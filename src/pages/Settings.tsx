import { useState, type ReactNode } from 'react';
import { Sun, Moon, Monitor, Download, Wallet, ArrowLeftRight, CalendarClock, LineChart, HardDrive, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { BentoCard, CardLabel } from '../components/ui/BentoCard';
import { SegmentedControl, Button } from '../components/ui/Form';
import { useTheme } from '../lib/theme';
import {
  exportAccountsCsv,
  exportTransactionsCsv,
  exportRecurringCsv,
  exportSecuritiesCsv,
  exportAllCsv,
} from '../lib/exportCsv';

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [exporting, setExporting] = useState<string | null>(null);

  const runExport = async (key: string, fn: () => Promise<void>) => {
    setExporting(key);
    try {
      await fn();
    } finally {
      setExporting(null);
    }
  };

  return (
    <div>
      <PageHeader title="Réglages" subtitle="Apparence et export de vos données" />

      <BentoCard span="full" className="mb-4">
        <CardLabel>Apparence</CardLabel>
        <SegmentedControl
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: 'Système' },
            { value: 'light', label: 'Clair' },
            { value: 'dark', label: 'Sombre' },
          ]}
        />
        <p className="text-xs text-muted mt-2 flex items-center gap-1.5">
          {theme === 'system' ? <Monitor size={13} /> : theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
          {theme === 'system' ? "Suit le réglage de votre appareil" : theme === 'dark' ? 'Thème sombre actif' : 'Thème clair actif'}
        </p>
      </BentoCard>

      <BentoCard span="full" className="mb-4">
        <CardLabel icon={<RefreshCw size={13} />}>Application</CardLabel>
        <p className="text-xs text-muted mb-3">
          En PWA, l'actualisation habituelle du navigateur n'est pas toujours disponible. Utilisez ce bouton si
          l'app semble figée ou pour appliquer une mise à jour.
        </p>
        <Button variant="ghost" className="w-full" onClick={() => window.location.reload()}>
          <RefreshCw size={16} /> Recharger l'app
        </Button>
      </BentoCard>

      <BentoCard span="full" className="mb-4">
        <CardLabel icon={<Download size={13} />}>Exporter mes données (Excel / CSV)</CardLabel>
        <p className="text-xs text-muted mb-3">
          Chaque export génère un fichier .csv compatible Excel (séparateur « ; », accents et € préservés).
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <ExportButton
            icon={<Wallet size={15} />}
            label="Comptes"
            busy={exporting === 'accounts'}
            onClick={() => runExport('accounts', exportAccountsCsv)}
          />
          <ExportButton
            icon={<ArrowLeftRight size={15} />}
            label="Mouvements"
            busy={exporting === 'transactions'}
            onClick={() => runExport('transactions', exportTransactionsCsv)}
          />
          <ExportButton
            icon={<CalendarClock size={15} />}
            label="Récurrent"
            busy={exporting === 'recurring'}
            onClick={() => runExport('recurring', exportRecurringCsv)}
          />
          <ExportButton
            icon={<LineChart size={15} />}
            label="Titres"
            busy={exporting === 'securities'}
            onClick={() => runExport('securities', exportSecuritiesCsv)}
          />
        </div>
        <Button className="w-full" onClick={() => runExport('all', exportAllCsv)} disabled={exporting !== null}>
          <Download size={16} />
          {exporting === 'all' ? 'Export en cours…' : 'Tout exporter'}
        </Button>
      </BentoCard>

      <BentoCard span="full">
        <CardLabel icon={<HardDrive size={13} />}>Où sont mes données ?</CardLabel>
        <p className="text-sm text-muted leading-relaxed">
          Tout est stocké uniquement sur cet appareil, dans la base locale de votre navigateur (IndexedDB) — rien
          n'est envoyé sur un serveur. L'application fonctionne hors-ligne. Pensez à exporter régulièrement vos
          données : elles peuvent être perdues si vous videz les données du navigateur ou désinstallez l'app.
        </p>
      </BentoCard>
    </div>
  );
}

function ExportButton({
  icon,
  label,
  busy,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex items-center gap-2 rounded-2xl border border-line px-3.5 py-2.5 text-sm font-medium text-ink hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-50 transition-colors disabled:opacity-50"
    >
      <span className="text-primary-600">{icon}</span>
      {busy ? 'Export…' : label}
    </button>
  );
}
