import { describe, it, expect } from "vitest";
import { BOARD_COLUMNS, statusToColumn, columnToStatus } from "../contentBoard";
import { POST_STATUSES } from "../content";

describe("contentBoard mapping", () => {
  it("maps every post_status enum value to a column", () => {
    for (const s of POST_STATUSES) {
      const col = statusToColumn(s.value);
      expect(BOARD_COLUMNS.find((c) => c.id === col)).toBeDefined();
    }
  });

  it("statusToColumn maps known statuses", () => {
    expect(statusToColumn("idea")).toBe("idea");
    expect(statusToColumn("script")).toBe("script");
    expect(statusToColumn("draft")).toBe("script");
    expect(statusToColumn("filming")).toBe("filming");
    expect(statusToColumn("editing")).toBe("editing");
    expect(statusToColumn("internal_review")).toBe("editing");
    expect(statusToColumn("ready_for_client")).toBe("approval");
    expect(statusToColumn("pending_approval")).toBe("approval");
    expect(statusToColumn("changes_requested")).toBe("approval");
    expect(statusToColumn("rejected")).toBe("approval");
    expect(statusToColumn("approved")).toBe("scheduled");
    expect(statusToColumn("scheduled")).toBe("scheduled");
    expect(statusToColumn("published")).toBe("published");
    expect(statusToColumn("posted")).toBe("published");
    expect(statusToColumn("analyzed")).toBe("published");
  });

  it("columnToStatus returns canonical when current is from another column", () => {
    expect(columnToStatus("script", "idea")).toBe("script");
    expect(columnToStatus("filming", "script")).toBe("filming");
    expect(columnToStatus("approval", "editing")).toBe("ready_for_client");
    expect(columnToStatus("scheduled", "ready_for_client")).toBe("scheduled");
  });

  it("columnToStatus preserves status when it already belongs to the column", () => {
    expect(columnToStatus("script", "draft")).toBe("draft");
    expect(columnToStatus("approval", "changes_requested")).toBe("changes_requested");
    expect(columnToStatus("approval", "rejected")).toBe("rejected");
    expect(columnToStatus("scheduled", "approved")).toBe("approved");
    expect(columnToStatus("published", "posted")).toBe("posted");
  });

  it("columnToStatus falls back to canonical without currentStatus", () => {
    expect(columnToStatus("idea")).toBe("idea");
    expect(columnToStatus("published")).toBe("published");
  });
});
