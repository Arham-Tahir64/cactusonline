export type UiIconName =
  | 'menu'
  | 'users'
  | 'volume'
  | 'muted'
  | 'settings'
  | 'copy'
  | 'cards'
  | 'take'
  | 'cactus'
  | 'crown'
  | 'sparkle'
  | 'clear';

export default function UiIcon({ name, className = '' }: { name: UiIconName; className?: string }) {
  const common = {
    className: `ui-icon ${className}`.trim(),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'menu') return <svg {...common}><path d="M5 7h14M5 12h14M5 17h14" /></svg>;
  if (name === 'users') return <svg {...common}><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6.8-1a2.4 2.4 0 1 0 0-4.8M3.8 19v-1.4A4.6 4.6 0 0 1 8.4 13h1.2a4.6 4.6 0 0 1 4.6 4.6V19m1.4-6a4.2 4.2 0 0 1 4.6 4.2V19" /></svg>;
  if (name === 'volume') return <svg {...common}><path d="M5 10v4h3l4 3V7l-4 3H5Zm10-1a4.2 4.2 0 0 1 0 6m2-8a7 7 0 0 1 0 10" /></svg>;
  if (name === 'muted') return <svg {...common}><path d="M5 10v4h3l4 3V7l-4 3H5Zm10 0 4 4m0-4-4 4" /></svg>;
  if (name === 'settings') return <svg {...common}><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19 13.5 1.2 1-.8 2-1.6-.1-1.4 1.4.1 1.6-2 .8-1-1.2h-2l-1 1.2-2-.8.1-1.6-1.4-1.4-1.6.1-.8-2 1.2-1v-2l-1.2-1 .8-2 1.6.1 1.4-1.4-.1-1.6 2-.8 1 1.2h2l1-1.2 2 .8-.1 1.6 1.4 1.4 1.6-.1.8 2-1.2 1v2Z" /></svg>;
  if (name === 'copy') return <svg {...common}><rect x="8" y="7" width="10" height="11" rx="1.5" /><path d="M6 15H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1" /></svg>;
  if (name === 'cards') return <svg {...common}><rect x="7" y="4" width="11" height="16" rx="1.5" transform="rotate(6 12.5 12)" /><path d="m6.5 7-1.2.2a1.5 1.5 0 0 0-1.2 1.7l1.6 10a1.5 1.5 0 0 0 1.7 1.2l7.1-1.1" /></svg>;
  if (name === 'take') return <svg {...common}><path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v6h14v-6" /></svg>;
  if (name === 'cactus') return <svg {...common}><path d="M12 21V5.5a2 2 0 0 1 4 0V9m0-1.5v3a2 2 0 0 0 2 2h1.5V9M12 12H9a2 2 0 0 1-2-2V7.5m0 1V6a2 2 0 0 0-4 0v3.5a6 6 0 0 0 6 6h3M8 21h8" /></svg>;
  if (name === 'crown') return <svg {...common}><path d="m4 8 4 4 4-6 4 6 4-4-2 10H6L4 8Zm3 13h10" /></svg>;
  if (name === 'sparkle') return <svg {...common}><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" /></svg>;
  return <svg {...common}><path d="m12 3 8 9-8 9-8-9 8-9Z" /><path d="m12 7 4.5 5-4.5 5-4.5-5 4.5-5Z" /></svg>;
}
