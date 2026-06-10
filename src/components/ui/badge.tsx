import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-surface-2 text-foreground hover:bg-surface-3",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border-border text-foreground bg-card",
        success: "border-transparent bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]",
        warning: "border-transparent bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
        info: "border-transparent bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]",
        pending: "border-transparent bg-surface-2 text-muted-foreground",
        accent: "border-transparent bg-accent-soft text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
