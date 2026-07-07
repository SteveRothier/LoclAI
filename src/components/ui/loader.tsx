import { cn } from "@/lib/utils";

export type LoaderVariant = "ellipsis" | "ring" | "dots-fade";
export type LoaderSize = "sm" | "md";

type LoaderProps = {
  variant?: LoaderVariant;
  size?: LoaderSize;
  className?: string;
  /** Ring + dots-fade dot color. Defaults to primary for ellipsis/dots-fade on light, muted on sidebar via className. */
  tone?: "primary" | "muted" | "sidebar-muted";
};

const dotSize = {
  sm: "size-1.5",
  md: "size-2",
} as const;

const ringSize = {
  sm: "size-4 border-2",
  md: "size-5 border-2",
} as const;

const toneClass = {
  primary: "bg-primary",
  muted: "bg-muted-foreground",
  "sidebar-muted": "bg-sidebar-muted",
} as const;

function EllipsisLoader({
  size,
  tone,
  className,
}: {
  size: LoaderSize;
  tone: LoaderProps["tone"];
  className?: string;
}) {
  const dot = dotSize[size];
  const color = toneClass[tone ?? "primary"];

  return (
    <div
      role="status"
      aria-label="Chargement"
      className={cn("flex items-center gap-1", className)}
    >
      <span className={cn(dot, "rounded-full", color, "loclai-loader-ellipsis")} />
      <span
        className={cn(dot, "rounded-full", color, "loclai-loader-ellipsis")}
        style={{ animationDelay: "160ms" }}
      />
      <span
        className={cn(dot, "rounded-full", color, "loclai-loader-ellipsis")}
        style={{ animationDelay: "320ms" }}
      />
    </div>
  );
}

function RingLoader({
  size,
  tone,
  className,
}: {
  size: LoaderSize;
  tone?: LoaderProps["tone"];
  className?: string;
}) {
  const borderTone =
    tone === "muted" || tone === "sidebar-muted"
      ? "border-muted-foreground"
      : "border-primary";

  return (
    <div
      role="status"
      aria-label="Chargement"
      className={cn(
        "rounded-full border-t-transparent loclai-loader-ring",
        borderTone,
        ringSize[size],
        className
      )}
    />
  );
}

function DotsFadeLoader({
  size,
  tone,
  className,
}: {
  size: LoaderSize;
  tone: LoaderProps["tone"];
  className?: string;
}) {
  const dot = dotSize[size];
  const color = toneClass[tone ?? "primary"];

  return (
    <div
      role="status"
      aria-label="Chargement"
      className={cn("flex items-center gap-1.5", className)}
    >
      <span className={cn(dot, "rounded-full", color, "loclai-loader-dots-fade")} />
      <span
        className={cn(dot, "rounded-full", color, "loclai-loader-dots-fade")}
        style={{ animationDelay: "200ms" }}
      />
      <span
        className={cn(dot, "rounded-full", color, "loclai-loader-dots-fade")}
        style={{ animationDelay: "400ms" }}
      />
    </div>
  );
}

export function Loader({
  variant = "ellipsis",
  size = "md",
  className,
  tone,
}: LoaderProps) {
  switch (variant) {
    case "ring":
      return <RingLoader size={size} tone={tone} className={className} />;
    case "dots-fade":
      return <DotsFadeLoader size={size} tone={tone} className={className} />;
    case "ellipsis":
    default:
      return <EllipsisLoader size={size} tone={tone} className={className} />;
  }
}

type SectionLoadingProps = {
  label?: string;
  tone?: LoaderProps["tone"];
  className?: string;
  /** Compact row for sidebar / lists */
  inline?: boolean;
};

export function SectionLoading({
  label = "Chargement…",
  tone = "primary",
  className,
  inline = false,
}: SectionLoadingProps) {
  if (inline) {
    return (
      <div className={cn("flex items-center gap-2.5", className)} role="status" aria-label={label}>
        <Loader variant="dots-fade" size="sm" tone={tone} />
        <span className="text-sm">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground",
        className
      )}
      role="status"
      aria-label={label}
    >
      <Loader variant="dots-fade" size="md" tone={tone} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
