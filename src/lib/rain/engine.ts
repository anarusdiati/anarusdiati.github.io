// Depth-layered rain for the browser.
//
// A port of RainDepth from github.com/anarusdiati/rain-augmentation-depth (python/rain_depth.py), drawn with Canvas 2D.
// Every drop lives in 3D space in front of a pinhole camera, falls at its physical speed, and is drawn as the streak
// it leaves while the shutter is open. Near drops are long, wide, and out of focus; far drops are short, thin, and
// fade into the mist. The scene is assumed to be a flat ground (no depth map).

export type Level = 'light' | 'medium' | 'heavy';
export type View = 'down' | 'tilted' | 'eye';

/** Everything the user can change. Values are in plain units (metres, degrees, milliseconds). */
export interface RainSettings {
  level: Level;
  view: View;
  amount: number; // multiplier on the number of drops
  rainfall: number; // mm per hour: bigger and faster drops when higher
  brightness: number; // multiplier on streak contrast
  wind: number; // degrees, below 0 leans left
  gusts: number; // degrees of slow wind change
  mist: number; // 0 to 0.5
  visibility: number; // metres
  darker: number; // 0 to 0.5
  faded: number; // 0 to 0.6
  softness: number; // pixels of blur at 960 px
  fov: number; // degrees across the long side
  tilt: number; // degrees the camera looks down
  height: number; // metres above the ground
  shutter: number; // milliseconds
  nearBlur: number; // pixels of blur for a drop at 0.5 m
  lensDrops: boolean;
  lensRate: number; // new lens drops per second
  seed: number;
}

const LEVELS: Record<Level, {
  drops: number; rainfall: number; visibility: number; mist: number; darken: number; desat: number; soft: number;
  lensRate: number; lensMax: number; lensRadius: [number, number];
}> = {
  light: { drops: 12, rainfall: 2, visibility: 60, mist: 0.06, darken: 0.93, desat: 0.9, soft: 0.3, lensRate: 0.1, lensMax: 4, lensRadius: [0.008, 0.025] },
  medium: { drops: 35, rainfall: 10, visibility: 30, mist: 0.14, darken: 0.85, desat: 0.8, soft: 0.5, lensRate: 0.3, lensMax: 8, lensRadius: [0.008, 0.025] },
  heavy: { drops: 70, rainfall: 40, visibility: 15, mist: 0.22, darken: 0.76, desat: 0.68, soft: 0.8, lensRate: 0.8, lensMax: 16, lensRadius: [0.01, 0.03] },
};

const VIEWS: Record<View, { fov: number; tilt: number; height: number; shutter: number }> = {
  down: { fov: 100, tilt: 40, height: 4, shutter: 40 },
  tilted: { fov: 80, tilt: 20, height: 3, shutter: 33 },
  eye: { fov: 70, tilt: 0, height: 1.5, shutter: 33 },
};

export function presetSettings(level: Level, view: View, seed = 1): RainSettings {
  const l = LEVELS[level];
  const v = VIEWS[view];
  return {
    level, view, seed,
    amount: 1, rainfall: l.rainfall, brightness: 1, wind: 0, gusts: 4,
    mist: l.mist, visibility: l.visibility, darker: round2(1 - l.darken), faded: round2(1 - l.desat), softness: l.soft,
    fov: v.fov, tilt: v.tilt, height: v.height, shutter: v.shutter, nearBlur: 5,
    lensDrops: true, lensRate: l.lensRate,
  };
}

