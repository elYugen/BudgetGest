import type { ReactNode } from 'react';

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  span?: 'sm' | 'md' | 'lg' | 'full';
  noPad?: boolean;
}

const spanClasses: Record<NonNullable<BentoCardProps['span']>, string> = {
  sm: 'col-span-1',
  md: 'col-span-2',
  lg: 'col-span-2 md:col-span-3',
  full: 'col-span-2 md:col-span-4',
};

export function BentoCard({ children, className = '', span = 'sm', noPad = false }: BentoCardProps) {
  return (
    <div
      className={`rounded-3xl bg-card border border-line/70 shadow-[var(--shadow-bento)] transition-shadow hover:shadow-[var(--shadow-bento-hover)] ${
        noPad ? '' : 'p-5'
      } ${spanClasses[span]} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardLabel({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted mb-2">
      {icon}
      {children}
    </div>
  );
}
