import type { CtaResult } from '@/lib/cta';

// Renders the CTA content fragment as a banner, faithful to the ACCA EDS
// `content-fragment` block markup (title + accent underline, subtitle,
// description, and a button linking to the CTA target) over a background image
// with a gradient overlay.
export default function CtaBanner({ result }: { result: CtaResult }) {
  const { fragment, ctaHref, imageUrl } = result;

  const overlay =
    'linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.1) 80%)';
  const bg = imageUrl
    ? `${overlay}, url('${imageUrl}')`
    : 'linear-gradient(90deg, #1f1f1f, #4a4a4a)';

  return (
    <div className="cta-banner" style={{ backgroundImage: bg }}>
      <div className="cta-detail">
        {fragment.subtitle && <p className="cta-subtitle">{fragment.subtitle}</p>}
        {fragment.title && <h2 className="cta-title">{fragment.title}</h2>}
        {fragment.description?.plaintext && (
          <p className="cta-description">{fragment.description.plaintext}</p>
        )}
        {fragment.ctalabel && (
          <a className="cta-button" href={ctaHref} target="_blank" rel="noopener noreferrer">
            {fragment.ctalabel}
          </a>
        )}
      </div>
    </div>
  );
}
