import type { PostStatus } from "./content";

export type BoardColumnId =
  | "idea"
  | "script"
  | "filming"
  | "editing"
  | "approval"
  | "scheduled"
  | "published";

export type BoardColumn = {
  id: BoardColumnId;
  label: string;
  hint: string;
  statuses: PostStatus[];
  canonical: PostStatus;
};

export const BOARD_COLUMNS: BoardColumn[] = [
  { id: "idea",      label: "Idee",          hint: "De aici începe totul",       statuses: ["idea"],                                                                                                                  canonical: "idea" },
  { id: "script",    label: "Script",        hint: "Punem ideea pe hârtie",      statuses: ["script", "draft"],                                                                                                       canonical: "script" },
  { id: "filming",   label: "Filmare",       hint: "Camera pornește",            statuses: ["filming"],                                                                                                               canonical: "filming" },
  { id: "editing",   label: "Montaj",        hint: "Croim varianta finală",      statuses: ["editing", "internal_review"],                                                                                            canonical: "editing" },
  { id: "approval",  label: "Spre aprobare", hint: "Mingea e la client",         statuses: ["ready_for_client", "sent_for_approval", "pending_approval", "changes_requested", "rejected"],                            canonical: "ready_for_client" },
  { id: "scheduled", label: "Programat",     hint: "Așteaptă momentul lui",      statuses: ["scheduled", "approved"],                                                                                                 canonical: "scheduled" },
  { id: "published", label: "Publicat",      hint: "E live, urmărim rezultate",  statuses: ["published", "posted", "analyzed"],                                                                                       canonical: "published" },
];

export function statusToColumn(status: string): BoardColumnId {
  for (const c of BOARD_COLUMNS) {
    if ((c.statuses as string[]).includes(status)) return c.id;
  }
  return "idea";
}

/**
 * Returns the status to write when a card is dropped into a column.
 * If the current status already belongs to the target column, keep it
 * (so we don't downgrade e.g. `changes_requested` to `ready_for_client`).
 */
export function columnToStatus(column: BoardColumnId, currentStatus?: string): PostStatus {
  const col = BOARD_COLUMNS.find((c) => c.id === column)!;
  if (currentStatus && (col.statuses as string[]).includes(currentStatus)) {
    return currentStatus as PostStatus;
  }
  return col.canonical;
}

export function columnAccent(id: BoardColumnId): string {
  switch (id) {
    case "idea":      return "bg-muted-foreground/40";
    case "script":    return "bg-blue-500/60";
    case "filming":   return "bg-violet-500/60";
    case "editing":   return "bg-amber-500/60";
    case "approval":  return "bg-orange-500/60";
    case "scheduled": return "bg-sky-500/60";
    case "published": return "bg-emerald-500/60";
  }
}

export function statusPillKind(status: string): "muted" | "info" | "warning" | "success" | "danger" | "pending" | "accent" {
  switch (status) {
    case "idea":
    case "draft":
      return "muted";
    case "script":
    case "filming":
    case "editing":
    case "internal_review":
      return "info";
    case "ready_for_client":
    case "sent_for_approval":
    case "pending_approval":
      return "pending";
    case "changes_requested":
      return "warning";
    case "rejected":
      return "danger";
    case "approved":
    case "scheduled":
      return "info";
    case "published":
    case "posted":
    case "analyzed":
      return "success";
    default:
      return "muted";
  }
}
