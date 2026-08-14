'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PhoneCall, Inbox, Archive, Trash2 } from 'lucide-react';
import {
  updateAdmissionLeadStatusAction,
  deleteAdmissionLeadAction,
} from '@/lib/admin-actions/admission-leads';
import { useConfirm } from '@/components/admin/ConfirmDialogProvider';

type Status = 'new' | 'contacted' | 'archived';

export default function StatusActions({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  function runStatusUpdate(next: Status, label: string) {
    startTransition(async () => {
      const res = await updateAdmissionLeadStatusAction(id, next);
      if (res.ok) {
        toast.success(`Marked as ${label}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  async function runDelete() {
    const ok = await confirm({
      title: 'Delete lead?',
      message: 'This lead will be removed permanently. This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteAdmissionLeadAction(id);
      if (res.ok) {
        toast.success('Lead deleted');
        router.push('/admin/admission-leads');
      } else {
        toast.error(res.error);
      }
    });
  }

  const isNew = currentStatus === 'new';
  const isContacted = currentStatus === 'contacted';
  const isArchived = currentStatus === 'archived';

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
        Actions
      </h2>
      <div className="flex flex-wrap gap-2">
        {!isNew && (
          <button
            type="button"
            onClick={() => runStatusUpdate('new', 'new')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Inbox size={14} /> Mark as new
          </button>
        )}
        {!isContacted && (
          <button
            type="button"
            onClick={() => runStatusUpdate('contacted', 'contacted')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-colors disabled:opacity-60"
          >
            <PhoneCall size={14} /> Mark as contacted
          </button>
        )}
        {!isArchived && (
          <button
            type="button"
            onClick={() => runStatusUpdate('archived', 'archived')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Archive size={14} /> Archive
          </button>
        )}
        <button
          type="button"
          onClick={runDelete}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium transition-colors disabled:opacity-60 ml-auto"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </section>
  );
}
