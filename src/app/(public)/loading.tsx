import BrandedLoader from '@/components/common/BrandedLoader';

// Phase 15 — Tier 1 default route-segment loading UI.
// App Router renders this during real Suspense / data-fetch waits.
// /admin/* overrides this with its own loading.tsx that returns null,
// so the public branded loader never appears on admin routes.
//
// The wrapper reserves a viewport's worth of height in the document
// flow. BrandedLoader itself is `fixed inset-0`, so on its own it
// occupied zero space: while the page streamed, <main> collapsed to
// nothing and the footer sat in the middle of the screen, then got
// shoved down when the real content arrived — a ~0.5 CLS on every
// cold load, the single largest layout shift on the site. Reserving
// the height keeps the footer below the fold until the content
// replaces this, so the move is off-screen and costs nothing. The
// spacer is behind a full-screen opaque overlay, so it is invisible.
export default function Loading() {
  return (
    <div className="min-h-screen" aria-hidden="true">
      <BrandedLoader />
    </div>
  );
}
