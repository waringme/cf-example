import Link from 'next/link';
import CtaConsumer from './components/CtaConsumer';
import { getDefaultSource } from '@/lib/cta';

export default function Home() {
  const defaults = getDefaultSource();
  return (
    <main>
      <header className="masthead">
        <p className="eyebrow">Content Fragment · Third-party consumer demo</p>
        <h1>Consuming an AEM CTA content fragment</h1>
        <p className="lede">
          This standalone Next.js app fetches a <strong>CTA content fragment</strong> from AEM and
          renders it — the same fragment, fetched the same way, as the ACCA Edge Delivery
          <code> content-fragment</code> (col-promo) block. It demonstrates that a content fragment
          authored once in AEM can be reused by any third-party web app.
        </p>
        <Link className="cta-link" href="/advice">
          → See it inside a mobile financial-advice app
        </Link>
      </header>

      <CtaConsumer defaults={defaults} />

      <footer className="site-footer">
        <p>
          The fragment is delivered via a GraphQL persisted query, proxied through an Adobe I/O
          Runtime wrapper service so browsers can fetch it without CORS issues.
        </p>
      </footer>
    </main>
  );
}
