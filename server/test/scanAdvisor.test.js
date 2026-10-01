import { test } from "node:test";
import assert from "node:assert/strict";
import { handleAdvisor, initialAdvisorState, needsDermatologist } from "../src/services/scanAdvisor.js";

const scan = {
  overallScore: 61,
  overallLabel: "Fair",
  concerns: [
    { key: "pores", label: "Pores", severity: 72, level: "High" },
    { key: "texture", label: "Texture", severity: 55, level: "Medium" },
    { key: "redness", label: "Redness", severity: 48, level: "Medium" },
    { key: "moisture", label: "Hydration", severity: 30, level: "Low" },
  ],
};

const run = (inputs, ctx = { scan, profile: {} }) => {
  let state = initialAdvisorState();
  let out;
  for (const i of inputs) {
    out = handleAdvisor(state, typeof i === "string" ? { text: i } : i, ctx);
    state = out.state;
  }
  return out;
};

test("init summarises the scan and asks what to improve (no products)", () => {
  const out = handleAdvisor(initialAdvisorState(), { init: true }, { scan, profile: {} });
  assert.match(out.replies[0].text, /61\/100/);
  assert.match(out.replies[0].text, /pores/i);
  assert.equal(out.action, null);
  const last = out.replies.at(-1);
  assert.equal(last.input, "multi");
  assert.equal(last.quick[0].value, "pores"); // strongest first
});

test("two questions, then a short plan with a products button — and no products yet", () => {
  const out = run([{ values: ["pores", "texture"] }, "oily"]);
  assert.equal(out.state.planned, true);
  assert.equal(out.action, null);
  const all = out.replies.map((r) => r.text).join("\n");
  assert.match(all, /Pores \(High\)/);
  assert.match(all, /sunscreen/i);
  assert.ok(out.replies.at(-1).quick.some((q) => q.value === "cmd:products"));
});

test("products appear only on request, at any point; typing yes works", () => {
  const plan = [{ values: ["pores"] }, "dry"];
  assert.equal(run(plan).action, null);
  assert.equal(run([...plan, "cmd:products"]).action, "products");
  assert.equal(run([...plan, "yes please"]).action, "products");
  assert.equal(run([...plan, "not now"]).action, null);
  // Early request: falls back to the strongest findings.
  const early = run(["cmd:products"]);
  assert.equal(early.action, "products");
  assert.deepEqual(early.state.goals, ["pores", "texture", "redness"]);
});

test("dermatologists on request, and for red flags", () => {
  assert.equal(run(["cmd:derm"]).action, "dermatologists");
  assert.equal(run(["is there a dermatologist near me"]).action, "dermatologists");
  assert.equal(run(["my skin has pus and swelling"]).action, "dermatologists");
});

test("severe findings add a dermatologist note to the plan", () => {
  const severe = { ...scan, concerns: [{ key: "acne", label: "Acne", severity: 85, level: "High" }] };
  assert.equal(needsDermatologist(severe), true);
  assert.equal(needsDermatologist(scan), false);
  const out = run([{ values: ["acne"] }, "oily"], { scan: severe, profile: {} });
  assert.match(out.replies.map((r) => r.text).join("\n"), /dermatologist/i);
});

test("free text goals, 'you choose', and questions mid-flow", () => {
  assert.deepEqual(run(["clear my pores and dark spots"]).state.goals.sort(), ["pores", "spots"]);
  assert.equal(run(["you choose"]).state.goals.length, 3);
  const q = run(["what is retinol?"]);
  assert.equal(q.state.step, "goals");
  assert.match(q.replies[0].text, /retinol/i);
});

test("a known skin type skips the skin question; sensitive is remembered", () => {
  const out = run([{ values: ["pores"] }], { scan, profile: { skinType: "oily" } });
  assert.equal(out.state.planned, true);
  const sens = run([{ values: ["pores"] }, "sensitive"]);
  assert.equal(sens.state.sensitive, true);
});

test("start over restarts; garbage never throws", () => {
  assert.equal(run([{ values: ["pores"] }, "dry", "cmd:redo"]).state.step, "goals");
  assert.doesNotThrow(() => run(["x".repeat(3000), { text: "a", values: [1, null] }, "???"]));
});
