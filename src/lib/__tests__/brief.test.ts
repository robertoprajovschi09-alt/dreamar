import { describe, it, expect } from "vitest";
import { serializeBrief, BRIEF_COLUMNS } from "../brief";

describe("serializeBrief", () => {
  it("keeps every brief column on the payload", () => {
    const out = serializeBrief({
      agency_id: "a",
      client_id: "c",
      business_description: "x",
      preferred_platforms: ["Instagram"],
      completed: true,
    } as any);
    for (const col of BRIEF_COLUMNS) {
      expect(Object.prototype.hasOwnProperty.call(out, col)).toBe(true);
    }
    expect(out.preferred_platforms).toEqual(["Instagram"]);
    expect(out.completed).toBe(true);
  });

  it("normalizes platforms to an array and strips unknown keys", () => {
    const out: any = serializeBrief({
      agency_id: "a", client_id: "c",
      preferred_platforms: null,
      junk: "ignored",
    } as any);
    expect(Array.isArray(out.preferred_platforms)).toBe(true);
    expect(out.junk).toBeUndefined();
  });
});