export function viewSettings(view: View) {
  return { ...VIEWS[view] };
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

// ---------------------------------------------------------------------------------------------
// Random numbers (seeded, so the same seed always gives the same rain)
// ---------------------------------------------------------------------------------------------
function hashSeed(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

class Rng {
  private a: number; private b: number; private c: number; private d: number;
  private spare: number | null = null;

  constructor(key: string) {
    [this.a, this.b, this.c, this.d] = hashSeed(key);
    for (let i = 0; i < 12; i++) this.next();
  }

  next(): number {
    // sfc32
    this.a >>>= 0; this.b >>>= 0; this.c >>>= 0; this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  uniform(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }

  normal(): number {
    if (this.spare !== null) {
      const s = this.spare;
      this.spare = null;
      return s;
    }
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    const r = Math.sqrt(-2 * Math.log(u));
    this.spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  }

  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= this.next(); } while (p > L);
    return k - 1;
  }
}

// ---------------------------------------------------------------------------------------------
// Drop physics
// ---------------------------------------------------------------------------------------------
/** Drop diameter (mm) from the Marshall-Palmer distribution, truncated to 0.5 to 5 mm. */
function dropDiameter(rate: number, rng: Rng): number {
  const lam = 4.1 * Math.pow(Math.max(rate, 0.1), -0.21);
  const a = Math.exp(-lam * 0.5), b = Math.exp(-lam * 5);
  return -Math.log(a - rng.next() * (a - b)) / lam;
}

/** Fall speed (m/s) from Atlas et al. (1973). */
function terminalVelocity(d: number): number {
  return 9.65 - 10.3 * Math.exp(-0.6 * d);
}

/** Ornstein-Uhlenbeck process: a random value that drifts smoothly. */
class OU {
  x: number;
  constructor(private std: number, private tau: number, private rng: Rng) {
    this.x = std > 0 ? rng.normal() * std : 0;
  }
  step(dt: number): number {
    if (dt > 0 && this.std > 0) {
      const a = Math.exp(-dt / this.tau);
      this.x = this.x * a + this.std * Math.sqrt(1 - a * a) * this.rng.normal();
    }
    return this.x;
  }
}

// ---------------------------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------------------------
function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

let filterSupport: boolean | null = null;

/** Whether ctx.filter blur works (it is missing in some older Safari versions). */
export function canvasFilterWorks(): boolean {
  if (filterSupport !== null) return filterSupport;
  try {
    const c = makeCanvas(9, 9);
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = '#fff';
    ctx.fillRect(4, 4, 1, 1);
    filterSupport = ctx.getImageData(2, 4, 1, 1).data[3] > 0;
  } catch {
    filterSupport = false;
  }
  return filterSupport;
}

class Blurrer {
  private small: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  constructor(private w: number, private h: number) {
    this.small = makeCanvas(w, h);
    this.sctx = this.small.getContext('2d')!;
  }

  /** Draw src onto ctx with a Gaussian-like blur of ``sigma`` pixels, using the current composite mode. */
  draw(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sigma: number, extra = '') {
    const { w, h } = this;
    if (sigma < 0.35 && !extra) {
      ctx.drawImage(src, 0, 0, w, h);
      return;
    }
    if (canvasFilterWorks()) {
      ctx.filter = `${sigma >= 0.35 ? `blur(${sigma.toFixed(2)}px)` : ''} ${extra}`.trim() || 'none';
      ctx.drawImage(src, 0, 0, w, h);
      ctx.filter = 'none';
      return;
    }
    // Fallback: shrink and enlarge again, which softens the image about as much as a blur of ``sigma``.
    const k = Math.max(1, sigma * 1.25);
    if (k < 1.5) {
      ctx.drawImage(src, 0, 0, w, h);
      return;
    }
    const sw = Math.max(1, Math.round(w / k)), sh = Math.max(1, Math.round(h / k));
    this.sctx.globalCompositeOperation = 'copy';
    this.sctx.imageSmoothingEnabled = true;
    this.sctx.imageSmoothingQuality = 'high';
    this.sctx.drawImage(src, 0, 0, sw, sh);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.small, 0, 0, sw, sh, 0, 0, w, h);
  }
}

// ---------------------------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------------------------
const WORK_LONG = 960;
const Z_NEAR = 0.3;
const Z_FAR = 25;
const FALLOFF = 4;
const STREAK_GAIN = 40;
const SHELL_BLEND = 0.2;
const KEEP_SOFT = 0.15;
const MAX_STREAK = 600;
const N_BINS = 8;
const MAX_DROPS = 450_000;
const WIDTHS = [1, 1.5, 2, 3, 4, 6, 8, 12];
const N_ALPHA = 24;
const AIRLIGHT = [0.77 * 255, 0.79 * 255, 0.8 * 255]; // light bluish grey (RGB)
const TINT = [0.97, 1.0, 1.03]; // slight blue tint when overcast (RGB)

interface Shell { x0: number; x1: number; f0: number; f1: number; d0: number; d1: number; zlo: number; zhi: number; rho: number }
interface LensDrop { x: number; y: number; rx: number; ry: number; age: number; life: number; slideV: number; slideAfter: number }

