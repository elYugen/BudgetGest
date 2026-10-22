import { useState } from 'react';
import { Scale } from 'lucide-react';
import { Button } from '../ui/Form';
import { findBalanceMismatches, recalculateBalances, type BalanceMismatch } from '../../lib/balances';
import { formatMoney } from '../../lib/format';

// Compares each stored balance with opening balance + transaction history, and offers to fix drift.
export function BalanceCheck() {
  const [mismatches, setMismatches] = useState<BalanceMismatch[] | null>(null);
  const [fixed, setFixed] = useState(false);

  const check = async () => {
    setFixed(false);
    setMismatches(await findBalanceMismatches());
  };

  const fix = async () => {
    await recalculateBalances();
    setMismatches([]);
    setFixed(true);
  };

  return (
    <div>
      <p className="text-xs text-muted mb-3">
        Compare le solde de chaque compte avec son solde d'ouverture et l'historique des mouvements, puis corrige les
        écarts éventuels.
      </p>
      <Button variant="ghost" className="w-full" onClick={check}>
        <Scale size={16} /> Vérifier les soldes
      </Button>
      {mismatches !== null && mismatches.length === 0 && (
        <p className="text-sm font-medium text-primary-700 mt-3">
          {fixed ? 'Soldes corrigés.' : 'Tous les soldes sont justes.'}
        </p>
      )}
      {mismatches !== null && mismatches.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-col divide-y divide-line">
            {mismatches.map(({ account, expected }) => (
              <div key={account.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium truncate">{account.name}</span>
                <span className="text-muted shrink-0">
                  {formatMoney(account.balance)} → <span className="font-semibold text-ink">{formatMoney(expected)}</span>
                </span>
              </div>
            ))}
          </div>
          <Button className="w-full mt-2" onClick={fix}>
            Corriger {mismatches.length > 1 ? `les ${mismatches.length} soldes` : 'le solde'}
          </Button>
        </div>
      )}
    </div>
  );
}
