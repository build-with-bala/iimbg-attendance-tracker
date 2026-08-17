"use client";
import { useEffect, useRef } from "react";

// Full-page GLSL backdrop the frosted panels blur against: a slow aurora in the
// app's own semantic hues over the signature horizon grid. `hero` (landing) runs
// the grid at full strength; `ambient` (app pages) keeps both as a low hum.
const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform float u_motion; uniform vec2 u_ptr;
uniform float u_grid; uniform float u_alpha; uniform float u_hor;
uniform vec3 u_base; uniform vec3 u_line; uniform vec3 u_a1; uniform vec3 u_a2; uniform vec3 u_a3;
out vec4 fragColor;
float line(float c){ float g = abs(fract(c-0.5)-0.5)/fwidth(c); return 1.0-min(g,1.0); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float blob(vec2 p, vec2 c, float r){ float d = length(p-c); return exp(-d*d/(r*r)); }
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5*u_res)/u_res.y;
  p.x += u_ptr.x*0.04; p.y -= u_ptr.y*0.02;
  float t = u_time*u_motion;
  vec3 col = u_base;
  col = mix(col, u_a1, blob(p, vec2(-0.55+0.12*sin(t*0.21),  0.30+0.08*cos(t*0.17)), 0.55)*u_alpha);
  col = mix(col, u_a2, blob(p, vec2( 0.62+0.14*cos(t*0.13),  0.30+0.10*sin(t*0.19)), 0.60)*u_alpha);
  col = mix(col, u_a3, blob(p, vec2( 0.05+0.20*sin(t*0.11), -0.04+0.07*cos(t*0.23)), 0.50)*u_alpha*0.8);
  float horizon = u_hor + u_ptr.y*0.015;
  if (p.y < horizon){
    float z = 1.0/(horizon - p.y);
    float x = p.x*z;
    float g = max(line(x), line(z*0.5 + t*0.9));
    float fade = exp(-z*0.065);
    col = mix(col, u_line, g*fade*u_grid);
    col += (u_line-u_base)*0.03*exp(-abs(p.y-horizon)*15.0)*min(u_grid*1.6, 1.0);
  }
  float v = smoothstep(1.55, 0.2, length(p));
  col = mix(u_base, col, 0.45 + 0.55*v);
  col += (hash(gl_FragCoord.xy) - 0.5)*0.012;
  fragColor = vec4(col, 1.0);
}`;
const VERT = `#version 300 es
precision highp float;
const vec2 pos[3] = vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
void main(){ gl_Position = vec4(pos[gl_VertexID],0.,1.); }`;

function cssRgb(str: string): [number, number, number] {
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const ctx = c.getContext("2d")!; ctx.fillStyle = str.trim() || "#000"; ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}
function triplet(raw: string, fallback: [number, number, number]): [number, number, number] {
  const parts = raw.split(",").map((n) => parseFloat(n) / 255);
  return parts.length === 3 && parts.every((n) => !isNaN(n)) ? (parts as [number, number, number]) : fallback;
}

export function Backdrop({ variant = "ambient" }: { variant?: "hero" | "ambient" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!gl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sh = (t: number, s: string) => { const x = gl.createShader(t)!; gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = U("u_res"), uTime = U("u_time"), uMotion = U("u_motion"), uPtr = U("u_ptr"),
      uGrid = U("u_grid"), uAlpha = U("u_alpha"), uHor = U("u_hor"),
      uBase = U("u_base"), uLine = U("u_line"), uA1 = U("u_a1"), uA2 = U("u_a2"), uA3 = U("u_a3");
    gl.uniform1f(uMotion, reduce ? 0 : 0.12);
    gl.uniform1f(uGrid, variant === "hero" ? 0.5 : 0.16);
    gl.uniform1f(uHor, variant === "hero" ? 0.2 : -0.28);

    const applyTheme = () => {
      const cs = getComputedStyle(document.documentElement);
      const v = (n: string) => cs.getPropertyValue(n).trim();
      const base = cssRgb(v("--bg"));
      const lineC = triplet(v("--grid-line"), [0.5, 0.51, 1]);
      const a1 = triplet(v("--aur-1"), [0.42, 0.38, 0.94]);
      const a2 = triplet(v("--aur-2"), [0.18, 0.83, 0.63]);
      const a3 = triplet(v("--aur-3"), [0.94, 0.57, 0.43]);
      gl.uniform3f(uBase, base[0], base[1], base[2]);
      gl.uniform3f(uLine, lineC[0], lineC[1], lineC[2]);
      gl.uniform3f(uA1, a1[0], a1[1], a1[2]);
      gl.uniform3f(uA2, a2[0], a2[1], a2[2]);
      gl.uniform3f(uA3, a3[0], a3[1], a3[2]);
      gl.uniform1f(uAlpha, parseFloat(v("--aur-alpha")) || 0.2);
    };
    applyTheme();
    const onTheme = () => { applyTheme(); if (reduce) gl.drawArrays(gl.TRIANGLES, 0, 3); };
    window.addEventListener("themechange", onTheme);

    let ptr = [0, 0], tgt = [0, 0];
    const onMove = (e: PointerEvent) => { tgt = [(e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1]; };
    window.addEventListener("pointermove", onMove);
    const resize = () => { const dpr = Math.min(devicePixelRatio || 1, 1.25); const w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr; if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); } gl.uniform2f(uRes, w, h); };
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
    let raf = 0, start = performance.now(), running = true;
    const frame = (now: number) => { if (!running) return; ptr[0] += (tgt[0] - ptr[0]) * 0.05; ptr[1] += (tgt[1] - ptr[1]) * 0.05; gl.uniform2f(uPtr, ptr[0], ptr[1]); gl.uniform1f(uTime, (now - start) / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3); if (!reduce) raf = requestAnimationFrame(frame); };
    raf = requestAnimationFrame(frame);
    const onVis = () => { running = !document.hidden; if (running && !reduce) raf = requestAnimationFrame(frame); };
    document.addEventListener("visibilitychange", onVis);
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); window.removeEventListener("themechange", onTheme); document.removeEventListener("visibilitychange", onVis); };
  }, [variant]);
  return <canvas ref={ref} className="bgfx" aria-hidden="true" />;
}
