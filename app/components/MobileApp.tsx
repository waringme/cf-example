'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CtaResult } from '@/lib/cta';

// Each dropdown option maps to a real content fragment + variation on the
// M&G AEM instance. Selecting one re-fetches the promo shown in the app.
// (fragment-one only has a `master` variation; fragment-two is a sibling promo
// with a different CTA — together they demonstrate switching CF content live.)
const CF_BASE = '/content/dam/mandg/en/fragments/promotions';

type Offer = { id: string; label: string; cfPath: string; variation: string };

const OFFERS: Offer[] = [
  {
    id: 'master',
    label: 'Master — “Check Now”',
    cfPath: `${CF_BASE}/fragment-one`,
    variation: 'master',
  },
  {
    id: 'advice',
    label: 'Advice — “Explore Financial Advice”',
    cfPath: `${CF_BASE}/fragment-two`,
    variation: 'master',
  },
];

function PromoFragment({ result }: { result: CtaResult }) {
  const { fragment, ctaHref, imageUrl } = result;
  // Stacked, mobile-friendly layout: text on top, image below.
  return (
    <div className="promo-card">
      <span className="promo-tag">Sponsored · Content Fragment</span>
      {fragment.subtitle && <p className="promo-eyebrow">{fragment.subtitle}</p>}
      {fragment.title && <h3 className="promo-title">{fragment.title}</h3>}
      {fragment.description?.plaintext && (
        <p className="promo-desc">{fragment.description.plaintext}</p>
      )}
      {fragment.ctalabel && (
        <a className="promo-cta" href={ctaHref} target="_blank" rel="noopener noreferrer">
          {fragment.ctalabel}
        </a>
      )}
      {imageUrl && (
        <div className="promo-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={fragment.title ?? 'Promotion'} />
        </div>
      )}
    </div>
  );
}

export default function MobileApp() {
  const [offerId, setOfferId] = useState<string>(OFFERS[0].id);
  const [result, setResult] = useState<CtaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadOffer = useCallback(async (id: string) => {
    const offer = OFFERS.find((o) => o.id === id) ?? OFFERS[0];
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cfPath: offer.cfPath, variation: offer.variation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data as CtaResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffer(offerId);
  }, [offerId, loadOffer]);

  return (
    <div className="phone-wrap">
      <div className="phone">
        {/* App bar */}
        <div className="app-bar">
          <div className="app-brand">
            <span className="app-logo">M&amp;G</span>
            <span className="app-name">Wealth</span>
          </div>
          <div className="app-avatar" aria-hidden>
            AC
          </div>
        </div>

        {/* Variation selector */}
        <div className="variation-bar">
          <label htmlFor="variation">Promotion variation</label>
          <select
            id="variation"
            value={offerId}
            autoComplete="off"
            onChange={(e) => setOfferId(e.target.value)}
          >
            {OFFERS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="app-scroll">
          {/* Greeting + balance */}
          <section className="greeting">
            <p className="hello">Good morning, Alex</p>
            <div className="balance-card">
              <span className="balance-label">Total portfolio value</span>
              <span className="balance-value">£128,450.20</span>
              <span className="balance-change up">▲ £1,240.85 (0.98%) today</span>
            </div>
          </section>

          {/* Quick actions */}
          <section className="quick-actions">
            {['Invest', 'Withdraw', 'Goals', 'Advice'].map((a) => (
              <button key={a} className="quick-action" type="button">
                <span className="qa-icon" aria-hidden />
                {a}
              </button>
            ))}
          </section>

          {/* Pretend financial advice content */}
          <section className="feed">
            <h2 className="feed-title">Your financial insights</h2>

            <article className="tip-card">
              <span className="tip-kicker">Retirement</span>
              <h3>You&rsquo;re on track for your 2045 goal</h3>
              <p>
                Based on your current contributions, you&rsquo;re projected to reach 92% of your
                retirement target. Increasing your monthly payment by £75 could close the gap.
              </p>
            </article>

            <article className="tip-card">
              <span className="tip-kicker">Tax</span>
              <h3>£4,200 of ISA allowance remaining</h3>
              <p>
                Make the most of this tax year&rsquo;s allowance before 5 April to keep more of your
                returns tax-free.
              </p>
            </article>

            {/* Content fragment promo section */}
            <div className="promo-section">
              {loading && <div className="promo-skeleton" aria-label="Loading promotion" />}
              {error && <p className="promo-error">Couldn&rsquo;t load promotion: {error}</p>}
              {!loading && !error && result && <PromoFragment result={result} />}
            </div>

            <article className="tip-card">
              <span className="tip-kicker">Markets</span>
              <h3>Global equities rose 1.2% this week</h3>
              <p>
                Your diversified portfolio benefited from strength in technology and healthcare
                sectors.
              </p>
            </article>
          </section>
        </div>

        {/* Bottom nav */}
        <nav className="tab-bar">
          {['Home', 'Invest', 'Advice', 'Profile'].map((t, i) => (
            <button key={t} className={`tab ${i === 0 ? 'active' : ''}`} type="button">
              <span className="tab-icon" aria-hidden />
              {t}
            </button>
          ))}
        </nav>
      </div>

      <p className="phone-caption">
        The purple <strong>“Sponsored · Content Fragment”</strong> card is pulled live from AEM via
        the same CTA fragment. Use the dropdown at the top to switch variation.
      </p>
    </div>
  );
}
