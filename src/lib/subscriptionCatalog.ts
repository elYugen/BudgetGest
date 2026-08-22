import { BRAND_LOGOS } from './brandLogos';

export interface CatalogEntry {
  name: string;
  color: string;
  emoji: string;
  category: string;
  logo?: string;
}

export const SUBSCRIPTION_CATALOG: CatalogEntry[] = [
  { name: 'Netflix', color: BRAND_LOGOS.netflix.hex, emoji: '🎬', category: 'Streaming', logo: 'netflix' },
  { name: 'Spotify', color: BRAND_LOGOS.spotify.hex, emoji: '🎵', category: 'Musique', logo: 'spotify' },
  { name: 'Disney+', color: '#113CCF', emoji: '🏰', category: 'Streaming' },
  { name: 'Amazon Prime', color: '#00A8E1', emoji: '📦', category: 'Streaming' },
  { name: 'YouTube Premium', color: BRAND_LOGOS.youtube.hex, emoji: '▶️', category: 'Streaming', logo: 'youtube' },
  { name: 'HBO Max', color: BRAND_LOGOS.hbomax.hex, emoji: '🎬', category: 'Streaming', logo: 'hbomax' },
  { name: 'Crunchyroll', color: BRAND_LOGOS.crunchyroll.hex, emoji: '📺', category: 'Streaming', logo: 'crunchyroll' },
  { name: 'Deezer', color: BRAND_LOGOS.deezer.hex, emoji: '🎧', category: 'Musique', logo: 'deezer' },
  { name: 'Apple Music', color: BRAND_LOGOS.applemusic.hex, emoji: '🍎', category: 'Musique', logo: 'applemusic' },
  { name: 'Canal+', color: '#000000', emoji: '📡', category: 'Streaming' },
  { name: 'PlayStation Plus', color: BRAND_LOGOS.playstation.hex, emoji: '🎮', category: 'Jeux vidéo', logo: 'playstation' },
  { name: 'Xbox Game Pass', color: '#107C10', emoji: '🎮', category: 'Jeux vidéo' },
  { name: 'Steam', color: BRAND_LOGOS.steam.hex, emoji: '🎮', category: 'Jeux vidéo', logo: 'steam' },
  { name: 'Twitch', color: BRAND_LOGOS.twitch.hex, emoji: '🎥', category: 'Streaming', logo: 'twitch' },
  { name: 'Salle de sport', color: '#F97316', emoji: '💪', category: 'Sport' },
  { name: 'Assurance', color: '#0EA5E9', emoji: '🛡️', category: 'Assurance' },
  { name: 'Internet / Box', color: '#8B5CF6', emoji: '📶', category: 'Télécom' },
  { name: 'Téléphone', color: '#14B8A6', emoji: '📱', category: 'Télécom' },
  { name: 'iCloud / Cloud', color: BRAND_LOGOS.icloud.hex, emoji: '☁️', category: 'Cloud', logo: 'icloud' },
  { name: 'Presse / Magazine', color: '#EAB308', emoji: '📰', category: 'Presse' },
  { name: 'Autre', color: '#22C55E', emoji: '⭐', category: 'Autre' },
];

export const EMOJI_CHOICES = [
  '⭐', '🎬', '🎵', '🎧', '🏰', '📦', '▶️', '📡', '🎮', '💪', '🛡️', '📶', '📱', '☁️', '📰',
  '🏠', '🚗', '🍔', '🛒', '💡', '💧', '🔥', '🏥', '🎓', '🐶', '🧾', '💼', '💰', '🏦', '🧘',
];

export const COLOR_CHOICES = [
  '#16A34A', '#22C55E', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899',
  '#14B8A6', '#F97316', '#64748B', '#A238FF', '#E50914', '#113CCF', '#EAB308',
];
