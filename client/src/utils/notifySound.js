// Short two-note chime for the admin bell, synthesised with Web Audio so
// there's no sound file to ship. Browsers keep audio locked until the person
// has clicked or pressed a key on the page, so the first gesture unlocks it.
let ctx = null;

const getCtx = () => {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
};

const unlock = () => {
  getCtx()?.resume?.();
  window.removeEventListener("pointerdown", unlock);
  window.removeEventListener("keydown", unlock);
};
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export const playNotifySound = () => {
  try {
    const c = getCtx();
    if (!c || c.state !== "running") return; // still locked: stay silent rather than error
    const now = c.currentTime;
    [[880, 0], [1320, 0.16]].forEach(([freq, offset]) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
      osc.connect(gain).connect(c.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.4);
    });
  } catch {
    /* audio unavailable */
  }
};
