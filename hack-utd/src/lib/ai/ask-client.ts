import type { Role } from '@/lib/auth/types';
import type { ReportPeriod } from '@/lib/portfolio/report';

import { offlineAnswer } from './offline-answer';
import { ASK_LIMITS, type AskErrorResponse, type AskResponse, type AskTurn, type ChatRole } from './types';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  /** Assistant replies only: where the answer came from. */
  source?: 'ai' | 'offline';
  /** Assistant replies only: why we fell back to an offline answer. */
  note?: string;
};

const TIMEOUT_MS = 60_000;

/**
 * Asks the server-side AI. If it can't answer (not configured, offline, busy),
 * returns a rule-based answer from the same data instead of an error, so the
 * chat never dead-ends.
 */
export async function ask(
  history: ChatMessage[],
  role: Role,
  period: ReportPeriod
): Promise<Pick<ChatMessage, 'text' | 'source' | 'note'>> {
  const turns = toTurns(history);
  const question = turns[turns.length - 1]?.content ?? '';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: turns, role, period }),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as AskResponse | AskErrorResponse | null;

    if (res.ok && data && 'answer' in data) {
      return { text: cleanText(data.answer), source: 'ai' };
    }
    if (data && 'code' in data && data.code === 'refused') {
      return { text: data.error, source: 'ai' };
    }
    return {
      text: offlineAnswer(question, period),
      source: 'offline',
      note:
        data && 'code' in data && data.code === 'not_configured'
          ? 'AI is off right now, so this is a quick answer from the report.'
          : 'AI is busy right now, so this is a quick answer from the report.',
    };
  } catch {
    return {
      text: offlineAnswer(question, period),
      source: 'offline',
      note: 'Couldn’t reach the AI, so this is a quick answer from the report.',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Converts the chat into API turns: strictly alternating, starting with the user,
 * ending with the newest user question, within the server's limits.
 */
function toTurns(history: ChatMessage[]): AskTurn[] {
  const turns: AskTurn[] = [];
  for (const m of history) {
    const content = m.text.trim().slice(0, ASK_LIMITS.maxCharsPerTurn);
    if (!content) continue;
    const prev = turns[turns.length - 1];
    if (prev && prev.role === m.role) prev.content = `${prev.content}\n\n${content}`.slice(0, ASK_LIMITS.maxCharsPerTurn);
    else turns.push({ role: m.role, content });
  }
  while (turns.length && turns[0].role !== 'user') turns.shift();

  // Keep the newest turns; an odd count keeps "user first, user last".
  const max = ASK_LIMITS.maxTurns % 2 === 0 ? ASK_LIMITS.maxTurns - 1 : ASK_LIMITS.maxTurns;
  return turns.length > max ? turns.slice(turns.length - max) : turns;
}

/** The prompt asks for plain text; this strips stray markdown just in case. */
function cleanText(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*\*\s+/gm, '- ')
    .trim();
}
