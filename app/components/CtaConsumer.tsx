'use client';

import { useEffect, useState } from 'react';
import type { CtaResult, CtaSource, VariationOption } from '@/lib/cta';
import CtaBanner from './CtaBanner';

// Client component: lets you point at any AEM publish origin + content
// fragment path, fetch it through our /api/cta route, and see the rendered
// CTA plus the exact request that was made.
export default function CtaConsumer({ defaults }: { defaults: CtaSource }) {
  const [source, setSource] = useState<CtaSource>(defaults);
  const [variations, setVariations] = useState<VariationOption[]>([
    { name: defaults.variation, title: defaults.variation },
  ]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [result, setResult] = useState<CtaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof CtaSource>(key: K, value: CtaSource[K]) {
    setSource((prev) => ({ ...prev, [key]: value }));
  }

  // Load the fragment's variations whenever the content fragment path changes
  // (debounced, since it's a free-text field). The dropdown always reflects
  // what's currently authored in AEM for that path.
  useEffect(() => {
    const cfPath = source.cfPath.trim();
    if (!cfPath) return;
    let cancelled = false;
    setVariationsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/variations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cfPath }),
        });
        const data = await res.json();
        if (cancelled) return;
        const list: VariationOption[] =
          Array.isArray(data?.variations) && data.variations.length
            ? data.variations
            : [{ name: 'master', title: 'Master' }];
        setVariations(list);
        // Keep the current selection if still valid, else fall back to the first.
        setSource((prev) =>
          list.some((o) => o.name === prev.variation)
            ? prev
            : { ...prev, variation: list[0].name },
        );
      } catch {
        if (!cancelled) setVariations([{ name: 'master', title: 'Master' }]);
      } finally {
        if (!cancelled) setVariationsLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [source.cfPath]);

  async function load(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/cta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data as CtaResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="consumer">
      <form className="controls" onSubmit={load}>
        <label>
          <span>AEM publish origin <em>(blank = mock data)</em></span>
          <input
            type="text"
            value={source.aemPublishOrigin}
            placeholder="https://publish-p12345-e67890.adobeaemcloud.com"
            onChange={(e) => update('aemPublishOrigin', e.target.value)}
          />
        </label>
        <label>
          <span>Content fragment path</span>
          <input
            type="text"
            value={source.cfPath}
            onChange={(e) => update('cfPath', e.target.value)}
          />
        </label>
        <div className="row">
          <label>
            <span>
              Variation{' '}
              <em>{variationsLoading ? '(loading…)' : `(${variations.length} in AEM)`}</em>
            </span>
            <select
              value={source.variation}
              autoComplete="off"
              onChange={(e) => update('variation', e.target.value)}
            >
              {/* If the selected variation isn't in the fetched list, still show it. */}
              {!variations.some((o) => o.name === source.variation) && (
                <option value={source.variation}>{source.variation}</option>
              )}
              {variations.map((o) => (
                <option key={o.name} value={o.name}>
                  {o.name === o.title ? o.name : `${o.name} — ${o.title}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>GraphQL persisted query</span>
            <input
              type="text"
              value={source.graphqlQuery}
              onChange={(e) => update('graphqlQuery', e.target.value)}
            />
          </label>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Fetching…' : 'Fetch CTA fragment'}
        </button>
      </form>

      {error && <p className="error">⚠ {error}</p>}

      {result && (
        <>
          {result.mock && result.mockReason === 'aem-unavailable' && (
            <p className="notice">
              AEM is <strong>unreachable</strong> (likely hibernating) — showing the repo&rsquo;s
              offline <code>cf-1</code> snapshot so the demo keeps working. It will fetch live again
              once AEM is back up.
            </p>
          )}
          {result.mock && result.mockReason !== 'aem-unavailable' && (
            <p className="notice">
              Showing <strong>mock data</strong> — set an AEM publish origin above (or
              <code>AEM_PUBLISH_ORIGIN</code> in <code>.env.local</code>) to fetch a live fragment.
            </p>
          )}

          <section className="preview">
            <h2>Rendered CTA</h2>
            <CtaBanner result={result} />
          </section>

          <section className="under-the-hood">
            <h2>How it was fetched</h2>
            <p>
              The browser posted to this app&rsquo;s <code>/api/cta</code> route, which called the
              Adobe I/O Runtime wrapper service. The wrapper GETs the AEM GraphQL persisted query
              server-side (avoiding CORS) and returns JSON.
            </p>
            <pre>
{`POST ${result.debug.wrapperServiceUrl}
Content-Type: application/json

${JSON.stringify(result.debug.requestBody, null, 2)}`}
            </pre>
            <p className="resolved">
              Wrapper resolves this to:<br />
              <code>{result.debug.resolvedGraphqlUrl}</code>
            </p>
            <details>
              <summary>Raw fragment JSON</summary>
              <pre>{JSON.stringify(result.fragment, null, 2)}</pre>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
