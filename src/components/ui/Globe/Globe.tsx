"use client";

import { useEffect, useRef, type RefObject } from "react";
import styles from "./Globe.module.css";

// 256×128 equirectangular land mask (white = land).
const MAP_SRC = "/home/globe.png";

// ---- Tunables -------------------------------------------------------------
const R = 1; // base sphere radius
const GAP = 0.03; // "air" between the glass and the dot blanket
const RADIUS_JITTER = 0.012; // per-dot radial variation
const DENSITY = 3; // particles per land pixel
const AUTO_SPIN = -0.0004; // idle rotation speed (rad/frame)
const DOT_SIZE = 0.022; // base world size of a dot
const CAM_Z = 3.8; // camera distance — smaller = bigger globe (still fits without crop)
const GLOBE_Y = 0.0; // vertical offset in the scene — centred so it isn't clipped

// Hover: lift + highlight + grow, with a fading trail behind the cursor.
const HOVER_RADIUS = 0.34;
const HOVER_LIFT = 0.12;
const HOVER_SIZE_BOOST = 1.5;
const HOVER_HIGHLIGHT: [number, number, number] = [0.8, 1.0, 0.0]; // brand lime glow
const TRAIL_N = 32;
const TRAIL_DECAY = 0.965;

// Dot colours — mostly cool-white "lights" with a brand-lime minority.
const DOT_MAIN: [number, number, number] = [0.92, 0.96, 1.0];
const DOT_ACCENT: [number, number, number] = [0.8, 1.0, 0.0]; // Electric Lime #CCFF00

// Dark frosted-glass body palette (retheme of the PV reference for a dark bg).
const OCEAN = 0x1e242a; // dark glass body
const LAND = 0x2c3a44; // faint continents seen through the glass
const RIM = 0x9fb1b8; // soft light rim

/**
 * Globe — a dark frosted-glass sphere with a floating particle "blanket" of the
 * world map above it (white lights + a few lime ones). Drag to rotate; hovering
 * lifts/highlights/grows the dots with a lime glow and leaves a rippling trail.
 * Adapted from the PV Link Energy globe, rethemed dark + lime and stripped of
 * the office-marker logic so it works purely as a background. Scroll transforms
 * (shrink / move to centre) are applied to its container by the scene, not here.
 */
