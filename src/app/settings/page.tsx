"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModelPicker } from "@/components/ollama/ModelPicker";
import { testConnection } from "@/lib/ollama/client";
import { normalizeOllamaEndpointUrl } from "@/lib/ollama/config";
import { useSettingsStore } from "@/stores/settings-store";
import { ModelManager } from "@/components/ollama/ModelManager";
import { PersonasEditor } from "@/components/settings/PersonasEditor";
import { ThemeSelect } from "@/components/settings/ThemeSelect";
import { SectionLoading } from "@/components/ui/loader";
import {
  exportAllData,
  importAllData,
  type ExportPayload,
} from "@/lib/db/schema";

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const load = useSettingsStore((s) => s.load);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [importPayload, setImportPayload] = useState<ExportPayload | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  if (!settings) {
    return <SectionLoading />;
  }

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LoclAI-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Export téléchargé.");
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as ExportPayload;
      if (payload.version !== 1 || !Array.isArray(payload.conversations)) {
        throw new Error("Format de fichier invalide");
      }
      setImportPayload(payload);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Erreur lors de l'import"
      );
    }
  };

  const confirmImport = async () => {
    if (!importPayload) return;

    setImporting(true);
    try {
      await importAllData(importPayload);
      setImportPayload(null);
      setStatus("Import réussi. Rechargez la page si nécessaire.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Erreur lors de l'import"
      );
    } finally {
      setImporting(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const result = await testConnection(
        settings.ollamaUrl,
        settings.defaultModel
      );
      if (result.ok) {
        setStatus(
          `Connexion OK — ${result.models.length} modèle(s) détecté(s), chat fonctionnel avec « ${settings.defaultModel} ».`
        );
      } else {
        setStatus(result.error ?? "Test de connexion échoué.");
      }
    } finally {
      setTesting(false);
    }
  };

  const urlWarning =
    settings.ollamaUrl.includes("/api") ||
    !normalizeOllamaEndpointUrl(settings.ollamaUrl);

  return (
    <div className="flex-1 overflow-y-auto bg-background px-8 py-10">
      <div className="mx-auto max-w-2xl space-y-10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Paramètres</h1>
            <p className="text-sm text-muted-foreground">
              Configuration locale — rien n&apos;est envoyé au cloud
            </p>
          </div>
        </div>

        <section className="space-y-4 rounded-xl border border-border p-6">
          <div>
            <h2 className="font-semibold text-foreground">Apparence</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choisissez le thème clair, sombre, ou suivez les préférences de votre système.
            </p>
          </div>
          <ThemeSelect />
        </section>

        <section className="space-y-5 rounded-xl border border-border p-6">
          <h2 className="font-semibold text-foreground">Connexion Ollama</h2>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              URL endpoint
            </label>
            <Input
              value={settings.ollamaUrl}
              onChange={(e) => void update({ ollamaUrl: e.target.value })}
              placeholder="http://127.0.0.1:11434"
            />
            {urlWarning && (
              <p className="mt-1.5 text-xs text-amber-600">
                Utilisez l&apos;URL de base sans <code>/api</code>, par ex.{" "}
                <code>http://127.0.0.1:11434</code>
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Modèle par défaut
            </label>
            <ModelPicker
              value={settings.defaultModel}
              onChange={(model) => void update({ defaultModel: model })}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleTestConnection()}
            disabled={testing}
          >
            <Wifi className="size-4" />
            {testing ? "Test en cours…" : "Tester la connexion"}
          </Button>
          {status && (
            <p
              className={`text-sm ${
                status.startsWith("Connexion OK")
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {status}
            </p>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Messages max. dans le contexte
            </label>
            <Input
              type="number"
              min={4}
              max={200}
              value={settings.maxContextMessages}
              onChange={(e) => {
                const value = Number.parseInt(e.target.value, 10);
                if (!Number.isNaN(value)) {
                  void update({ maxContextMessages: Math.min(200, Math.max(4, value)) });
                }
              }}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Nombre de messages user/assistant envoyés au modèle (les plus anciens sont exclus).
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              System prompt par défaut
            </label>
            <Textarea
              value={settings.defaultSystemPrompt}
              onChange={(e) =>
                void update({ defaultSystemPrompt: e.target.value })
              }
              rows={4}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border p-6">
          <div>
            <h2 className="font-semibold text-foreground">Assistants / personas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Profils réutilisables pour démarrer une conversation avec un rôle prédéfini.
            </p>
          </div>
          <PersonasEditor
            personas={settings.personas}
            onChange={(personas) => void update({ personas })}
          />
        </section>

        <ModelManager onStatus={setStatus} />

        <section className="space-y-4 rounded-xl border border-border p-6">
          <h2 className="font-semibold text-foreground">
            Déploiement Vercel + Ollama local
          </h2>
          <p className="text-sm text-muted-foreground">
            Sur Windows PowerShell, avant de lancer Ollama :
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
            {`$env:OLLAMA_ORIGINS="https://votre-app.vercel.app"
ollama serve`}
          </pre>
          <p className="text-sm text-muted-foreground">
            Ouvrez ensuite l&apos;app Vercel depuis le même PC que Ollama.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border p-6">
          <h2 className="font-semibold text-foreground">Sauvegarde</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void handleExport()}>
              <Download className="size-4" />
              Exporter JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" />
              Importer JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={!!importPayload}
        onOpenChange={(open) => {
          if (!open && !importing) setImportPayload(null);
        }}
        title="Importer les données ?"
        description="Cette action remplacera toutes les conversations et paramètres existants."
        warnings={[
          importPayload
            ? `${importPayload.conversations.length} conversation(s) seront importées.`
            : "",
        ].filter(Boolean)}
        confirmLabel="Importer"
        loadingLabel="Import…"
        loading={importing}
        onConfirm={confirmImport}
      />
    </div>
  );
}
