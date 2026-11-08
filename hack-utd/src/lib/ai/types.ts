import type { Role } from '@/lib/auth/types';
import type { LiveReportEntries, ReportPeriod } from '@/lib/portfolio/report';

export type ChatRole = 'user' | 'assistant';

/** One turn sent to /api/ask. */
export type AskTurn = { role: ChatRole; content: string };

export type AskRequest = {
  messages: AskTurn[];
  role: Role;
  /** The report period the person is looking at, in days. */
  period: ReportPeriod;
  /** Live fixes / overnight savings / open alerts from the app, so answers match the Report. */
  live?: LiveReportEntries;
};

export type AskResponse = { answer: string };

export type AskErrorCode =
  | 'bad_request'
  | 'not_configured'
  | 'rate_limited'
  | 'refused'
  | 'upstream_error';

export type AskErrorResponse = { error: string; code: AskErrorCode };

/** Limits enforced on the server and respected by the client. */
export const ASK_LIMITS = {
  maxTurns: 16,
  maxCharsPerTurn: 2000,
} as const;
