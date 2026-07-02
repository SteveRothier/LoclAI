import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex h-9 w-full rounded-lg border px-3 py-1 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input bg-input text-foreground",
        sidebar:
          "border-sidebar-border bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-muted focus-visible:border-primary/50 focus-visible:ring-primary/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface InputProps
  extends React.ComponentProps<"input">,
    VariantProps<typeof inputVariants> {}

export function Input({ className, type, variant, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  );
}
