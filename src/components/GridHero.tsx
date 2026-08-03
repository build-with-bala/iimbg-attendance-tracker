"use client";
import { useEffect, useRef } from "react";

// Custom GLSL: an infinite perspective grid (the register, receding to a horizon)
// with a slow drift and indigo glow. WebGL2; falls back to CSS gradient if absent.
const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform float u_motion; uniform vec2 u_ptr;
out vec4 fragColor;
float line(float c){ float g = abs(fract(c-0.5)-0.5)/fwidth(c); return 1.0-min(g,1.0); }
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5*u_res)/u_res.y;
  p.x += (u_ptr.x)*0.06; // gentle parallax toward cursor
  vec3 base = vec3(0.031,0.038,0.055);
  vec3 ind  = vec3(0.36,0.42,0.85);
  vec3 col  = base;
  float horizon = 0.18 + u_ptr.y*0.02;
  if (p.y < horizon){
    float z = 1.0/(horizon - p.y);
    float x = p.x*z;
    float t = u_time*u_motion;
    float g = max(line(x), line(z*0.5 + t));
    float fade = exp(-z*0.05);
    col = mix(base, base + ind*0.95, g*fade);
    col += ind*0.05*exp(-abs(p.y-horizon)*16.0);
  } else {
    float glow = exp(-(p.y-horizon)*3.2);
    col = base + vec3(0.05,0.07,0.17)*glow*0.55;
  }
  float v = smoothstep(1.35,0.15,length(p));
  col *= 0.55 + 0.45*v;
  fragColor = vec4(col,1.0);
}`;
const VERT = `#version 300 es
precision highp float;
const vec2 pos[3] = vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
void main(){ gl_Position = vec4(pos[gl_VertexID],0.,1.); }`;

export function GridHero() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!gl) return; // CSS fallback shows through
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMotion = gl.getUniformLocation(prog, "u_motion");
    const uPtr = gl.getUniformLocation(prog, "u_ptr");
    gl.uniform1f(uMotion, reduce ? 0 : 0.18);

    let ptr = [0, 0], tgt = [0, 0];
    const onMove = (e: PointerEvent) => { tgt = [(e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1]; };
    window.addEventListener("pointermove", onMove);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(uRes, w, h);
    };
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

    let raf = 0, start = performance.now(), running = true;
    const frame = (now: number) => {
      if (!running) return;
      ptr[0] += (tgt[0] - ptr[0]) * 0.05; ptr[1] += (tgt[1] - ptr[1]) * 0.05;
      gl.uniform2f(uPtr, ptr[0], ptr[1]);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => { running = !document.hidden; if (running && !reduce) raf = requestAnimationFrame(frame); };
    document.addEventListener("visibilitychange", onVis);

    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return <canvas ref={ref} className="grid-hero" aria-hidden="true" />;
}
