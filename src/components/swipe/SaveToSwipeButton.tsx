import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { useState } from "react";
import { SwipeFormDialog } from "./SwipeFormDialog";
import type { SwipeFile } from "@/lib/swipe";

type Props = {
  defaults: Partial<SwipeFile>;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  label?: string;
};

export function SaveToSwipeButton({ defaults, size = "sm", variant = "ghost", label = "Save to Swipe" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} variant={variant} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        <Bookmark className="h-3.5 w-3.5 mr-1" /> {label}
      </Button>
      <SwipeFormDialog open={open} onOpenChange={setOpen} defaults={defaults} />
    </>
  );
}
