import { Pencil, Trash2, Check, Repeat } from 'lucide-react';
import type { Goal } from '../../db/types';
import { IconBadge } from '../ui/IconBadge';
import { formatMoney, formatDateLong, currentPeriod } from '../../lib/format';

export function GoalRow({
  goal,
  current,
  accountName,
  onToggleDone,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  current: number;
  accountName: string;
  onToggleDone?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const completedPeriods = goal.completedPeriods ?? [];
  const done = goal.recurring ? completedPeriods.includes(currentPeriod()) : !!goal.achieved;
  const pct = goal.targetAmount > 0 ? Math.min(100, (current / goal.targetAmount) * 100) : 0;

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <IconBadge emoji={goal.emoji} color={goal.color} size={36} />
        <div className="flex-1 min-w-0 text-left">
          <p className="font-medium truncate flex items-center gap-1.5">
            <span className="truncate">{goal.label}</span>
            {goal.recurring && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted bg-canvas rounded-full px-1.5 py-0.5 shrink-0">
                <Repeat size={10} /> Mensuel
              </span>
            )}
          </p>
          <p className="text-xs text-muted truncate">
            {accountName}
            {!goal.recurring && goal.deadline ? ` · avant le ${formatDateLong(goal.deadline)}` : ''}
          </p>
        </div>
        {onToggleDone && (
          <button
            onClick={onToggleDone}
            title={
              goal.recurring
                ? done
                  ? 'Fait ce mois-ci'
                  : 'Marquer comme fait ce mois-ci'
                : done
                ? 'Marqué comme effectué'
                : 'Marquer comme effectué'
            }
            className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 border transition-colors ${
              done ? 'bg-primary-600 border-primary-600 text-white' : 'border-line text-muted hover:border-primary-400'
            }`}
          >
            <Check size={15} />
          </button>
        )}
        {(onEdit || onDelete) && (
          <div className="flex gap-0.5 shrink-0">
            {onEdit && (
              <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-canvas">
                <Pencil size={13} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {goal.recurring ? (
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted">
            Objectif <span className="font-semibold text-ink">{formatMoney(goal.targetAmount)}</span> / mois
          </p>
          <p className="text-xs text-muted">
            {completedPeriods.length} mois validé{completedPeriods.length > 1 ? 's' : ''}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-2.5 h-2.5 rounded-full bg-canvas overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: goal.color }} />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-muted">
              <span className="font-semibold text-ink">{formatMoney(current)}</span> / {formatMoney(goal.targetAmount)}
            </p>
            <p className="text-xs font-semibold" style={{ color: goal.color }}>
              {pct.toFixed(0)}%
            </p>
          </div>
        </>
      )}
    </div>
  );
}
