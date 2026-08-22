import type { RecurringItem } from '../../db/types';
import { IconBadge } from '../ui/IconBadge';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function MonthCalendar({
  items,
  year,
  month,
  selectedDay,
  onSelectDay,
}: {
  items: RecurringItem[];
  year: number;
  month: number;
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
}) {
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const today = now.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const byDay = new Map<number, RecurringItem[]>();
  for (const item of items) {
    const day = Math.min(item.dayOfMonth, lastDay);
    const arr = byDay.get(day) ?? [];
    arr.push(item);
    byDay.set(day, arr);
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-muted">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const dayItems = byDay.get(day) ?? [];
          const isToday = isCurrentMonth && day === today;
          const isSelected = day === selectedDay;
          return (
            <button
              key={day}
              onClick={() => onSelectDay(isSelected ? null : day)}
              className={`relative aspect-square min-h-14 rounded-xl flex flex-col items-center justify-center gap-1 py-1.5 text-[11px] transition-colors ${
                isSelected
                  ? 'bg-primary-600 text-white'
                  : isToday
                  ? 'bg-primary-100 text-primary-800 font-bold'
                  : dayItems.length > 0
                  ? 'bg-canvas text-ink hover:bg-primary-50'
                  : 'text-muted hover:bg-canvas'
              }`}
            >
              <span className="leading-none">{day}</span>
              {dayItems.length > 0 && (
                <div className="flex items-center justify-center gap-1">
                  {dayItems.slice(0, 2).map((it) => (
                    <IconBadge
                      key={it.id}
                      emoji={it.emoji}
                      color={it.color}
                      logo={it.logo}
                      size={dayItems.length === 1 ? 28 : 22}
                    />
                  ))}
                  {dayItems.length > 2 && (
                    <span
                      className={`text-[10px] font-semibold leading-none ${isSelected ? 'text-white' : 'text-muted'}`}
                    >
                      +{dayItems.length - 2}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
