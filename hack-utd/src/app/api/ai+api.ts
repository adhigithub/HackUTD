/**
 * POST /api/ai — server-only route that turns engine facts into plain English
 * (alert summaries + work orders) via Groq.
 *
 * Runs on the server, so GROQ_API_KEY never reaches the phone. The numbers
 * all come from engine.ts; the model is told to only reword them, never compute them.
 */
import { z } from 'zod';

// Groq's chat endpoint (OpenAI-compatible).
const AI_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Groq retires models often. Override with GROQ_MODEL in .env.local (shared with Ask AI).
// Current list: https://console.groq.com/docs/models
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const Facts = z.object({
  building: z.string(),
  asset: z.string(),
  location: z.string(),
  breaksInMinutes: z.number(),
  projectedLossUSD: z.number(),
  whatHappensNext: z.array(
    z.object({ whatHappens: z.string(), inMinutes: z.number(), costUSD: z.number() })
  ),
  readings: z.array(z.object({ system: z.string(), reading: z.string() })),
  fix: z
    .object({
      title: z.string(),
      detail: z.string(),
      savesUSD: z.number(),
      worksInMinutes: z.number(),
      mustBeDoneBeforeMinutes: z.number(),
    })
    .optional(),
});

const Body = z.object({ kind: z.enum(['explain', 'workOrder']), facts: Facts });

const SYSTEM = `You write for BluePrint, an app for building managers and technicians.
Use plain, everyday English that anyone can understand. No jargon or acronyms
(no "HVAC", "SLA", "BMS", "PDU", "CRAC", "uptime").
Only use numbers that appear in the facts. Never invent, round differently, or recompute numbers.
Write times like "1 h 15 min" and money like "$107,000".`;

const PROMPTS = {
  explain:
    'In exactly 2 short sentences, explain what is breaking, why we think so (mention 1-2 readings), and what it will cost if ignored. No preamble, no bullet points.',
  workOrder:
    'Write a short work order for the technician, under 120 words, plain text with these lines: ' +
    '"Task:", "Why it matters:", "Deadline:", then "What we know:" followed by 2-4 "- " bullets. No preamble.',
};

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return Response.json({ error: 'GROQ_API_KEY is not set' }, { status: 500 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Bad request' }, { status: 400 });
  const { kind, facts } = parsed.data;

  let res: Response;
  try {
    res = await fetch(AI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3, // steadier wording
        // Keep the model's thinking short, and leave room for the answer
        // (thinking tokens count toward this limit).
        reasoning_effort: 'low',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `${PROMPTS[kind]}\n\nFacts (JSON):\n${JSON.stringify(facts)}` },
        ],
      }),
    });
  } catch {
    return Response.json({ error: 'network' }, { status: 502 });
  }

  if (!res.ok) {
    // Log Groq's reason server-side (shows in the Metro terminal), never the key.
    console.warn(`[api/ai] Groq ${res.status}:`, (await res.text()).slice(0, 300));
    // 429 = Groq free-tier rate limit. The app falls back to template text.
    return Response.json({ error: `groq_${res.status}` }, { status: res.status === 429 ? 429 : 502 });
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) return Response.json({ error: 'empty' }, { status: 502 });
  return Response.json({ text, model: MODEL });
}
