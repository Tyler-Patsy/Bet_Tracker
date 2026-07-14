import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompt";
import type { ParseImage, ParseInput, ParseResponse, ParseResult, ParseUsage } from "./types";

const HAIKU_MODEL = "claude-haiku-4-5";
const SONNET_MODEL = "claude-sonnet-5"; // escalation model — spec's "claude-sonnet-4-6" does not exist
const MAX_TOKENS = 1500;
const CONFIDENCE_ESCALATION_THRESHOLD = 0.6;

type UserContentBlock = Anthropic.TextBlockParam | Anthropic.ImageBlockParam;

function buildUserContent(input: ParseInput): UserContentBlock[] {
  const blocks: UserContentBlock[] = [];
  for (const img of (input.images ?? []).slice(0, 3)) {
    blocks.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64Data },
    });
  }
  const tendencyLine = input.capperSportTendencies?.length
    ? `This capper's recent picks were in: ${input.capperSportTendencies.join(", ")}.\n`
    : "";
  blocks.push({ type: "text", text: `${tendencyLine}${input.text}` });
  return blocks;
}

export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

export function parseAndValidate(raw: string): ParseResponse {
  let json: unknown;
  try {
    json = JSON.parse(stripCodeFences(raw));
  } catch (err) {
    throw new Error(`Parser returned invalid JSON: ${(err as Error).message}`);
  }
  const obj = json as Partial<ParseResponse>;
  if (!Array.isArray(obj.picks)) {
    throw new Error("Parser response missing picks array");
  }
  return { picks: obj.picks as ParseResponse["picks"], no_picks_reason: obj.no_picks_reason ?? null };
}

async function callModel(
  client: Anthropic,
  model: string,
  content: UserContentBlock[]
): Promise<{ response: ParseResponse; usage: ParseUsage }> {
  const isHaiku = model === HAIKU_MODEL;
  const message = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    // temperature: 0 is only valid on Haiku — Sonnet 5 rejects non-default
    // sampling params with a 400 (see model-migration notes on Sonnet 5).
    ...(isHaiku ? { temperature: 0 } : {}),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) throw new Error("Parser response had no text block");

  return {
    response: parseAndValidate(textBlock.text),
    usage: {
      model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  };
}

export async function parsePost(client: Anthropic, input: ParseInput): Promise<ParseResult> {
  const content = buildUserContent(input);
  const first = await callModel(client, HAIKU_MODEL, content);
  const usages: ParseUsage[] = [first.usage];

  const needsEscalation = first.response.picks.some(
    (p) => p.confidence < CONFIDENCE_ESCALATION_THRESHOLD
  );

  if (!needsEscalation) {
    return { response: first.response, usages, escalated: false };
  }

  const second = await callModel(client, SONNET_MODEL, content);
  usages.push(second.usage);
  return { response: second.response, usages, escalated: true };
}

export * from "./types";
export { SYSTEM_PROMPT } from "./prompt";
export type { ParseImage };
