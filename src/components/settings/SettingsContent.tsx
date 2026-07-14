"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModelPicker } from "@/components/ollama/ModelPicker";
import { testConnection } from "@/lib/ollama/client";
import { normalizeOllamaEndpointUrl } from "@/lib/ollama/config";
import { useSettingsStore } from "@/stores/settings-store";
import { useToastStore } from "@/stores/toast-store";
import { ModelManager } from "@/components/ollama/ModelManager";
import { PersonasEditor } from "@/components/settings/PersonasEditor";
import { SettingsAlert } from "@/components/settings/SettingsAlert";
import { SettingsCodeBlock } from "@/components/settings/SettingsCodeBlock";
import { SettingsGroup } from "@/components/settings/SettingsGroup";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSectionHeader } from "@/components/settings/SettingsSectionHeader";
import { SettingsStatusBadge } from "@/components/settings/SettingsStatusBadge";
import { ThemeSelect } from "@/components/settings/ThemeSelect";
import { SectionLoading } from "@/components/ui/loader";
import {
  exportAllData,
  importAllData,
  type ExportPayload,
} from "@/lib/db/schema";
import type { SettingsSection } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

type SettingsContentProps = {
  section: SettingsSection;
};

const VERCEL_CODE = `$env:OLLAMA_ORIGINS="https://votre-app.vercel.app"
ollama serve`;

