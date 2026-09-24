import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { loadHead, createRenderer, studioEnvironment, runLoop, damp, prefersReducedMotion } from "./three-utils.js";

// Visual layers the head can show. Each preset is a target the uniforms ease toward,
// so switching presets animates smoothly from one analysis stage to the next.
export const FACE_PRESETS = {
  hero: { scan: 1, points: 0.3, wire: 0, heat: 0, dim: 0.05, marks: 1 },
  capture: { scan: 1, points: 0.12, wire: 0, heat: 0, dim: 0, marks: 0 },
  landmarks: { scan: 0.2, points: 1, wire: 0, heat: 0, dim: 0.6, marks: 1 },
  mesh: { scan: 0, points: 0.35, wire: 1, heat: 0, dim: 0.7, marks: 0.3 },
  heat: { scan: 0, points: 0, wire: 0.12, heat: 1, dim: 0.2, marks: 0 },
  result: { scan: 0.35, points: 0.12, wire: 0, heat: 0.4, dim: 0, marks: 1 },
};

// Face-space coordinates (x, y) on the normalized head; the component ray-casts them onto the surface.
export const FACE_POINTS = {
  forehead: [0, 0.7],
  browL: [-0.16, 0.55],
  browR: [0.16, 0.55],
  eyeL: [-0.15, 0.46],
  eyeR: [0.15, 0.46],
  underEyeL: [-0.15, 0.38],
  underEyeR: [0.15, 0.38],
  noseBridge: [0, 0.47],
  noseTip: [0, 0.31],
  nostrilL: [-0.06, 0.24],
  nostrilR: [0.06, 0.24],
  cheekL: [-0.22, 0.28],
  cheekR: [0.22, 0.28],
  mouthL: [-0.1, 0.155],
  mouthR: [0.1, 0.155],
  lipTop: [0, 0.18],
  lipBottom: [0, 0.12],
  chin: [0, 0.03],
  jawL: [-0.19, 0.08],
  jawR: [0.19, 0.08],
  templeL: [-0.27, 0.6],
  templeR: [0.27, 0.6],
};

const CYAN = new THREE.Color("#5ee7ff");

const patchSkin = (material, uniforms) => {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vObj;
        uniform float uTime, uScanY, uScan, uHeat, uDim;
        uniform vec3 uCyan;
        float gauss(vec2 p, vec2 c, vec2 r) { vec2 d = (p - c) / r; return exp(-dot(d, d)); }`
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        vec3 col = gl_FragColor.rgb * (1.0 - uDim * 0.82);
        vec2 p = vObj.xy;
        float front = smoothstep(0.1, 0.4, vObj.z);

        // Concern heat-map: T-zone oil, cheek redness, under-eye darkness, chin blemishes.
        float oil = gauss(p, vec2(0.0, 0.69), vec2(0.27, 0.075)) + gauss(p, vec2(0.0, 0.36), vec2(0.06, 0.14));
        float red = gauss(p, vec2(-0.22, 0.27), vec2(0.085, 0.08)) + gauss(p, vec2(0.22, 0.27), vec2(0.085, 0.08));
        float dark = gauss(p, vec2(-0.15, 0.365), vec2(0.075, 0.026)) + gauss(p, vec2(0.15, 0.365), vec2(0.075, 0.026));
        float spot = gauss(p, vec2(0.0, 0.03), vec2(0.085, 0.045)) + gauss(p, vec2(-0.2, 0.62), vec2(0.035, 0.03)) + gauss(p, vec2(0.16, 0.19), vec2(0.03, 0.03));
        vec3 heat = vec3(1.0, 0.72, 0.18) * oil + vec3(1.0, 0.23, 0.33) * red + vec3(0.58, 0.4, 1.0) * dark + vec3(0.2, 1.0, 0.75) * spot;
        float amt = clamp(oil + red + dark + spot, 0.0, 1.0);
        float pulse = 0.82 + 0.18 * sin(uTime * 2.4);
        float contour = smoothstep(0.08, 0.0, abs(fract(amt * 5.0 - uTime * 0.25) - 0.5) - 0.38) * step(0.12, amt);
        col = mix(col, col * 0.35 + heat * 0.9 * pulse, uHeat * front * smoothstep(0.05, 0.5, amt));
        col += heat * contour * 0.35 * uHeat * front;

        // Scan beam sweeping down, leaving a fading measurement grid behind it.
        float band = exp(-pow((vObj.y - uScanY) / 0.018, 2.0));
        float halo = exp(-pow((vObj.y - uScanY) / 0.09, 2.0));
        vec2 gp = vObj.xy * 34.0;
        vec2 gw = abs(fract(gp - 0.5) - 0.5) / fwidth(gp);
        float grid = 1.0 - min(min(gw.x, gw.y), 1.0);
        float trail = smoothstep(uScanY, uScanY + 0.02, vObj.y) * exp(-(vObj.y - uScanY) * 7.0);
        col += uCyan * (band * 1.4 + halo * 0.14 + grid * trail * 0.22) * uScan * front;

        float neck = smoothstep(-0.62, -0.18, vObj.y) * (1.0 - smoothstep(0.45, 0.78, abs(vObj.x)));
        gl_FragColor = vec4(col * neck, gl_FragColor.a * neck);`
      );
  };
};

