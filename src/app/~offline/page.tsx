import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">LoclAI est hors ligne</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        L&apos;interface et vos conversations enregistrées restent accessibles si vous les
        aviez déjà ouvertes. Pour discuter avec l&apos;IA, Ollama doit être en ligne sur
        votre machine.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Réessayer
      </Link>
    </div>
  );
}
