import { test } from "node:test";
import assert from "node:assert/strict";
import {
  handleTurn,
  initialState,
  parseName,
  parseSkinType,
  parseConcerns,
  parseBudget,
  parseAge,
  parseEmail,
  parsePhone,
} from "../src/services/chatbot.js";

// Runs a list of visitor inputs through the engine and returns the last result.
const run = (inputs, profile = {}) => {
  let state = initialState(profile);
  let out;
  for (const input of inputs) {
    out = handleTurn(state, typeof input === "string" ? { text: input } : input, profile);
    state = out.state;
  }
  return out;
};

test("parsers", () => {
  assert.equal(parseName("my name is priya sharma"), "Priya Sharma");
  assert.equal(parseName("hello"), null);
  assert.equal(parseName("what is niacinamide?"), null);
  assert.equal(parseSkinType("it's oily"), "oily");
  assert.equal(parseSkinType("oily and dry in places"), "combination");
  assert.equal(parseSkinType("no idea"), "unknown");
  assert.equal(parseSkinType("blue"), null);
  assert.deepEqual(parseConcerns("pimples and dark spots").sort(), ["acne", "spots"]);
  assert.deepEqual(parseConcerns("", ["hydration", "bogus"]), ["hydration"]);
  assert.equal(parseBudget("around 2k"), "2000");
  assert.equal(parseBudget("₹1,500"), "1500");
  assert.equal(parseBudget("no limit"), "0");
  assert.equal(parseBudget("cheap"), null);
  assert.equal(parseAge("I'm 27"), "25-34");
  assert.equal(parseAge("16"), "under-18");
  assert.equal(parseEmail("it is Me@Example.com thanks"), "me@example.com");
  assert.equal(parsePhone("+91 98765 43210"), "+919876543210");
  assert.equal(parsePhone("12345"), null);
});

test("full interview ends with a recommendation request and captured details", () => {
  const out = run(["Hi", "Priya", "oily", { text: "", values: ["acne", "pores"] }, "no", "27", "2500", "priya@example.com", "9876543210"]);
  const s = out.state;
  assert.equal(out.recommend, true);
  assert.equal(s.done, true);
  assert.equal(s.name, "Priya");
  assert.equal(s.skinType, "oily");
  assert.deepEqual(s.concerns, ["acne", "pores"]);
  assert.equal(s.sensitive, false);
  assert.equal(s.ageBand, "25-34");
  assert.equal(s.budget, "2500");
  assert.equal(s.email, "priya@example.com");
  assert.equal(s.phone, "+919876543210");
  assert.equal(s.consent, true);
});

test("skip contact still gives picks, with no consent recorded", () => {
  const out = run(["Sam", "dry", "dryness", "no", "40", "no limit", "skip"]);
  assert.equal(out.recommend, true);
  assert.equal(out.state.consent, false);
  assert.equal(out.state.email, null);
});

test("sensitive skin type skips the sensitivity question", () => {
  const out = run(["Sam", "sensitive"].concat([{ text: "none" }]));
  assert.equal(out.state.step, "age");
  assert.equal(out.state.sensitive, true);
});

test("answers a skin question mid-interview and re-asks the same step", () => {
  const out = run(["Sam", "what is niacinamide?"]);
  assert.equal(out.state.step, "skinType");
  assert.ok(out.replies[0].text.toLowerCase().includes("niacinamide"));
  assert.ok(out.replies.at(-1).quick.length > 0);
});

test("unrecognised input re-prompts and does not advance", () => {
  const out = run(["Sam", "purple"]);
  assert.equal(out.state.step, "skinType");
  assert.equal(out.state.fails, 1);
});

test("a medical red flag recommends a doctor and keeps the step", () => {
  const out = run(["Sam", "my face is swollen and has pus"]);
  assert.equal(out.state.flaggedMedical, true);
  assert.equal(out.state.step, "skinType");
  assert.match(out.replies[0].text, /dermatologist/);
});

test("invalid email is rejected at the contact step", () => {
  const out = run(["Sam", "dry", "none", "no", "30", "1000", "not-an-email"]);
  assert.equal(out.state.step, "contact");
  assert.equal(out.state.done, false);
});

test("signed-in user: name prefilled, account email can be reused", () => {
  const profile = { name: "Asha Rao", email: "asha@example.com", phone: "+919876543210" };
  assert.equal(initialState(profile).step, "skinType");
  const out = run(["combination", "none", "no", "30", "0", "use-account"], profile);
  assert.equal(out.state.email, "asha@example.com");
  assert.equal(out.state.consent, true);
  assert.equal(out.recommend, true);
});

test("restart resets; picks command works only when finished", () => {
  const early = run(["Sam", "cmd:picks"]);
  assert.equal(early.recommend, false);
  const done = run(["Sam", "dry", "none", "no", "30", "0", "skip", "show my products"]);
  assert.equal(done.recommend, true);
  const reset = run(["Sam", "dry", "none", "no", "30", "0", "skip", "start over"]);
  assert.equal(reset.state.step, "name");
});

test("after finishing, small talk and questions are handled", () => {
  const after = (msg) => run(["Sam", "dry", "none", "no", "30", "0", "skip", msg]);
  assert.match(after("thanks!").replies[0].text, /welcome/i);
  assert.match(after("how do I use sunscreen").replies[0].text, /SPF/);
  assert.match(after("asdf qwer").replies[0].text, /picks/i);
});

test("oversized or odd input never throws", () => {
  assert.doesNotThrow(() => run(["x".repeat(5000), "<script>alert(1)</script>", { text: "a", values: [1, null, {}] }]));
});
