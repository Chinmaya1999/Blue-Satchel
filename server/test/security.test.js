import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";

const { default: app } = await import("../src/app.js");
const { generateToken } = await import("../src/utils/generateToken.js");
const { sanitizeBody } = await import("../src/middleware/security.js");

let server;
let base;
test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test("health endpoint responds ok", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "ok");
});

test("unknown API route returns 404 JSON", async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
});

test("protected routes reject requests without a token", async () => {
  for (const [method, path] of [
    ["GET", "/api/auth/me"],
    ["GET", "/api/auth/me/export"],
    ["DELETE", "/api/auth/me"],
    ["GET", "/api/scans"],
  ]) {
    const res = await fetch(`${base}${path}`, { method });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test("protected routes reject a forged token", async () => {
  const forged = jwt.sign({ id: "abc", role: "admin" }, "wrong-secret");
  const res = await fetch(`${base}/api/admin/scans`, { headers: { Authorization: `Bearer ${forged}` } });
  assert.equal(res.status, 401);
});

test("security headers are set", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.ok(res.headers.get("x-content-type-options"));
});

test("generateToken signs HS256 with id and role", () => {
  const decoded = jwt.verify(generateToken("u1", "customer"), "test-secret", { algorithms: ["HS256"] });
  assert.equal(decoded.id, "u1");
  assert.equal(decoded.role, "customer");
});

test("sanitizeBody strips Mongo operator keys", () => {
  const req = { body: { email: { $ne: null }, nested: { "a.b": 1, ok: 2 }, list: [{ $gt: 1, x: 1 }] } };
  sanitizeBody(req, {}, () => {});
  assert.deepEqual(req.body, { email: {}, nested: { ok: 2 }, list: [{ x: 1 }] });
});
