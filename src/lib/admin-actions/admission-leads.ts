'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import { admissionLeadStatusEnum } from '@/lib/validation';

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAuth(): Promise<ActionResult | null> {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  return null;
}

function revalidateLeadSurfaces() {
  revalidatePath('/admin/admission-leads');
  revalidatePath('/admin');
  // Sidebar badge count is rendered in the (authed) layout — layout
  // scope invalidation makes the count refresh on next nav.
  revalidatePath('/', 'layout');
}

export async function updateAdmissionLeadStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;

  const parsed = admissionLeadStatusEnum.safeParse(status);
  if (!parsed.success) return { ok: false, error: 'Invalid status' };

  try {
    await prisma.admissionLead.update({
      where: { id },
      data: { status: parsed.data },
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') {
      return { ok: false, error: 'Lead not found' };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateLeadSurfaces();
  revalidatePath(`/admin/admission-leads/${id}`);
  return { ok: true };
}

export async function deleteAdmissionLeadAction(id: string): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    await prisma.admissionLead.delete({ where: { id } });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') {
      return { ok: false, error: 'Lead not found' };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateLeadSurfaces();
  return { ok: true };
}
