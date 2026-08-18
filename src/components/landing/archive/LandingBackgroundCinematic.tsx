"use client";

import { useEffect, useRef } from "react";

/**
 * Spatial ambient field — particles + slow gradients.
 * Pauses when prefers-reduced-motion.
 */
export function LandingBackgroundCinematic() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;

    type P = { x: number; y: number; z: number; vx: number; vy: number };
    let particles: P[] = [];

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = reduce ? 24 : Math.min(90, Math.floor((w * h) / 18000));
      particles = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: 0.3 + Math.random() * 0.7,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.12,
      }));
    }

    let t = 0;
    function frame() {
      t += 0.004;
      ctx!.clearRect(0, 0, w, h);

      // soft nebula
      const g1 = ctx!.createRadialGradient(
        w * (0.25 + Math.sin(t) * 0.05),
        h * 0.2,
        0,
        w * 0.3,
        h * 0.3,
        w * 0.55,
      );
      g1.addColorStop(0, "rgba(240,185,11,0.07)");
      g1.addColorStop(0.45, "rgba(56,189,248,0.04)");
      g1.addColorStop(1, "transparent");
      ctx!.fillStyle = g1;
      ctx!.fillRect(0, 0, w, h);

      const g2 = ctx!.createRadialGradient(
        w * (0.75 + Math.cos(t * 0.8) * 0.04),
        h * 0.75,
        0,
        w * 0.7,
        h * 0.7,
        w * 0.5,
      );
      g2.addColorStop(0, "rgba(168,85,247,0.06)");
      g2.addColorStop(1, "transparent");
      ctx!.fillStyle = g2;
      ctx!.fillRect(0, 0, w, h);

      if (!reduce) {
        for (const p of particles) {
          p.x += p.vx * p.z;
          p.y += p.vy * p.z;
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;
          const r = 0.6 + p.z * 1.4;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255,255,255,${0.12 + p.z * 0.35})`;
          ctx!.fill();
        }
        // faint links
        ctx!.strokeStyle = "rgba(240,185,11,0.04)";
        ctx!.lineWidth = 1;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i];
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d = Math.hypot(dx, dy);
            if (d < 120) {
              ctx!.globalAlpha = (1 - d / 120) * 0.35;
              ctx!.beginPath();
              ctx!.moveTo(a.x, a.y);
              ctx!.lineTo(b.x, b.y);
              ctx!.stroke();
            }
          }
        }
        ctx!.globalAlpha = 1;
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[#05070A]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 40%, black 20%, transparent 75%)",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#05070A] to-transparent" />
    </div>
  );
}
