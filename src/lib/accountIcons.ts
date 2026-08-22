import type { Account } from '../db/types';
import { ACCOUNT_TYPE_ICONS } from '../db/types';
import {
  Wallet,
  CreditCard,
  PiggyBank,
  Landmark,
  TrendingUp,
  LineChart,
  BarChart3,
  PieChart,
  Coins,
  Banknote,
  Building2,
  ShieldCheck,
  Gem,
  Home,
  Car,
  Briefcase,
  GraduationCap,
  Plane,
  Gift,
  Heart,
  Umbrella,
  Lock,
  Star,
  Rocket,
  HandCoins,
  Vault,
  WalletCards,
  CircleDollarSign,
  type LucideIcon,
} from 'lucide-react';

export const ACCOUNT_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  'credit-card': CreditCard,
  'piggy-bank': PiggyBank,
  landmark: Landmark,
  'trending-up': TrendingUp,
  'line-chart': LineChart,
  'bar-chart': BarChart3,
  'pie-chart': PieChart,
  coins: Coins,
  banknote: Banknote,
  building: Building2,
  shield: ShieldCheck,
  gem: Gem,
  home: Home,
  car: Car,
  briefcase: Briefcase,
  graduation: GraduationCap,
  plane: Plane,
  gift: Gift,
  heart: Heart,
  umbrella: Umbrella,
  lock: Lock,
  star: Star,
  rocket: Rocket,
  'hand-coins': HandCoins,
  vault: Vault,
  'wallet-cards': WalletCards,
  'dollar-circle': CircleDollarSign,
};

export const ACCOUNT_ICON_CHOICES = Object.keys(ACCOUNT_ICONS);

// Accounts created before the icon-library switch have an emoji character stored in
// `icon` instead of a known key — fall back to the type's default vector icon instead
// of rendering that raw emoji.
export function resolveAccountIcon(account: Pick<Account, 'icon' | 'type'>): string {
  return ACCOUNT_ICONS[account.icon] ? account.icon : ACCOUNT_TYPE_ICONS[account.type];
}
