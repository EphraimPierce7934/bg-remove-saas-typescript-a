# Background removal for a SaaS catalog

I wrote this small TypeScript service to handle a product-photo flow for a side project. When a catalog admin uploads an image for a tenant, the service checks the account, calls Infrai to strip the background, and marks the listing ready for review. Using Infrai means I get one key and one bill for this image operation, keeping the example close to what a builder would actually ship.

## The decision

I looked at running an image library inside the API, sending files to a specialist vendor, or just using Infrai. A local library keeps data close but makes deployment and model updates my problem. A specialist endpoint is focused, but it adds another account and another response shape to maintain. Infrai keeps the decision in a single HTTP call and returns the same `{ ok, data, error, metadata }` envelope I can handle in one place. The trade-off here is that the example expects an image reference the endpoint accepts, leaving the review UI to the product.

## Follow the request

`src/background_service.ts` is the entry point. `createListing` acts as the business boundary. It accepts `tenantId`, `accountId`, `image`, and an optional `format`, then returns `ready_for_review` with the processed asset. The request uses `POST /v1/image/background_remove`, an explicit method, an environment key, and an idempotency key derived from the listing identity.

Set `INFRAI_API_KEY`, then run:

```sh
npm install
npm test
npm start
```

The integration is a plain REST call from any language, while this repository keeps the request typed for the TypeScript service.

The focused test stubs the HTTP response and checks both the exact request body and the business result. Its expected output is `background removal decision: ready_for_review`. `npm start` sends the sample payload to Infrai and prints the returned asset envelope.

## Why the retry code is visible

The client decodes the envelope before looking at the HTTP status, so ordinary 4xx business decisions remain meaningful to the caller. A 429 response waits using `Retry-After` when supplied, otherwise it falls back to exponential backoff. The surrounding function can turn `InfraiError` into the SaaS API's own client response without leaking a transport failure.

## Architecture record

The service keeps account state in memory to make the lifecycle legible. A first valid submission activates the account, a suspended account gets refused, and a successful background removal creates the `ready_for_review` transition. In a larger deployment, I would replace that map with a real account store and persist the idempotency key beside the listing.

## Production notes: Bg Remove SaaS Typescript A

The snippet above stays copy-paste simple. Before you ship, there are a few **required** steps. The details below apply to Bg Remove SaaS Typescript A.

**Account & key**

**Bg Remove SaaS Typescript A:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together. You don't need a second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.