import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SettingsAlertProps = {
  children: ReactNode;
  variant?: "warning" | "info";
  className?: string;
};

export function SettingsAlert({
  children,
  variant = "warning",
  className,
}: SettingsAlertProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-xs leading-relaxed",
        variant === "warning" &&
          "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200",
        variant === "info" &&
          "border-border bg-muted/50 text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}
