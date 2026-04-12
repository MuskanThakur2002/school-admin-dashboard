import { Shield, Calendar, CreditCard, FileText, GraduationCap, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

const modules = [
  { title: 'Roles & Permissions', desc: 'Define user roles and access control policies', icon: Shield, path: '/settings/roles', color: 'bg-blue-50 text-blue-600' },
  { title: 'Holidays', desc: 'Manage school holidays and calendar events', icon: Calendar, path: '/settings/holidays', color: 'bg-emerald-50 text-emerald-600' },
  { title: 'Payment Modes', desc: 'Configure accepted payment methods', icon: CreditCard, path: '/settings/payment-modes', color: 'bg-amber-50 text-amber-600' },
  { title: 'Document Types', desc: 'Manage required student documents', icon: FileText, path: '/settings/document-types', color: 'bg-red-50 text-red-500' },
  { title: 'Grading Rules', desc: 'Set up grading scales and evaluation criteria', icon: GraduationCap, path: '/settings/grading', color: 'bg-violet-50 text-violet-600' },
  { title: 'Communication', desc: 'SMS, email, and push notification settings', icon: MessageSquare, path: '/settings/communication', color: 'bg-teal-50 text-teal-600' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-[1280px]">
      <div className="mb-8">
        <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Settings</h1>
        <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Configure system-wide preferences and policies</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {modules.map((m) => (
          <div key={m.path} onClick={() => navigate(m.path)}
            className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all cursor-pointer group">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', m.color)}>
              <m.icon className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-1 group-hover:text-[#002c98] transition-colors">{m.title}</h3>
            <p className="text-[0.8125rem] text-[var(--text-muted)]">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
