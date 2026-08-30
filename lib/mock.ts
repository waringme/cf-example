// ---------------------------------------------------------------------------
// Offline mock for the cf-1 CTA content fragment.
//
// AEM as a Cloud Service dev/stage environments hibernate when idle, so a live
// fetch can fail (timeout / 503 / network error) even though nothing is wrong
// with the app. To keep the demo working, we ship a snapshot of cf-1 — its
// master plus every authored variation — in `mock/cf-1.json`, with the banner
// images copied into `/public/mock`. `fetchCta` / `fetchVariations` fall back
// to this snapshot whenever AEM is unreachable for the cf-1 path.
//
// Regenerate the snapshot by refetching the CTAByPath persisted query for each
// variation and re-downloading the banner images into /public/mock.
// ---------------------------------------------------------------------------

import type { CtaFragment, VariationOption } from './cta';
import cf1 from './mock/cf-1.json';

/** The content fragment path this mock snapshot represents. */
export const MOCK_CF_PATH = cf1.cfPath;

type MockItems = Record<string, CtaFragment>;
// The snapshot uses `bannerimage: null` for variations that inherit master's
// image; CtaFragment models that field as optional, so cast through unknown.
const items = cf1.items as unknown as MockItems;

/** True when we have a mock snapshot for this content fragment path. */
export function hasMock(cfPath: string): boolean {
  return cfPath.trim() === MOCK_CF_PATH;
}

/** Variations authored on the mock fragment, master-first. */
export function mockVariations(): VariationOption[] {
  return cf1.variations.map((v) => ({ name: v.name, title: v.title }));
}

/**
 * The mock fragment for a variation, or undefined if that variation isn't in
 * the snapshot. Banner images resolve to local `/mock/*.png` copies, so this
 * works with no network access.
 */
export function mockFragmentFor(variation: string): CtaFragment | undefined {
  return items[variation] ?? undefined;
}

/** The master fragment — used to inherit a banner image the way AEM does. */
export function mockMaster(): CtaFragment {
  return items.master;
}
