import { NextResponse } from 'next/server';
import { fetchCta, getDefaultSource, type CtaSource } from '@/lib/cta';

// Server-side route so secrets (publish origin, wrapper URL) stay off the
// client, and so the actual GraphQL fetch happens server-to-server.
export async function POST(request: Request) {
  const defaults = getDefaultSource();
  let body: Partial<CtaSource> = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine — fall back entirely to defaults.
  }

  const source: CtaSource = {
    aemPublishOrigin: body.aemPublishOrigin ?? defaults.aemPublishOrigin,
    graphqlQuery: body.graphqlQuery || defaults.graphqlQuery,
    wrapperServiceUrl: body.wrapperServiceUrl || defaults.wrapperServiceUrl,
    cfPath: body.cfPath || defaults.cfPath,
    variation: body.variation || defaults.variation,
  };

  try {
    const result = await fetchCta(source);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
