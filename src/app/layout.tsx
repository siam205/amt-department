import type { Metadata } from 'next';
import { Poppins, Montserrat, Hind_Siliguri } from 'next/font/google';
import { getDepartmentIdentity } from '@/lib/identity';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-montserrat',
  display: 'swap',
});

const hindSiliguri = Hind_Siliguri({
  subsets: ['latin', 'bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

/**
 * Site-wide names and the canonical URL.
 *
 * These are the strings a search result and a shared link show. They used to
 * be written into this file as plain constants — so a copy of this codebase
 * announced itself as the department it was copied from, in the <title> of
 * every single page (this file's title.template wraps all of them) and in
 * the root OG/Twitter tags. departmentMetadata() (src/lib/page-metadata.ts)
 * already fixed this for every per-page title/description by reading
 * DepartmentIdentity at request time; this file now does the same, via
 * generateMetadata() instead of a static `export const metadata`, since a
 * plain object can't await the DB.
 *
 * The URL comes from the environment (set NEXT_PUBLIC_SITE_URL in Vercel).
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const OG_IMAGE = '/assets/og-banner.webp';

export async function generateMetadata(): Promise<Metadata> {
  const dept = await getDepartmentIdentity();
  const departmentName = dept.name.replace(/^Department of\s+/i, '');
  const siteName = `Sonargaon University — ${departmentName} Department`;
  const siteDescription = `${dept.name} at Sonargaon University. Programs, faculty, research, laboratories, admissions and campus services.`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: siteName,
      template: `%s — Sonargaon University ${departmentName}`,
    },
    description: siteDescription,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName,
      title: siteName,
      description: siteDescription,
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `Sonargaon University — ${dept.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteName,
      description: siteDescription,
      images: [OG_IMAGE],
    },
  };
}

// Phase 18 — minimal root layout. The previous root layout pulled in
// the admin-vs-public chrome conditional via `headers()` to read
// x-pathname, which forced every public route into dynamic rendering
// and blocked ISR. Chrome rendering now lives in the (public)/ and
// admin/ route group layouts; this root layout only sets up the
// HTML shell, fonts, and the DB-driven brand-color CSS vars on
// <html>. getDepartmentIdentity is React.cache-wrapped and a plain
// DB query, so it does NOT force dynamic rendering — the resulting
// brand vars are baked into the ISR cache for public routes.
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dept = await getDepartmentIdentity();
  const brandVars = {
    '--color-primary': dept.primaryColor,
    '--color-accent': dept.accentColor,
    '--color-button-yellow': dept.buttonColor,
  } as React.CSSProperties;

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${montserrat.variable} ${hindSiliguri.variable}`}
      style={brandVars}
    >
      <body className="min-h-screen flex flex-col selection:bg-accent/30">
        {children}
      </body>
    </html>
  );
}
