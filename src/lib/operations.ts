export const TASK_STATUSES = [
  { value: "todo", label: "To do", color: "bg-muted text-foreground" },
  { value: "in_progress", label: "In progress", color: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  { value: "blocked", label: "Blocked", color: "bg-rose-500/20 text-rose-700 dark:text-rose-300" },
  { value: "done", label: "Done", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
] as const;

export const TASK_PRIORITIES = [
  { value: "low", label: "Low", color: "bg-muted text-muted-foreground" },
  { value: "medium", label: "Medium", color: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  { value: "high", label: "High", color: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  { value: "urgent", label: "Urgent", color: "bg-rose-500/20 text-rose-700 dark:text-rose-300" },
] as const;

export const TASK_TYPES = ["content", "shoot", "edit", "meeting", "report", "admin", "ads", "other"] as const;

export const CAMPAIGN_STATUSES = [
  { value: "planned", label: "Planned", color: "bg-muted text-foreground" },
  { value: "active", label: "Active", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  { value: "paused", label: "Paused", color: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  { value: "completed", label: "Completed", color: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  { value: "cancelled", label: "Cancelled", color: "bg-rose-500/20 text-rose-700 dark:text-rose-300" },
] as const;

export const DOCUMENT_FOLDERS = ["general", "contracts", "briefs", "reports", "creative", "branding"] as const;

export function statusFor<T extends { value: string; label: string; color: string }>(list: readonly T[], v: string) {
  return list.find((s) => s.value === v) ?? { value: v, label: v, color: "bg-muted text-foreground" } as T;
}
