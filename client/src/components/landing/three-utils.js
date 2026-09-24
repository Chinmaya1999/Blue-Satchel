import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Scanned head (Lee Perry-Smith, Infinite-Realities, CC-BY 3.0 — via three.js examples).
const HEAD_DIR = "/models/head/";

let headPromise = null;

// Loads the head geometry + textures once and shares them between every canvas on the page.
// The geometry is normalized so the head is centered and spans y ∈ [-1, 1], facing +Z.
export const loadHead = () => {
  if (headPromise) return headPromise;
  const tex = new THREE.TextureLoader();
  const loadTex = (file, srgb) =>
    new Promise((resolve, reject) =>
      tex.load(HEAD_DIR + file, (t) => {
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        resolve(t);
      }, undefined, reject)
    );

  const geo = new Promise((resolve, reject) =>
    new GLTFLoader().load(HEAD_DIR + "LeePerrySmith.glb", (gltf) => {
      let mesh = null;
      gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
      const g = mesh.geometry.clone();
      g.computeBoundingBox();
      const bb = g.boundingBox;
      const c = new THREE.Vector3();
      bb.getCenter(c);
      g.translate(-c.x, -c.y, -c.z);
      const s = 2 / (bb.max.y - bb.min.y);
      g.scale(s, s, s);
      g.computeBoundingSphere();
      resolve(g);
    }, undefined, reject)
  );

  headPromise = Promise.all([
    geo,
    loadTex("Map-COL.jpg", true),
    loadTex("Infinite-Level_02_Tangent_SmoothUV.jpg", false),
    loadTex("Map-SPEC.jpg", false),
  ]).then(([geometry, map, normalMap, specMap]) => ({ geometry, map, normalMap, specMap }));
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
    const dt = Math.min((now - last) / 1000, 0.05);
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
