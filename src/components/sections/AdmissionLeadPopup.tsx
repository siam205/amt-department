'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { X, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Homepage-only lead-capture popup. Appears once per browser tab
 * session, `delaySeconds` after the page mounts — long enough that it
 * reads as "you've been reading a while, want help?" rather than an
 * ad interrupting the first paint. Submitting OR closing it both mark
 * the session as seen, so a visitor who dismisses it isn't nagged
 * again on the next page within the same visit.
 */

const STORAGE_KEY = 'admission_lead_popup_shown';

type Config = {
  delaySeconds: number;
  heading: string;
  subheading: string;
  buttonText: string;
  successMessage: string;
};

type FormState = 'idle' | 'submitting' | 'submitted' | 'error';

export default function AdmissionLeadPopup({
  config,
  programmes,
}: {
  config: Config;
  programmes: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>('idle');
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [programmeName, setProgrammeName] = useState('');
  // Honeypot — never filled by a real visitor. See ContactForm for
  // the same pattern; field name here is 'company' instead of
  // 'website' only so a bot's saved autofill profile can't skip both.
  const [company, setCompany] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return; // sessionStorage unavailable (private mode) — skip rather than hard-fail
    }
    const timer = window.setTimeout(() => setOpen(true), config.delaySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [config.delaySeconds]);

  function markSeen() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  }

  function close() {
    setOpen(false);
    markSeen();
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admission-lead/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, mobileNumber, programmeName, company }),
      });
      if (res.ok) {
        setState('submitted');
        markSeen();
        return;
      }
      let msg = 'Something went wrong. Please try again.';
      try {
        const data = await res.json();
        if (typeof data?.error === 'string' && data.error.length > 0) msg = data.error;
      } catch {
        // non-JSON response — keep generic message
      }
      setErrorMsg(msg);
      setState('error');
    } catch {
      setErrorMsg('Network error — please check your connection and try again.');
      setState('error');
    }
  }

  if (!open) return null;

  const submitting = state === 'submitting';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admission-lead-heading"
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
        >
          <X size={18} />
        </button>

        {state === 'submitted' ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <h3 className="font-display text-xl font-bold text-primary mb-2">Thank you!</h3>
            <p className="text-[14px] text-gray-600">{config.successMessage}</p>
          </div>
        ) : (
          <>
            <h2
              id="admission-lead-heading"
              className="font-display pr-8 text-xl font-bold text-gray-900 md:text-2xl"
            >
              {config.heading}
            </h2>
            <p className="mt-2 mb-6 text-sm text-gray-600">{config.subheading}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div aria-hidden="true" style={honeypotWrapStyle}>
                <label htmlFor="lead-company">Company (leave empty)</label>
                <input
                  id="lead-company"
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              <Field label="Full name">
                <input
                  type="text"
                  required
                  disabled={submitting}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className={inputClass}
                />
              </Field>

              <Field label="Mobile number">
                <input
                  type="tel"
                  required
                  disabled={submitting}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className={inputClass}
                />
              </Field>

              <Field label="Programme you are interested in">
                <select
                  required
                  disabled={submitting}
                  value={programmeName}
                  onChange={(e) => setProgrammeName(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose a programme</option>
                  {programmes.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>

              {state === 'error' && errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
                >
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent px-6 py-3.5 font-bold text-white shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    {config.buttonText}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-500">{config.successMessage}</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] text-gray-800 placeholder:text-gray-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/15 transition disabled:opacity-60';

const honeypotWrapStyle: React.CSSProperties = {
  position: 'absolute',
  left: '-9999px',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-primary">
        {label}
        <span className="text-accent">*</span>
      </span>
      {children}
    </label>
  );
}
