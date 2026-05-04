export const POST_STATUSES = [
  { value: "idea", label: "Idea", color: "bg-muted text-foreground" },
  { value: "script", label: "Script", color: "bg-muted text-foreground" },
  { value: "filming", label: "Filming", color: "bg-secondary text-secondary-foreground" },
  { value: "editing", label: "Editing", color: "bg-secondary text-secondary-foreground" },
  { value: "sent_for_approval", label: "Awaiting approval", color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" },
  { value: "approved", label: "Approved", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  { value: "scheduled", label: "Scheduled", color: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  { value: "published", label: "Published", color: "bg-accent/20 text-foreground" },
  { value: "analyzed", label: "Analyzed", color: "bg-accent/30 text-foreground" },
] as const;

export type PostStatus = typeof POST_STATUSES[number]["value"];

export const PLATFORM_OPTIONS = [
  "instagram", "tiktok", "facebook", "youtube", "linkedin",
] as const;

export const CONTENT_TYPES = [
  "Reel", "TikTok", "Story", "Carousel", "Static post", "Ad", "YouTube short", "Long-form video", "Live",
] as const;

export const APPROVAL_DECISIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Changes requested" },
] as const;

export function statusMeta(v: string) {
  return POST_STATUSES.find((s) => s.value === v) ?? { value: v, label: v, color: "bg-muted text-foreground" };
}
