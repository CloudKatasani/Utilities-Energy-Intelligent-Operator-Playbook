// A pausable step player for scripted runs, scenarios and motion demos.
// Steps advance on a timer (or instantly with reduced motion); ←/→ and Space are wired in main.js
// to whichever player is active.
import { reducedMotion } from './util.js';

let active = null;
export const activePlayer = () => active;

export class Player {
  constructor({ count, onStep, onDone, delay = () => 1400 }) {
    this.count = count;
    this.onStep = onStep;
    this.onDone = onDone;
    this.delay = delay;
    this.i = -1;
    this.playing = false;
    this.timer = null;
    active = this;
  }

  show(i) {
    this.i = Math.max(-1, Math.min(this.count - 1, i));
    this.onStep(this.i);
    if (this.i === this.count - 1) { this.stopTimer(); this.playing = false; this.onDone?.(); }
  }

  play() {
    active = this;
    if (this.i >= this.count - 1) this.i = -1;
    this.playing = true;
    if (reducedMotion() || window.__FAST_PLAYER__) { this.show(this.count - 1); return; }
    this.tick();
  }

  tick() {
    this.stopTimer();
    if (!this.playing) return;
    this.show(this.i + 1);
    if (this.i < this.count - 1) this.timer = setTimeout(() => this.tick(), this.delay(this.i));
  }

  pause() { this.playing = false; this.stopTimer(); }
  toggle() { if (this.playing) this.pause(); else this.play(); }
  next() { this.pause(); this.show(this.i + 1); }
  prev() { this.pause(); this.show(this.i - 1); }
  stopTimer() { clearTimeout(this.timer); this.timer = null; }
  destroy() { this.pause(); if (active === this) active = null; }
}
