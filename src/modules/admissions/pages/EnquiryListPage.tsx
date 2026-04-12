import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Phone, Mail, Search, X, MessageSquare, ArrowUpRight,
  Globe, UserPlus, Megaphone, Users, ArrowRight, Trash2, CheckCircle2,
  UserPlus2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAdmissionsStore } from '@/stores/admissions.store';
import type { Enquiry, EnquirySource, EnquiryStatus } from '@/types/admissions.types';

const statusStyle: Record<EnquiryStatus, { dot: string; text: string; bg: string }> = {
  new: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  contacted: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  converted: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  closed: { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50' },
};

const sourceIcon: Record<EnquirySource, React.ElementType> = {
  walk_in: Users, online: Globe, referral: UserPlus, advertisement: Megaphone,
};

const sourceOptions = [
  { label: 'Walk-in', value: 'walk_in' },
  { label: 'Online', value: 'online' },
  { label: 'Referral', value: 'referral' },
  { label: 'Advertisement', value: 'advertisement' },
];

export default function EnquiryListPage() {
  const navigate = useNavigate();
  const enquiries = useAdmissionsStore((s) => s.enquiries);
  const loading = useAdmissionsStore((s) => s.enquiriesLoading);
  const fetchEnquiries = useAdmissionsStore((s) => s.fetchEnquiries);
  const createEnquiry = useAdmissionsStore((s) => s.createEnquiry);
  const updateEnquiryStatus = useAdmissionsStore((s) => s.updateEnquiryStatus);
  const deleteEnquiry = useAdmissionsStore((s) => s.deleteEnquiry);
  const convertEnquiry = useAdmissionsStore((s) => s.convertEnquiryToApplication);
  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Form state
  const [formStudent, setFormStudent] = useState('');
  const [formParent, setFormParent] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formClass, setFormClass] = useState('');
  const [formSource, setFormSource] = useState<EnquirySource>('walk_in');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (enquiries.length === 0) fetchEnquiries();
  }, [enquiries.length, fetchEnquiries]);

  const newCount = enquiries.filter((e) => e.status === 'new').length;
  const contactedCount = enquiries.filter((e) => e.status === 'contacted').length;
  const convertedCount = enquiries.filter((e) => e.status === 'converted').length;
  const conversionRate = enquiries.length > 0 ? Math.round((convertedCount / enquiries.length) * 100) : 0;

  const filtered = useMemo(() => enquiries.filter((e) => {
    const matchSearch = !search || e.studentName.toLowerCase().includes(search.toLowerCase()) || e.parentName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchSearch && matchStatus;
  }), [enquiries, search, statusFilter]);

  const resetForm = () => {
    setFormStudent(''); setFormParent(''); setFormPhone(''); setFormEmail('');
    setFormClass(''); setFormSource('walk_in'); setFormNotes('');
  };

  const handleCreate = async () => {
    if (!formStudent || !formParent || !formPhone || !formClass) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Student, parent, phone, and class are required' });
      return;
    }
    setSubmitting(true);
    try {
      await createEnquiry({
        studentName: formStudent, parentName: formParent, parentPhone: formPhone,
        parentEmail: formEmail, classInterest: formClass, source: formSource, notes: formNotes,
      });
      showToast({ type: 'success', title: 'Enquiry captured', message: `${formStudent} — Class ${formClass}` });
      setModalOpen(false);
      resetForm();
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to save', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkContacted = async (e: Enquiry) => {
    try {
      await updateEnquiryStatus(e.id, 'contacted');
      showToast({ type: 'success', title: 'Marked as contacted', message: e.studentName });
    } catch (err) {
      showToast({ type: 'error', title: 'Update failed', message: (err as Error).message });
    }
  };

  const handleConvert = async (e: Enquiry) => {
    try {
      const app = await convertEnquiry(e.id);
      showToast({ type: 'success', title: 'Converted to application', message: `${app.applicationNo} created` });
      setDetailOpen(false);
    } catch (err) {
      showToast({ type: 'error', title: 'Conversion failed', message: (err as Error).message });
    }
  };

  const handleDelete = async (e: Enquiry) => {
    try {
      await deleteEnquiry(e.id);
      showToast({ type: 'info', title: 'Enquiry removed', message: e.studentName });
      setDetailOpen(false);
    } catch (err) {
      showToast({ type: 'error', title: 'Delete failed', message: (err as Error).message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Enquiries</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Capture and track admission enquiries</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => { resetForm(); setModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[#002c98] bg-blue-50 hover:bg-blue-100 transition-all"
          >
            <Plus className="w-4 h-4" /> New Enquiry
          </button>
          <button
            onClick={() => navigate('/admissions/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all"
          >
            <UserPlus2 className="w-4 h-4" /> New Admission
          </button>
        </div>
      </div>

      {/* Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Enquiries', value: enquiries.length, icon: Mail, color: 'bg-blue-50 text-blue-600' },
          { label: 'New', value: newCount, icon: MessageSquare, color: 'bg-violet-50 text-violet-600' },
          { label: 'Contacted', value: contactedCount, icon: Phone, color: 'bg-amber-50 text-amber-600' },
          { label: 'Conversion Rate', value: `${conversionRate}%`, icon: ArrowUpRight, color: 'bg-emerald-50 text-emerald-600' },
        ].map((m) => (
          <div key={m.label} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">{m.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', m.color)}>
                <m.icon className="w-4 h-4" strokeWidth={2} />
              </div>
            </div>
            <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student or parent name..."
            className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {['', 'new', 'contacted', 'converted', 'closed'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all',
                statusFilter === s ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]')}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[3fr_3fr_1.5fr_2fr_2fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Student', 'Parent / Contact', 'Class', 'Source', 'Status'].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {loading && enquiries.length === 0 ? (
          <div className="py-16 text-center text-[0.875rem] text-[var(--text-muted)]">Loading enquiries...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 text-[var(--text-ghost)] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No enquiries found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">Try adjusting your search or filters</p>
          </div>
        ) : filtered.map((enquiry, idx) => {
          const st = statusStyle[enquiry.status];
          const SourceIcon = sourceIcon[enquiry.source];
          return (
            <div
              key={enquiry.id}
              onClick={() => { setSelectedEnquiry(enquiry); setDetailOpen(true); }}
              className={cn(
                'grid grid-cols-[3fr_3fr_1.5fr_2fr_2fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)] cursor-pointer group',
                idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                  <span className="text-white text-[0.6875rem] font-bold">
                    {enquiry.studentName.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{enquiry.studentName}</p>
                  <p className="text-[0.6875rem] text-[var(--text-muted)]">{enquiry.date}</p>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[0.8125rem] text-[var(--text-secondary)] truncate">{enquiry.parentName}</p>
                <div className="flex items-center gap-1 text-[0.6875rem] text-[var(--text-muted)]">
                  <Phone className="w-3 h-3" /> <span>{enquiry.parentPhone}</span>
                </div>
              </div>

              <span className="text-[0.8125rem] font-semibold text-[var(--text-secondary)]">Class {enquiry.classInterest}</span>

              <div className="flex items-center gap-1.5">
                <SourceIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.8} />
                <span className="text-[0.75rem] text-[var(--text-tertiary)] capitalize">{enquiry.source.replace('_', ' ')}</span>
              </div>

              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit', st.bg)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                <span className={cn('text-[0.6875rem] font-semibold capitalize', st.text)}>{enquiry.status}</span>
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between px-6 py-3.5 bg-[var(--card-bg-hover)]">
          <p className="text-[0.75rem] text-[var(--text-muted)]">{filtered.length} of {enquiries.length} enquiries</p>
        </div>
      </div>

      {/* New Enquiry Modal */}
      <Modal
        open={modalOpen} onOpenChange={setModalOpen} title="New Enquiry"
        description="Capture a walk-in or phone enquiry"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={submitting}>Save Enquiry</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Student Name *" value={formStudent} onChange={(e) => setFormStudent(e.target.value)} placeholder="e.g. Aarav Mehta" />
            <Input label="Class Interest *" value={formClass} onChange={(e) => setFormClass(e.target.value)} placeholder="e.g. V" />
          </div>
          <Input label="Parent / Guardian Name *" value={formParent} onChange={(e) => setFormParent(e.target.value)} placeholder="e.g. Deepak Mehta" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone *" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="e.g. 9812345678" />
            <Input label="Email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="e.g. parent@email.com" />
          </div>
          <Select label="Source" options={sourceOptions} value={formSource} onChange={(e) => setFormSource(e.target.value as EnquirySource)} />
          <Input label="Notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Any additional details..." />
        </div>
      </Modal>

      {/* Enquiry Detail Modal */}
      {selectedEnquiry && (
        <Modal
          open={detailOpen} onOpenChange={setDetailOpen}
          title={selectedEnquiry.studentName}
          description={`Enquiry captured ${selectedEnquiry.date}`}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => handleDelete(selectedEnquiry)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold text-red-600 hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <div className="flex gap-2">
                {selectedEnquiry.status === 'new' && (
                  <Button variant="secondary" onClick={() => handleMarkContacted(selectedEnquiry)}>
                    <CheckCircle2 className="w-4 h-4" /> Mark Contacted
                  </Button>
                )}
                {selectedEnquiry.status !== 'converted' && selectedEnquiry.status !== 'closed' && (
                  <Button onClick={() => handleConvert(selectedEnquiry)}>
                    <ArrowRight className="w-4 h-4" /> Convert to Application
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Student', value: selectedEnquiry.studentName },
                { label: 'Class Interest', value: `Class ${selectedEnquiry.classInterest}` },
                { label: 'Parent / Guardian', value: selectedEnquiry.parentName },
                { label: 'Phone', value: selectedEnquiry.parentPhone },
                { label: 'Email', value: selectedEnquiry.parentEmail || '—' },
                { label: 'Source', value: selectedEnquiry.source.replace('_', ' ') },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">{f.label}</p>
                  <p className="text-[0.875rem] font-semibold text-[var(--text-primary)] capitalize">{f.value}</p>
                </div>
              ))}
            </div>
            {selectedEnquiry.notes && (
              <div>
                <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">Notes</p>
                <p className="text-[0.8125rem] text-[var(--text-secondary)] bg-[var(--card-bg-hover)] rounded-xl px-4 py-3 leading-relaxed">{selectedEnquiry.notes}</p>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-[0.6875rem] text-[var(--text-muted)]">Status:</span>
              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full', statusStyle[selectedEnquiry.status].bg)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle[selectedEnquiry.status].dot)} />
                <span className={cn('text-[0.6875rem] font-semibold capitalize', statusStyle[selectedEnquiry.status].text)}>{selectedEnquiry.status}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
