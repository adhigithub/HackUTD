const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function withCommas(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** $67,000 · $1,562 · $64 */
export function formatUSD(n: number) {
  return `${n < 0 ? '-' : ''}$${withCommas(Math.abs(n))}`;
}

/** $67K · $1.6K · $940 (for tight spaces) */
export function formatUSDCompact(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}$${trim(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function trim(n: number) {
  return n >= 100 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, '');
}

/** plural(1, 'problem') → "1 problem"; plural(3, 'threat') → "3 threats" */
export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

export function formatNumber(n: number) {
  return withCommas(n);
}

/** "Nov 4" */
export function formatShortDate(iso: string) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Nov 4, 11:10 PM" */
export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${formatShortDate(iso)}, ${hour12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}
