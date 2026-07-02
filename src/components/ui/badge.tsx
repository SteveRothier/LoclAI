import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warning" | "outline" | "sidebar";
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-secondary text-secondary-foreground",
        variant === "success" && "bg-primary/15 text-primary",
        variant === "warning" && "bg-amber-500/15 text-amber-600",
        variant === "outline" && "border border-border text-muted-foreground",
        variant === "sidebar" &&
          "bg-sidebar-accent text-sidebar-muted",
        className
      )}
      {...props}
    />
  );
}
