"use client";
import { useEffect, useRef } from "react";

// Subtle 3D hover-tilt for any descendant with class "tilt". Delegated, so it
// works with server-rendered content and respects reduced-motion.
export function Tilt({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return; // skip on touch
    const el = root.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const card = (e.target as HTMLElement)?.closest(".tilt") as HTMLElement | null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-py * 3).toFixed(2)}deg) rotateY(${(px * 3).toFixed(2)}deg) translateZ(0)`;
      card.style.transition = "transform .05s";
    };
    const onLeave = (e: MouseEvent) => {
      const card = (e.target as HTMLElement)?.closest(".tilt") as HTMLElement | null;
      if (!card) return;
      card.style.transform = "";
      card.style.transition = "transform .35s ease";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseout", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseout", onLeave); };
  }, []);
  return <div ref={root}>{children}</div>;
}
