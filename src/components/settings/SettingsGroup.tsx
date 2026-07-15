import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SettingsGroupProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsGroup({ title, children, className }: SettingsGroupProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {title && (
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
      )}
      <div className="rounded-xl border border-border bg-muted/20 px-4">
        {children}
      </div>
    </div>
  );
}
