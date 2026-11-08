import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES, type Role } from '@/lib/auth/types';
import {
  buildAiContext,
  isReportPeriod,
  type LiveReportEntries,
  type ReportPeriod,
} from '@/lib/portfolio/report';
import type { ActiveAlert, ResolvedIncident, WasteNight } from '@/lib/portfolio/types';

import { ASK_LIMITS, type AskRequest, type AskTurn } from './types';

const AUDIENCE: Record<Role, string> = {
  manager:
    'They run these buildings day to day. Be direct about what needs their approval or attention next.',
  technician:
    'They fix equipment on site. Focus on what broke, what was done, and what to check next.',
  advisor:
    'They are a CBRE advisor who presents results to the property owner. Lead with business impact in dollars, and keep the wording client-ready.',
};

export function buildSystemPrompt(role: Role, period: ReportPeriod, live: LiveReportEntries = {}) {
  return `You are the Ask AI assistant inside BluePrint, an app that connects a commercial real estate portfolio's separate building systems (HVAC/BMS, smart meters, panel sensors, temperature sensors, badge and Wi-Fi occupancy, maintenance tickets, tenant leases, weather) to predict failures, put a dollar figure on them, and stop them before they spread. You are on the Client Report screen.

You are talking with a ${ROLE_LABELS[role]} (${ROLE_DESCRIPTIONS[role].toLowerCase()}). ${AUDIENCE[role]}

They are viewing the last ${period} days. Answer for that period unless they ask about another one.

How to answer:
- Use only the portfolio data below. If the answer isn't in it, say so plainly and name the data that would answer it. Never invent buildings, events, dates, or dollar amounts.
- The numbers below were calculated by the app. Quote them as given. If you combine numbers (a sum or a difference), show the arithmetic in one short line.
- Dollar figures are illustrative estimates based on building type and lease terms. Say so if someone asks where the numbers come from or treats them as audited.
- Explain why the same problem costs more in some buildings (10 minutes without power is minor at a mall and a disaster at a data center) when it helps answer the question.
- You can explain and recommend, but you cannot take actions. Fixes are approved with one tap elsewhere in the app.
- Use everyday words a person new to buildings would understand. Say "AC" rather than "HVAC", "power box" rather than "panel", and "backup batteries" rather than "UPS". If a technical term is needed, explain it in a few words.
- Write plain text for a phone screen: no markdown headings, bold, or tables. Short paragraphs, and "- " bullets when listing. Keep answers under about 150 words unless the person asks for a draft such as a client email or summary.

PORTFOLIO DATA
${buildAiContext(new Date(), live)}`;
}

export type ParsedAsk = { ok: true; value: AskRequest } | { ok: false; error: string };

/** Validates an untrusted /api/ask body. */
export function parseAskRequest(body: unknown): ParsedAsk {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a JSON object.' };
  const { messages, role, period, live } = body as Record<string, unknown>;

  if (!ROLES.includes(role as Role)) return { ok: false, error: 'Unknown role.' };
  if (!isReportPeriod(period)) return { ok: false, error: 'period must be 7 or 30.' };
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: 'messages must be a non-empty array.' };
  }
  if (messages.length > ASK_LIMITS.maxTurns) return { ok: false, error: 'Too many messages.' };

  const turns: AskTurn[] = [];
  for (const [i, m] of messages.entries()) {
    if (!m || typeof m !== 'object') return { ok: false, error: `messages[${i}] is invalid.` };
    const { role: r, content } = m as Record<string, unknown>;
    const expected = i % 2 === 0 ? 'user' : 'assistant';
    if (r !== expected) return { ok: false, error: 'Messages must alternate, starting with user.' };
    if (typeof content !== 'string' || !content.trim()) {
      return { ok: false, error: `messages[${i}] content must be a non-empty string.` };
    }
    if (content.length > ASK_LIMITS.maxCharsPerTurn) {
      return { ok: false, error: `messages[${i}] is too long.` };
    }
    turns.push({ role: expected, content: content.trim() });
  }
  if (turns[turns.length - 1].role !== 'user') {
    return { ok: false, error: 'The last message must be from the user.' };
  }

  return { ok: true, value: { messages: turns, role: role as Role, period, live: parseLive(live) } };
}

// ─── Live entries from the app (untrusted: validate before they reach the prompt) ───

const str = (v: unknown, max = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const date = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null);
const oneOf = <T extends string>(v: unknown, options: readonly T[]) =>
  options.includes(v as T) ? (v as T) : null;
const strList = (v: unknown, maxItems = 10) =>
  Array.isArray(v) ? v.map((x) => str(x, 120)).filter((x): x is string => x !== null).slice(0, maxItems) : [];
const list = (v: unknown, maxItems: number) =>
  (Array.isArray(v) ? v.slice(0, maxItems) : []).filter(
    (x): x is Record<string, unknown> => !!x && typeof x === 'object'
  );

const CATEGORIES = ['cooling', 'power', 'security', 'waste'] as const;

function parseIncident(x: Record<string, unknown>): ResolvedIncident | null {
  const v = {
    id: str(x.id, 120),
    buildingId: str(x.buildingId, 60),
    category: oneOf(x.category, CATEGORIES),
    outcome: oneOf(x.outcome, ['outage_prevented', 'failure_prevented', 'threat_stopped'] as const),
    title: str(x.title),
    summary: str(x.summary, 600),
    occurredAt: date(x.occurredAt),
    chain: strList(x.chain),
    stoppedAt: num(x.stoppedAt),
    fix: str(x.fix),
    fixMode: oneOf(x.fixMode, ['auto', 'one_tap', 'escalated'] as const),
    sources: strList(x.sources),
    costAvoided: num(x.costAvoided),
  };
  return Object.values(v).every((f) => f !== null) ? (v as ResolvedIncident) : null;
}

function parseWasteNight(x: Record<string, unknown>): WasteNight | null {
  const v = {
    buildingId: str(x.buildingId, 60),
    zone: str(x.zone, 60),
    date: date(x.date),
    kwhSaved: num(x.kwhSaved),
    costSaved: num(x.costSaved),
  };
  return Object.values(v).every((f) => f !== null) ? (v as WasteNight) : null;
}

function parseActiveAlert(x: Record<string, unknown>): ActiveAlert | null {
  const v = {
    id: str(x.id, 120),
    buildingId: str(x.buildingId, 60),
    category: oneOf(x.category, CATEGORIES),
    severity: oneOf(x.severity, ['watch', 'act'] as const),
    title: str(x.title),
    detail: str(x.detail, 600),
    moneyAtRisk: num(x.moneyAtRisk),
    eta: str(x.eta, 60),
    recommendedFix: str(x.recommendedFix),
  };
  return Object.values(v).every((f) => f !== null) ? (v as ActiveAlert) : null;
}

/** Keeps only well-formed, size-limited live entries; anything else is dropped. */
function parseLive(raw: unknown): LiveReportEntries | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const keep = <T,>(items: (T | null)[]) => items.filter((x): x is T => x !== null);
  return {
    incidents: keep(list(r.incidents, 50).map(parseIncident)),
    wasteNights: keep(list(r.wasteNights, 50).map(parseWasteNight)),
    // Only replace the demo "still at risk" list if the app actually sent one.
    activeAlerts: Array.isArray(r.activeAlerts)
      ? keep(list(r.activeAlerts, 20).map(parseActiveAlert))
      : undefined,
  };
}
