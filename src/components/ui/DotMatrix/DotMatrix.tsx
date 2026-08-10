"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import styles from "./DotMatrix.module.css";

type Props = {
  className?: string;
  color?: string; // hex, e.g. "#5a656c"
  dotSize?: number; // dot diameter in px
  spacing?: number; // grid cell size in px (bigger = sparser)
  opacity?: number; // base opacity (0..1)
  delay?: number; // seconds before the radial reveal starts
  speed?: number; // radial reveal speed (bigger = slower spread)
};

const MOBILE_QUERY = "(max-width: 1024px)";

function subscribeToViewport(callback: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
    : [0.35, 0.4, 0.44];
}

/**
 * DotMatrix — a WebGL2 grid of flickering dots that reveals radially outward
 * from the centre (ported from the nrmlss reference). Additive-blended so it
 * glows softly over a dark background. Reusable as a section backdrop.
 */
export function DotMatrix({
  className = "",
  color = "#5a656c",
  dotSize = 2.2,
  spacing = 22,
  opacity = 0.42,
  delay = 0.2,
  speed = 0.008,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // null until measured. On mobile / small tablets we skip the WebGL grid and
  // paint a lightweight CSS dot background instead (one fewer WebGL context).
  const mobile = useSyncExternalStore(subscribeToViewport, getMobileSnapshot, () => null);

  useEffect(() => {
    if (mobile !== false) return; // only run WebGL once confirmed desktop
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: true,
    });
    if (!gl) return;

    const [r, g, b] = hexToRgb(color);
    // 6 opacity layers (subtle → full) like the reference.
    const opacities = [0.4, 0.4, 0.65, 0.65, 0.95, 1].map((o) => o * opacity);

    const vert = `#version 300 es
      precision highp float;
      in vec2 coordinates;
      uniform vec2 u_resolution;
      out vec2 fragCoord;
      void main() {
        gl_Position = vec4(coordinates, 0.0, 1.0);
        fragCoord = (coordinates + 1.0) * 0.5 * u_resolution;
        fragCoord.y = u_resolution.y - fragCoord.y;
      }`;

    const frag = `#version 300 es
      precision highp float;
      in vec2 fragCoord;
      uniform float u_time;
      uniform float u_opacities[6];
      uniform vec3 u_color;
      uniform float u_total_size;
      uniform float u_dot_size;
      uniform vec2 u_resolution;
      out vec4 fragColor;
      const float PHI = 1.61803398874989484820459;
      float random(vec2 xy) { return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x); }
      void main() {
        vec2 st = fragCoord.xy;
        st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
        float opacity = step(0.0, st.x) * step(0.0, st.y);
        vec2 st2 = vec2(floor(st.x / u_total_size), floor(st.y / u_total_size));
        float show_offset = random(st2);
        float rand = random(st2 * floor((u_time / 5.0) + show_offset + 5.0) + 1.0);
        opacity *= u_opacities[int(rand * 6.0)];
        opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
        opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));
        // Radial intro reveal from centre.
        float intro = distance(u_resolution / 2.0 / u_total_size, st2) * ${speed.toFixed(4)} + random(st2) * 0.15;
        opacity *= step(intro, u_time - ${delay.toFixed(2)});
        opacity *= clamp((1.0 - step(intro + 0.1, u_time - ${delay.toFixed(2)})) * 1.25, 1.0, 1.25);
        fragColor = vec4(u_color, opacity);
        fragColor.rgb *= fragColor.a;
      }`;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, vert);
    const fs = compile(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "coordinates");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uTime = gl.getUniformLocation(prog, "u_time");
    gl.uniform1fv(gl.getUniformLocation(prog, "u_opacities"), opacities);
    gl.uniform3f(gl.getUniformLocation(prog, "u_color"), r, g, b);
    gl.uniform1f(gl.getUniformLocation(prog, "u_total_size"), spacing);
    gl.uniform1f(gl.getUniformLocation(prog, "u_dot_size"), dotSize);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w / dpr, h / dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let start = 0;
    const render = (t: number) => {
      if (!start) start = t;
      const time = reduce ? 12 : (t - start) / 1000; // reduced motion → fully revealed, static
      gl.uniform1f(uTime, time);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduce) raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, [mobile, color, dotSize, spacing, opacity, delay, speed]);

  // Mobile / small tablets → CSS dot grid (same colour, spacing, opacity), with
  // a soft radial fade to echo the WebGL version's centre reveal.
  if (mobile) {
    const r = dotSize / 2;
    const [cr, cg, cb] = hexToRgb(color).map((v) => Math.round(v * 255));
    const rgba = (a: number) => `rgba(${cr}, ${cg}, ${cb}, ${a})`;
    return (
      <div
        aria-hidden="true"
        className={`${styles.dots} ${styles.cssDots} ${className}`.trim()}
        style={{
          // Two layers at different opacities → a softer, less uniform grid.
          backgroundImage: `radial-gradient(${rgba(0.9)} ${r}px, transparent ${r + 0.6}px), radial-gradient(${rgba(0.4)} ${r * 0.8}px, transparent ${r * 0.8 + 0.6}px)`,
          backgroundSize: `${spacing}px ${spacing}px, ${spacing}px ${spacing}px`,
          backgroundPosition: `0 0, ${spacing / 2}px ${spacing / 2}px`,
          // dialled down so it's more subtle than the WebGL version
          opacity: opacity * 0.6,
        }}
      />
    );
  }

  return <canvas ref={canvasRef} aria-hidden="true" className={`${styles.dots} ${className}`.trim()} />;
}
