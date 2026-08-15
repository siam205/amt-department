'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, FlaskConical } from 'lucide-react';
import Container from '../ui/Container';

const LAB_FACILITY_PATH = '/about/lab-facility';

// Public Lab shape — matches getLabs() select in identity.ts.
// Same shape as LabFacilityClient consumes.
type LabRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  heroImageUrl: string | null;
};

type Props = {
  labs: readonly LabRow[];
};

export default function ResearchLabsSection({ labs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Center the row only when every card already fits without scrolling —
  // centering a row that overflows would shift it so the first card(s)
  // scroll off the left edge at rest. Measured against the real DOM
  // rather than guessed from breakpoint widths, so it stays correct at
  // any lab count and any viewport.
  const [canCenter, setCanCenter] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setCanCenter(el.scrollWidth <= el.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [labs.length]);

  return (
    <section className="py-8 md:py-16 bg-white overflow-hidden">
      <Container>
        <div className="text-center mb-6 md:mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="w-10 h-[1.5px] bg-accent/40" />
            <span className="text-accent font-bold tracking-[0.2em] uppercase text-[10px]">
              Research That Advances Technology
            </span>
          </div>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-display font-bold text-primary leading-tight">
            Research &amp; Labs
          </h2>
        </div>

        <div className="-mx-4 sm:mx-0">
        <div
          ref={scrollRef}
          className={`flex overflow-x-auto snap-x snap-mandatory gap-4 md:gap-6 pt-4 pb-8 no-scrollbar px-4 sm:px-0 ${
            canCenter ? 'justify-center' : ''
          }`}
        >
          {labs.map((lab, idx) => (
            <motion.a
              key={lab.slug}
              href={`${LAB_FACILITY_PATH}#${lab.slug}`}
              data-lab-card
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -8 }}
              className="snap-center md:snap-start shrink-0 w-[88%] sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1.125rem)] h-[460px] md:h-[500px] relative rounded-3xl overflow-hidden group shadow-xl bg-primary"
            >
              {lab.heroImageUrl ? (
                <Image
                  src={lab.heroImageUrl}
                  alt={lab.name}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 88vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FlaskConical size={64} className="text-white/30" strokeWidth={1.25} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/45 to-primary/10 group-hover:via-primary/65 group-hover:to-primary/20 transition-all duration-500" />

              <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                <h3 className="text-white group-hover:text-accent transition-colors duration-300 text-xl md:text-2xl font-display font-bold mb-2 leading-tight">
                  {lab.name}
                </h3>
                <p className="text-white/80 text-sm leading-snug">{lab.tagline}</p>
                <div className="mt-6 flex justify-end">
                  <div className="w-10 h-10 rounded-full bg-white/10 group-hover:bg-accent border border-white/20 flex items-center justify-center text-white transition-all">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
        </div>
      </Container>
    </section>
  );
}
