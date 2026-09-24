import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createRenderer, studioEnvironment, runLoop, damp, prefersReducedMotion } from "./three-utils.js";

// Block dimensions (world units). y = 0 is the skin surface.
const W = 3.2;
const D = 2.0;
const EPI = 0.28; // epidermis thickness
const DERM = 1.0; // dermis thickness
const HYPO = 0.75; // hypodermis thickness

// Deterministic pseudo-random so the block looks the same on every visit.
const rng = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const LAYERS = [
  { id: "epidermis", label: "Epidermis", depth: "Pores · melanin · tone", y: -EPI / 2 },
  { id: "dermis", label: "Dermis", depth: "Collagen · vessels · redness", y: -EPI - DERM / 2 },
  { id: "hypo", label: "Subcutis", depth: "Volume · fat support", y: -EPI - DERM - HYPO / 2 },
];

const buildSurface = (rand, pores, follicles) => {
  const geo = new THREE.PlaneGeometry(W, D, 220, 140);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Fine skin micro-relief: crossed ridges ("skin lines") plus soft undulation.
    let h =
      0.012 * Math.sin(x * 9 + z * 3) +
      0.008 * Math.sin(z * 11 - x * 4) +
      0.006 * Math.abs(Math.sin(x * 24 + z * 17)) +
      0.004 * Math.abs(Math.sin(x * 19 - z * 29));
    for (const p of pores) {
      const d2 = (x - p.x) ** 2 + (z - p.z) ** 2;
      h -= p.depth * Math.exp(-d2 / (p.r * p.r));
    }
    for (const f of follicles) {
      const d2 = (x - f.x) ** 2 + (z - f.z) ** 2;
      h -= 0.03 * Math.exp(-d2 / 0.0012);
    }
    // Fade the relief at the edges so the block edges stay clean.
    const edge = Math.min(1, (W / 2 - Math.abs(x)) * 8, (D / 2 - Math.abs(z)) * 8);
    pos.setY(i, h * Math.max(edge, 0));
  }
  geo.computeVertexNormals();
  return geo;
};

const tube = (points, radius, color, extra = {}) =>
  new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, radius, 10, false),
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.3, ...extra })
  );

