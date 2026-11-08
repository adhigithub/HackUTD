import Anthropic from '@anthropic-ai/sdk';

import { buildSystemPrompt, parseAskRequest } from '@/lib/ai/prompt';
import type { AskErrorCode, AskErrorResponse, AskResponse } from '@/lib/ai/types';

/**
 * POST /api/ask: Ask AI for the Client Report.
 *
 * Runs on the server only, so ANTHROPIC_API_KEY never reaches the app bundle.
 * Put the key in hack-utd/.env.local (git-ignored); Expo CLI loads it on start.
 */

const MODEL = 'claude-opus-5-5';

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 });
  return client;
}

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

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return fail(503, 'not_configured', 'Ask AI is not configured on the server.');
  }

  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Chat answers over a small, fixed dataset: low effort keeps replies fast.
      output_config: { effort: 'low' },
      system: [
        {
          type: 'text',
          text: buildSystemPrompt(parsed.value.role, parsed.value.period),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: parsed.value.messages,
      // If the model declines for policy reasons, let the API retry on its default fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });

    if (response.stop_reason === 'refusal') {
      return fail(422, 'refused', 'Ask AI can’t help with that question.');
    }

    const answer = response.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('')
      .trim();

    if (!answer) return fail(502, 'upstream_error', 'Ask AI returned an empty answer.');

    return Response.json({ answer } satisfies AskResponse);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      console.error('[ask] Anthropic credentials rejected:', error.message);
      return fail(503, 'not_configured', 'Ask AI credentials were rejected.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      return fail(429, 'rate_limited', 'Ask AI is busy. Try again in a moment.');
    }
    if (error instanceof Anthropic.APIConnectionError) {
      console.error('[ask] Could not reach the Anthropic API:', error.message);
      return fail(502, 'upstream_error', 'Could not reach Ask AI.');
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[ask] Anthropic API error ${error.status}:`, error.message);
      return fail(502, 'upstream_error', 'Ask AI had a problem answering.');
    }
    console.error('[ask] Unexpected error:', error);
    return fail(500, 'upstream_error', 'Something went wrong.');
  }
}
