'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import { admissionLeadPopupUpdateSchema } from '@/lib/validation';

export type ActionResult = { ok: true } | { ok: false; error: string };

function getStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

function getBool(fd: FormData, key: string): boolean {
  return fd.get(key) === 'on';
}

async function requireAuth(): Promise<ActionResult | null> {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  return null;
}

export async function updateAdmissionLeadPopupAction(
  _prev: ActionResult | { ok: null },
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;

  const raw = {
    enabled:        getBool(formData, 'enabled'),
    delaySeconds:   getStr(formData, 'delaySeconds'),
    heading:        getStr(formData, 'heading'),
    subheading:     getStr(formData, 'subheading'),
    buttonText:     getStr(formData, 'buttonText'),
    successMessage: getStr(formData, 'successMessage'),
  };

  const parsed = admissionLeadPopupUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; '),
    };
  }

  try {
    await prisma.admissionLeadPopup.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...parsed.data },
      update: parsed.data,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }

  // The popup renders on the homepage only.
  revalidatePath('/');
  revalidatePath('/admin/admission-lead-popup');
  revalidatePath('/admin');
  return { ok: true };
}
