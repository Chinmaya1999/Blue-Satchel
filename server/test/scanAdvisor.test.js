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

test("full conversation gives a plan and still shows no products", () => {
  const out = run([{ values: ["pores", "texture"] }, { values: ["sun", "sleep"] }, "oily", "no", { values: ["cleanser"] }]);
  assert.equal(out.state.planned, true);
  assert.equal(out.action, null);
  const all = out.replies.map((r) => r.text).join("\n");
  assert.match(all, /Pores — High/);
  assert.match(all, /SPF/); // lifestyle + missing sunscreen
  assert.match(all, /missing sunscreen/);
  assert.ok(out.replies.at(-1).quick.some((q) => q.value === "cmd:products"));
});

test("products only after the user asks; typing yes works too", () => {
  const plan = ["pores", "none", "dry", "no", "none"].map((x) => (x === "pores" ? { values: ["pores"] } : x));
  assert.equal(run(plan).action, null);
  assert.equal(run([...plan, "cmd:products"]).action, "products");
  assert.equal(run([...plan, "yes please"]).action, "products");
  assert.equal(run([...plan, "not now"]).action, null);
});

test("asking for products early finishes the interview first", () => {
  const out = run(["cmd:products"]);
  assert.equal(out.action, null);
  assert.equal(out.state.step, "goals");
});

test("dermatologists on request, and for red flags", () => {
  assert.equal(run(["cmd:derm"]).action, "dermatologists");
  assert.equal(run(["is there a dermatologist near me"]).action, "dermatologists");
  assert.equal(run(["my skin has pus and swelling"]).action, "dermatologists");
});

test("severe findings add a dermatologist recommendation to the plan", () => {
  const severe = { ...scan, concerns: [{ key: "acne", label: "Acne", severity: 85, level: "High" }] };
  assert.equal(needsDermatologist(severe), true);
  assert.equal(needsDermatologist(scan), false);
  const out = run([{ values: ["acne"] }, "none", "oily", "no", "none"], { scan: severe, profile: {} });
  assert.match(out.replies.map((r) => r.text).join("\n"), /dermatologist/i);
});

test("free text goals, 'you choose', and questions mid-flow", () => {
  assert.deepEqual(run(["clear my pores and dark spots"]).state.goals.sort(), ["pores", "spots"]);
  assert.equal(run(["you choose"]).state.goals.length, 3);
  const q = run(["what is retinol?"]);
  assert.equal(q.state.step, "goals");
  assert.match(q.replies[0].text, /retinol/i);
});

test("profile skin type skips the skin question", () => {
  const out = run([{ values: ["pores"] }, "none"], { scan, profile: { skinType: "oily" } });
  assert.equal(out.state.step, "sensitivity");
  const sensitive = run([{ values: ["pores"] }, "none"], { scan, profile: { skinType: "sensitive" } });
  assert.equal(sensitive.state.step, "routine");
});

test("change answers restarts; garbage never throws", () => {
  assert.equal(run([{ values: ["pores"] }, "none", "dry", "no", "none", "cmd:redo"]).state.step, "goals");
  assert.doesNotThrow(() => run(["x".repeat(3000), { text: "a", values: [1, null] }, "???"]));
});
