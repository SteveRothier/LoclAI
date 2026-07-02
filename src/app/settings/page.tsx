"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { testConnection } from "@/lib/ollama/client";
import { normalizeOllamaEndpointUrl } from "@/lib/ollama/config";
import { useSettingsStore } from "@/stores/settings-store";
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

  useEffect(() => {
    void load();
  }, [load]);

  if (!settings) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
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

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as ExportPayload;
      if (payload.version !== 1 || !Array.isArray(payload.conversations)) {
        throw new Error("Format de fichier invalide");
      }
      if (
        !confirm(
          "Importer remplacera toutes les conversations existantes. Continuer ?"
        )
      ) {
        return;
      }
      await importAllData(payload);
      setStatus("Import réussi. Rechargez la page si nécessaire.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Erreur lors de l'import"
      );
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
            <Input
              value={settings.defaultModel}
              onChange={(e) => void update({ defaultModel: e.target.value })}
              placeholder="qwen3.5:4b"
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
              Température par défaut ({settings.defaultTemperature})
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.defaultTemperature}
              onChange={(e) =>
                void update({ defaultTemperature: Number(e.target.value) })
              }
              className="w-full accent-primary"
            />
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
                if (file) void handleImport(file);
                e.target.value = "";
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