export class RainRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly w: number;
  readonly h: number;
  visibleDrops = 0;

  private s: number;
  private rng: Rng;
  private cfg: ReturnType<typeof toConfig>;
  private wind0: number;
  private windF: number;
  private ouWind: OU; private ouGust: OU; private ouInten: OU; private ouVeil: OU;
  private tPrev: number | null = null;

  // camera
  private f: number; private cx: number; private cy: number; private cp: number; private sp: number; private H: number;
  // drops
  private shells: Shell[] = [];
  private n = 0;
  private PX!: Float32Array; private PF!: Float32Array; private PD!: Float32Array;
  private sh!: Uint8Array; private dia!: Float32Array; private vel!: Float32Array; private u!: Float32Array;
  private edges: number[] = [];
  private zmid: number[] = [];
  private zFocus: number;
  private dmean = 1;
  private mist: Float32Array;
  private lens: LensDrop[] = [];

  // canvases
  private frameCtx: CanvasRenderingContext2D;
  private binCanvases: HTMLCanvasElement[] = [];
  private binCtx: CanvasRenderingContext2D[] = [];
  private accum: HTMLCanvasElement; private accumCtx: CanvasRenderingContext2D;
  private mask: HTMLCanvasElement; private maskCtx: CanvasRenderingContext2D;
  private lensCanvas: HTMLCanvasElement; private lensCtx: CanvasRenderingContext2D;
  private work: HTMLCanvasElement; private workCtx: CanvasRenderingContext2D;
  private outCtx: CanvasRenderingContext2D;
  private blur: Blurrer;

  constructor(settings: RainSettings, width: number, height: number, key = 'clip') {
    this.w = width;
    this.h = height;
    this.s = Math.max(width, height) / WORK_LONG;
    this.cfg = toConfig(settings);
    const c = this.cfg;
    this.rng = new Rng(`${settings.seed}|${key}|rain-depth`);
    const r = this.rng;
    this.wind0 = c.windMean;
    this.windF = r.uniform(-1, 1) * 5;
    this.ouWind = new OU(c.windDrift, 20, r);
    this.ouGust = new OU(c.gust, 3, r);
    this.ouInten = new OU(0.15, 20, r);
    this.ouVeil = new OU(0.1, 30, r);

    // camera
    this.f = Math.max(width, height) / (2 * Math.tan((c.fov * Math.PI) / 360));
    this.cx = width / 2;
    this.cy = height / 2;
    const p = (c.pitch * Math.PI) / 180;
    this.cp = Math.cos(p);
    this.sp = Math.sin(p);
    this.H = c.height;

    this.initDrops();

    // focus and mist from the ground distance of each row
    const zg = new Float32Array(height);
    for (let row = 0; row < height; row++) zg[row] = this.groundDepth(row);
    const zc = Number.isFinite(zg[height >> 1]) ? zg[height >> 1] : Z_FAR;
    this.zFocus = clamp(zc, 2, Z_FAR);
    this.mist = new Float32Array(height);
    for (let row = 0; row < height; row++) {
      this.mist[row] = 1 - Math.exp(-Math.min(zg[row], 1e4) / c.visibility);
    }
    for (let i = 0; i <= N_BINS; i++) this.edges.push(Z_NEAR * Math.pow(Z_FAR / Z_NEAR, i / N_BINS));
    for (let i = 0; i < N_BINS; i++) this.zmid.push(Math.sqrt(this.edges[i] * this.edges[i + 1]));

    // canvases
    this.canvas = makeCanvas(width, height);
    this.outCtx = this.canvas.getContext('2d')!;
    const frame = makeCanvas(width, height);
    this.frameCtx = frame.getContext('2d', { willReadFrequently: true })!;
    this.work = frame;
    this.workCtx = this.frameCtx;
    for (let i = 0; i < N_BINS; i++) {
      const b = makeCanvas(width, height);
      this.binCanvases.push(b);
      this.binCtx.push(b.getContext('2d')!);
    }
    this.accum = makeCanvas(width, height);
    this.accumCtx = this.accum.getContext('2d', { willReadFrequently: true })!;
    this.mask = makeCanvas(width, height);
    this.maskCtx = this.mask.getContext('2d')!;
    this.lensCanvas = makeCanvas(width, height);
    this.lensCtx = this.lensCanvas.getContext('2d')!;
    this.blur = new Blurrer(width, height);
  }

  // ---- camera
  private groundDepth(row: number): number {
    const yn = (row + 0.5 - this.cy) / this.f;
    const den = yn * this.cp + this.sp;
    return den > 1e-6 ? this.H / den : Infinity;
  }

  private frustumBox(zNear: number, zFar: number) {
    const { w, h, f, cx, cy, cp, sp, H } = this;
    const n = 24;
    let x0 = Infinity, x1 = -Infinity, f0 = Infinity, f1 = -Infinity, d0 = Infinity;
    const visit = (u: number, v: number) => {
      const xn = (u - cx) / f, yn = (v - cy) / f;
      const den = yn * cp + sp;
      const zg = den > 1e-6 ? H / den : Infinity;
      for (const z of [zNear, zFar]) {
        const zz = Math.max(Math.min(z, zg), zNear);
        const x = xn * zz, y = yn * zz;
        const F = -y * sp + zz * cp;
        const D = y * cp + zz * sp;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        f0 = Math.min(f0, F); f1 = Math.max(f1, F);
        d0 = Math.min(d0, D);
      }
    };
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      visit(t * w, 0);
      visit(w, t * h);
      visit((1 - t) * w, h);
      visit(0, (1 - t) * h);
    }
    return { x0, x1, f0, f1, d0, d1: H };
  }

  // ---- drops in distance shells: dense near the camera, sparser (1/Z^2) far away
  private initDrops() {
    const c = this.cfg, r = this.rng;
    const cuts = [Z_NEAR];
    for (const z of [FALLOFF / 2, FALLOFF, 2 * FALLOFF, 4 * FALLOFF, 8 * FALLOFF, 16 * FALLOFF]) {
      if (z > Z_NEAR && z < Z_FAR) cuts.push(z);
    }
    cuts.push(Z_FAR);
    const counts: number[] = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const zlo = cuts[i], zhi = cuts[i + 1];
      const b = this.frustumBox(Z_NEAR, zhi * Math.exp(SHELL_BLEND / 2));
      const rho = c.drops * Math.min(1, (FALLOFF / zlo) ** 2);
      const vol = (b.x1 - b.x0) * (b.f1 - b.f0) * (b.d1 - b.d0);
      this.shells.push({ ...b, zlo, zhi, rho });
      counts.push(Math.max(0, Math.floor(rho * vol * 1.5)));
    }
    let total = counts.reduce((a, b) => a + b, 0);
    if (total > MAX_DROPS) {
      // keep the browser responsive: simulate fewer drops, each one drawn more often
      const k = MAX_DROPS / total;
      for (let i = 0; i < counts.length; i++) {
        counts[i] = Math.floor(counts[i] * k);
        this.shells[i].rho *= k;
      }
      total = counts.reduce((a, b) => a + b, 0);
    }
    this.n = total;
    this.PX = new Float32Array(total); this.PF = new Float32Array(total); this.PD = new Float32Array(total);
    this.sh = new Uint8Array(total); this.dia = new Float32Array(total); this.vel = new Float32Array(total);
    this.u = new Float32Array(total);
    let k = 0, dsum = 0;
    this.shells.forEach((s, si) => {
      for (let j = 0; j < counts[si]; j++, k++) {
        this.PX[k] = r.uniform(s.x0, s.x1);
        this.PF[k] = r.uniform(s.f0, s.f1);
        this.PD[k] = r.uniform(s.d0, s.d1);
        this.sh[k] = si;
        const d = dropDiameter(c.rainfall, r);
        this.dia[k] = d;
        this.vel[k] = terminalVelocity(d);
        this.u[k] = r.next();
        dsum += d;
      }
    });
    this.dmean = total ? dsum / total : 1;
  }

  private step(dt: number, tx: number, tf: number) {
    if (dt <= 0) return;
    const r = this.rng, c = this.cfg;
    for (let i = 0; i < this.n; i++) {
      const s = this.shells[this.sh[i]];
      const v = this.vel[i];
      let x = this.PX[i] + v * tx * dt;
      let F = this.PF[i] + v * tf * dt;
      let D = this.PD[i] + v * dt;
      if (D > s.d1) {
        // hit the ground: respawn at the top with a new size
        const over = D - s.d1;
        x = r.uniform(s.x0, s.x1);
        F = r.uniform(s.f0, s.f1);
        D = s.d0 + mod(over, s.d1 - s.d0);
        const d = dropDiameter(c.rainfall, r);
        this.dia[i] = d;
        this.vel[i] = terminalVelocity(d);
        this.u[i] = r.next();
      }
      this.PX[i] = s.x0 + mod(x - s.x0, s.x1 - s.x0);
      this.PF[i] = s.f0 + mod(F - s.f0, s.f1 - s.f0);
      this.PD[i] = D;
    }
  }

  /** Draw all visible streaks into one canvas per distance bin, then blur each bin by its defocus. */
  private drawStreaks(intensity: number, tx: number, tf: number) {
    const c = this.cfg, { w, h, f, cx, cy, cp, sp, s } = this;
    const T = c.shutter / 1000;
    const zf = this.zFocus;
    // segments grouped by bin, width, and alpha, so each group is one stroke call
    const groups: Map<number, number[]>[] = Array.from({ length: N_BINS }, () => new Map());
    let visible = 0;
    const lnZlo = this.shells.map((x) => Math.log(x.zlo));
    const lnZhi = this.shells.map((x) => Math.log(x.zhi));
    const lnEdges = this.edges.map(Math.log);
    const lnNear = Math.log(Z_NEAR);
    const binStep = (lnEdges[N_BINS] - lnNear) / N_BINS;
    for (let i = 0; i < this.n; i++) {
      const X = this.PX[i], F = this.PF[i], D = this.PD[i];
      const z1 = F * cp + D * sp;
      if (z1 <= Z_NEAR) continue;
      const v = this.vel[i];
      const Xb = X - v * tx * T, Fb = F - v * tf * T, Db = D - v * T;
      const z0 = Fb * cp + Db * sp;
      if (z0 <= Z_NEAR) continue;
      const shell = this.shells[this.sh[i]];
      const si = this.sh[i];
      const want = c.drops * Math.min(1, (FALLOFF / z1) ** 2) * intensity / 1.5;
      const lz = Math.log(z1);
      const lo = shell.zlo > Z_NEAR ? clamp((lz - lnZlo[si]) / SHELL_BLEND + 0.5, 0, 1) : 1;
      const hi = shell.zhi < Z_FAR ? clamp((lnZhi[si] - lz) / SHELL_BLEND + 0.5, 0, 1) : (z1 <= Z_FAR ? 1 : 0);
      const keep = clamp((want / shell.rho - this.u[i]) / KEEP_SOFT + 0.5, 0, 1);
      const wt = lo * hi * keep;
      if (wt <= 0) continue;
      const y1 = -F * sp + D * cp;
      const y0 = -Fb * sp + Db * cp;
      const u1 = (f * X) / z1 + cx, v1 = (f * y1) / z1 + cy;
      let u0 = (f * Xb) / z0 + cx, v0 = (f * y0) / z0 + cy;
      if (Math.max(u0, u1) < -2 || Math.min(u0, u1) > w + 2 || Math.max(v0, v1) < -2 || Math.min(v0, v1) > h + 2) continue;
      let L = Math.hypot(u1 - u0, v1 - v0);
      const sc = Math.min(1, (MAX_STREAK * s) / Math.max(L, 1e-6));
      u0 = u1 - (u1 - u0) * sc;
      v0 = v1 - (v1 - v0) * sc;
      L *= sc;
      const d = this.dia[i];
      const width = Math.max(s, ((d / 1000) * f) / z1);
      // per-pixel contrast D/(vT) (Garg & Nayar), faded by mist with distance
      const alpha = ((c.gain * (d / 1000)) / (v * T)) * Math.exp(-z1 / c.visibility) * wt;
      if (alpha < 0.002) continue;
      visible++;
      const bin = clamp(Math.floor((lz - lnNear) / binStep), 0, N_BINS - 1);
      let wi = 0;
      while (wi < WIDTHS.length - 1 && WIDTHS[wi + 1] <= width * 1.15) wi++;
      const ai = clamp(Math.round(Math.log2(Math.min(alpha, 1)) * 2) + 18, 0, N_ALPHA - 1);
      const key = wi * N_ALPHA + ai;
      let arr = groups[bin].get(key);
      if (!arr) { arr = []; groups[bin].set(key, arr); }
      if (L < 0.75) {
        // too short to be a line: draw a dot along the motion direction
        arr.push(u1 - 0.4, v1 - 0.4, u1 + 0.4, v1 + 0.4);
      } else {
        arr.push(u0, v0, u1, v1);
      }
    }
    this.visibleDrops = visible;

    const actx = this.accumCtx;
    actx.globalCompositeOperation = 'source-over';
    actx.clearRect(0, 0, w, h);
    actx.globalCompositeOperation = 'lighter';
    const ref = Math.abs(1 / 0.5 - 1 / zf);
    for (let b = 0; b < N_BINS; b++) {
      if (groups[b].size === 0) continue;
      const ctx = this.binCtx[b];
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#fff';
      ctx.lineCap = 'butt';
      for (const [key, arr] of groups[b]) {
        const wi = Math.floor(key / N_ALPHA), ai = key % N_ALPHA;
        ctx.lineWidth = WIDTHS[wi];
        ctx.globalAlpha = Math.min(1, Math.pow(2, (ai - 18) / 2));
        ctx.beginPath();
        for (let k = 0; k < arr.length; k += 4) {
          ctx.moveTo(arr[k], arr[k + 1]);
          ctx.lineTo(arr[k + 2], arr[k + 3]);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const defocus = (c.nearBlur * s * Math.abs(1 / this.zmid[b] - 1 / zf)) / Math.max(ref, 1e-6);
      const wpx = ((this.dmean / 1000) * f) / this.zmid[b];
      const sigma = Math.sqrt(defocus ** 2 + (wpx / 2.5) ** 2 + (0.5 * s) ** 2);
      this.blur.draw(actx, this.binCanvases[b], sigma);
    }
    actx.globalCompositeOperation = 'source-over';
  }

  private stepLens(dt: number, intensity: number) {
    const c = this.cfg, r = this.rng;
    for (const d of this.lens) {
      d.age += dt;
      if (d.slideV > 0 && d.age > d.slideAfter) d.y += d.slideV * dt;
    }
    this.lens = this.lens.filter((d) => d.age < d.life && d.y - d.ry < this.h);
    if (c.lensRate <= 0 || dt <= 0) return;
    const nNew = r.poisson(c.lensRate * intensity * dt);
    for (let k = 0; k < Math.min(nNew, Math.max(0, c.lensMax - this.lens.length)); k++) {
      const rad = r.uniform(c.lensRadius[0], c.lensRadius[1]) * this.w;
      const life = r.uniform(3, 12);
      const slide = r.next() < 0.35;
      this.lens.push({
        x: r.uniform(0, this.w), y: r.uniform(0, this.h), rx: rad, ry: rad * r.uniform(0.8, 1.25), age: 0, life,
        slideV: slide ? r.uniform(8, 30) * this.s : 0, slideAfter: r.uniform(0.3, 0.7) * life,
      });
    }
  }

  private drawLens(target: HTMLCanvasElement, tctx: CanvasRenderingContext2D) {
    if (!this.lens.length) return;
    const { w, h } = this;
    const m = this.maskCtx;
    m.clearRect(0, 0, w, h);
    let rsum = 0;
    for (const d of this.lens) {
      const a = Math.min(1, d.age / 0.4) * Math.min(1, (d.life - d.age) / 1.5);
      const sliding = d.slideV > 0 && d.age > d.slideAfter;
      m.fillStyle = `rgba(255,255,255,${(0.9 * Math.max(0, a)).toFixed(3)})`;
      m.beginPath();
      m.ellipse(d.x, d.y, Math.max(1, d.rx), Math.max(1, d.ry * (sliding ? 1.3 : 1)), 0, 0, Math.PI * 2);
      m.fill();
      rsum += d.rx;
    }
    const meanR = rsum / this.lens.length;
    const l = this.lensCtx;
    l.globalCompositeOperation = 'copy';
    this.blur.draw(l, target, Math.max(3 * this.s, 0.6 * meanR), canvasFilterWorks() ? 'brightness(1.05)' : '');
    l.globalCompositeOperation = 'destination-in';
    this.blur.draw(l, this.mask, Math.max(1, 0.3 * meanR));
    l.globalCompositeOperation = 'source-over';
    tctx.drawImage(this.lensCanvas, 0, 0);
  }

  /** Render one frame. Call in order with increasing ``t`` (seconds). Returns the canvas with the rainy frame. */
  render(source: CanvasImageSource, t: number): HTMLCanvasElement {
    const { w, h } = this;
    const c = this.cfg;
    const dt = this.tPrev === null ? 0 : Math.max(0, t - this.tPrev);
    this.tPrev = t;
    const wind = this.wind0 + this.ouWind.step(dt) + this.ouGust.step(dt);
    const inten = clamp(1 + this.ouInten.step(dt), 0.5, 1.5);
    const veilM = clamp(1 + this.ouVeil.step(dt), 0.6, 1.4);
    const tx = Math.tan((wind * Math.PI) / 180), tf = Math.tan((this.windF * Math.PI) / 180);
    this.step(dt, tx, tf);
    this.stepLens(dt, inten);
    this.drawStreaks(inten, tx, tf);

    // overcast, mist, and streaks per pixel
    const fctx = this.frameCtx;
    fctx.globalCompositeOperation = 'copy';
    fctx.drawImage(source, 0, 0, w, h);
    fctx.globalCompositeOperation = 'source-over';
    const img = fctx.getImageData(0, 0, w, h);
    const px = img.data;
    const streak = this.accumCtx.getImageData(0, 0, w, h).data;
    const desat = c.desat, dk = c.darken;
    const tr = TINT[0] * dk, tg = TINT[1] * dk, tb = TINT[2] * dk;
    let sum = 0;
    for (let row = 0, i = 0; row < h; row++) {
      const tv = c.veil * veilM * this.mist[row];
      const keep = 1 - tv;
      const ar = AIRLIGHT[0] * dk * tv, ag = AIRLIGHT[1] * dk * tv, ab = AIRLIGHT[2] * dk * tv;
      for (let col = 0; col < w; col++, i += 4) {
        const R = px[i], G = px[i + 1], B = px[i + 2];
        const g = (R + G + B) / 3;
        const r2 = (g + (R - g) * desat) * tr * keep + ar;
        const g2 = (g + (G - g) * desat) * tg * keep + ag;
        const b2 = (g + (B - g) * desat) * tb * keep + ab;
        px[i] = r2; px[i + 1] = g2; px[i + 2] = b2;
        sum += r2 + g2 + b2;
      }
    }
    const bright = clamp(0.7 + (0.4 * sum) / (w * h * 3 * 255), 0.75, 0.97) * 255;
    for (let i = 0; i < px.length; i += 4) {
      // white strokes on a transparent canvas: the streak strength is in the alpha channel
      const sv = streak[i + 3];
      if (sv === 0) continue;
      const s = Math.min(0.85, sv / 255);
      px[i] = px[i] * (1 - s) + bright * s;
      px[i + 1] = px[i + 1] * (1 - s) + bright * s;
      px[i + 2] = px[i + 2] * (1 - s) + bright * s;
    }
    fctx.putImageData(img, 0, 0);

    this.drawLens(this.work, this.workCtx);

    // soft blur from wet air
    const out = this.outCtx;
    out.globalCompositeOperation = 'copy';
    if (c.softness * this.s > 0.35 && canvasFilterWorks()) {
      this.blur.draw(out, this.work, c.softness * this.s);
    } else {
      out.drawImage(this.work, 0, 0);
    }
    out.globalCompositeOperation = 'source-over';
    return this.canvas;
  }
}

function toConfig(st: RainSettings) {
  const l = LEVELS[st.level];
  return {
    drops: l.drops * st.amount,
    rainfall: st.rainfall,
    gain: STREAK_GAIN * st.brightness,
    windMean: st.wind,
    windDrift: st.gusts,
    gust: st.gusts * 0.625,
    veil: st.mist,
    visibility: Math.max(1, st.visibility),
    darken: 1 - st.darker,
    desat: 1 - st.faded,
    softness: st.softness,
    fov: st.fov,
    pitch: st.tilt,
    height: Math.max(0.3, st.height),
    shutter: Math.max(1, st.shutter),
    nearBlur: st.nearBlur,
    lensRate: st.lensDrops ? st.lensRate : 0,
    lensMax: l.lensMax,
    lensRadius: l.lensRadius,
  };
}

function clamp(x: number, lo: number, hi: number) {
  return x < lo ? lo : x > hi ? hi : x;
}

function mod(a: number, b: number) {
  return b <= 0 ? 0 : ((a % b) + b) % b;
}
