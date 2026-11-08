import { buildSystemPrompt, parseAskRequest } from '@/lib/ai/prompt';
import type { AskErrorCode, AskErrorResponse, AskResponse } from '@/lib/ai/types';

/**
 * POST /api/ask: Ask AI for the Client Report, answered by Google Gemini.
 *
 * Runs on the server only, so GEMINI_API_KEY never reaches the app bundle.
 * Put the key in hack-utd/.env.local (git-ignored); Expo CLI loads it on start.
 * Get a key at https://aistudio.google.com/apikey
 */

// Google renames models often. Override with GEMINI_MODEL in .env.local if this one disappears.
// gemini-3.5-flash answers in seconds; gemini-3.8-flash was too slow for a chat (30-90 s) when tested.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail(503, 'not_configured', 'Ask AI is not configured on the server.');

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            { text: buildSystemPrompt(parsed.value.role, parsed.value.period, parsed.value.live) },
          ],
        },
        // Gemini calls the assistant side of the chat "model".
        contents: parsed.value.messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        // Short chat answers over a small dataset: light thinking keeps replies fast.
        // Room for that thinking plus a full answer.
        generationConfig: { maxOutputTokens: 8192, thinkingConfig: { thinkingLevel: 'LOW' } },
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    console.error('[ask] Could not reach Gemini:', error);
    return fail(502, 'upstream_error', 'Could not reach Ask AI.');
  }

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    console.error(`[ask] Gemini error ${res.status}:`, detail); // shows in the Metro terminal, never the key
    if (res.status === 401 || res.status === 403) {
      return fail(503, 'not_configured', 'Ask AI credentials were rejected.');
    }
    if (res.status === 429) return fail(429, 'rate_limited', 'Ask AI is busy. Try again in a moment.');
    return fail(502, 'upstream_error', 'Ask AI had a problem answering.');
  }

  const data = (await res.json()) as GeminiResponse;
  const candidate = data.candidates?.[0];
  if (data.promptFeedback?.blockReason || candidate?.finishReason === 'SAFETY') {
    return fail(422, 'refused', 'Ask AI can’t help with that question.');
  }

  const answer = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought) // skip any thinking summaries, keep only the answer
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!answer) return fail(502, 'upstream_error', 'Ask AI returned an empty answer.');

  return Response.json({ answer } satisfies AskResponse);
}
