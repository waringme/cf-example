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
    const { variations, mock } = await fetchVariations(cfPath);
    return NextResponse.json({ cfPath, variations, mock });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Degrade gracefully: master always exists, so the app still works.
    return NextResponse.json(
      { cfPath, variations: [{ name: 'master', title: 'Master' }], mock: true, error: message },
      { status: 200 },
    );
  }
}
