import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

const iconSvg = (size, pad = 0) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22C55E"/>
      <stop offset="100%" stop-color="#15803D"/>
    </linearGradient>
  </defs>
  <rect x="${pad}" y="${pad}" width="${512 - pad * 2}" height="${512 - pad * 2}" rx="${120}" fill="url(#g)"/>
  <g transform="translate(256 256)">
    <rect x="-140" y="-92" width="280" height="184" rx="28" fill="#F4FAF6"/>
    <rect x="-140" y="-92" width="280" height="60" rx="28" fill="#ffffff"/>
    <circle cx="96" cy="0" r="26" fill="#16A34A"/>
  </g>
</svg>`;

const favicon = iconSvg(512, 0);
writeFileSync('public/favicon.svg', favicon);

const jobs = [
  { file: 'public/icons/icon-192.png', size: 192, pad: 0 },
  { file: 'public/icons/icon-512.png', size: 512, pad: 0 },
  { file: 'public/icons/icon-maskable-192.png', size: 192, pad: 60 },
  { file: 'public/icons/icon-maskable-512.png', size: 512, pad: 60 },
  { file: 'public/icons/apple-touch-icon.png', size: 180, pad: 20 },
];

for (const job of jobs) {
  const svg = iconSvg(job.size, job.pad);
  await sharp(Buffer.from(svg)).png().toFile(job.file);
  console.log('wrote', job.file);
}
