import { Pencil, Trash2, PartyPopper } from 'lucide-react';
import type { Goal } from '../../db/types';
import { IconBadge } from '../ui/IconBadge';
import { formatMoney, formatDateLong } from '../../lib/format';

export function GoalRow({
  goal,
  current,
  accountName,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  current: number;
  accountName: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const pct = goal.targetAmount > 0 ? Math.min(100, (current / goal.targetAmount) * 100) : 0;
  const reached = current >= goal.targetAmount;

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <IconBadge emoji={goal.emoji} color={goal.color} size={36} />
        <div className="flex-1 min-w-0 text-left">
          <p className="font-medium truncate">{goal.label}</p>
          <p className="text-xs text-muted truncate">
            {accountName}
            {goal.deadline ? ` · avant le ${formatDateLong(goal.deadline)}` : ''}
          </p>
        </div>
        {reached && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-primary-700 bg-primary-50 rounded-full px-2 py-1 shrink-0">
            <PartyPopper size={12} /> Atteint
          </span>
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
      <div className="mt-2.5 h-2.5 rounded-full bg-canvas overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: goal.color }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-muted">
          <span className="font-semibold text-ink">{formatMoney(current)}</span> / {formatMoney(goal.targetAmount)}
        </p>
        <p className="text-xs font-semibold" style={{ color: goal.color }}>
          {pct.toFixed(0)}%
        </p>
      </div>
    </div>
  );
}
