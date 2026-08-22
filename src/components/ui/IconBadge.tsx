import { BRAND_LOGOS } from '../../lib/brandLogos';

export function IconBadge({
  emoji,
  color,
  logo,
  size = 40,
}: {
  emoji: string;
  color: string;
  logo?: string;
  size?: number;
}) {
  const brand = logo ? BRAND_LOGOS[logo] : undefined;
  const bg = brand ? brand.hex : color;

  return (
    <div
      className="flex items-center justify-center rounded-2xl shrink-0"
      style={{
        width: size,
        height: size,
        background: `${bg}1A`,
        fontSize: size * 0.5,
      }}
    >
      {brand ? (
        <svg viewBox="0 0 24 24" width={size * 0.52} height={size * 0.52} fill={brand.hex} role="img" aria-label={brand.title}>
          <path d={brand.path} />
        </svg>
      ) : (
        <span style={{ filter: 'saturate(1.1)' }}>{emoji}</span>
      )}
    </div>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />;
}
