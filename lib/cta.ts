// ---------------------------------------------------------------------------
// CTA content fragment fetcher
//
// This is the heart of the demo. It replicates how the ACCA EDS
// `content-fragment` block consumes a CTA content fragment on the publish tier:
//
//   1. It targets a GraphQL *persisted query* (`CTAByPath`) on the AEM publish
//      origin, parameterised with `;path=<cfPath>;variation=<variation>`.
//   2. Because a browser / third-party app cannot call AEM publish directly
//      (CORS), the request is proxied through an Adobe I/O Runtime "wrapper
//      service" that performs the GraphQL fetch server-side and returns JSON.
//
// The wrapper contract (POST body):
//   { graphQLPath, cfPath, variation }
// The wrapper appends `;path=<cfPath>;variation=<variation>` to graphQLPath and
// GETs it, returning the raw GraphQL response shape:
//   { data: { ctaByPath: { item: {...} } } }
// ---------------------------------------------------------------------------

export interface CtaFragment {
  title?: string;
  subtitle?: string;
  description?: { plaintext?: string; html?: string };
  bannerimage?: { _publishUrl?: string; _authorUrl?: string };
  ctalabel?: string;
  ctaurl?: string | { _path?: string; _publishUrl?: string; _authorUrl?: string; _url?: string };
}

export interface CtaSource {
  aemPublishOrigin: string;
  graphqlQuery: string;
  wrapperServiceUrl: string;
  cfPath: string;
  variation: string;
}

export interface CtaResult {
  fragment: CtaFragment;
  ctaHref: string;
  imageUrl: string | null;
  /** True when imageUrl was inherited from master because the variation had none. */
  imageFromMaster: boolean;
  mock: boolean;
  /** The exact request that was issued, for the "how it works" panel. */
  debug: {
    wrapperServiceUrl: string;
    requestBody: Record<string, unknown>;
    resolvedGraphqlUrl: string;
  };
}

// Hardcoded live defaults (M&G reference demo). Used whenever the matching env
// var is missing OR blank — a blank value (e.g. an empty Vercel env var) must
// NOT silently drop the app into mock mode.
const DEFAULTS = {
  aemPublishOrigin: 'https://publish-p147324-e2050468.adobeaemcloud.com',
  graphqlQuery: '/graphql/execute.json/ref-demo-eds/CTAByPath',
  wrapperServiceUrl:
    'https://3635370-refdemoapigateway-stage.adobeioruntime.net/api/v1/web/ref-demo-api-gateway/fetch-cf',
  directEndpoint: '/content/_cq_graphql/ref-demo-eds/endpoint.json',
  cfPath: '/content/dam/mandg/en/fragments/promotions/fragment-one',
  variation: 'master',
} as const;

/** Return the env var only if it's a non-blank string, else the fallback. */
function envOr(value: string | undefined, fallback: string): string {
  return value && value.trim() ? value.trim() : fallback;
}

/** Defaults, overridable per-request from the UI or via env vars. */
export function getDefaultSource(): CtaSource {
  return {
    aemPublishOrigin: envOr(process.env.AEM_PUBLISH_ORIGIN, DEFAULTS.aemPublishOrigin),
    graphqlQuery: envOr(process.env.AEM_GRAPHQL_QUERY, DEFAULTS.graphqlQuery),
    wrapperServiceUrl: envOr(process.env.CF_WRAPPER_SERVICE_URL, DEFAULTS.wrapperServiceUrl),
    cfPath: envOr(process.env.DEFAULT_CF_PATH, DEFAULTS.cfPath),
    variation: envOr(process.env.DEFAULT_CF_VARIATION, DEFAULTS.variation),
  };
}

export interface VariationOption {
  /** AEM variation name, e.g. "master" or "genai_retire_confidence". */
  name: string;
  /** The content fragment's title for that variation, used as the dropdown label. */
  title: string;
}

/**
 * List the variations authored on a content fragment, each with its title.
 *
 * The persisted `CTAByPath` query doesn't project `_variations`, so this hits
 * the AEM publish *direct* GraphQL endpoint (server-side, no CORS). One query
 * gets the variation names + master's title; a second aliased query fetches the
 * title for each remaining variation. Returns options ordered master-first so
 * the caller can build a dropdown labelled by fragment title.
 */
