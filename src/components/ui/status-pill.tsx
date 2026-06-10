import { Badge, type BadgeProps } from "./badge";
import { cn } from "@/lib/utils";

type Kind = "success" | "warning" | "info" | "pending" | "danger" | "muted" | "accent";

const map: Record<Kind, BadgeProps["variant"]> = {
  success: "success",
  warning: "warning",
  info: "info",
  pending: "pending",
  danger: "destructive",
  muted: "secondary",
  accent: "accent",
};

export function StatusPill({
  kind = "muted",
  className,
  children,
}: {
  kind?: Kind;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge variant={map[kind]} className={cn("uppercase tracking-wide", className)}>
      {children}
    </Badge>
  );
}
