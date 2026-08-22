import { NavLink } from 'react-router-dom';
import { LayoutGrid, ArrowLeftRight, CalendarClock, Wallet, Settings } from 'lucide-react';

const items = [
  { to: '/', label: 'Accueil', icon: LayoutGrid, end: true },
  { to: '/mouvements', label: 'Mouvements', icon: ArrowLeftRight, end: false },
  { to: '/recurrent', label: 'Récurrent', icon: CalendarClock, end: false },
  { to: '/comptes', label: 'Comptes', icon: Wallet, end: false },
  { to: '/reglages', label: 'Réglages', icon: Settings, end: false },
];

const fadeMask = 'linear-gradient(to top, black 40%, transparent 100%)';

export function BottomNav() {
  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-30 h-28 pointer-events-none backdrop-blur-lg"
        style={{
          WebkitMaskImage: fadeMask,
          maskImage: fadeMask,
          background: 'linear-gradient(to top, var(--color-canvas) 5%, transparent 100%)',
        }}
      />
      <nav
        className="fixed left-0 right-0 bottom-4 z-40 flex justify-center px-3"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center gap-0.5 rounded-3xl bg-nav/95 backdrop-blur px-1.5 py-2 shadow-[0_12px_32px_-8px_rgba(15,36,23,0.45)] max-w-full overflow-x-auto">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-2 text-[10.5px] font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'bg-primary-500 text-white' : 'text-white/60 hover:text-white/90'
                }`
              }
            >
              <Icon size={18} strokeWidth={2.2} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
