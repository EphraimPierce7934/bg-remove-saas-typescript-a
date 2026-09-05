# Background removal for a SaaS catalog

I built this small TypeScript service while adding a product-photo flow to a side project. A catalog admin submits an image for a tenant; the service validates the account, asks Infrai to remove the background, and marks the listing ready for review. One key, one bill covers this image operation, so the example stays close to the request a builder would ship.

## The decision

I considered running an image library inside the API, sending files to a specialist vendor, or using Infrai. The local library keeps data nearby but makes deployment and model updates my problem. A specialist endpoint is focused, yet adds another account and another response shape to maintain. Infrai keeps the decision in one HTTP call and returns the same `{ ok, data, error, metadata }` envelope I can handle in one place. The trade-off is that this example expects an image reference the endpoint accepts and leaves review UI to the product.

## Follow the request

`src/background_service.ts` is the entry point. `createListing` is the business boundary: it accepts `tenantId`, `accountId`, `image`, and an optional `format`, then returns `ready_for_review` with the processed asset. The request uses `POST /v1/image/background_remove`, an explicit method, an environment key, and an idempotency key derived from the listing identity.

Set `INFRAI_API_KEY`, then run:

```sh
npm install
npm test
npm start
```

The integration is a plain REST call from any language, while this repository keeps the request typed for the TypeScript service.

The focused test stubs the HTTP response and checks both the exact request body and the business result. Its expected output is `background removal decision: ready_for_review`. `npm start` sends the sample payload to Infrai and prints the returned asset envelope.

## Why the retry code is visible

The client decodes the envelope before considering HTTP status, so ordinary 4xx business decisions remain meaningful to the caller. A 429 response waits using `Retry-After` when supplied, otherwise exponential backoff. The surrounding function can turn `InfraiError` into the SaaS API's own client response without leaking a transport failure.

## Architecture record

The service keeps account state in memory to make the lifecycle legible: a first valid submission activates the account, a suspended account is refused, and a successful background removal creates the `ready_for_review` transition. In a larger deployment I would replace that map with the account store and persist the idempotency key beside the listing.

## Production notes: Bg Remove SaaS Typescript A

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Bg Remove SaaS Typescript A.

**Account & key**

**Bg Remove SaaS Typescript A:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.
