"use client";
import { useEffect, useRef, useState } from "react";

const STORE_KEY = "sutraSprint.soundOn";

function playTone(
  ctx: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.18
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(gain, startAt + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [on, setOn] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved != null) setOn(saved === "1");
    } catch {}
  }, []);

  function toggle() {
    setOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  function ctx(): AudioContext | null {
    if (!on || typeof window === "undefined") return null;
    const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext || w.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }

  function correct() {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    playTone(c, 587.33, t, 0.12);
    playTone(c, 783.99, t + 0.09, 0.18);
  }
  function wrong() {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    playTone(c, 196, t, 0.22, "sawtooth", 0.12);
  }
  function click() {
    const c = ctx();
    if (!c) return;
    playTone(c, 880, c.currentTime, 0.05, "square", 0.06);
  }
  function levelUp() {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(c, f, t + i * 0.1, 0.22));
  }
  function stageClear() {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    [392, 523.25, 659.25].forEach((f, i) => playTone(c, f, t + i * 0.11, 0.28));
  }
  function combo(tier: number) {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    const base = [523.25, 659.25, 783.99, 987.77][Math.min(tier, 3)];
    playTone(c, base, t, 0.09, "triangle", 0.14);
    playTone(c, base * 1.5, t + 0.06, 0.14, "triangle", 0.12);
  }
  function hit() {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    playTone(c, 120, t, 0.07, "square", 0.2);
    playTone(c, 1400, t, 0.04, "sawtooth", 0.08);
    playTone(c, 660, t + 0.05, 0.16, "triangle", 0.14);
  }
  function flip() {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    playTone(c, 720, t, 0.05, "sine", 0.08);
    playTone(c, 980, t + 0.03, 0.06, "sine", 0.06);
  }
  function bossFanfare() {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(c, f, t + i * 0.1, 0.3, "triangle", 0.16));
    playTone(c, 196, t, 0.5, "sawtooth", 0.08);
  }

  return { on, toggle, correct, wrong, click, levelUp, stageClear, combo, hit, flip, bossFanfare };
}
