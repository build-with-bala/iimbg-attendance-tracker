"use client";
import { useEffect, useRef } from "react";

const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform float u_motion; uniform vec2 u_ptr;
uniform vec3 u_base; uniform vec3 u_line;
out vec4 fragColor;
float line(float c){ float g = abs(fract(c-0.5)-0.5)/fwidth(c); return 1.0-min(g,1.0); }
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5*u_res)/u_res.y;
  p.x += u_ptr.x*0.05;
  vec3 col = u_base;
  float horizon = 0.20 + u_ptr.y*0.02;
  if (p.y < horizon){
    float z = 1.0/(horizon - p.y);
    float x = p.x*z;
    float t = u_time*u_motion;
    float g = max(line(x), line(z*0.5 + t));
    float fade = exp(-z*0.06);
    col = mix(u_base, u_line, g*fade*0.55);
    col += (u_line-u_base)*0.03*exp(-abs(p.y-horizon)*16.0);
  }
  float v = smoothstep(1.4,0.1,length(p));
  col = mix(u_base, col, 0.55 + 0.45*v);
  fragColor = vec4(col,1.0);
}`;
const VERT = `#version 300 es
precision highp float;
const vec2 pos[3] = vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
void main(){ gl_Position = vec4(pos[gl_VertexID],0.,1.); }`;

function rgb(str: string): [number, number, number] {
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const ctx = c.getContext("2d")!; ctx.fillStyle = str.trim() || "#000"; ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

export function GridHero() {
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
    const uRes = U("u_res"), uTime = U("u_time"), uMotion = U("u_motion"), uPtr = U("u_ptr"), uBase = U("u_base"), uLine = U("u_line");
    gl.uniform1f(uMotion, reduce ? 0 : 0.12);

    const applyTheme = () => {
      const cs = getComputedStyle(document.documentElement);
      const base = rgb(cs.getPropertyValue("--bg"));
      const raw = cs.getPropertyValue("--grid-line").trim(); // "r,g,b"
      const parts = raw.split(",").map((n) => parseFloat(n) / 255);
      const line = parts.length === 3 ? (parts as [number, number, number]) : ([0.48, 0.55, 1] as [number, number, number]);
      gl.uniform3f(uBase, base[0], base[1], base[2]);
      gl.uniform3f(uLine, line[0], line[1], line[2]);
    };
    applyTheme();
    const onTheme = () => applyTheme();
    window.addEventListener("themechange", onTheme);

    let ptr = [0, 0], tgt = [0, 0];
    const onMove = (e: PointerEvent) => { tgt = [(e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1]; };
    window.addEventListener("pointermove", onMove);
    const resize = () => { const dpr = Math.min(devicePixelRatio || 1, 1.5); const w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr; if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); } gl.uniform2f(uRes, w, h); };
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
    let raf = 0, start = performance.now(), running = true;
    const frame = (now: number) => { if (!running) return; ptr[0] += (tgt[0] - ptr[0]) * 0.05; ptr[1] += (tgt[1] - ptr[1]) * 0.05; gl.uniform2f(uPtr, ptr[0], ptr[1]); gl.uniform1f(uTime, (now - start) / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3); if (!reduce) raf = requestAnimationFrame(frame); };
    raf = requestAnimationFrame(frame);
    const onVis = () => { running = !document.hidden; if (running && !reduce) raf = requestAnimationFrame(frame); };
    document.addEventListener("visibilitychange", onVis);
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); window.removeEventListener("themechange", onTheme); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return <canvas ref={ref} className="grid-hero" aria-hidden="true" />;
}