export function Globe({
  className = "",
  spinRef,
}: {
  className?: string;
  /** Target angular velocity (rad/frame) from scroll; the globe eases toward it
   *  then bleeds back to the idle spin, so it keeps turning and settles. */
  spinRef?: RefObject<number>;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup = () => {};

    const init = async () => {
      const THREE = await import("three");
      if (disposed || !mountRef.current) return;
      const dpr = Math.min(window.devicePixelRatio, 2);

      let width = mount.clientWidth || 1;
      let height = mount.clientHeight || 1;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);

      // Fit the sphere to the *smaller* axis. The 34° FOV is vertical, so in
      // portrait (aspect < 1) the horizontal view is narrower than the sphere
      // and it gets cropped on the sides — pull the camera back far enough that
      // the globe fits width AND height. Landscape keeps the default CAM_Z.
      const VFOV = (34 * Math.PI) / 180;
      // Radius to keep in frame: the sphere (1) + floating dot blanket + wave/
      // hover displacement, plus margin so nothing clips at the left/right edge.
      const FIT_R = 1.3;
      const fitCamera = () => {
        const aspect = width / height;
        const half = Math.tan(VFOV / 2);
        const distV = FIT_R / half;
        const distH = FIT_R / (half * aspect);
        camera.position.z = Math.max(CAM_Z, distV, distH);
      };
      camera.position.set(0, 0, CAM_Z);
      fitCamera();

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(dpr);
      mount.appendChild(renderer.domElement);

      const group = new THREE.Group();
      group.position.y = GLOBE_Y; // shift the globe lower on screen
      scene.add(group);

      // Sample the land mask (crisp for dots, blurred for the glass tint).
      const img = await new Promise<HTMLImageElement | null>((res) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = MAP_SRC;
      });
      if (disposed || !img) return;

      const MW = 256;
      const MH = 128;
      const cvs = document.createElement("canvas");
      cvs.width = MW;
      cvs.height = MH;
      const cx = cvs.getContext("2d");
      if (!cx) return;
      cx.drawImage(img, 0, 0, MW, MH);
      const data = cx.getImageData(0, 0, MW, MH).data;

      // Heavily-blurred copy for the glass tint → soft diffuse continents.
      const bcvs = document.createElement("canvas");
      bcvs.width = MW;
      bcvs.height = MH;
      const bctx = bcvs.getContext("2d")!;
      const small = document.createElement("canvas");
      small.width = 24;
      small.height = 12;
      const sctx = small.getContext("2d")!;
      sctx.imageSmoothingEnabled = true;
      sctx.drawImage(cvs, 0, 0, 24, 12);
      bctx.imageSmoothingEnabled = true;
      bctx.drawImage(small, 0, 0, MW, MH);

      const mapTex = new THREE.CanvasTexture(bcvs);
      mapTex.minFilter = THREE.LinearFilter;
      mapTex.magFilter = THREE.LinearFilter;
      mapTex.wrapS = THREE.RepeatWrapping;
      mapTex.wrapT = THREE.ClampToEdgeWrapping;

      // ---- Frosted-glass body --------------------------------------------
      const sphereGeo = new THREE.SphereGeometry(R, 96, 96);
      const sphereMat = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: mapTex },
          uOcean: { value: new THREE.Color(OCEAN) },
          uLand: { value: new THREE.Color(LAND) },
          uRim: { value: new THREE.Color(RIM) },
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec3 vN;
          varying vec3 vV;
          varying vec2 vUv;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vN = normalize(mat3(modelMatrix) * normal);
            vV = normalize(cameraPosition - wp.xyz);
            vUv = uv;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform sampler2D uMap;
          uniform vec3 uOcean;
          uniform vec3 uLand;
          uniform vec3 uRim;
          uniform float uTime;
          varying vec3 vN;
          varying vec3 vV;
          varying vec2 vUv;

          float ellipseSpot(vec3 N, vec3 L, float ax, float ay) {
            float ndl = dot(N, L);
            if (ndl <= 0.0) return 0.0;
            vec3 up = abs(L.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
            vec3 T = normalize(cross(up, L));
            vec3 B = cross(L, T);
            float x = dot(N, T);
            float y = dot(N, B);
            float r2 = (x * x) / (ax * ax) + (y * y) / (ay * ay);
            return smoothstep(1.0, 0.0, r2) * ndl;
          }

          void main() {
            vec3 N = normalize(vN);
            float land = texture2D(uMap, vUv).r;
            vec3 col = mix(uOcean, uLand, land * 0.8);

            vec3 L1 = normalize(vec3(-0.20, 0.22, 1.0));
            vec3 L2 = normalize(vec3(0.34 + 0.30 * sin(uTime * 0.13 + 2.0), -0.22 + 0.24 * sin(uTime * 0.17), 0.95));
            vec3 L3 = normalize(vec3(-0.14 + 0.28 * sin(uTime * 0.10 + 3.0), 0.34 + 0.20 * sin(uTime * 0.14 + 1.5), 0.9));
            col += ellipseSpot(N, L1, 1.25, 1.0) * 0.06;
            col += ellipseSpot(N, L2, 0.62 + 0.08 * sin(uTime * 0.15), 0.5) * 0.08;
            col += ellipseSpot(N, L3, 0.4, 0.3 + 0.06 * sin(uTime * 0.19)) * 0.05;

            float facing = clamp(dot(N, normalize(vV)), 0.0, 1.0);
            col = mix(col, uRim, pow(1.0 - facing, 2.0) * 0.55);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      group.add(sphere);

      // ---- Dot blanket ----------------------------------------------------
      const isLand = (xx: number, yy: number) => {
        if (yy < 0 || yy >= MH) return false;
        const wx = ((xx % MW) + MW) % MW;
        return data[(yy * MW + wx) * 4] >= 128;
      };
      const homes: number[] = [];
      const cols: number[] = [];
      const sizes: number[] = [];
      for (let y = 0; y < MH; y++) {
        for (let x = 0; x < MW; x++) {
          if (data[(y * MW + x) * 4] < 128) continue;
          const edge =
            !isLand(x - 1, y) || !isLand(x + 1, y) || !isLand(x, y - 1) || !isLand(x, y + 1);
          const jit = edge ? 0.55 : 1.7;
          for (let d = 0; d < DENSITY; d++) {
            const u = (x + 0.5 + (Math.random() - 0.5) * jit) / MW;
            const v = (y + 0.5 + (Math.random() - 0.5) * jit) / MH;
            const phi = u * Math.PI * 2;
            const theta = v * Math.PI;
            const sinT = Math.sin(theta);
            const rr = R + GAP + (Math.random() - 0.5) * RADIUS_JITTER;
            homes.push(
              -Math.cos(phi) * sinT * rr,
              Math.cos(theta) * rr,
              Math.sin(phi) * sinT * rr,
            );
            const t = Math.random() * Math.random() * 0.9;
            cols.push(
              DOT_MAIN[0] + (DOT_ACCENT[0] - DOT_MAIN[0]) * t,
              DOT_MAIN[1] + (DOT_ACCENT[1] - DOT_MAIN[1]) * t,
              DOT_MAIN[2] + (DOT_ACCENT[2] - DOT_MAIN[2]) * t,
            );
            sizes.push(edge ? 0.85 + Math.random() * 0.4 : 0.55 + Math.random() * 1.15);
          }
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(homes), 3));
      geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(cols), 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(sizes), 1));

      const trail = Array.from({ length: TRAIL_N }, () => new THREE.Vector4(999, 999, 999, 0));
      let writeIdx = 0;

      const pointsMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTrail: { value: trail },
          uCursorNow: { value: new THREE.Vector4(999, 999, 999, 0) },
          uTime: { value: 0 },
          uInfluence: { value: HOVER_RADIUS },
          uLift: { value: HOVER_LIFT },
          uSizeBoost: { value: HOVER_SIZE_BOOST },
          uHighlight: { value: new THREE.Color(...HOVER_HIGHLIGHT) },
          uSize: { value: DOT_SIZE },
          uSizeScale: { value: height * dpr * 0.5 },
        },
        vertexShader: `
          attribute vec3 color;
          attribute float aSize;
          uniform vec4 uTrail[${TRAIL_N}];
          uniform vec4 uCursorNow;
          uniform float uTime;
          uniform float uInfluence;
          uniform float uLift;
          uniform float uSizeBoost;
          uniform vec3 uHighlight;
          uniform float uSize;
          uniform float uSizeScale;
          varying vec3 vColor;
          varying float vFacing;
          varying float vGlow;
          void main() {
            vec3 p = position;
            vec3 nrm = normalize(p);
            float f = 0.0;
            for (int i = 0; i < ${TRAIL_N}; i++) {
              vec4 tr = uTrail[i];
              float infl = 1.0 - smoothstep(0.0, uInfluence, distance(p, tr.xyz));
              f = max(f, infl * tr.w);
            }
            f = clamp(f, 0.0, 1.0);
            float w = sin(uTime * 0.9 + p.x * 6.0 + p.y * 3.0) * 0.5
                    + sin(uTime * 1.4 + p.z * 7.0 - p.y * 4.0) * 0.5;
            p += nrm * (w * (0.008 + f * 0.022));
            float dcn = distance(p, uCursorNow.xyz);
            float ripple = sin(dcn * 12.0 - uTime * 2.8) * exp(-dcn * 3.2) * uCursorNow.w;
            p += nrm * (uLift * f + ripple * 0.07);
            vColor = mix(color, uHighlight, f);
            vGlow = f;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vec3 viewNrm = normalize((modelViewMatrix * vec4(nrm, 0.0)).xyz);
            vFacing = dot(viewNrm, normalize(-mv.xyz));
            float size = uSize * aSize * (1.0 + uSizeBoost * f);
            gl_PointSize = size * uSizeScale / -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vFacing;
          varying float vGlow;
          void main() {
            float d = distance(gl_PointCoord, vec2(0.5));
            float halo = smoothstep(0.5, 0.0, d);
            float core = smoothstep(0.24, 0.0, d);
            float a = (halo * 0.5 + core * 0.55) * (1.0 + vGlow * 1.8) * smoothstep(-0.05, 0.45, vFacing);
            if (a < 0.01) discard;
            gl_FragColor = vec4(vColor, a);
          }
        `,
      });
      const points = new THREE.Points(geo, pointsMat);
      group.add(points);

      const pick = new THREE.Mesh(
        new THREE.SphereGeometry(R + GAP, 24, 24),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      group.add(pick);

      // ---- Interaction ----------------------------------------------------
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2(-10, -10);
      const cursorLocal = new THREE.Vector3(999, 999, 999);
      const simWorld = new THREE.Vector3();
      let hovering = false;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let rotY = -1.9; // start with Europe / Africa facing the viewer
      let rotX = 0.14;
      let velY = 0;
      let scrollSpin = 0; // eased scroll-driven angular velocity
      const autoSpin = window.matchMedia("(max-width: 1024px)").matches
        ? AUTO_SPIN * 2.2
        : AUTO_SPIN;

      const onPointerMove = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        hovering = true;
        if (dragging) {
          velY = (e.clientX - lastX) * 0.005;
          rotY += velY;
          rotX = Math.max(-0.6, Math.min(0.6, rotX + (e.clientY - lastY) * 0.005));
          lastX = e.clientX;
          lastY = e.clientY;
        }
      };
      const onPointerDown = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        renderer.domElement.style.cursor = "grabbing";
      };
      const onPointerUp = () => {
        dragging = false;
        renderer.domElement.style.cursor = "grab";
      };
      const onPointerLeave = () => {
        hovering = false;
      };
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointerleave", onPointerLeave);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);

      const onResize = () => {
        width = mount.clientWidth || 1;
        height = mount.clientHeight || 1;
        camera.aspect = width / height;
        fitCamera();
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        pointsMat.uniforms.uSizeScale.value = height * dpr * 0.5;
      };
      window.addEventListener("resize", onResize);

      let visible = true;
      const vio = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
        threshold: 0,
      });
      vio.observe(mount);

      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!visible) return;

        pointsMat.uniforms.uTime.value += 0.016;
        sphereMat.uniforms.uTime.value += 0.016;

        // Scroll injects angular velocity; ease toward it, then bleed it off so
        // the planet keeps spinning a moment and settles back to the idle speed.
        const extTarget = spinRef ? spinRef.current || 0 : 0;
        scrollSpin += (extTarget - scrollSpin) * 0.12;
        if (spinRef) spinRef.current = extTarget * 0.9;

        if (!dragging) {
          if (Math.abs(velY) > 0.0004) {
            rotY += velY;
            velY *= 0.95;
          } else {
            velY = 0;
            rotY += autoSpin;
          }
        }
        rotY += scrollSpin;
        group.rotation.y = rotY;
        group.rotation.x += (rotX - group.rotation.x) * 0.1;

        let hit = false;
        if (hovering) {
          raycaster.setFromCamera(ndc, camera);
          const h = raycaster.intersectObject(pick, false)[0];
          if (h) {
            // Real hover: snap the effect straight to the cursor point.
            cursorLocal.copy(group.worldToLocal(h.point.clone()));
            hit = true;
          }
        }

        if (!hit) {
          // Simulated hover: a point drifting across the front-facing hemisphere,
          // driving the exact same lift/glow/trail as a real cursor.
          const tt = pointsMat.uniforms.uTime.value;
          const wx = Math.sin(tt * 0.18) * 0.5 + Math.sin(tt * 0.083 + 1.0) * 0.18;
          const wy = Math.sin(tt * 0.13 + 2.1) * 0.42;
          const wz = Math.sqrt(Math.max(0.04, 1 - wx * wx - wy * wy));
          simWorld.set(wx, wy, wz).multiplyScalar(R + GAP);
          group.updateMatrixWorld();
          cursorLocal.copy(group.worldToLocal(simWorld.clone()));
          hit = true;
        }

        for (let i = 0; i < TRAIL_N; i++) trail[i].w *= TRAIL_DECAY;
        const now = pointsMat.uniforms.uCursorNow.value as InstanceType<typeof THREE.Vector4>;
        trail[writeIdx].set(cursorLocal.x, cursorLocal.y, cursorLocal.z, 1);
        writeIdx = (writeIdx + 1) % TRAIL_N;
        now.set(cursorLocal.x, cursorLocal.y, cursorLocal.z, 1);

        renderer.render(scene, camera);
      };
      loop();
      renderer.domElement.style.cursor = "grab";

      cleanup = () => {
        cancelAnimationFrame(raf);
        vio.disconnect();
        window.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        geo.dispose();
        pointsMat.dispose();
        mapTex.dispose();
        sphereGeo.dispose();
        sphereMat.dispose();
        pick.geometry.dispose();
        (pick.material as InstanceType<typeof THREE.MeshBasicMaterial>).dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    };

    // Defer three.js until the globe nears the viewport.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          init();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(mount);

    return () => {
      disposed = true;
      io.disconnect();
      cleanup();
    };
  }, [spinRef]);

  return (
    <div
      ref={mountRef}
      className={`${styles.globe3d} ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
