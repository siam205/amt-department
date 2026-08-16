import * as LucideIcons from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';

// Phase 20 — Dynamic Lucide icon renderer.
//
// Server-renderable on purpose: NO 'use client' directive. The public
// renderers under (public)/ are all server components (Phase 18 ISR),
// and this needs to render inside them without forcing a client
// boundary. Inline-imports the full Lucide namespace once per server
// instance; the actual JS payload sent to the browser is just the
// resolved SVG markup, since server components don't ship JS to the
// client.
//
// Lucide@0.546.x exports each icon twice (`Foo` and `FooIcon` alias),
// so the resolver tries the bare name first, then the `Icon` suffix
// form, and finally a HelpCircle fallback. PascalCase names are the
// only convention the resolver recognises — admin helper text in
// IconInputField documents this for editors.

const lib = LucideIcons as unknown as Record<string, LucideIcon | undefined>;

// lucide-react also exports its generic base renderer under the bare
// name `Icon` (the primitive every named icon is built from — it
// requires an `iconNode` prop we never pass). An empty/blank `name`
// makes the `${name}Icon` fallback below resolve to exactly that
// component, which then throws ("Cannot read properties of undefined
// (reading 'map')") instead of rendering anything — reproduced by
// adding a fresh row in any admin Json-array editor (icon name starts
// blank) before typing one in. Excluded explicitly so a blank/unknown
// name always falls through to HelpCircle instead.
const GENERIC_BASE_ICON = LucideIcons.Icon as unknown as LucideIcon;

function resolve(name: string): LucideIcon | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  const hit = lib[trimmed] ?? lib[`${trimmed}Icon`];
  return hit && hit !== GENERIC_BASE_ICON ? hit : undefined;
}

export function DynamicLucideIcon({
  name,
  ...rest
}: { name: string } & LucideProps) {
  const Icon = resolve(name) ?? LucideIcons.HelpCircle;
  return <Icon {...rest} />;
}

// Used by IconInputField for live validation feedback.
export function hasIcon(name: string): boolean {
  return resolve(name) != null;
}
