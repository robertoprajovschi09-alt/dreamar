export type PortalPermissions = {
  can_view_dashboard: boolean;
  can_view_calendar: boolean;
  can_approve_content: boolean;
  can_request_changes: boolean;
  can_view_reports: boolean;
  can_upload_documents: boolean;
  can_complete_impact_forms: boolean;
  can_comment: boolean;
};

export const PORTAL_PERMISSION_KEYS: (keyof PortalPermissions)[] = [
  "can_view_dashboard",
  "can_view_calendar",
  "can_approve_content",
  "can_request_changes",
  "can_view_reports",
  "can_upload_documents",
  "can_complete_impact_forms",
  "can_comment",
];

export const PORTAL_PERMISSION_LABELS: Record<keyof PortalPermissions, string> = {
  can_view_dashboard: "View dashboard",
  can_view_calendar: "View content calendar",
  can_approve_content: "Approve content",
  can_request_changes: "Request changes",
  can_view_reports: "View reports",
  can_upload_documents: "Upload documents",
  can_complete_impact_forms: "Complete business impact forms",
  can_comment: "Leave comments",
};

export function defaultPermissions(role: "client_owner" | "client_viewer"): PortalPermissions {
  return {
    can_view_dashboard: true,
    can_view_calendar: true,
    can_approve_content: role === "client_owner",
    can_request_changes: true,
    can_view_reports: true,
    can_upload_documents: role === "client_owner",
    can_complete_impact_forms: true,
    can_comment: true,
  };
}

export function normalizePermissions(input: any, role: "client_owner" | "client_viewer" = "client_viewer"): PortalPermissions {
  const def = defaultPermissions(role);
  if (!input || typeof input !== "object") return def;
  const out: any = {};
  for (const k of PORTAL_PERMISSION_KEYS) {
    out[k] = typeof input[k] === "boolean" ? input[k] : def[k];
  }
  return out as PortalPermissions;
}

export type InviteStatus = "pending" | "sent" | "opened" | "accepted" | "expired" | "revoked";

export const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
  pending: "În așteptare",
  sent: "Trimisă",
  opened: "Deschisă",
  accepted: "Acceptată",
  expired: "Expirată",
  revoked: "Revocată",
};

export function inviteStatusVariant(status: string): { bg: string; fg: string } {
  switch (status) {
    case "accepted": return { bg: "bg-emerald-500/10", fg: "text-emerald-600 dark:text-emerald-400" };
    case "opened":   return { bg: "bg-amber-500/10",   fg: "text-amber-600 dark:text-amber-400" };
    case "sent":     return { bg: "bg-sky-500/10",     fg: "text-sky-600 dark:text-sky-400" };
    case "expired":  return { bg: "bg-red-500/10",     fg: "text-red-600 dark:text-red-400" };
    case "revoked":  return { bg: "bg-muted",          fg: "text-muted-foreground" };
    default:         return { bg: "bg-muted",          fg: "text-muted-foreground" };
  }
}
