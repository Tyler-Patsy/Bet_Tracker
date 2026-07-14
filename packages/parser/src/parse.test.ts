import { describe, expect, it } from "vitest";
import { stripCodeFences, parseAndValidate } from "./parse";

describe("stripCodeFences", () => {
  it("strips a ```json fenced block", () => {
    expect(stripCodeFences('```json\n{"picks":[]}\n```')).toBe('{"picks":[]}');
  });

  it("strips a bare ``` fenced block", () => {
    expect(stripCodeFences('```\n{"picks":[]}\n```')).toBe('{"picks":[]}');
  });

  it("leaves unfenced JSON untouched", () => {
    expect(stripCodeFences('{"picks":[]}')).toBe('{"picks":[]}');
  });
});

describe("parseAndValidate", () => {
  it("parses a valid response with picks", () => {
    const result = parseAndValidate(
      '{"picks":[{"sport":"nba","confidence":0.9}],"no_picks_reason":null}'
    );
    expect(result.picks).toHaveLength(1);
    expect(result.no_picks_reason).toBeNull();
  });

  it("defaults no_picks_reason when absent", () => {
    const result = parseAndValidate('{"picks":[]}');
    expect(result.no_picks_reason).toBeNull();
  });

  it("throws on malformed JSON rather than silently accepting it", () => {
    expect(() => parseAndValidate("not json at all")).toThrow(/invalid JSON/);
  });

  it("throws when picks is missing entirely", () => {
    expect(() => parseAndValidate('{"no_picks_reason":"just chatter"}')).toThrow(
      /missing picks array/
    );
  });
});
