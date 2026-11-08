import { SOURCE_LABELS, type Alert, type Building, type Severity, type TimelineEvent } from '@/data/buildings';

/**
 * Builds one timeline for a building out of everything we know: sensor events,
 * security events, problems spotted, and what people did. Put side by side,
 * these show how a small blip turned into a problem.
 */

export type TimelineCategory = TimelineEvent['category'] | 'security' | 'alert';

export type TimelineItem = {
  id: string;
  at: string;
  category: TimelineCategory;
  title: string;
  detail?: string;
  source?: string;
  who?: string;
  severity?: Severity;
  /** Alert / linked-risk ids this item belongs to (for the "what led to this" filter). */
  relatedTo: string[];
};

/** A thread you can follow through the timeline: one problem or linked risk. */
export type TimelineThread = { id: string; label: string };

export function buildTimeline(
  building: Building,
  alerts: Alert[]
): { items: TimelineItem[]; threads: TimelineThread[] } {
  const items: TimelineItem[] = [];

  for (const e of building.timeline ?? []) {
    items.push({
      ...e,
      source: e.source ? SOURCE_LABELS[e.source] : undefined,
      relatedTo: e.relatedTo ?? [],
    });
  }

  const risks = building.security?.linkedRisks ?? [];
  for (const e of building.security?.events ?? []) {
    items.push({
      id: e.id,
      at: e.at,
      category: e.kind === 'cyber' ? 'network' : 'security',
      title: e.title,
      detail: e.detail,
      severity: e.severity,
      relatedTo: risks.filter((r) => r.eventIds.includes(e.id)).map((r) => r.id),
    });
  }

  for (const a of alerts) {
    items.push({
      id: `alert-${a.id}`,
      at: a.detectedAt,
      category: 'alert',
      title: `Problem spotted: ${a.title}`,
      detail: `Noticed by: ${a.sources.map((s) => SOURCE_LABELS[s].toLowerCase()).join(', ')}`,
      severity: a.severity,
      relatedTo: [a.id],
    });
  }

  items.sort((x, y) => Date.parse(x.at) - Date.parse(y.at));

  const threads: TimelineThread[] = [
    ...alerts.map((a) => ({ id: a.id, label: a.title })),
    ...risks.map((r) => ({ id: r.id, label: 'Possible break-in' })),
  ];
  return { items, threads };
}
