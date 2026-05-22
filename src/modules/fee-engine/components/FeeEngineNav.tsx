import { NavLink } from 'react-router-dom';
import { Info } from 'lucide-react';
import { cn } from '@/utils/cn';

const tabs = [
  { label: 'Structures', path: '/fees' },
  { label: 'Fee Heads', path: '/fees/heads' },
];

interface FeeEngineNavProps {
  /** Short paragraph describing what this section is for. */
  description?: string;
}

export function FeeEngineNav({ description }: FeeEngineNavProps) {
  return (
    <div className="mb-8">
      {/* Tab strip */}
      <div className="flex items-center gap-1 border-b border-[var(--border-subtle)]">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            className={({ isActive }) =>
              cn(
                'relative px-4 py-2.5 text-[0.8125rem] font-medium transition-colors',
                isActive
                  ? 'text-[#002c98] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                {tab.label}
                {isActive && (
                  <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-t bg-[#002c98]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Description */}
      {description && (
        <div className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50/60">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" strokeWidth={2} />
          <p className="text-[0.8125rem] text-blue-900 leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
}
