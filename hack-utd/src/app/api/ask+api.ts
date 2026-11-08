import { buildSystemPrompt, parseAskRequest } from '@/lib/ai/prompt';
import type { AskErrorCode, AskErrorResponse, AskResponse } from '@/lib/ai/types';

/**
 * POST /api/ask: Ask AI for the Client Report, answered by Groq.
 *
 * Runs on the server only, so GROQ_API_KEY never reaches the app bundle.
 * Put the key in hack-utd/.env.local (git-ignored); Expo CLI loads it on start.
 * Get a key at https://console.groq.com/keys
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Groq retires models often. Override with GROQ_MODEL in .env.local (shared with alert summaries).
// Current list: https://console.groq.com/docs/models
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

type GroqResponse = {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
};

function fail(status: number, code: AskErrorCode, error: string) {
  return Response.json({ error, code } satisfies AskErrorResponse, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'bad_request', 'Body must be valid JSON.');
  }

  const parsed = parseAskRequest(body);
  if (!parsed.ok) return fail(400, 'bad_request', parsed.error);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return fail(503, 'not_configured', 'Ask AI is not configured on the server.');

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(parsed.value.role, parsed.value.period, parsed.value.live),
          },
          ...parsed.value.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        // gpt-oss is a reasoning model: keep its thinking short so chat replies stay fast,
        // and leave room for that thinking plus a full answer.
        reasoning_effort: 'low',
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    console.error('[ask] Could not reach Groq:', error);
    return fail(502, 'upstream_error', 'Could not reach Ask AI.');
  }

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    console.error(`[ask] Groq error ${res.status}:`, detail); // shows in the Metro terminal, never the key
    if (res.status === 401 || res.status === 403) {
      return fail(503, 'not_configured', 'Ask AI credentials were rejected.');
    }
    if (res.status === 429) return fail(429, 'rate_limited', 'Ask AI is busy. Try again in a moment.');
    return fail(502, 'upstream_error', 'Ask AI had a problem answering.');
  }

  const data = (await res.json()) as GroqResponse;
  const choice = data.choices?.[0];
  if (choice?.finish_reason === 'content_filter') {
    return fail(422, 'refused', 'Ask AI can’t help with that question.');
  }

  const answer = choice?.message?.content?.trim();
  if (!answer) return fail(502, 'upstream_error', 'Ask AI returned an empty answer.');

  return Response.json({ answer } satisfies AskResponse);
}
