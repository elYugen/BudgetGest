import { useState } from 'react';
import { OctagonAlert, TriangleAlert, Lightbulb, CircleCheck, Sparkles } from 'lucide-react';
import type { Advice, AdviceLevel } from '../../lib/advice';
import { BentoCard, CardLabel } from '../ui/BentoCard';

const LEVELS: Record<AdviceLevel, { icon: typeof Lightbulb; label: string; className: string }> = {
  critical: { icon: OctagonAlert, label: 'Urgent', className: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' },
  warning: { icon: TriangleAlert, label: 'Attention', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  info: { icon: Lightbulb, label: 'Conseil', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' },
  good: { icon: CircleCheck, label: 'Bien', className: 'bg-primary-50 text-primary-700' },
};

const COLLAPSED_COUNT = 3;

export function AdviceCard({ advice }: { advice: Advice[] }) {
  const [expanded, setExpanded] = useState(false);
  if (advice.length === 0) return null;
  const shown = expanded ? advice : advice.slice(0, COLLAPSED_COUNT);

  return (
    <BentoCard span="full">
      <CardLabel icon={<Sparkles size={13} className="text-primary-600" />}>Conseils personnalisés</CardLabel>
      <div className="flex flex-col gap-3 mt-2">
        {shown.map((a) => {
          const { icon: Icon, label, className } = LEVELS[a.level];
          return (
            <div key={a.id} className="flex gap-3 text-left">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${className}`} title={label}>
                <Icon size={16} aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  <span className="sr-only">{label} : </span>
                  {a.title}
                </p>
                <p className="text-xs text-muted leading-relaxed mt-0.5">{a.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
      {advice.length > COLLAPSED_COUNT && (
        <button onClick={() => setExpanded((e) => !e)} className="mt-3 text-xs font-semibold text-primary-700 hover:underline">
          {expanded ? 'Voir moins' : `Voir les ${advice.length} conseils`}
        </button>
      )}
      <p className="text-[11px] text-muted mt-3">Calculés sur cet appareil à partir de vos chiffres, à titre indicatif.</p>
    </BentoCard>
  );
}