const SkinLayers3D = ({ className = "", activeLayer = null }) => {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const labelRefs = useRef([]);
  const activeRef = useRef(activeLayer);
  const [failed, setFailed] = useState(false);
  activeRef.current = activeLayer;

  useEffect(() => {
    const wrap = wrapRef.current;
    let renderer;
    try {
      renderer = createRenderer(canvasRef.current);
    } catch {
      setFailed(true);
      return undefined;
    }
    const scene = new THREE.Scene();
    scene.environment = studioEnvironment(renderer);
    scene.environmentIntensity = 0.3;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(3.6, 1.9, 5.8);
    camera.lookAt(0, -0.95, 0);

    scene.add(new THREE.HemisphereLight("#ffffff", "#2a1830", 0.7));
    const key = new THREE.DirectionalLight("#fff3ea", 2.4);
    key.position.set(3, 5, 4);
    const rim = new THREE.DirectionalLight("#6fdcff", 1.6);
    rim.position.set(-4, 2, -3);
    scene.add(key, rim);

    const block = new THREE.Group();
    scene.add(block);
    const disposables = [];
    const rand = rng(7);

    const pores = Array.from({ length: 60 }, () => ({
      x: (rand() - 0.5) * (W - 0.3),
      z: (rand() - 0.5) * (D - 0.3),
      r: 0.018 + rand() * 0.02,
      depth: 0.018 + rand() * 0.02,
    }));
    const follicles = Array.from({ length: 7 }, (_, i) => ({
      x: -W / 2 + 0.35 + i * ((W - 0.7) / 6) + (rand() - 0.5) * 0.15,
      z: 0.35 + rand() * 0.5,
      tilt: (rand() - 0.5) * 0.35,
    }));

    // Surface skin
    const surfaceMat = new THREE.MeshPhysicalMaterial({
      color: "#c98466",
      roughness: 0.5,
      sheen: 0.25,
      sheenColor: new THREE.Color("#ffc2ad"),
      sheenRoughness: 0.5,
      clearcoat: 0.15,
      clearcoatRoughness: 0.4,
    });
    const surface = new THREE.Mesh(buildSurface(rand, pores, follicles), surfaceMat);
    block.add(surface);

    // Translucent layer slabs so the internal structures stay visible.
    const slab = (h, y, color, opacity) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(W, h, D),
        new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide })
      );
      m.position.y = y;
      m.renderOrder = 2;
      block.add(m);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(m.geometry),
        new THREE.LineBasicMaterial({ color: "#9befff", transparent: true, opacity: 0.25 })
      );
      edges.position.y = y;
      block.add(edges);
      return m;
    };
    const slabs = {
      epidermis: slab(EPI, -EPI / 2 - 0.004, "#f0c3a8", 0.55),
      dermis: slab(DERM, -EPI - DERM / 2, "#e58e8e", 0.32),
      hypo: slab(HYPO, -EPI - DERM - HYPO / 2, "#f3d58a", 0.28),
    };

    // Melanin clusters at the base of the epidermis (what shows up as spots).
    const melGeo = new THREE.SphereGeometry(0.022, 10, 10);
    const melanin = new THREE.InstancedMesh(melGeo, new THREE.MeshStandardMaterial({ color: "#6b3a22", roughness: 0.6 }), 140);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 140; i++) {
      const cx = i < 60 ? -0.9 + (rand() - 0.5) * 0.5 : (rand() - 0.5) * (W - 0.2);
      m4.makeScale(1, 0.6, 1).setPosition(cx, -EPI + 0.04 + rand() * 0.05, (rand() - 0.5) * (D - 0.2));
      melanin.setMatrixAt(i, m4);
    }
    block.add(melanin);

    // Hair follicles with sebaceous glands and hair shafts.
    const follicleMat = new THREE.MeshPhysicalMaterial({ color: "#d9796f", roughness: 0.4, clearcoat: 0.4 });
    const glandMat = new THREE.MeshPhysicalMaterial({ color: "#f4d27a", roughness: 0.3, clearcoat: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: "#3b2418", roughness: 0.5 });
    follicles.forEach((f) => {
      const g = new THREE.Group();
      const len = 0.95;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, len, 16, 1, true), follicleMat);
      shaft.position.y = -len / 2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 20), follicleMat);
      bulb.position.y = -len;
      bulb.scale.set(1, 1.3, 1);
      const gland = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.045 + k * 0.006, 14, 14), glandMat);
        lobe.position.set(0.07 + (k % 2) * 0.04, -0.3 - k * 0.04, (k - 1.5) * 0.03);
        gland.add(lobe);
      }
      const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.013, len + 0.55, 8), hairMat);
      hair.position.y = -len / 2 + 0.28;
      g.add(shaft, bulb, gland, hair);
      g.position.set(f.x, 0, f.z);
      g.rotation.z = f.tilt;
      block.add(g);
    });

    // Collagen & elastin fibers — wavy bundles through the dermis.
    for (let i = 0; i < 16; i++) {
      const y = -EPI - 0.15 - rand() * (DERM - 0.3);
      const z = (rand() - 0.5) * (D - 0.3);
      const phase = rand() * 6;
      const pts = Array.from({ length: 12 }, (_, k) => {
        const x = -W / 2 + 0.05 + (k / 11) * (W - 0.1);
        return new THREE.Vector3(x, y + Math.sin(x * 3 + phase) * 0.05, z + Math.cos(x * 2.2 + phase) * 0.12);
      });
      block.add(tube(pts, 0.012 + rand() * 0.01, i % 3 === 0 ? "#f7e3d6" : "#f2b6a8", { roughness: 0.25 }));
    }

    // Blood vessels: arterial (red) and venous (blue) plexus with capillary loops rising toward the surface.
    const vessel = (color, yBase, zOff, loopPhase) => {
      const pts = Array.from({ length: 14 }, (_, k) => {
        const x = -W / 2 + 0.05 + (k / 13) * (W - 0.1);
        return new THREE.Vector3(x, yBase + Math.sin(x * 2.1 + loopPhase) * 0.06, zOff + Math.sin(x * 1.3) * 0.2);
      });
      block.add(tube(pts, 0.035, color, { emissive: new THREE.Color(color).multiplyScalar(0.15) }));
      for (let k = 0; k < 6; k++) {
        const x = -W / 2 + 0.35 + k * 0.5 + loopPhase * 0.08;
        const z = zOff + Math.sin(x * 1.3) * 0.2;
        const loop = [
          new THREE.Vector3(x, yBase, z),
          new THREE.Vector3(x - 0.03, -EPI - 0.3, z),
          new THREE.Vector3(x + 0.02, -EPI - 0.04, z + 0.02),
          new THREE.Vector3(x + 0.08, -EPI - 0.3, z),
          new THREE.Vector3(x + 0.1, yBase, z),
        ];
        block.add(tube(loop, 0.009, color));
      }
    };
    vessel("#d63a4a", -EPI - DERM + 0.12, -0.35, 0);
    vessel("#4a64d6", -EPI - DERM + 0.2, -0.05, 1.7);

    // Fat lobules filling the subcutis.
    const fatGeo = new THREE.SphereGeometry(1, 20, 20);
    const fat = new THREE.InstancedMesh(
      fatGeo,
      new THREE.MeshPhysicalMaterial({ color: "#f6d77e", roughness: 0.2, clearcoat: 0.8, transmission: 0, sheen: 0.4, sheenColor: new THREE.Color("#fff2c4") }),
      110
    );
    for (let i = 0; i < 110; i++) {
      const r = 0.11 + rand() * 0.07;
      m4.makeScale(r, r * 0.85, r).setPosition(
        (rand() - 0.5) * (W - 0.25),
        -EPI - DERM - 0.12 - rand() * (HYPO - 0.24),
        (rand() - 0.5) * (D - 0.25)
      );
      fat.setMatrixAt(i, m4);
    }
    block.add(fat);

    // Imaging light: three beams that stop at the depth each wavelength reaches.
    const beamMat = (color) =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uDepth: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: `
          uniform float uTime; uniform vec3 uColor;
          varying vec2 vUv;
          void main(){
            float along = 1.0 - vUv.y;
            float flow = 0.55 + 0.45 * sin(along * 26.0 - uTime * 5.0);
            float a = smoothstep(1.0, 0.75, along) * smoothstep(0.0, 0.08, along) * flow;
            gl_FragColor = vec4(uColor, a * 0.4);
          }`,
      });
    const beams = [
      { color: "#b38bff", depth: EPI + 0.05, x: -1.05 },
      { color: "#ffffff", depth: EPI + 0.55, x: 0.05 },
      { color: "#ff5a6e", depth: EPI + DERM, x: 1.1 },
    ].map((b) => {
      const above = 0.9;
      const h = above + b.depth;
      const mat = beamMat(b.color);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.09, h, 24, 1, true), mat);
      m.position.set(b.x, above - h / 2, D / 2 - 0.25);
      block.add(m);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 16, 16),
        new THREE.MeshBasicMaterial({ color: b.color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      glow.position.set(b.x, -b.depth, D / 2 - 0.25);
      block.add(glow);
      return { mat, glow };
    });

    block.traverse((o) => {
      if (o.geometry) disposables.push(o.geometry);
      if (o.material) disposables.push(o.material);
    });

    const reduced = prefersReducedMotion();
    const pointer = { x: 0, tx: 0 };
    const onPointer = (e) => {
      const r = wrap.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const resize = () => {
      const { width, height } = wrap.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const fit = camera.aspect < 1.2 ? 1.2 / camera.aspect : 1;
      camera.position.set(3.6 * fit, 1.9 * fit, 5.8 * fit);
      camera.lookAt(0, -0.95, 0);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const tmp = new THREE.Vector3();
    const layerOpacity = { epidermis: 0.55, dermis: 0.32, hypo: 0.28 };
    const stop = runLoop(wrap, (dt, t) => {
      pointer.x = damp(pointer.x, pointer.tx, 2, dt);
      block.rotation.y = (reduced ? 0 : Math.sin(t * 0.25) * 0.28) + pointer.x * 0.25 - 0.15;
      beams.forEach((b, i) => {
        b.mat.uniforms.uTime.value = t;
        b.glow.scale.setScalar(0.8 + Math.sin(t * 3 + i) * 0.25);
      });
      const active = activeRef.current;
      Object.entries(slabs).forEach(([id, m]) => {
        const target = !active || active === id ? layerOpacity[id] : layerOpacity[id] * 0.35;
        m.material.opacity = damp(m.material.opacity, target, 4, dt);
      });

      block.updateMatrixWorld();
      const { width, height } = wrap.getBoundingClientRect();
      LAYERS.forEach((l, i) => {
        const el = labelRefs.current[i];
        if (!el) return;
        tmp.set(-W / 2, l.y, D / 2).applyMatrix4(block.matrixWorld).project(camera);
        el.style.transform = `translate3d(${((tmp.x + 1) / 2) * width}px, ${((1 - tmp.y) / 2) * height}px, 0)`;
        el.style.opacity = !active || active === l.id ? "1" : "0.4";
      });
      renderer.render(scene, camera);
    });

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      disposables.forEach((d) => d.dispose());
      scene.environment?.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {failed && <img src="/landing/serum.jpg" alt="" className="absolute inset-0 h-full w-full rounded-3xl object-cover" />}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {LAYERS.map((l, i) => (
          <div key={l.id} ref={(el) => (labelRefs.current[i] = el)} className="absolute left-0 top-0 transition-opacity duration-500 will-change-transform">
            <div className="flex -translate-x-full -translate-y-1/2 items-center gap-2 pr-1">
              <div className="rounded-lg bg-slate-950/70 px-2.5 py-1.5 text-right ring-1 ring-white/10 backdrop-blur">
                <p className="font-display text-xs font-semibold text-white">{l.label}</p>
                <p className="hidden text-[10px] text-slate-400 sm:block">{l.depth}</p>
              </div>
              <span className="h-px w-5 bg-cyan-300/70 sm:w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkinLayers3D;
