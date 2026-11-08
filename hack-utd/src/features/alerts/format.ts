const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatUSD(n: number) {
  return usd.format(Math.round(n));
}

/** $71, $26K, $1.2M */
export function formatUSDCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${trim(n / 1_000_000)}M`;
  if (abs >= 10_000) return `$${Math.round(n / 1000)}K`;
  if (abs >= 1_000) return `$${trim(n / 1000)}K`;
  return formatUSD(n);
}

function trim(n: number) {
  return n.toFixed(1).replace(/\.0$/, '');
}

/** 47 min, 2 h 5 min */
export function formatMinutes(min: number) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

export function formatClock(ms: number) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
