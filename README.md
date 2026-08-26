# cf-example

A minimal **Next.js** web app that consumes an **AEM CTA content fragment** and
renders it — demonstrating how a content fragment authored once in Adobe
Experience Manager can be reused by any third-party web app.

It reproduces the exact consumption pattern used by the ACCA Edge Delivery
Services `content-fragment` block (the "col-promo" style CTA banner), but as a
standalone app that has nothing to do with Edge Delivery.

## What it demonstrates

A CTA content fragment lives in AEM with fields like `title`, `subtitle`,
`description`, `bannerimage`, `ctalabel`, and `ctaurl`. Any consumer can fetch it:

```
Browser ──POST──▶ /api/cta (this app, server-side)
                     │
                     └─POST──▶ Adobe I/O Runtime wrapper service
                                  │
                                  └─GET──▶ AEM publish GraphQL persisted query
                                           /graphql/execute.json/ref-demo-eds/CTAByPath
                                           ;path=<cfPath>;variation=<variation>
```

The **wrapper service** (an Adobe I/O Runtime action) performs the GraphQL
request server-side and returns JSON, so a browser can consume the fragment
without running into CORS. This is the same gateway the EDS block posts to on
publish.

The page lets you point at any AEM publish origin + content fragment path, fetch
it, and see both the **rendered CTA banner** and the **exact request** that was
made.

## Two pages

| Route     | What it is                                                                  |
| --------- | --------------------------------------------------------------------------- |
| `/`       | Developer test page — enter any origin / path / variation and inspect the request. |
| `/advice` | A pretend **M&G Wealth** financial-advice mobile app (purple brand). The feed contains a sponsored promo pulled live from a CTA content fragment — text with the image below, sized for a phone. A **dropdown at the top switches variation** between the real M&G promotion fragments. |

Defaults point at the M&G AEM instance
(`https://publish-p147324-e2050468.adobeaemcloud.com`,
`/content/dam/mandg/en/fragments/promotions/fragment-one`), so both pages fetch
live content out of the box.

## Running locally

```bash
npm install
cp .env.example .env.local   # optional — edit to point at your AEM
npm run dev
```

Open http://localhost:3000.

With no `AEM_PUBLISH_ORIGIN` configured, the app renders a **sample (mock) CTA
fragment** so you can see the pattern immediately. Fill in your AEM publish
origin (in the form or `.env.local`) to fetch a live fragment.

## Configuration

| Env var                  | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `AEM_PUBLISH_ORIGIN`     | AEM publish origin hosting the GraphQL endpoint. Blank = mock. |
| `AEM_GRAPHQL_QUERY`      | Persisted query path (default: `…/ref-demo-eds/CTAByPath`).     |
| `CF_WRAPPER_SERVICE_URL` | Adobe I/O Runtime wrapper that proxies the GraphQL call.        |
| `DEFAULT_CF_PATH`        | Content fragment path loaded by default.                       |
| `DEFAULT_CF_VARIATION`   | Variation (default: `master`).                                 |

## Project structure

```
app/
  page.tsx               Landing page + intro copy
  layout.tsx             Root layout
  globals.css            Styles (CTA banner mirrors the EDS block)
  api/cta/route.ts       Server route that proxies to the wrapper service
  components/
    CtaConsumer.tsx      Client UI: form + fetch + "how it works" panel
    CtaBanner.tsx        Renders the CTA fragment as a banner
lib/
  cta.ts                 Core fetch logic + mock fallback
```

## Reference

Modeled on the `content-fragment` block in the ACCA Edge Delivery project
(`blocks/content-fragment/content-fragment.js`).
