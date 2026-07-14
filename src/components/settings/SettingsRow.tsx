import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SettingsRowProps = {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
  controlClassName?: string;
  stacked?: boolean;
  align?: "center" | "top";
  footer?: ReactNode;
};

export function SettingsRow({
  label,
  description,
  children,
  className,
  controlClassName,
  stacked = false,
  align = "center",
  footer,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        stacked
          ? "space-y-2 py-4"
          : cn(
              "flex flex-col gap-3 py-4 sm:flex-row sm:justify-between sm:gap-8",
              align === "center" ? "sm:items-center" : "sm:items-start"
            ),
        "border-b border-border last:border-b-0",
        className
      )}
    >
      <div className="min-w-0 sm:max-w-[55%]">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div
        className={cn(
          "min-w-0 sm:w-[min(100%,320px)] sm:shrink-0",
          stacked && "sm:w-full",
          controlClassName
        )}
      >
        {children}
        {footer && <div className="mt-2">{footer}</div>}
      </div>
    </div>
  );
}
