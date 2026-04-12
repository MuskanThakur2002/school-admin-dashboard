import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { Card } from '@/components/ui/Card/Card';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  subtitle?: string;
}

export function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <Card className="flex flex-col items-center justify-center py-20 text-center">
        <Construction className="w-12 h-12 text-on-surface-variant/40 mb-4" />
        <h2 className="font-display text-headline-sm text-on-surface mb-2">
          Coming Soon
        </h2>
        <p className="text-body-md text-on-surface-variant max-w-md">
          The {title.toLowerCase()} module is under development. Check back soon.
        </p>
      </Card>
    </div>
  );
}
