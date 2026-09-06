/**
 * SpaceXAI / xAI client (OpenAI-compatible).
 * Server-only — never import from client components.
 */

import OpenAI from "openai";

export const AI_MODEL = process.env.XAI_MODEL || "grok-4.5";

export function hasXaiKey(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

export function getXaiClient(): OpenAI | null {
  const key = process.env.XAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({
    apiKey: key,
    baseURL: "https://api.x.ai/v1",
  });
}

/** Chat completion → text (JSON mode optional) */
export async function xaiChat(opts: {
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const client = getXaiClient();
  if (!client) {
    return { ok: false, error: "AI advisor not configured" };
  }
  try {
    const res = await client.chat.completions.create({
      model: AI_MODEL,
      temperature: opts.temperature ?? 0.35,
      max_tokens: opts.maxTokens ?? 4096,
      response_format: opts.json ? { type: "json_object" } : undefined,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    });
    const text = res.choices[0]?.message?.content?.trim() || "";
    if (!text) return { ok: false, error: "Empty model response" };
    return { ok: true, text };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "xAI request failed";
    return {
      ok: false,
      error: raw
        .replace(/xai-[A-Za-z0-9_-]+/gi, "[redacted]")
        .replace(/XAI_API_KEY/g, "AI_KEY"),
    };
  }
}

export function safeJsonParse<T>(text: string): T | null {
  try {
    // strip markdown fences if any
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
