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
  mock: boolean;
  /** The exact request that was issued, for the "how it works" panel. */
  debug: {
    wrapperServiceUrl: string;
    requestBody: Record<string, unknown>;
    resolvedGraphqlUrl: string;
  };
}

/** Defaults, overridable per-request from the UI or via env vars. */
export function getDefaultSource(): CtaSource {
  return {
    aemPublishOrigin:
      process.env.AEM_PUBLISH_ORIGIN ?? 'https://publish-p147324-e2050468.adobeaemcloud.com',
    graphqlQuery:
      process.env.AEM_GRAPHQL_QUERY ?? '/graphql/execute.json/ref-demo-eds/CTAByPath',
    wrapperServiceUrl:
      process.env.CF_WRAPPER_SERVICE_URL ??
      'https://3635370-refdemoapigateway-stage.adobeioruntime.net/api/v1/web/ref-demo-api-gateway/fetch-cf',
    cfPath:
      process.env.DEFAULT_CF_PATH ?? '/content/dam/mandg/en/fragments/promotions/fragment-one',
    variation: process.env.DEFAULT_CF_VARIATION ?? 'master',
  };
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
  const requestBody = {
    graphQLPath,
    cfPath,
    variation: `${variation};ts=${Date.now()}`,
  };
  const resolvedGraphqlUrl = `${graphQLPath};path=${cfPath};variation=${variation}`;

  const debug = { wrapperServiceUrl, requestBody, resolvedGraphqlUrl };

  // No publish origin configured -> render a sample fragment so the pattern is
  // visible without needing live AEM credentials.
  if (!publishOrigin) {
    const fragment = mockFragment();
    return {
      fragment,
      ctaHref: resolveCtaHref(fragment, publishOrigin),
      imageUrl: fragment.bannerimage?._publishUrl ?? null,
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

  return {
    fragment,
    ctaHref: resolveCtaHref(fragment, publishOrigin),
    imageUrl: fragment.bannerimage?._publishUrl ?? null,
    mock: false,
    debug,
  };
}
