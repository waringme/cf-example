import { NextResponse } from 'next/server';
import { fetchVariations, getDefaultSource } from '@/lib/cta';

// Returns the variations currently authored on a content fragment, so the
// client can build its dropdown dynamically on each load.
export async function POST(request: Request) {
  let cfPath = getDefaultSource().cfPath;
  try {
    const body = await request.json();
    if (body?.cfPath) cfPath = body.cfPath;
  } catch {
    // No body -> use default cfPath.
  }

  try {
    const variations = await fetchVariations(cfPath);
    return NextResponse.json({ cfPath, variations });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Degrade gracefully: master always exists, so the app still works.
    return NextResponse.json({ cfPath, variations: ['master'], error: message }, { status: 200 });
  }
}
