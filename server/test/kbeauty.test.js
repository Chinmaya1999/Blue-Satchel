import { test } from "node:test";
import assert from "node:assert/strict";
import { handleKBeauty, initialKState, KOREAN_BRANDS } from "../src/services/kbeauty.js";

const scan = {
  overallScore: 70,
  overallLabel: "Good",
  concerns: [
    { key: "acne", label: "Acne", severity: 60, level: "Medium" },
    { key: "moisture", label: "Hydration", severity: 45, level: "Medium" },
    { key: "radiance", label: "Radiance", severity: 40, level: "Medium" },
  ],
};
const run = (inputs, ctx = { scan, profile: {} }) => {
  let state = initialKState();
  let out;
  for (const i of inputs) {
    out = handleKBeauty(state, typeof i === "string" ? { text: i } : i, ctx);
    state = out.state;
  }
  return out;
};

test("intro asks for goals; guide explains Korean treatment and routine", () => {
  const intro = handleKBeauty(initialKState(), { init: true }, { scan, profile: {} });
  assert.equal(intro.replies.at(-1).input, "multi");
  const out = run([{ values: ["acne", "moisture"] }, "oily"]);
  assert.equal(out.state.planned, true);
  assert.equal(out.action, null);
  const all = out.replies.map((r) => r.text).join("\n");
  assert.match(all, /centella/i);
  assert.match(all, /skin flooding/i);
  assert.match(all, /AM:.*PM:/s);
  assert.ok(out.replies.at(-1).quick.some((q) => q.value === "cmd:products"));
});

test("Korean products only on request", () => {
  const plan = [{ values: ["acne"] }, "dry"];
  assert.equal(run(plan).action, null);
  assert.equal(run([...plan, "cmd:products"]).action, "products");
  assert.equal(run(["glass skin", "normal", "show me"]).action, "products");
});

test("answers K-beauty questions at any time", () => {
  const mid = run(["what is double cleansing?"]);
  assert.match(mid.replies[0].text, /oil or balm/i);
  assert.equal(mid.state.step, "goals");
  assert.match(run([{ values: ["acne"] }, "oily", "what is snail mucin"]).replies[0].text, /snail/i);
});

test("red flags point to a doctor; garbage is safe", () => {
  assert.match(run(["my face is swollen and bleeding"]).replies[0].text, /dermatologist/);
  assert.doesNotThrow(() => run(["x".repeat(4000), { values: [1, {}] }]));
});

test("brand list includes the Korean brands in the catalogue", () => {
  assert.ok(KOREAN_BRANDS.includes("COSRX") && KOREAN_BRANDS.includes("Beauty of Joseon"));
});
