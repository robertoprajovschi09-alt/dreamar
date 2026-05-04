import { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-border rounded-lg p-10 text-center bg-surface-1">
      <div className="mx-auto h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-accent" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
