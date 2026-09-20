"use client";
import { useEffect, useRef } from "react";

const CONFETTI_COLORS = ["#58CC02", "#1CB0F6", "#FFC800", "#FF4B4B", "#A560FF", "#FF9A2E"];

type Particle = {
  x: number; y: number; vx: number; vy: number; g: number;
  size: number; rot: number; vr: number; color: string; life: number;
};

export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const running = useRef(false);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function tick() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    particles.current.forEach((p) => {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life--;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    particles.current = particles.current.filter((p) => p.life > 0 && p.y < c.height + 40);
    if (particles.current.length) {
      requestAnimationFrame(tick);
    } else {
      running.current = false;
      ctx.clearRect(0, 0, c.width, c.height);
    }
  }

  function burst(x: number, y: number, n = 60) {
    if (reduceMotion.current) return;
    for (let i = 0; i < n; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 9,
        vy: Math.random() * -9 - 3,
        g: 0.28,
        size: 4 + Math.random() * 4,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 14,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        life: 70 + Math.random() * 30,
      });
    }
    if (!running.current) {
      running.current = true;
      requestAnimationFrame(tick);
    }
  }

  function burstFromEl(el: HTMLElement | null, n = 60) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, n);
  }

  function burstCenter(n = 90, atTop = 0.35) {
    burst(window.innerWidth / 2, window.innerHeight * atTop, n);
  }

  return { canvasRef, burst, burstFromEl, burstCenter };
}
