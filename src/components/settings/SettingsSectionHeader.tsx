import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SettingsSectionHeaderProps = {
  title: string;
  description?: string;
  badge?: ReactNode;
  className?: string;
};

export function SettingsSectionHeader({
  title,
  description,
  badge,
  className,
}: SettingsSectionHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {badge}
      </div>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
