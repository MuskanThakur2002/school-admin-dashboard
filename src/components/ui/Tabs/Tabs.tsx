import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

interface Tab {
  value: string;
  label: string;
  content: ReactNode;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  className?: string;
}

export function Tabs({ tabs, defaultValue, className }: TabsProps) {
  return (
    <RadixTabs.Root defaultValue={defaultValue || tabs[0]?.value} className={className}>
      <RadixTabs.List className="flex gap-1 bg-surface-container-low rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-label-lg font-medium',
              'text-on-surface-variant transition-all duration-200',
              'data-[state=active]:bg-surface-container-lowest data-[state=active]:text-primary data-[state=active]:shadow-card',
              'hover:text-on-surface',
            )}
          >
            {tab.icon}
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map((tab) => (
        <RadixTabs.Content key={tab.value} value={tab.value}>
          {tab.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
