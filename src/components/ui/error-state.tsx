import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-4 py-10 px-6",
        className
      )}
    >
      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div>
        <div className="font-semibold text-sm">Ceva nu a mers bine</div>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reîncearcă
        </Button>
      )}
    </div>
  );
}
