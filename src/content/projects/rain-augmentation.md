---
title: Rain Augmentation
description: A physics-based rain generator that turns clear video into believable rainy footage, with drops placed in 3D, real drop sizes and speeds, and rain that stays smooth from frame to frame. Runs in the browser.
tags:
  - Computer Vision
  - Machine Learning
  - Research
date: 2026-11-25
link: https://anarusdiati.github.io/rain-augmentation/
github: https://github.com/anarusdiati/rain-augmentation-depth
---

## Overview

Most video datasets are recorded on nice days. Cameras get set up, footage gets collected, and by the time anyone
trains a model, the bulk of the data shows dry roads and clear skies. Then it rains, and a model that looked solid on
the test set starts missing things.

The obvious fix is to collect rainy footage. In practice that is slow. You wait for the weather, you hope it rains
during the hours you need, and then you label everything again. Synthetic rain flips this around: take the clear
footage you already have, labels included, and add rain on top. The objects stay in the same place, so the labels
still hold.

The catch is that the rain has to look real enough for the result to mean something. This project is my attempt at
that. It started as a Python tool and is now also a [browser app](/rain-augmentation/) where you can upload a clip,
pick how heavy the rain should be, and download the rainy version.

### What I wanted from it

- **Believable on video, not just on a single frame.** Rain that flickers or jumps between frames is easy to spot, and
  a model can learn that artefact instead of learning to see through rain.
- **Grounded in how rain actually looks on camera,** so each setting means something physical (drop size, shutter
  speed, distance) instead of being a "make it more rainy" knob.
- **Repeatable.** The same seed should always give exactly the same rain, so experiments can be compared fairly.
- **Easy to use.** Upload, choose a level, generate, download. The physics should stay out of the way unless you want
  to tweak it.

## Why the simple approach falls short

The quickest way to fake rain is to draw a bunch of thin diagonal lines over an image. Plenty of augmentation
libraries do exactly this, and for still images it is a reasonable start. On video it breaks down in two ways.

First, **it flickers.** If every frame gets its own random set of lines, the amount of rain, the wind direction, and
the haze all jump around 25 or 30 times a second. Real rain does not behave like that [8]. Its intensity drifts, the wind
shifts slowly, and the mist stays roughly where it is.

Second, **it looks stuck to the screen.** All the lines end up the same length, the same thickness, and the same
sharpness, as if the rain were painted on a sheet of glass in front of the lens. In real footage, drops close to the
camera look completely different from drops twenty metres away, and that difference is a big part of why rain reads
as rain.

So I went back to how rain forms an image in a camera.

## How real rain looks on camera

### A streak is motion blur

A raindrop is tiny and falls fast. While the camera shutter is open, the drop moves, and what the sensor records is a
short bright line: the path of that drop during the exposure. That is the core idea from Garg and Nayar's work on
rendering rain [2]. It means the length of a streak on screen is roughly

$$
\text{streak length} \approx \frac{v \cdot T \cdot f}{Z}
$$

where $v$ is the fall speed, $T$ is the exposure time, $f$ is the focal length in pixels, and $Z$ is the distance from
the camera. A slow shutter gives long streaks. A fast shutter almost freezes the drops into dots. Drops that are close
(small $Z$) leave long streaks, and distant drops leave short ones.

### Drops come in different sizes

Rain is not made of identical drops. Meteorologists measured this decades ago, and the classic result is the
Marshall-Palmer distribution [3]: lots of small drops, fewer large ones, with the balance shifting toward bigger drops
as the rain gets heavier.

$$
N(D) \propto e^{-\Lambda D}, \qquad \Lambda = 4.1\,R^{-0.21}
$$

Here $D$ is the drop diameter in millimetres and $R$ is the rainfall rate in millimetres per hour. Bigger drops also
fall faster. A good fit to measurements is [4]:

$$
v(D) = 9.65 - 10.3\,e^{-0.6D} \quad \text{m/s}
$$

In the generator, every drop gets its own size from this distribution, and its speed follows from its size. That is
why the "Rainfall" slider changes more than the number of drops. It changes what the drops look like.

