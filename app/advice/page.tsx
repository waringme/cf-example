import Link from 'next/link';
import MobileApp from '../components/MobileApp';

export const metadata = {
  title: 'M&G Wealth — mobile app demo (CTA content fragment)',
  description:
    'A pretend financial-advice mobile app that pulls in an AEM CTA content fragment as a sponsored promo.',
};

export default function AdvicePage() {
  return (
    <main className="advice-main">
      <div className="advice-intro">
        <p className="eyebrow">Content Fragment · In-app promo</p>
        <h1>Financial advice app</h1>
        <p className="lede">
          A pretend M&amp;G Wealth mobile app. The scrollable feed contains a{' '}
          <strong>sponsored promo pulled live from an AEM CTA content fragment</strong> — text with
          the image below, sized for a phone screen. Pick a variation from the dropdown at the top
          of the app.
        </p>
        <Link className="back-link" href="/">
          ← Back to the developer test page
        </Link>
      </div>

      <MobileApp />
    </main>
  );
}