const patchExtra = (material, uniforms) => {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vObjY;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjY = position.y;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vObjY;\nuniform float uDim;")
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        float neck = smoothstep(-0.62, -0.18, vObjY);
        gl_FragColor = vec4(gl_FragColor.rgb * (1.0 - uDim * 0.82) * neck, gl_FragColor.a * neck);`
      );
  };
};

const FaceScan3D = ({ preset = "hero", callouts = [], className = "", autoRotate = true, onReady }) => {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const calloutRefs = useRef([]);
  const presetRef = useRef(FACE_PRESETS[preset] || FACE_PRESETS.hero);
  const calloutsRef = useRef(callouts);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  presetRef.current = FACE_PRESETS[preset] || FACE_PRESETS.hero;
  calloutsRef.current = callouts;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    let disposed = false;
    let stop = () => {};
    let renderer;
    const cleanups = [];

    try {
      renderer = createRenderer(canvas);
    } catch {
      setFailed(true);
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.environment = studioEnvironment(renderer);
    scene.environmentIntensity = 0.35;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0.34, 3.9);
    camera.lookAt(0, 0.3, 0);

    // Portrait lighting: warm key, soft fill, two cool rims that read as "scanner" light.
    scene.add(new THREE.HemisphereLight("#dfe8ff", "#1a1020", 0.5));
    const key = new THREE.DirectionalLight("#fff1e4", 2.6);
    key.position.set(1.6, 1.8, 2.4);
    const fill = new THREE.DirectionalLight("#b9cbff", 0.55);
    fill.position.set(-2.2, 0.4, 1.6);
    const rimL = new THREE.DirectionalLight("#4fd8ff", 2.2);
    rimL.position.set(-2.5, 1.2, -2.2);
    const rimR = new THREE.DirectionalLight("#7b8bff", 1.8);
    rimR.position.set(2.6, 0.8, -2);
    scene.add(key, fill, rimL, rimR);

    const head = new THREE.Group();
    scene.add(head);

    const uniforms = {
      uTime: { value: 0 },
      uScanY: { value: 1 },
      uScan: { value: 0 },
      uHeat: { value: 0 },
      uDim: { value: 0 },
      uPoints: { value: 0 },
      uCyan: { value: CYAN },
    };
    const state = { ...presetRef.current, scan: 0, points: 0, wire: 0, heat: 0, marks: 0 };
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const reduced = prefersReducedMotion();
    let markers = [];
    let wireMat;

    const onPointer = (e) => {
      const r = wrap.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    cleanups.push(() => window.removeEventListener("pointermove", onPointer));

    const resize = () => {
      const { width, height } = wrap.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Keep the whole face in frame on tall/narrow layouts.
      camera.position.z = camera.aspect < 0.8 ? 3.9 / Math.max(camera.aspect / 0.8, 0.62) : 3.9;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    cleanups.push(() => ro.disconnect());
    resize();

    loadHead()
      .then(({ geometry, scanGeometry, map, extras }) => {
        if (disposed) return;
        const skin = new THREE.MeshPhysicalMaterial({
          map,
          roughness: 0.5,
          specularIntensity: 0.55,
          sheen: 0.4,
          sheenRoughness: 0.55,
          sheenColor: new THREE.Color("#ffab96"),
          clearcoat: 0.1,
          clearcoatRoughness: 0.35,
          transparent: true,
        });
        patchSkin(skin, uniforms);
        const mesh = new THREE.Mesh(geometry, skin);
        head.add(mesh);

        // Eyes, brows, lashes and hair: dim with the skin and fade out at the neck like it does.
        const extraMats = extras.map(({ name, geometry: g, material: src }) => {
          const hairLike = name !== "eyes";
          const mat = new THREE.MeshStandardMaterial({
            map: src.map,
            roughness: name === "eyes" ? 0.12 : name === "hair" ? 0.55 : 0.8,
            metalness: 0,
            transparent: true,
            alphaTest: name === "hair" ? 0.35 : hairLike ? 0.05 : 0,
            depthWrite: name === "hair" || name === "eyes",
            side: hairLike ? THREE.DoubleSide : THREE.FrontSide,
          });
          patchExtra(mat, uniforms);
          const part = new THREE.Mesh(g, mat);
          part.renderOrder = hairLike ? 1 : 0;
          head.add(part);
          return mat;
        });

        // Dense surface sampling — reads as the landmark / depth point cloud.
        const pointsMat = new THREE.ShaderMaterial({
          uniforms,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          vertexShader: `
            uniform float uTime, uPoints, uScanY, uScan;
            varying float vA;
            void main() {
              vec3 p = position + normal * 0.006;
              vec4 mv = modelViewMatrix * vec4(p, 1.0);
              vec3 n = normalize(normalMatrix * normal);
              float facing = clamp(dot(n, normalize(-mv.xyz)), 0.0, 1.0);
              float band = exp(-pow((position.y - uScanY) / 0.05, 2.0)) * uScan;
              float twinkle = 0.65 + 0.35 * sin(uTime * 3.0 + position.x * 40.0 + position.y * 23.0);
              vA = (uPoints * twinkle + band) * facing * smoothstep(-0.5, -0.15, position.y);
              gl_PointSize = (1.6 + band * 2.0) * (3.4 / -mv.z);
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: `
            uniform vec3 uCyan;
            varying float vA;
            void main() {
              float d = length(gl_PointCoord - 0.5);
              if (d > 0.5) discard;
              gl_FragColor = vec4(uCyan, vA * smoothstep(0.5, 0.1, d));
            }`,
        });
        const pts = new THREE.Points(scanGeometry, pointsMat);
        head.add(pts);

        wireMat = new THREE.ShaderMaterial({
          uniforms: { ...uniforms, uWire: { value: 0 } },
          wireframe: true,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          vertexShader: `
            varying float vFade;
            void main() {
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vec3 n = normalize(normalMatrix * normal);
              vFade = smoothstep(-0.5, -0.12, position.y) * (0.35 + 0.65 * clamp(dot(n, normalize(-mv.xyz)), 0.0, 1.0));
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: `
            uniform float uWire; uniform vec3 uCyan;
            varying float vFade;
            void main() { gl_FragColor = vec4(uCyan, uWire * vFade); }`,
        });
        const wire = new THREE.Mesh(scanGeometry, wireMat);
        wire.scale.setScalar(1.003);
        head.add(wire);

        // Anchor points on the real surface for landmark dots + HTML callouts.
        const ray = new THREE.Raycaster();
        const hitAt = (x, y) => {
          ray.set(new THREE.Vector3(x, y, 3), new THREE.Vector3(0, 0, -1));
          const hit = ray.intersectObject(mesh, false)[0];
          if (!hit) return null;
          const n = hit.face.normal.clone();
          return { point: hit.point.clone().add(n.clone().multiplyScalar(0.004)), normal: n };
        };
        const dotGeo = new THREE.SphereGeometry(0.009, 12, 12);
        const ringGeo = new THREE.RingGeometry(0.018, 0.024, 32);
        markers = Object.entries(FACE_POINTS)
          .map(([id, [x, y]]) => {
            const hit = hitAt(x, y);
            if (!hit) return null;
            const dotMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, depthWrite: false });
            const ringMat = dotMat.clone();
            const dot = new THREE.Mesh(dotGeo, dotMat);
            const ring = new THREE.Mesh(ringGeo, ringMat);
            dot.position.copy(hit.point);
            ring.position.copy(hit.point);
            ring.lookAt(hit.point.clone().add(hit.normal));
            head.add(dot, ring);
            return { id, ...hit, dot, ring, phase: Math.random() * Math.PI * 2 };
          })
          .filter(Boolean);

        cleanups.push(() => {
          skin.dispose();
          extraMats.forEach((m) => m.dispose());
          pointsMat.dispose();
          wireMat.dispose();
          dotGeo.dispose();
          ringGeo.dispose();
          markers.forEach((m) => { m.dot.material.dispose(); m.ring.material.dispose(); });
        });
        setReady(true);
        onReady?.();
      })
      .catch(() => !disposed && setFailed(true));

    const tmp = new THREE.Vector3();
    const tmpN = new THREE.Vector3();
    const camDir = new THREE.Vector3();

    stop = runLoop(wrap, (dt, t) => {
      const target = presetRef.current;
      for (const k of ["scan", "points", "wire", "heat", "dim", "marks"]) state[k] = damp(state[k], target[k], 3.2, dt);

      uniforms.uTime.value = t;
      uniforms.uScan.value = state.scan;
      uniforms.uHeat.value = state.heat;
      uniforms.uDim.value = state.dim;
      uniforms.uPoints.value = state.points;
      // Top of head → chin, pause, repeat.
      const cycle = (t * 0.28) % 1.25;
      uniforms.uScanY.value = 1.05 - Math.min(cycle, 1) * 1.35;
      if (wireMat) wireMat.uniforms.uWire.value = state.wire * 0.26;

      pointer.x = damp(pointer.x, pointer.tx, 2.5, dt);
      pointer.y = damp(pointer.y, pointer.ty, 2.5, dt);
      const sway = autoRotate && !reduced ? Math.sin(t * 0.35) * 0.42 : 0;
      head.rotation.y = sway + pointer.x * 0.35;
      head.rotation.x = pointer.y * 0.12;
      head.position.y = reduced ? 0 : Math.sin(t * 0.8) * 0.012;

      head.updateMatrixWorld();
      camera.getWorldDirection(camDir);
      markers.forEach((m) => {
        tmpN.copy(m.normal).transformDirection(head.matrixWorld);
        const facing = THREE.MathUtils.smoothstep(-tmpN.dot(camDir), 0.15, 0.45);
        const a = state.marks * facing;
        m.dot.material.opacity = a;
        const pulse = (t * 0.9 + m.phase) % 1;
        m.ring.scale.setScalar(0.6 + pulse * 1.6);
        m.ring.material.opacity = a * (1 - pulse) * 0.9;
      });

      // Pin HTML callouts to their 3D anchor.
      const { width, height } = wrap.getBoundingClientRect();
      calloutsRef.current.forEach((c, i) => {
        const el = calloutRefs.current[i];
        const m = markers.find((mk) => mk.id === c.at);
        if (!el || !m) return;
        tmp.copy(m.point).applyMatrix4(head.matrixWorld).project(camera);
        tmpN.copy(m.normal).transformDirection(head.matrixWorld);
        const facing = THREE.MathUtils.smoothstep(-tmpN.dot(camDir), 0.1, 0.4);
        el.style.transform = `translate3d(${((tmp.x + 1) / 2) * width}px, ${((1 - tmp.y) / 2) * height}px, 0)`;
        el.style.opacity = String(state.marks * facing);
      });

      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      stop();
      cleanups.forEach((fn) => fn());
      scene.environment?.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`} />
      {!ready && !failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-40 animate-pulse rounded-full bg-cyan-400/10 ring-1 ring-cyan-300/20" />
        </div>
      )}
      {failed && (
        <img src="/landing/portrait-front.jpg" alt="" className="absolute inset-0 h-full w-full rounded-3xl object-cover opacity-80" />
      )}
      <div className="pointer-events-none absolute inset-0">
        {callouts.map((c, i) => (
          <div
            key={c.at + c.label}
            ref={(el) => (calloutRefs.current[i] = el)}
            className="absolute left-0 top-0 opacity-0 will-change-transform"
          >
            <div className={`fs-callout ${c.side === "left" ? "fs-callout-left" : ""}`} style={{ "--len": `${c.len || 70}px` }}>
              <span className="fs-callout-line" />
              <div className="fs-callout-card">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">{c.label}</p>
                <p className="font-display text-sm font-semibold text-white">{c.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FaceScan3D;
