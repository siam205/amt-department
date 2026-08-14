import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { admissionLeadCreateSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendAdmissionLeadNotification } from '@/lib/email';

// Honeypot field name — must match the hidden input in the popup
// component. Same reasoning as /api/contact/submit: return 200 on a
// trip so a bot's logging shows success and it doesn't probe further.
const HONEYPOT_FIELD = 'company';

function getClientIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0];
    if (first) return first.trim();
  }
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const honeypotValue = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  if (typeof honeypotValue === 'string' && honeypotValue.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  const rateLimitKey = `admission-lead:${ip ?? 'no-ip'}`;
  const limit = checkRateLimit(rateLimitKey);
  if (!limit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetMs - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Too many submissions from your IP. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const parsed = admissionLeadCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const identity = await prisma.universityIdentity.findUnique({
    where: { id: 'singleton' },
    select: { contactSubmissionEmail: true },
  });

  const lead = await prisma.admissionLead.create({
    data: {
      ...parsed.data,
      ipAddress: ip,
      userAgent: userAgent ?? null,
    },
  });

  const dispatch = await sendAdmissionLeadNotification({
    to: identity?.contactSubmissionEmail ?? null,
    fullName: lead.fullName,
    mobileNumber: lead.mobileNumber,
    programmeName: lead.programmeName,
    submittedAt: lead.submittedAt,
  });

  let emailSentAt: Date | null = null;
  let emailError: string | null = null;
  if (dispatch.status === 'sent') {
    emailSentAt = new Date();
  } else if (dispatch.status === 'skipped') {
    emailError = `skipped: ${dispatch.reason}`;
  } else if (dispatch.status === 'failed') {
    emailError = dispatch.error;
  }

  if (emailSentAt || emailError) {
    await prisma.admissionLead.update({
      where: { id: lead.id },
      data: { emailSentAt, emailError },
    });
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin/admission-leads');
  revalidatePath('/admin');

  return NextResponse.json({ ok: true });
}
