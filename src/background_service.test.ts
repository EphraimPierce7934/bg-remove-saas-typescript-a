import assert from "node:assert/strict";
import { createListing } from "./background_service.js";

const originalFetch = globalThis.fetch;
globalThis.fetch = async (_input, init) => {
  assert.equal(init?.method, "POST");
  const body = JSON.parse(String(init?.body));
  assert.deepEqual(body, { image: "data:image/png;base64,x", format: "png", idempotency_key: "tenant-a:acct-a:data:image/png;base64,x" });
  return new Response(JSON.stringify({ ok: true, data: { id: "asset-1" }, metadata: {} }), { status: 200 });
};
process.env.INFRAI_API_KEY = "test-key-from-env";
const result = await createListing({ tenantId: "tenant-a", accountId: "acct-a", image: "data:image/png;base64,x" });
assert.equal(result.state, "ready_for_review");
assert.deepEqual(result.asset, { id: "asset-1" });
globalThis.fetch = originalFetch;
console.log("background removal decision: ready_for_review");
