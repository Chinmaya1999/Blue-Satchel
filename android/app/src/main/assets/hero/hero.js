// Standalone port of the website's FaceScan3D hero (client/src/components/landing/FaceScan3D.jsx):
// the same MakeHuman female head, skin shader (scan beam + grid), point cloud, landmarks and callouts.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const bridge = window.Android;
const fail = () => bridge && bridge.onFail && bridge.onFail();

const FACE_POINTS = {
  forehead: [0, 0.7], browL: [-0.16, 0.55], browR: [0.16, 0.55], eyeL: [-0.15, 0.46], eyeR: [0.15, 0.46],
  underEyeL: [-0.15, 0.38], underEyeR: [0.15, 0.38], noseBridge: [0, 0.47], noseTip: [0, 0.31],
  nostrilL: [-0.06, 0.24], nostrilR: [0.06, 0.24], cheekL: [-0.22, 0.28], cheekR: [0.22, 0.28],
  mouthL: [-0.1, 0.155], mouthR: [0.1, 0.155], lipTop: [0, 0.18], lipBottom: [0, 0.12], chin: [0, 0.03],
  jawL: [-0.19, 0.08], jawR: [0.19, 0.08], templeL: [-0.27, 0.6], templeR: [0.27, 0.6],
};
const CYAN = new THREE.Color("#8fe9ff");

// Concern callouts pinned to the face. Android can replace the values with the user's real scan results.
let callouts = [
  { at: "forehead", label: "T-ZONE OIL", value: "Balanced · 72" },
  { at: "underEyeL", label: "DARK CIRCLES", value: "Mild · 34", left: true },
  { at: "cheekR", label: "REDNESS", value: "Low · 18" },
  { at: "chin", label: "BLEMISHES", value: "2 detected", left: true },
];
const wrapEl = document.getElementById("callouts");
let calloutEls = [];
const buildCallouts = () => {
  wrapEl.innerHTML = "";
  calloutEls = callouts.map((c) => {
    const el = document.createElement("div");
    el.className = "callout" + (c.left ? " left" : "");
    el.innerHTML = `<div class="tag"><small>${c.label}</small>${c.value}</div>`;
    wrapEl.appendChild(el);
    return el;
  });
};
buildCallouts();
window.setCallouts = (json) => { try { callouts = JSON.parse(json); buildCallouts(); } catch (e) {} };

