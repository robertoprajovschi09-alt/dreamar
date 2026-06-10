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
  idea: { label: "Idee", color: "bg-muted text-foreground" },
  draft: { label: "Ciornă", color: "bg-muted text-foreground" },
  script: { label: "Scenariu", color: "bg-muted text-foreground" },
  filming: { label: "Filmare", color: "bg-secondary text-secondary-foreground" },
  editing: { label: "Editare", color: "bg-secondary text-secondary-foreground" },
  internal_review: { label: "Verificare internă", color: "bg-secondary text-secondary-foreground" },
  ready_for_client: { label: "Gata pentru client", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  sent_for_approval: { label: "În așteptarea aprobării", color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" },
  pending_approval: { label: "În așteptarea aprobării", color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" },
  approved: { label: "Aprobat", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  changes_requested: { label: "Modificări cerute", color: "bg-orange-500/20 text-orange-700 dark:text-orange-300" },
  rejected: { label: "Respins", color: "bg-red-500/20 text-red-700 dark:text-red-300" },
  scheduled: { label: "Programat", color: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  published: { label: "Publicat", color: "bg-accent/20 text-foreground" },
  posted: { label: "Postat", color: "bg-accent/20 text-foreground" },
  analyzed: { label: "Analizat", color: "bg-accent/30 text-foreground" },
};

export function postStatusMeta(v: string) {
  return POST_STATUS_META[v] ?? { label: v, color: "bg-muted text-foreground" };
}

export const APPROVAL_STATUS_META: Record<ApprovalStatus, { label: string; color: string }> = {
  not_sent: { label: "Netrimis", color: "bg-muted text-foreground" },
  pending_approval: { label: "În așteptare", color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" },
  approved: { label: "Aprobat", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  changes_requested: { label: "Modificări cerute", color: "bg-orange-500/20 text-orange-700 dark:text-orange-300" },
  rejected: { label: "Respins", color: "bg-red-500/20 text-red-700 dark:text-red-300" },
  expired: { label: "Expirat", color: "bg-muted text-muted-foreground" },
};

export const PENDING_POST_STATUSES = ["pending_approval", "sent_for_approval"];

// ---------- Asset / video helpers ----------

export type PostAssetLike = {
  video_url?: string | null;
  thumbnail_url?: string | null;
  assets?: any;
  script?: string | null;
};

function pickAssetUrl(asset: any): string | null {
  if (!asset) return null;
  if (typeof asset === "string") return asset;
  return asset.url || asset.signed_url || asset.public_url || asset.path || null;
}

function isVideoAsset(asset: any): boolean {
  if (!asset) return false;
  const type = (asset.type || asset.mime || asset.kind || "").toString().toLowerCase();
  if (type.startsWith("video") || type === "video") return true;
  const url = pickAssetUrl(asset) || "";
  return /\.(mp4|mov|webm|m4v|avi|mkv)(\?|$)/i.test(url);
}

/** Returns a playable video URL (signed if it's a storage path) or null. */
export async function getPostVideoUrl(post: PostAssetLike | null | undefined): Promise<string | null> {
  if (!post) return null;
  let raw: string | null = post.video_url || null;
  if (!raw && Array.isArray(post.assets)) {
    const vid = post.assets.find(isVideoAsset) || post.assets.find((a: any) => pickAssetUrl(a));
    raw = pickAssetUrl(vid);
  } else if (!raw && post.assets && typeof post.assets === "object") {
    raw = pickAssetUrl(post.assets);
  }
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const { data } = await supabase.storage
    .from("agency-files")
    .createSignedUrl(raw.replace(/^\/+/, ""), 3600);
  return data?.signedUrl || null;
}

export function hasReviewableAsset(post: PostAssetLike | null | undefined): boolean {
  if (!post) return false;
  if (post.video_url) return true;
  if (post.script && post.script.trim()) return true;
  if (Array.isArray(post.assets) && post.assets.length > 0) return true;
  return false;
}

export function statusPillKind(status: string): "pending" | "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "pending_approval": return "pending";
    case "approved": return "success";
    case "changes_requested": return "warning";
    case "rejected": return "danger";
    default: return "muted";
  }
}

// ---------- Send / respond ----------

export interface SendForApprovalArgs {
  post: { id: string; agency_id: string; client_id: string; title: string } & PostAssetLike;
  dueDate?: string | null;
  assignedToClientUser?: string | null;
  message?: string | null;
}

export async function sendForApproval({ post, dueDate, assignedToClientUser, message }: SendForApprovalArgs) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Not authenticated");

  if (!hasReviewableAsset(post)) {
    throw new Error("Attach a video or script to this post before sending it for approval.");
  }

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
  if (status !== "approved" && !(feedback && feedback.trim())) {
    throw new Error("Feedback is required when requesting changes or rejecting.");
  }
  const { data: row, error } = await supabase.rpc("respond_to_approval", {
    _id: approvalId,
    _status: status,
    _feedback: feedback ?? "",
  });
  if (error) throw error;
  const r: any = Array.isArray(row) ? row[0] : row;

  // Notify agency members (best-effort)
  try {
    const { data: post } = await supabase
      .from("content_posts")
      .select("title")
      .eq("id", r.content_post_id)
      .maybeSingle();
    const { data: members } = await supabase
      .from("agency_members")
      .select("user_id")
      .eq("agency_id", r.agency_id);
    const titleByStatus: Record<string, string> = {
      approved: "Client approved content",
      changes_requested: "Client requested changes",
      rejected: "Client rejected content",
    };
    if (members?.length) {
      await supabase.from("notifications").insert(
        members.map((m: any) => ({
          user_id: m.user_id,
          agency_id: r.agency_id,
          client_id: r.client_id,
          type: status === "approved" ? "client_approved" : status === "rejected" ? "client_rejected" : "client_changes_requested",
          title: titleByStatus[status],
          body: (post as any)?.title || "",
          link: "/agency/approvals",
        })),
      );
    }
  } catch {}
  return r;
}

export async function resendForApproval(
  post: SendForApprovalArgs["post"],
  dueDate?: string | null,
) {
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

export type ApprovalKpiRow = {
  status: string;
  requested_at?: string | null;
  responded_at?: string | null;
  due_date?: string | null;
};

/** Pure, unit-testable KPI computation. */
export function computeApprovalKpis(rows: ApprovalKpiRow[], now: number = Date.now()): ApprovalKpis {
  const weekAgo = now - 7 * 24 * 3600 * 1000;
  const pending = rows.filter((r) => r.status === "pending_approval").length;
  const overdue = rows.filter(
    (r) => r.status === "pending_approval" && r.due_date && new Date(r.due_date).getTime() < now,
  ).length;
  const approvedThisWeek = rows.filter(
    (r) => r.status === "approved" && r.responded_at && new Date(r.responded_at).getTime() >= weekAgo,
  ).length;
  const changesRequested = rows.filter((r) => r.status === "changes_requested").length;
  const responded = rows.filter((r) => r.responded_at && r.requested_at);
  const avgHours = responded.length
    ? responded.reduce(
        (acc, r) =>
          acc + (new Date(r.responded_at as string).getTime() - new Date(r.requested_at as string).getTime()) / 3600000,
        0,
      ) / responded.length
    : null;
  return { pending, overdue, approvedThisWeek, changesRequested, avgHours };
}

export async function fetchApprovalKpis(agencyId: string): Promise<ApprovalKpis> {
  const { data } = await supabase
    .from("content_approvals")
    .select("status,requested_at,responded_at,due_date")
    .eq("agency_id", agencyId);
  return computeApprovalKpis((data || []) as ApprovalKpiRow[]);
}

