import { describe, it, expect } from "vitest";
import { computeApprovalKpis, hasReviewableAsset, statusPillKind } from "@/lib/approvals";

const NOW = new Date("2026-06-10T12:00:00Z").getTime();
const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();
const H = 3600_000;

describe("computeApprovalKpis", () => {
  it("counts pending, overdue, approved-this-week, changes-requested", () => {
    const rows = [
      { status: "pending_approval", requested_at: iso(-2 * H), due_date: iso(-1 * H) }, // overdue
      { status: "pending_approval", requested_at: iso(-1 * H), due_date: iso(2 * H) },  // pending only
      { status: "approved", requested_at: iso(-48 * H), responded_at: iso(-24 * H) },   // this week
      { status: "approved", requested_at: iso(-30 * 24 * H), responded_at: iso(-20 * 24 * H) }, // old
      { status: "changes_requested", requested_at: iso(-5 * H), responded_at: iso(-3 * H) },
      { status: "rejected", requested_at: iso(-4 * H), responded_at: iso(-2 * H) },
    ];
    const k = computeApprovalKpis(rows, NOW);
    expect(k.pending).toBe(2);
    expect(k.overdue).toBe(1);
    expect(k.approvedThisWeek).toBe(1);
    expect(k.changesRequested).toBe(1);
  });

  it("computes avgHours across responded rows only", () => {
    const rows = [
      { status: "approved", requested_at: iso(-10 * H), responded_at: iso(-8 * H) }, // 2h
      { status: "changes_requested", requested_at: iso(-6 * H), responded_at: iso(-2 * H) }, // 4h
      { status: "pending_approval", requested_at: iso(-1 * H) }, // ignored
    ];
    const k = computeApprovalKpis(rows, NOW);
    expect(k.avgHours).toBeCloseTo(3, 5);
  });

  it("returns avgHours = null when nothing responded", () => {
    expect(computeApprovalKpis([{ status: "pending_approval", requested_at: iso(-1 * H) }], NOW).avgHours).toBeNull();
  });
});

describe("hasReviewableAsset", () => {
  it("true when video_url present", () => {
    expect(hasReviewableAsset({ video_url: "https://x/v.mp4" })).toBe(true);
  });
  it("true when script present", () => {
    expect(hasReviewableAsset({ script: "Hello" })).toBe(true);
  });
  it("true when assets array non-empty", () => {
    expect(hasReviewableAsset({ assets: [{ url: "x" }] })).toBe(true);
  });
  it("false when nothing", () => {
    expect(hasReviewableAsset({})).toBe(false);
    expect(hasReviewableAsset(null)).toBe(false);
  });
});

describe("statusPillKind", () => {
  it("maps statuses to pill kinds", () => {
    expect(statusPillKind("pending_approval")).toBe("pending");
    expect(statusPillKind("approved")).toBe("success");
    expect(statusPillKind("changes_requested")).toBe("warning");
    expect(statusPillKind("rejected")).toBe("danger");
    expect(statusPillKind("expired")).toBe("muted");
  });
});
