// Turns a video file into a rainy MP4, entirely in the browser.
// Frames are decoded and encoded with WebCodecs through Mediabunny; the original audio is copied when possible.
import {
  ALL_FORMATS,
  AudioBufferSink,
  AudioBufferSource,
  BlobSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from 'mediabunny';
import { RainRenderer, type RainSettings } from './engine';

export interface VideoInfo {
  width: number;
  height: number;
  duration: number;
  fps: number;
  hasAudio: boolean;
}

export interface ExportOptions {
  longSide: number; // long side of the output, in pixels
  maxSeconds: number; // only the first part of longer videos is used
  keepAudio: boolean;
}

export interface ExportResult {
  blob: Blob;
  width: number;
  height: number;
  frames: number;
  seconds: number;
  hasAudio: boolean;
}

export class FriendlyError extends Error {}

export function browserCanExport(): boolean {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoDecoder' in window;
}

/** Output size: long side at most ``longSide``, both sides even (needed by H.264). */
export function outputSize(w: number, h: number, longSide: number): [number, number] {
  const s = Math.min(1, longSide / Math.max(w, h));
  return [Math.max(2, Math.round((w * s) / 2) * 2), Math.max(2, Math.round((h * s) / 2) * 2)];
}

function openInput(file: Blob) {
  return new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
}

export async function probeVideo(file: Blob): Promise<VideoInfo> {
  const input = openInput(file);
  try {
    const vt = await input.getPrimaryVideoTrack();
    if (!vt) throw new FriendlyError('This file has no video in it.');
    const [duration, stats, audio] = await Promise.all([
      vt.computeDuration(),
      vt.computePacketStats(120),
      input.getPrimaryAudioTrack(),
    ]);
    const fps = Number.isFinite(stats.averagePacketRate) && stats.averagePacketRate > 0 ? stats.averagePacketRate : 30;
    return { width: vt.displayWidth, height: vt.displayHeight, duration, fps, hasAudio: !!audio };
  } finally {
    input.dispose?.();
  }
}

export async function exportRainVideo(
  file: Blob,
  settings: RainSettings,
  opts: ExportOptions,
  onProgress: (done: number, total: number) => void,
  signal: AbortSignal,
): Promise<ExportResult> {
  const t0 = performance.now();
  const input = openInput(file);
  try {
    const vt = await input.getPrimaryVideoTrack();
    if (!vt) throw new FriendlyError('This file has no video in it.');
    if (!(await vt.canDecode())) {
      throw new FriendlyError("Your browser can't read this video format. Try an MP4 (H.264) file.");
    }
    const duration = await vt.computeDuration();
    const start = await vt.getFirstTimestamp();
    const end = Math.min(duration, start + opts.maxSeconds);
    const stats = await vt.computePacketStats(120);
    const fps = Number.isFinite(stats.averagePacketRate) && stats.averagePacketRate > 0 ? stats.averagePacketRate : 30;
    const total = Math.max(1, Math.round((end - start) * fps));
    const [w, h] = outputSize(vt.displayWidth, vt.displayHeight, opts.longSide);

    const codec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width: w, height: h, quality: QUALITY_HIGH });
    if (!codec) throw new FriendlyError("Your browser can't create videos at this size. Try a smaller output size.");

    const renderer = new RainRenderer(settings, w, h, 'video');
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
    const videoSource = new CanvasSource(renderer.canvas, { codec, quality: QUALITY_HIGH });
    output.addVideoTrack(videoSource, { frameRate: Math.round(fps) });

    let audioSource: AudioBufferSource | null = null;
    let audioSink: AudioBufferSink | null = null;
    if (opts.keepAudio) {
      const at = await input.getPrimaryAudioTrack();
      if (at && (await at.canDecode())) {
        const acodec = await getFirstEncodableAudioCodec(['aac', 'opus'], {
          numberOfChannels: at.numberOfChannels,
          sampleRate: at.sampleRate,
        });
        if (acodec) {
          audioSource = new AudioBufferSource({ codec: acodec, quality: QUALITY_HIGH });
          output.addAudioTrack(audioSource);
          audioSink = new AudioBufferSink(at);
        }
      }
    }

    await output.start();
    const sink = new CanvasSink(vt, { width: w, height: h, fit: 'fill', poolSize: 2 });
    let done = 0;
    try {
      for await (const frame of sink.canvases(start, end)) {
        if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        const t = frame.timestamp - start;
        renderer.render(frame.canvas, t);
        await videoSource.add(t, frame.duration);
        done++;
        onProgress(done, Math.max(total, done));
      }
      if (audioSource && audioSink) {
        for await (const chunk of audioSink.buffers(start, end)) {
          if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
          await audioSource.add(chunk.buffer);
        }
        audioSource.close();
      }
      videoSource.close();
      await output.finalize();
    } catch (err) {
      await output.cancel().catch(() => {});
      throw err;
    }
    if (!done) throw new FriendlyError('No frames could be read from this video.');
    const buffer = (output.target as BufferTarget).buffer!;
    return {
      blob: new Blob([buffer], { type: 'video/mp4' }),
      width: w,
      height: h,
      frames: done,
      seconds: (performance.now() - t0) / 1000,
      hasAudio: !!audioSource,
    };
  } finally {
    input.dispose?.();
  }
}