### Far drops stay visible, just thinner

You might expect distant drops to simply disappear. They mostly don't, and the reason is neat. A drop only covers a
given pixel for a tiny fraction of the exposure, so its contrast against the background is roughly proportional to
$D / (v \cdot T)$ [1]. That ratio does not depend on distance. A far drop is thinner on screen, but it lingers over
each pixel just as long relative to its size, so it shows up as a fine, faint line rather than vanishing.

### Distance changes everything else too

- **Focus.** The camera focuses at some distance, usually somewhere in the middle of the scene. Drops much closer
  than that are out of focus, so they look wide and soft. This is the big blurry streak you sometimes see right in
  front of the lens.
- **Mist.** Heavy rain fills the air with fine water that scatters light. The further you look, the more of it is
  between you and the scene, so distant areas turn hazy and grey. The standard way to model this is Koschmieder's law
  [5]: the scene fades toward the colour of the sky as $1 - e^{-Z / \text{visibility}}$.
- **Perspective.** Rain falls straight down in the world, but a camera tilted toward the ground sees those vertical
  lines converge toward a point below the frame. Rain from a high camera fans out; rain seen at eye level looks almost
  vertical.

### Water on the lens

Outdoor cameras get wet. A few drops land on the glass, sit there blurring a small patch of the image, and fade after
a few seconds. Some slide down. It is a small detail, but it is one of those things that makes footage feel like it was
actually filmed in the rain [9], [10].

### Rain changes slowly over time

Real weather has inertia. To keep things smooth, the rain intensity, the wind direction, and the amount of mist each
follow a slow random drift (an Ornstein-Uhlenbeck process [11], which is just a random walk that keeps getting pulled
back toward its average). Gusts sit on top of that as faster, smaller wiggles. The result is rain that gets a little
heavier and lighter and leans a bit with the wind, without ever jumping between frames.

## From screen layers to drops in 3D

The first version of the generator drew rain on the image plane: a layer of thin, sharp "far" streaks and a layer of
thicker, blurred "near" streaks, both moving as particles from frame to frame. That already fixed the flicker, and it
is still in the repository as the lighter option. But it kept the "rain on a sheet of glass" feel, because every drop
in a layer was effectively at the same distance.

The current version places every drop in 3D space in front of a simple pinhole camera, in the spirit of
physics-based rain rendering for computer vision [6], [7]. Each drop has a position in
metres, falls at its own physical speed, and stops when it reaches the ground. For every frame, the generator works out
where each drop was when the shutter opened and where it is when the shutter closes, projects both points onto the
image, and draws the line between them. Length, width, blur, speed on screen, and how much mist covers it all fall out
of that one step, instead of being separate tricks.

### Not simulating a billion drops

Real rain has hundreds of drops in every cubic metre of air. Simulating all of them is out of the question, and most
would be far too small to see anyway. Their combined effect is the mist.

So the space in front of the camera is split into distance "shells": 0.3 to 2 m, 2 to 4 m, 4 to 8 m, and so on up to
25 m. Close shells are filled densely. Beyond a few metres the density drops off with the square of the distance, which
keeps the number of drops per metre of depth roughly constant and stops the distant ones from turning into a grey
noise. When a drop moves from one shell to the next, it fades out gradually instead of popping. Even with heavy rain,
this keeps it to a few hundred thousand simulated drops, of which only a few tens of thousands are drawn in any one
frame.

### Knowing where things are

