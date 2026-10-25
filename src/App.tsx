import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BottomNav } from './components/layout/BottomNav';
import { ConfirmHost } from './components/ui/ConfirmDialog';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Recurring } from './pages/Recurring';
import { Accounts } from './pages/Accounts';
import { Settings } from './pages/Settings';
import { processRecurringItems } from './lib/autoProcess';
import { requestPersistentStorage } from './lib/backup';
import { computeNetWorth, recordSnapshot } from './lib/snapshots';
import { refreshQuotesIfStale } from './lib/quotes';

export default function App() {
  const netWorth = useLiveQuery(computeNetWorth, []);

  useEffect(() => {
    if (netWorth !== undefined) recordSnapshot(netWorth);
  }, [netWorth]);

  useEffect(() => {
    requestPersistentStorage();
    processRecurringItems();
    refreshQuotesIfStale();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      processRecurringItems();
      refreshQuotesIfStale();
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
        <ConfirmHost />
      </div>
    </HashRouter>
  );
}
