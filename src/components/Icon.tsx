const P: Record<string, string> = {
  s: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  h: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>',
  u: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  m: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  c: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  f: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  p: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  l: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  g: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  d: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>',
  a: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  t: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
};

export function Icon({ n, size = 20, fill = 'none' }: { n: keyof typeof P; size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: P[n] }} />
  );
}

export function Logo({ size = 30, id = 'lg' }: { size?: number; id?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flex: 'none' }}>
      <defs><clipPath id={id}><rect width="64" height="64" rx="16" /></clipPath></defs>
      <rect width="64" height="64" rx="16" fill="#2563eb" />
      <g clipPath={`url(#${id})`}>
        <path d="M44.3 4.7H41.3M48.7 15.3L46.6 17.4M59.3 19.7V22.7" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="59.3" cy="4.7" r="11" fill="#fbbf24" />
      </g>
      <path d="M14 32 Q32 12 50 32Z" fill="#fff" />
      <rect x="16" y="32" width="32" height="10" rx="2" fill="#fff" />
      <rect x="28.5" y="34" width="7" height="8" rx="1" fill="#2563eb" />
    </svg>
  );
}