const patchSkin = (material, uniforms) => {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vObj;
        uniform float uTime, uScanY, uScan, uHeat, uDim;
        uniform vec3 uCyan;
        float gauss(vec2 p, vec2 c, vec2 r) { vec2 d = (p - c) / r; return exp(-dot(d, d)); }`)
      .replace("#include <dithering_fragment>", `#include <dithering_fragment>
        vec3 col = gl_FragColor.rgb * (1.0 - uDim * 0.82);
        vec2 p = vObj.xy;
        float front = smoothstep(0.1, 0.4, vObj.z);
        float oil = gauss(p, vec2(0.0, 0.69), vec2(0.27, 0.075)) + gauss(p, vec2(0.0, 0.36), vec2(0.06, 0.14));
        float red = gauss(p, vec2(-0.22, 0.27), vec2(0.085, 0.08)) + gauss(p, vec2(0.22, 0.27), vec2(0.085, 0.08));
        float dark = gauss(p, vec2(-0.15, 0.365), vec2(0.075, 0.026)) + gauss(p, vec2(0.15, 0.365), vec2(0.075, 0.026));
        float spot = gauss(p, vec2(0.0, 0.03), vec2(0.085, 0.045)) + gauss(p, vec2(-0.2, 0.62), vec2(0.035, 0.03)) + gauss(p, vec2(0.16, 0.19), vec2(0.03, 0.03));
        vec3 heat = vec3(1.0, 0.72, 0.18) * oil + vec3(1.0, 0.23, 0.33) * red + vec3(0.58, 0.4, 1.0) * dark + vec3(0.2, 1.0, 0.75) * spot;
        float amt = clamp(oil + red + dark + spot, 0.0, 1.0);
        float pulse = 0.82 + 0.18 * sin(uTime * 2.4);
        col = mix(col, col * 0.35 + heat * 0.9 * pulse, uHeat * front * smoothstep(0.05, 0.5, amt));
        float band = exp(-pow((vObj.y - uScanY) / 0.018, 2.0));
        float halo = exp(-pow((vObj.y - uScanY) / 0.09, 2.0));
        vec2 gp = vObj.xy * 34.0;
        vec2 gw = abs(fract(gp - 0.5) - 0.5) / fwidth(gp);
        float grid = 1.0 - min(min(gw.x, gw.y), 1.0);
        float trail = smoothstep(uScanY, uScanY + 0.02, vObj.y) * exp(-(vObj.y - uScanY) * 7.0);
        col += uCyan * (band * 1.4 + halo * 0.14 + grid * trail * 0.22) * uScan * front;
        float neck = smoothstep(-0.62, -0.18, vObj.y) * (1.0 - smoothstep(0.45, 0.78, abs(vObj.x)));
        gl_FragColor = vec4(col * neck, gl_FragColor.a * neck);`);
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
      .replace("#include <dithering_fragment>", `#include <dithering_fragment>
        float neck = smoothstep(-0.62, -0.18, vObjY);
        gl_FragColor = vec4(gl_FragColor.rgb * (1.0 - uDim * 0.82) * neck, gl_FragColor.a * neck);`);
  };
};

try {
  const canvas = document.getElementById("c");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.34, 3.9);
  camera.lookAt(0, 0.3, 0);

  scene.add(new THREE.HemisphereLight("#dfe8ff", "#1a1020", 0.5));
  const key = new THREE.DirectionalLight("#fff1e4", 2.6); key.position.set(1.6, 1.8, 2.4);
  const fill = new THREE.DirectionalLight("#b9cbff", 0.55); fill.position.set(-2.2, 0.4, 1.6);
  const rimL = new THREE.DirectionalLight("#4fd8ff", 2.2); rimL.position.set(-2.5, 1.2, -2.2);
  const rimR = new THREE.DirectionalLight("#c784ea", 2.0); rimR.position.set(2.6, 0.8, -2);
  scene.add(key, fill, rimL, rimR);

  const head = new THREE.Group();
  scene.add(head);

  const uniforms = {
    uTime: { value: 0 }, uScanY: { value: 1 }, uScan: { value: 1 }, uHeat: { value: 0 },
    uDim: { value: 0.05 }, uPoints: { value: 0.3 }, uCyan: { value: CYAN },
  };

  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, true);   // sets explicit px CSS size too: percent/vh heights resolve to 0 in this WebView layout
    camera.aspect = w / h;
    camera.position.z = camera.aspect < 0.8 ? 3.9 / Math.max(camera.aspect / 0.8, 0.62) : 3.9;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();

  let markers = [];
  let ready = false;
  let dragYaw = 0, tilt = 0, tiltTarget = 0;

  // Compose handles the touch gestures (so the page can still scroll) and forwards them here.
  window.dxb = {
    drag: (dx, dy) => { dragYaw += dx * 0.012; tiltTarget = Math.max(-0.25, Math.min(0.25, tiltTarget + dy * 0.004)); },
    pause: () => { paused = true; },
    resume: () => { paused = false; last = performance.now(); requestAnimationFrame(tick); },
  };

  new GLTFLoader().load("./FemaleHead.glb", (gltf) => {
    try {
      const parts = {};
      gltf.scene.traverse((o) => { if (o.isMesh) parts[o.name] = o; });
      const { skin: skinMesh, scan, ...rest } = parts;
      const map = skinMesh.material.map;
      map.anisotropy = 8;

      const skin = new THREE.MeshPhysicalMaterial({
        map, roughness: 0.5, specularIntensity: 0.55, sheen: 0.4, sheenRoughness: 0.55,
        sheenColor: new THREE.Color("#ffab96"), clearcoat: 0.1, clearcoatRoughness: 0.35, transparent: true,
      });
      patchSkin(skin, uniforms);
      const mesh = new THREE.Mesh(skinMesh.geometry, skin);
      head.add(mesh);
      document.getElementById("verts").textContent = skinMesh.geometry.attributes.position.count.toLocaleString("en-US");

      Object.entries(rest).forEach(([name, m]) => {
        if (m.material.map) m.material.map.anisotropy = 8;
        const hairLike = name !== "eyes";
        const mat = new THREE.MeshStandardMaterial({
          map: m.material.map, roughness: name === "eyes" ? 0.12 : name === "hair" ? 0.55 : 0.8, metalness: 0,
          transparent: true, alphaTest: name === "hair" ? 0.35 : hairLike ? 0.05 : 0,
          depthWrite: name === "hair" || name === "eyes", side: hairLike ? THREE.DoubleSide : THREE.FrontSide,
        });
        patchExtra(mat, uniforms);
        const part = new THREE.Mesh(m.geometry, mat);
        part.renderOrder = hairLike ? 1 : 0;
        head.add(part);
      });

      const pointsMat = new THREE.ShaderMaterial({
        uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
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
            gl_PointSize = (1.6 + band * 2.0) * (3.4 / -mv.z) * 1.6;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform vec3 uCyan; varying float vA;
          void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(uCyan, vA * smoothstep(0.5, 0.1, d)); }`,
      });
      head.add(new THREE.Points(scan.geometry, pointsMat));

      const ray = new THREE.Raycaster();
      const dotGeo = new THREE.SphereGeometry(0.009, 12, 12);
      const ringGeo = new THREE.RingGeometry(0.018, 0.024, 32);
      head.updateMatrixWorld(true);
      markers = Object.entries(FACE_POINTS).map(([id, [x, y]]) => {
        ray.set(new THREE.Vector3(x, y, 3), new THREE.Vector3(0, 0, -1));
        const hit = ray.intersectObject(mesh, false)[0];
        if (!hit) return null;
        const normal = hit.face.normal.clone();
        const point = hit.point.clone().add(normal.clone().multiplyScalar(0.004));
        const dotMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, depthWrite: false });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        const ring = new THREE.Mesh(ringGeo, dotMat.clone());
        dot.position.copy(point); ring.position.copy(point); ring.lookAt(point.clone().add(normal));
        head.add(dot, ring);
        return { id, point, normal, dot, ring, phase: Math.random() * Math.PI * 2 };
      }).filter(Boolean);

      ready = true;
      canvas.classList.add("on");
      document.getElementById("hud").classList.add("on");
      bridge && bridge.onReady && bridge.onReady();
    } catch (e) { fail(); }
  }, undefined, fail);

  const tmp = new THREE.Vector3(), tmpN = new THREE.Vector3(), camDir = new THREE.Vector3();
  let last = performance.now(), t = 0, paused = false;
  const tick = (now) => {
    if (paused) return;
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now; t += dt;
    uniforms.uTime.value = t;
    const cycle = (t * 0.28) % 1.25;
    uniforms.uScanY.value = 1.05 - Math.min(cycle, 1) * 1.35;

    tilt += (tiltTarget - tilt) * (1 - Math.exp(-6 * dt));
    dragYaw *= Math.exp(-0.35 * dt);                       // slowly settle back to the idle sway
    head.rotation.y = Math.sin(t * 0.35) * 0.42 + dragYaw;
    head.rotation.x = tilt;
    head.position.y = Math.sin(t * 0.8) * 0.012;

    head.updateMatrixWorld();
    camera.getWorldDirection(camDir);
    markers.forEach((m) => {
      tmpN.copy(m.normal).transformDirection(head.matrixWorld);
      const facing = THREE.MathUtils.smoothstep(-tmpN.dot(camDir), 0.15, 0.45);
      m.dot.material.opacity = facing;
      const pulse = (t * 0.9 + m.phase) % 1;
      m.ring.scale.setScalar(0.6 + pulse * 1.6);
      m.ring.material.opacity = facing * (1 - pulse) * 0.9;
    });

    const w = window.innerWidth, h = window.innerHeight;
    callouts.forEach((c, i) => {
      const el = calloutEls[i], m = markers.find((mk) => mk.id === c.at);
      if (!el || !m) return;
      tmp.copy(m.point).applyMatrix4(head.matrixWorld).project(camera);
      tmpN.copy(m.normal).transformDirection(head.matrixWorld);
      const facing = THREE.MathUtils.smoothstep(-tmpN.dot(camDir), 0.1, 0.4);
      el.style.transform = `translate3d(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px, 0)`;
      el.style.opacity = String(facing);
    });

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
} catch (e) { fail(); }
