import { BUILDINGS, IMPACT_PROFILES } from '@/lib/portfolio/demo-data';
import { formatShortDate, formatUSD, plural } from '@/lib/portfolio/format';
import { buildReport, buildingName, type ReportPeriod } from '@/lib/portfolio/report';
import { BUILDING_TYPE_LABELS, CATEGORY_LABELS } from '@/lib/portfolio/types';

/**
 * Rule-based answers from the same report data, used when the AI can't be
 * reached, so the demo still answers the common questions. It's a keyword
 * matcher, not a model, and the UI labels these replies as offline.
 */
export function offlineAnswer(question: string, period: ReportPeriod = 30): string {
  const q = question.toLowerCase();
  const r = buildReport(period);
  const range = `${formatShortDate(r.startISO)} – ${formatShortDate(r.endISO)}`;
  const has = (...words: string[]) => words.some((w) => q.includes(w));

  const building = BUILDINGS.find(
    (b) => q.includes(b.name.toLowerCase()) || q.includes(b.name.toLowerCase().split(' ')[0])
  );
  if (building) {
    const b = r.byBuilding.find((x) => x.building.id === building.id)!;
    const items = r.incidents.filter((i) => i.buildingId === building.id);
    const alerts = r.activeAlerts.filter((a) => a.buildingId === building.id);
    return [
      `${building.name} (${BUILDING_TYPE_LABELS[building.type]}) saved ${formatUSD(b.saved)} from ${range}: ${plural(b.incidents, 'problem')} stopped plus ${formatUSD(b.wasteSaved)} in overnight waste.`,
      ...items.map((i) => `- ${formatShortDate(i.occurredAt)}: ${i.title} (${formatUSD(i.costAvoided)} avoided)`),
      alerts.length
        ? `Open now: ${alerts.map((a) => `${a.title}, ${formatUSD(a.moneyAtRisk)} at risk`).join('; ')}.`
        : 'No open alerts right now.',
    ].join('\n');
  }

  if (has('risk', 'right now', 'open', 'active', 'next', 'attention', 'priorit', 'ignore', 'warm')) {
    return [
      `${formatUSD(r.moneyAtRisk)} is at risk right now across ${plural(r.activeAlerts.length, 'open alert')}, highest first:`,
      ...r.activeAlerts.map(
        (a) => `- ${buildingName(a.buildingId)}: ${a.title}, ${formatUSD(a.moneyAtRisk)}, ${a.eta}. Fix: ${a.recommendedFix}`
      ),
    ].join('\n');
  }

  if (has('data center', 'mall', 'office', 'differ', 'why does', 'building type', 'cost more')) {
    return [
      'The same problem costs different amounts depending on the building. Ten minutes without power:',
      ...(['office', 'mall', 'data_center'] as const).map(
        (t) => `- ${BUILDING_TYPE_LABELS[t]}: ${IMPACT_PROFILES[t].outageImpact} impact (${IMPACT_PROFILES[t].whatMatters.toLowerCase()})`
      ),
      'That is why Dallas DC-2 saved the most: its contract promises the tenant it will stay online 99.99% of the time, so every problem that spreads there comes with a penalty.',
    ].join('\n');
  }

  if (has('waste', 'hvac', 'overnight', 'energy', 'night', 'lights', 'kwh', 'empty')) {
    return [
      `Turning off AC and lights in empty buildings at night saved ${formatUSD(r.wasteSaved)} over ${plural(r.wasteNights, 'night')} (about ${formatUSD(r.wasteAnnualized)} a year at this rate).`,
      ...r.wasteByZone.map((z) => `- ${z.building.name}, ${z.zone}: ${plural(z.nights, 'night')}, ${formatUSD(z.saved)}`),
      'It only does this when nobody has badged in and it is after business hours. The AC turns back on as soon as someone badges in.',
    ].join('\n');
  }

  if (has('security', 'badge', 'break', 'login', 'cyber', 'intru')) {
    const sec = r.incidents.filter((i) => i.category === 'security');
    if (!sec.length) return `No security incidents from ${range}.`;
    return sec
      .map((i) => `${formatShortDate(i.occurredAt)} at ${buildingName(i.buildingId)}: ${i.summary} ${i.fix}`)
      .join('\n\n');
  }

  if (has('outage', 'prevent', 'stopped', 'incident', 'fail', 'what happened')) {
    if (!r.incidents.length) return `No problems needed stopping from ${range}.`;
    return [
      `From ${range}: ${plural(r.outagesPrevented, 'outage')} prevented, ${plural(r.failuresPrevented, 'equipment failure')} caught early, ${plural(r.threatsStopped, 'security threat')} stopped.`,
      ...r.incidents.map(
        (i) => `- ${formatShortDate(i.occurredAt)}, ${buildingName(i.buildingId)}: ${i.title} (${formatUSD(i.costAvoided)})`
      ),
    ].join('\n');
  }

  if (has('number', 'come from', 'calculat', 'real', 'accurate', 'source')) {
    return 'The app does the math itself from the building data, not the AI. Energy savings are the power used times the hours it would have run times the electricity price ($0.12 per kWh). Problem savings add up what each step of the chain would have cost if it happened: repairs, lost sales, and contract penalties. In this demo they are estimates, not real client numbers.';
  }

  // Default: a client-ready summary.
  const top = r.byBuilding[0];
  const topCat = r.byCategory[0];
  return [
    `From ${range}, BluePrint saved an estimated ${formatUSD(r.totalSaved)} across ${BUILDINGS.length} buildings.`,
    `- ${plural(r.outagesPrevented, 'outage')} prevented, ${plural(r.failuresPrevented, 'failure')} caught early, ${plural(r.threatsStopped, 'security threat')} stopped`,
    `- ${formatUSD(r.wasteSaved)} in overnight waste cut automatically (about ${formatUSD(r.wasteAnnualized)} a year)`,
    `- Biggest impact: ${top.building.name} (${formatUSD(top.saved)}); top issue type: ${CATEGORY_LABELS[topCat.category].toLowerCase()}`,
    `${formatUSD(r.moneyAtRisk)} is still at risk across ${plural(r.activeAlerts.length, 'open alert')}.`,
  ].join('\n');
}
