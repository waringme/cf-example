'use client';

import { useState } from 'react';
import type { CtaResult, CtaSource } from '@/lib/cta';
import CtaBanner from './CtaBanner';

// Client component: lets you point at any AEM publish origin + content
// fragment path, fetch it through our /api/cta route, and see the rendered
// CTA plus the exact request that was made.
export default function CtaConsumer({ defaults }: { defaults: CtaSource }) {
  const [source, setSource] = useState<CtaSource>(defaults);
  const [result, setResult] = useState<CtaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof CtaSource>(key: K, value: CtaSource[K]) {
    setSource((prev) => ({ ...prev, [key]: value }));
  }

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
            <span>Variation</span>
            <input
              type="text"
              value={source.variation}
              onChange={(e) => update('variation', e.target.value)}
            />
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
          {result.mock && (
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