The plain 3D model assumes the scene is a flat, empty ground. That works surprisingly well, but it means rain is still
drawn in front of walls and cars that should be hiding it. The Python version can fix this with a depth map: it runs a
monocular depth model (Depth Anything V2 [12] or Apple's Depth Pro [13]) on a few frames of the video and takes the
median, so people walking past don't become part of the scene. With that map, drops behind an object are hidden, mist
follows the real distance of each pixel, and the camera's height and tilt can be estimated by fitting the ground plane.

## Bringing it to the browser

I wanted people to be able to try this without installing Python, so I ported the depth-layered model to TypeScript
and built a small app around it. A few things made that possible:

- **Canvas 2D** for drawing. Streaks are grouped by distance, so each distance band gets drawn in one go and then
  blurred by the right amount for its focus.
- **WebCodecs** (through the Mediabunny library) for reading the video frame by frame and writing the result as an MP4,
  original audio included.
- **Everything stays on your device.** The video is never uploaded anywhere, which matters if your footage is private.

To make sure the port behaves like the original, I ran both on the same frame with the same settings. The number of
simulated drops matched exactly, and the average streak coverage came out within a few percent. Side by side, the two
are hard to tell apart.

The app keeps the physics in the background. You pick a rain level and a camera view, watch a live preview with a
before and after slider, and press generate. If you want more control, every setting has a plain-language name, like
"Amount of rain", "Visibility", or "Close-drop blur", with a one-line explanation of what it does.

## How I check that it looks right

"Looks good to me" is not a great test, so I also measure how smoothly the rain behaves over time. For each frame, the
clear version is subtracted from the rainy one, which leaves mostly the rain itself. From that difference I track:

- **Brightness flicker:** how much the overall brightness shift jumps between frames.
- **Tilt jitter:** how much the average streak direction changes between frames.
- **Low-frequency stability:** whether the soft parts (mist, lens drops) stay consistent from one frame to the next.

Per-frame rain scores badly on all three. The particle-based version keeps them low, which matches what you see: rain
that moves, rather than rain that flashes.

## Limitations

- Without a depth map, rain doesn't know about objects, so it can be drawn in front of things that should hide it. The
  browser version doesn't have the depth filter yet.
- The ground is treated as flat. Hills, stairs, or a camera that moves a lot will bend the assumptions.
- Splashes and wet surfaces are simple. They help, but they won't fool anyone who looks closely at a puddle.
- Rendering in the browser takes a few times longer than the video itself on an average laptop. Fine for clips, slow
  for hours of footage. The Python version is the better choice for large batches.

## What's next

- Bring the depth filter to the browser, likely with a small depth model running through WebGPU.
- Better ground effects: ripples, reflections, and surfaces that get darker as they get wetter.
- Other weather: snow and fog would reuse most of the same machinery.
- A proper study of how much training with this kind of rain helps detection models on real rainy footage.

## References

1. Garg, K., & Nayar, S. K. (2007). Vision and rain. *International Journal of Computer Vision, 75*(1), 3-27.
2. Garg, K., & Nayar, S. K. (2006). Photorealistic rendering of rain streaks. *ACM Transactions on Graphics, 25*(3).
3. Marshall, J. S., & Palmer, W. McK. (1948). The distribution of raindrops with size. *Journal of Meteorology, 5*(4).
4. Atlas, D., Srivastava, R. C., & Sekhon, R. S. (1973). Doppler radar characteristics of precipitation at vertical
   incidence. *Reviews of Geophysics, 11*(1).
5. Koschmieder, H. (1924). Theorie der horizontalen Sichtweite. *Beiträge zur Physik der freien Atmosphäre, 12*.
6. Halder, S. S., Lalonde, J.-F., & de Charette, R. (2019). Physics-based rendering for improving robustness to rain.
   *ICCV*.
7. Tremblay, M., Halder, S. S., de Charette, R., & Lalonde, J.-F. (2021). Rain rendering for evaluating and improving
   robustness to bad weather. *International Journal of Computer Vision, 129*.
8. Wang, S., et al. (2022). Rethinking video rain streak removal: A new synthesis model and a deraining network with
   video rain prior. *ECCV*.
9. Qian, R., et al. (2018). Attentive generative adversarial network for raindrop removal from a single image. *CVPR*.
10. Porav, H., Bruls, T., & Newman, P. (2019). I can see clearly now: Image restoration via de-raining. *ICRA*.
11. Uhlenbeck, G. E., & Ornstein, L. S. (1930). On the theory of the Brownian motion. *Physical Review, 36*(5).
12. Yang, L., et al. (2024). Depth Anything V2. *NeurIPS*.
13. Bochkovskii, A., et al. (2025). Depth Pro: Sharp monocular metric depth in less than a second. *ICLR*.
