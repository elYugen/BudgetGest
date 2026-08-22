import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/layout/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Recurring } from './pages/Recurring';
import { Accounts } from './pages/Accounts';
import { Settings } from './pages/Settings';
import { processRecurringItems } from './lib/autoProcess';

export default function App() {
  useEffect(() => {
    processRecurringItems();
    const onVisible = () => {
      if (document.visibilityState === 'visible') processRecurringItems();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  return (
    <HashRouter>
      <div className="min-h-svh bg-canvas">
        <div className="mx-auto max-w-3xl px-4 pt-6 pb-28">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mouvements" element={<Transactions />} />
            <Route path="/recurrent" element={<Recurring />} />
            <Route path="/comptes" element={<Accounts />} />
            <Route path="/reglages" element={<Settings />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </HashRouter>
  );
}
