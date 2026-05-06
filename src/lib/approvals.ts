import { supabase } from "@/integrations/supabase/client";

export type ApprovalStatus =
  | "not_sent"
  | "pending_approval"
  | "approved"
  | "changes_requested"
  | "rejected"
  | "expired";

export type PostStatusV2 =
  | "idea"
  | "draft"
  | "script"
  | "filming"
  | "editing"
  | "internal_review"
  | "ready_for_client"
  | "sent_for_approval"
  | "pending_approval"
  | "approved"
  | "changes_requested"
  | "rejected"
  | "scheduled"
  | "published"
  | "posted"
  | "analyzed";

export const POST_STATUS_META: Record<string, { label: string; color: string }> = {
  idea: { label: "Idea", color: "bg-muted text-foreground" },
  draft: { label: "Draft", color: "bg-muted text-foreground" },
  script: { label: "Script", color: "bg-muted text-foreground" },
  filming: { label: "Filming", color: "bg-secondary text-secondary-foreground" },
  editing: { label: "Editing", color: "bg-secondary text-secondary-foreground" },
  internal_review: { label: "Internal review", color: "bg-secondary text-secondary-foreground" },
  ready_for_client: { label: "Ready for client", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  sent_for_approval: { label: "Awaiting approval", color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" },
  pending_approval: { label: "Awaiting approval", color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" },
  approved: { label: "Approved", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  changes_requested: { label: "Changes requested", color: "bg-orange-500/20 text-orange-700 dark:text-orange-300" },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-700 dark:text-red-300" },
  scheduled: { label: "Scheduled", color: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  published: { label: "Published", color: "bg-accent/20 text-foreground" },
  posted: { label: "Posted", color: "bg-accent/20 text-foreground" },
  analyzed: { label: "Analyzed", color: "bg-accent/30 text-foreground" },
};

export function postStatusMeta(v: string) {
  return POST_STATUS_META[v] ?? { label: v, color: "bg-muted text-foreground" };
}

export const APPROVAL_STATUS_META: Record<ApprovalStatus, { label: string; color: string }> = {
  not_sent: { label: "Not sent", color: "bg-muted text-foreground" },
  pending_approval: { label: "Pending", color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" },
  approved: { label: "Approved", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  changes_requested: { label: "Changes requested", color: "bg-orange-500/20 text-orange-700 dark:text-orange-300" },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-700 dark:text-red-300" },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground" },
};

export const PENDING_POST_STATUSES = ["pending_approval", "sent_for_approval"];

export interface SendForApprovalArgs {
  post: { id: string; agency_id: string; client_id: string; title: string };
  dueDate?: string | null;
  assignedToClientUser?: string | null;
  message?: string | null;
}

export async function sendForApproval({ post, dueDate, assignedToClientUser, message }: SendForApprovalArgs) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Not authenticated");

  // Close any prior pending row (shouldn't exist but safety)
  await supabase
    .from("content_approvals")
    .update({ status: "expired" })
    .eq("content_post_id", post.id)
    .eq("status", "pending_approval");

  const { data: row, error } = await supabase
    .from("content_approvals")
    .insert({
      agency_id: post.agency_id,
      client_id: post.client_id,
      content_post_id: post.id,
      status: "pending_approval",
      requested_by: uid,
      assigned_to_client_user: assignedToClientUser ?? null,
      due_date: dueDate ?? null,
      feedback: message ?? null,
      decision: "pending",
    } as any)
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from("content_posts")
    .update({ status: "pending_approval" as any, approval_status: "pending" })
    .eq("id", post.id);

  // Notify assigned client user(s)
  const recipients: string[] = [];
  if (assignedToClientUser) {
    recipients.push(assignedToClientUser);
  } else {
    const { data: cu } = await supabase
      .from("client_users")
      .select("user_id")
      .eq("client_id", post.client_id)
      .eq("status", "active");
    (cu || []).forEach((r: any) => r.user_id && recipients.push(r.user_id));
  }
  if (recipients.length) {
    await supabase.from("notifications").insert(
      recipients.map((user_id) => ({
        user_id,
        agency_id: post.agency_id,
        client_id: post.client_id,
        type: "approval_requested",
        title: "New content awaiting your approval",
        body: post.title,
        link: "/client/portal?tab=approvals",
      })),
    );
  }
  return row;
}

export async function respondToApproval(
  approvalId: string,
  status: "approved" | "changes_requested" | "rejected",
  feedback: string | null,
) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  const { data: row, error } = await supabase
    .from("content_approvals")
    .update({
      status,
      feedback,
      comment: feedback,
      decision: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "changes_requested",
      decided_by: uid,
      responded_at: new Date().toISOString(),
    } as any)
    .eq("id", approvalId)
    .select("*, content_posts(title, agency_id)")
    .single();
  if (error) throw error;

  // Notify agency members
  const post: any = (row as any).content_posts;
  const { data: members } = await supabase
    .from("agency_members")
    .select("user_id")
    .eq("agency_id", (row as any).agency_id);
  const titleByStatus: Record<string, string> = {
    approved: "Client approved content",
    changes_requested: "Client requested changes",
    rejected: "Client rejected content",
  };
  if (members?.length) {
    await supabase.from("notifications").insert(
      members.map((m: any) => ({
        user_id: m.user_id,
        agency_id: (row as any).agency_id,
        client_id: (row as any).client_id,
        type: status === "approved" ? "client_approved" : status === "rejected" ? "client_rejected" : "client_changes_requested",
        title: titleByStatus[status],
        body: post?.title || "",
        link: "/agency/approvals",
      })),
    );
  }
  return row;
}

export async function resendForApproval(post: SendForApprovalArgs["post"], dueDate?: string | null) {
  return sendForApproval({ post, dueDate });
}

export async function aiSuggestClarifications(approvalId: string) {
  const { data, error } = await supabase.functions.invoke("approval-clarify", {
    body: { approval_id: approvalId },
  });
  if (error) throw error;
  return data as { questions: string[]; interpretation: string };
}

export interface ApprovalKpis {
  pending: number;
  overdue: number;
  approvedThisWeek: number;
  changesRequested: number;
  avgHours: number | null;
}

export async function fetchApprovalKpis(agencyId: string): Promise<ApprovalKpis> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("content_approvals")
    .select("status,requested_at,responded_at,due_date")
    .eq("agency_id", agencyId);
  const rows = (data || []) as any[];
  const now = Date.now();
  const pending = rows.filter((r) => r.status === "pending_approval").length;
  const overdue = rows.filter(
    (r) => r.status === "pending_approval" && r.due_date && new Date(r.due_date).getTime() < now,
  ).length;
  const approvedThisWeek = rows.filter(
    (r) => r.status === "approved" && r.responded_at && r.responded_at >= weekAgo,
  ).length;
  const changesRequested = rows.filter((r) => r.status === "changes_requested").length;
  const responded = rows.filter((r) => r.responded_at && r.requested_at);
  const avgHours = responded.length
    ? responded.reduce(
        (acc, r) =>
          acc + (new Date(r.responded_at).getTime() - new Date(r.requested_at).getTime()) / 3600000,
        0,
      ) / responded.length
    : null;
  return { pending, overdue, approvedThisWeek, changesRequested, avgHours };
}