export async function fetchVariations(cfPath: string): Promise<VariationOption[]> {
  const origin = envOr(process.env.AEM_PUBLISH_ORIGIN, DEFAULTS.aemPublishOrigin).replace(/\/$/, '');
  const directEndpoint = envOr(process.env.AEM_GRAPHQL_DIRECT_ENDPOINT, DEFAULTS.directEndpoint);
  // Cache-buster so the variation list also reflects the latest published state.
  const url = `${origin}${directEndpoint}?cq=${Date.now()}`;

  const runQuery = async (query: string) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Variation lookup returned ${response.status} ${response.statusText}`);
    }
    return response.json();
  };

  // Step 1: master's title + the list of authored variation names.
  const base = await runQuery(
    `{ ctaByPath(_path: ${JSON.stringify(cfPath)}) { item { _variations title } } }`,
  );
  const baseItem = base?.data?.ctaByPath?.item;
  const names: string[] = baseItem?._variations ?? [];
  const options: VariationOption[] = [
    { name: 'master', title: baseItem?.title || 'Master' },
  ];

  // Step 2: fetch each variation's title in a single aliased query.
  if (names.length) {
    const aliases = names
      .map(
        (n, i) =>
          `v${i}: ctaByPath(_path: ${JSON.stringify(cfPath)}, variation: ${JSON.stringify(
            n,
          )}) { item { title } }`,
      )
      .join('\n');
    const titles = await runQuery(`{ ${aliases} }`);
    names.forEach((name, i) => {
      const title = titles?.data?.[`v${i}`]?.item?.title;
      options.push({ name, title: title || prettify(name) });
    });
  }

  return options;
}

/** Turn a variation name into a readable label when no title is available. */
function prettify(variation: string): string {
  return variation.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Resolve the CTA click-through URL from the fragment's `ctaurl` field. */
function resolveCtaHref(fragment: CtaFragment, publishOrigin: string): string {
  const cta = fragment.ctaurl;
  if (!cta) return '#';
  if (typeof cta === 'string') {
    return /^https?:\/\//i.test(cta) ? cta : `${publishOrigin}${cta}`;
  }
  const path = cta._publishUrl || cta._url || cta._path;
  if (!path) return '#';
  return /^https?:\/\//i.test(path) ? path : `${publishOrigin}${path}`;
}

/** A sample fragment so the demo renders even without a live AEM instance. */
function mockFragment(): CtaFragment {
  return {
    title: 'Start your career in finance with ACCA',
    subtitle: 'A world of opportunity',
    description: {
      plaintext:
        "We're committed to your success. That's why ACCA is the number one choice for accountancy students worldwide. Join the most forward-thinking accountancy body and start your journey today.",
    },
    bannerimage: {
      _publishUrl:
        'https://www.accaglobal.com/content/dam/ACCA_Global/img/website/homepage/big-stories/GettyImages-1491045995-banner.jpg',
    },
    ctalabel: 'Study with ACCA',
    ctaurl: 'https://www.accaglobal.com/uk/en/study-with-acca.html',
  };
}

export async function fetchCta(source: CtaSource): Promise<CtaResult> {
  const {
    aemPublishOrigin,
    graphqlQuery,
    wrapperServiceUrl,
    cfPath,
    variation,
  } = source;

  const publishOrigin = aemPublishOrigin.replace(/\/$/, '');
  const graphQLPath = `${publishOrigin}${graphqlQuery}`;
  // Cache-buster: a unique `cq` timestamp query param forces AEM/CDN to serve
  // the latest published version of the fragment. The wrapper appends the
  // variation last, so a trailing `?cq=...` on the variation lands at the very
  // end of the resolved URL as a valid query string.
  const cacheBuster = `cq=${Date.now()}`;
  const requestBody = {
    graphQLPath,
    cfPath,
    variation: `${variation}?${cacheBuster}`,
  };
  const resolvedGraphqlUrl = `${graphQLPath};path=${cfPath};variation=${variation}?${cacheBuster}`;

  const debug = { wrapperServiceUrl, requestBody, resolvedGraphqlUrl };

  // No publish origin configured -> render a sample fragment so the pattern is
  // visible without needing live AEM credentials.
  if (!publishOrigin) {
    const fragment = mockFragment();
    return {
      fragment,
      ctaHref: resolveCtaHref(fragment, publishOrigin),
      imageUrl: fragment.bannerimage?._publishUrl ?? null,
      imageFromMaster: false,
      mock: true,
      debug,
    };
  }

  const response = await fetch(wrapperServiceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    // Always fetch fresh — CTA content can change on the fly.
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Wrapper service returned ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const fragment: CtaFragment | undefined = payload?.data?.ctaByPath?.item;
  if (!fragment) {
    throw new Error(
      'No CTA fragment found at that path. Check the content fragment path and variation.',
    );
  }

  let imageUrl = fragment.bannerimage?._publishUrl ?? null;
  let imageFromMaster = false;

  // A variation often overrides only text and leaves the banner image unset in
  // the GraphQL projection (bannerimage: null). Fall back to master's image so
  // the promo still shows one — mirroring how CF variations inherit from master.
  if (!imageUrl && variation !== 'master') {
    try {
      const masterRes = await fetch(wrapperServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphQLPath, cfPath, variation: `master?cq=${Date.now()}` }),
        cache: 'no-store',
      });
      if (masterRes.ok) {
        const masterItem: CtaFragment | undefined = (await masterRes.json())?.data?.ctaByPath?.item;
        const masterImage = masterItem?.bannerimage?._publishUrl;
        if (masterImage) {
          imageUrl = masterImage;
          imageFromMaster = true;
        }
      }
    } catch {
      // Non-fatal — just render the promo without an image.
    }
  }

  return {
    fragment,
    ctaHref: resolveCtaHref(fragment, publishOrigin),
    imageUrl,
    imageFromMaster,
    mock: false,
    debug,
  };
}
