import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Female head built from MakeHuman CC0 assets (young female base mesh, skin, eyes, brows, lashes, ponytail).
// The file is pre-normalized: head top at y = 1, eye line at y ≈ 0.46, facing +Z, neck fading out below y ≈ -0.6.
const HEAD_URL = "/models/head/FemaleHead.glb";

let headPromise = null;

// Loads the head once and shares it between every canvas on the page.
// Returns the smooth skin geometry + texture, a coarser copy of the skin for the point-cloud / wireframe
// overlays, and the extra parts (eyes, brows, lashes, hair).
export const loadHead = () => {
  if (headPromise) return headPromise;
  headPromise = new Promise((resolve, reject) =>
    new GLTFLoader().load(HEAD_URL, (gltf) => {
      const parts = {};
      gltf.scene.traverse((o) => { if (o.isMesh) parts[o.name] = o; });
      const { skin, scan, ...rest } = parts;
      const map = skin.material.map;
      map.anisotropy = 8;
      const extras = Object.entries(rest).map(([name, mesh]) => {
        if (mesh.material.map) mesh.material.map.anisotropy = 8;
        return { name, geometry: mesh.geometry, material: mesh.material };
      });
      skin.geometry.computeBoundingSphere();
      resolve({ geometry: skin.geometry, scanGeometry: scan.geometry, map, extras });
    }, undefined, reject)
  );
  headPromise.catch(() => { headPromise = null; });
  return headPromise;
};

export const createRenderer = (canvas) => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
};

export const studioEnvironment = (renderer) => {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
};

// Runs `frame(dt, t)` on rAF, but only while the canvas is on screen.
export const runLoop = (el, frame) => {
  let raf = 0;
  let visible = true;
  let last = performance.now();
  let t = 0;
  const tick = (now) => {
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    t += dt;
    frame(dt, t);
    raf = visible ? requestAnimationFrame(tick) : 0;
  };
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }, { rootMargin: "100px" });
  io.observe(el);
  raf = requestAnimationFrame(tick);
  return () => {
    io.disconnect();
    cancelAnimationFrame(raf);
  };
};

export const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
