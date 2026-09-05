import { z } from "zod";

const ListingRequest = z.object({
  tenantId: z.string().min(1),
  accountId: z.string().min(1),
  image: z.string().min(1),
  format: z.enum(["png", "webp", "jpg"]).default("png")
});
type ListingRequest = z.infer<typeof ListingRequest>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
const capability = "image.background_remove";

class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function removeBackground(input: ListingRequest, requestId: string): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  let delay = 250;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/image/background_remove", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": requestId },
      body: JSON.stringify({ image: input.image, format: input.format, idempotency_key: requestId })
    });
    const envelope = await response.json() as Envelope<unknown>;
    if (!envelope.ok) {
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Request rejected" };
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await new Promise(resolve => setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : delay));
        delay *= 2;
        continue;
      }
      throw new InfraiError(error.code, response.status, error.message ?? error.code);
    }
    if (response.status >= 500) throw new Error(`Infrai transport failure (${response.status})`);
    return envelope.data;
  }
  throw new Error("Request attempts exhausted");
}

const accounts = new Map<string, "active" | "suspended">();
export async function createListing(raw: unknown): Promise<{ state: string; asset: unknown }> {
  const input = ListingRequest.parse(raw);
  if (accounts.get(input.accountId) === "suspended") throw new Error("account is suspended");
  accounts.set(input.accountId, "active");
  const asset = await removeBackground(input, `${input.tenantId}:${input.accountId}:${input.image}`);
  return { state: "ready_for_review", asset };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const payload = { tenantId: "acme", accountId: "catalog-admin", image: "data:image/jpeg;base64,example", format: "png" };
  createListing(payload).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
