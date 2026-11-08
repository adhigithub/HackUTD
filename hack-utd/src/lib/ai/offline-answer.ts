import { BUILDINGS, IMPACT_PROFILES } from '@/lib/portfolio/demo-data';
import { formatNumber, formatShortDate, formatUSD, plural } from '@/lib/portfolio/format';
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

  if (has('risk', 'right now', 'open', 'active', 'next', 'attention', 'priorit')) {
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
      'That is why Dallas DC-2 has the largest savings: its tenant lease promises 99.99% uptime, so every domino that falls carries a penalty.',
    ].join('\n');
  }

  if (has('waste', 'hvac', 'overnight', 'energy', 'night', 'lights', 'kwh', 'empty')) {
    return [
      `Overnight waste cut: ${formatUSD(r.wasteSaved)} from ${plural(r.wasteNights, 'automatic setback')} (${formatNumber(r.wasteKwh)} kWh), about ${formatUSD(r.wasteAnnualized)} a year at this rate.`,
      ...r.wasteByZone.map((z) => `- ${z.building.name}, ${z.zone}: ${plural(z.nights, 'night')}, ${formatUSD(z.saved)}`),
      'Each setback only runs when HVAC is on, nobody is badged in, and it is outside lease hours. It switches back on the next badge swipe.',
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
    return 'The app calculates every figure in plain code from the connected building data. Waste is kW × hours × $0.12/kWh. Avoided costs add up what each domino in the chain would have cost (equipment, lost sales, lease penalties) for that building type. In this demo they are illustrative estimates, not audited figures.';
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