export function SettingsContent({ section }: SettingsContentProps) {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const load = useSettingsStore((s) => s.load);
  const showToast = useToastStore((s) => s.show);
  const fileRef = useRef<HTMLInputElement>(null);
  const [testing, setTesting] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [importPayload, setImportPayload] = useState<ExportPayload | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!testFeedback) return;
    const timer = window.setTimeout(() => setTestFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [testFeedback]);

  if (!settings) {
    return <SectionLoading />;
  }

  const notify = (message: string, type: "success" | "error" | "info" = "info") => {
    showToast(message, type);
  };

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
    notify("Export téléchargé.", "success");
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
      notify(
        error instanceof Error ? error.message : "Erreur lors de l'import",
        "error"
      );
    }
  };

  const confirmImport = async () => {
    if (!importPayload) return;

    setImporting(true);
    try {
      await importAllData(importPayload);
      setImportPayload(null);
      notify("Import réussi. Rechargez la page si nécessaire.", "success");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Erreur lors de l'import",
        "error"
      );
    } finally {
      setImporting(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestFeedback(null);
    try {
      const result = await testConnection(
        settings.ollamaUrl,
        settings.defaultModel
      );
      if (result.ok) {
        const message = `Connexion OK — ${result.models.length} modèle(s), chat fonctionnel avec « ${settings.defaultModel} ».`;
        setTestFeedback({ message, type: "success" });
        notify(message, "success");
      } else {
        const message = result.error ?? "Test de connexion échoué.";
        setTestFeedback({ message, type: "error" });
        notify(message, "error");
      }
    } finally {
      setTesting(false);
    }
  };

  const urlWarning =
    settings.ollamaUrl.includes("/api") ||
    !normalizeOllamaEndpointUrl(settings.ollamaUrl);

  const handleModelStatus = (message: string | null) => {
    if (!message) return;
    const type = message.toLowerCase().includes("erreur") ? "error" : "success";
    notify(message, type);
  };

  const sectionContent = (() => {
    if (section === "general") {
      return (
        <>
          <SettingsSectionHeader
            title="Général"
            description="Apparence et préférences d'affichage."
          />
          <SettingsGroup>
            <SettingsRow
              label="Thème"
              description="Clair, sombre, ou synchronisé avec le système."
              stacked
              align="top"
              controlClassName="sm:w-full sm:max-w-none"
            >
              <ThemeSelect />
            </SettingsRow>
          </SettingsGroup>
        </>
      );
    }

    if (section === "ollama") {
      return (
        <>
          <SettingsSectionHeader
            title="Ollama"
            description="Connexion locale et contexte par défaut."
            badge={<SettingsStatusBadge />}
          />
          <div className="space-y-6">
            <SettingsGroup title="Connexion">
              <SettingsRow
                label="URL endpoint"
                description="Adresse de base d'Ollama, sans /api."
                align="top"
              >
                <div className="space-y-2">
                  <Input
                    value={settings.ollamaUrl}
                    onChange={(e) => void update({ ollamaUrl: e.target.value })}
                    placeholder="http://127.0.0.1:11434"
                  />
                  {urlWarning && (
                    <SettingsAlert>
                      Utilisez l&apos;URL de base sans <code>/api</code>, par ex.{" "}
                      <code>http://127.0.0.1:11434</code>
                    </SettingsAlert>
                  )}
                </div>
              </SettingsRow>
              <SettingsRow label="Modèle par défaut">
                <ModelPicker
                  value={settings.defaultModel}
                  onChange={(model) => void update({ defaultModel: model })}
                />
              </SettingsRow>
              <SettingsRow label="Test de connexion">
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleTestConnection()}
                    disabled={testing}
                  >
                    <Wifi className="size-4" />
                    {testing ? "Test en cours…" : "Tester la connexion"}
                  </Button>
                  {testFeedback && (
                    <p
                      className={cn(
                        "text-xs leading-relaxed",
                        testFeedback.type === "success"
                          ? "text-primary"
                          : "text-destructive"
                      )}
                    >
                      {testFeedback.message}
                    </p>
                  )}
                </div>
              </SettingsRow>
            </SettingsGroup>

            <SettingsGroup title="Contexte">
              <SettingsRow
                label="Messages max. dans le contexte"
                description="Les messages les plus anciens sont exclus automatiquement."
              >
                <Input
                  type="number"
                  min={4}
                  max={200}
                  value={settings.maxContextMessages}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value, 10);
                    if (!Number.isNaN(value)) {
                      void update({
                        maxContextMessages: Math.min(200, Math.max(4, value)),
                      });
                    }
                  }}
                />
              </SettingsRow>
              <SettingsRow
                label="System prompt par défaut"
                stacked
                align="top"
                controlClassName="sm:w-full sm:max-w-none"
              >
                <Textarea
                  value={settings.defaultSystemPrompt}
                  onChange={(e) =>
                    void update({ defaultSystemPrompt: e.target.value })
                  }
                  rows={4}
                />
              </SettingsRow>
            </SettingsGroup>
          </div>
        </>
      );
    }

    if (section === "assistants") {
      return (
        <>
          <SettingsSectionHeader
            title="Assistants"
            description="Profils réutilisables pour démarrer une conversation avec un rôle prédéfini."
          />
          <PersonasEditor
            personas={settings.personas}
            onChange={(personas) => void update({ personas })}
          />
        </>
      );
    }

    if (section === "models") {
      return (
        <>
          <SettingsSectionHeader
            title="Modèles"
            description="Gérez les modèles installés, téléchargez-en de nouveaux ou désactivez-les."
          />
          <ModelManager onStatus={handleModelStatus} embedded />
        </>
      );
    }

    if (section === "data") {
      return (
        <>
          <SettingsSectionHeader
            title="Données"
            description="Exportez ou importez vos conversations et paramètres."
          />
          <SettingsGroup>
            <SettingsRow
              label="Exporter"
              description="Télécharge un fichier JSON avec toutes vos conversations."
            >
              <Button type="button" variant="outline" onClick={() => void handleExport()}>
                <Download className="size-4" />
                Exporter JSON
              </Button>
            </SettingsRow>
            <SettingsRow
              label="Importer"
              description="Remplace toutes les données locales. Action irréversible."
            >
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
            </SettingsRow>
          </SettingsGroup>

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
        </>
      );
    }

    return (
      <>
        <SettingsSectionHeader
          title="Avancé"
          description="Déploiement Vercel avec Ollama sur votre machine locale."
        />
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sur Windows PowerShell, avant de lancer Ollama :
          </p>
          <SettingsCodeBlock code={VERCEL_CODE} label="PowerShell" />
          <p className="text-sm text-muted-foreground">
            Ouvrez ensuite l&apos;app Vercel depuis le même PC que Ollama.{" "}
            <a
              href="https://vercel.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Documentation Vercel
            </a>
          </p>
        </div>
      </>
    );
  })();

  return (
    <div key={section} className="settings-section-enter">
      {sectionContent}
    </div>
  );
}
