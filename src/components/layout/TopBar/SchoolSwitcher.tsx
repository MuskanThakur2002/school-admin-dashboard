import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronDown, LogOut, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

export function SchoolSwitcher() {
  const navigate = useNavigate();
  const activeSchoolId = useAuthStore((s) => s.activeSchoolId);
  const setActiveSchool = useAuthStore((s) => s.setActiveSchool);

  const tenants = useTenantStore((s) => s.tenants);
  const fetchTenants = useTenantStore((s) => s.fetchTenants);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tenants.length === 0) fetchTenants();
  }, [tenants.length, fetchTenants]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const active = tenants.find((t) => t.id === activeSchoolId) ?? null;

  const filtered = query
    ? tenants.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : tenants;

  const handleSelect = (id: string) => {
    setActiveSchool(id);
    setOpen(false);
    setQuery('');
    navigate('/dashboard');
  };

  const handleExit = () => {
    setActiveSchool(null);
    setOpen(false);
    setQuery('');
    navigate('/tenants');
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
          'text-[0.8125rem] font-semibold',
        )}
        style={{
          background: active ? 'var(--brand-tint)' : 'var(--card-bg-subtle)',
          color: active ? 'var(--brand-primary)' : 'var(--text-tertiary)',
        }}
        title={active ? `Viewing ${active.name}` : 'Select a school to manage'}
      >
        <Building2 className="w-4 h-4" strokeWidth={2} />
        <span className="max-w-[160px] truncate">
          {active ? active.name : 'All Schools'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-[320px] rounded-xl shadow-lg z-40 overflow-hidden"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.12)',
          }}
        >
          <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background: 'var(--card-bg-subtle)' }}
            >
              <Search className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search schools..."
                className="bg-transparent outline-none flex-1 text-[0.8125rem]"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div
                className="px-4 py-6 text-center text-[0.8125rem]"
                style={{ color: 'var(--text-muted)' }}
              >
                No schools match "{query}"
              </div>
            ) : (
              filtered.map((t) => {
                const selected = t.id === activeSchoolId;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 transition-colors text-left"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--brand-tint)', color: 'var(--brand-primary)' }}
                    >
                      <Building2 className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8125rem] font-semibold truncate">{t.name}</p>
                      <p className="text-[0.6875rem] truncate" style={{ color: 'var(--text-muted)' }}>
                        {t.city}, {t.state} · {t.plan}
                      </p>
                    </div>
                    {selected && (
                      <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {active && (
            <button
              onClick={handleExit}
              className="w-full flex items-center gap-2 px-4 py-2.5 border-t text-[0.8125rem] font-semibold transition-colors"
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--text-tertiary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--card-bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Exit to all schools
            </button>
          )}
        </div>
      )}
    </div>
  );
}
