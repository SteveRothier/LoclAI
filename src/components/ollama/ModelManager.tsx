"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Loader } from "@/components/ui/loader";
import { ModelLibrarySearch } from "@/components/ollama/ModelLibrarySearch";
import { SettingsAlert } from "@/components/settings/SettingsAlert";
import { formatModelSize } from "@/lib/ollama/client";
import { getEnabledModelNames, isModelDisabled } from "@/lib/ollama/models";
import { countConversationsUsingModel } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { useOllamaStore } from "@/stores/ollama-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useUIStore } from "@/stores/ui-store";

type ModelManagerProps = {
  onStatus?: (message: string | null) => void;
  embedded?: boolean;
};

type DeleteTarget = {
  modelName: string;
  convCount: number;
  isDefault: boolean;
};

export function ModelManager({ onStatus, embedded }: ModelManagerProps) {
  const [newModel, setNewModel] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const online = useOllamaStore((s) => s.online);
  const models = useOllamaStore((s) => s.models);
  const refreshing = useOllamaStore((s) => s.refreshing);
  const pulling = useOllamaStore((s) => s.pulling);
  const pullModelName = useOllamaStore((s) => s.pullModelName);
  const pullProgress = useOllamaStore((s) => s.pullProgress);
  const deleting = useOllamaStore((s) => s.deleting);
  const pullModelByName = useOllamaStore((s) => s.pullModelByName);
  const deleteModelByName = useOllamaStore((s) => s.deleteModelByName);
  const refresh = useOllamaStore((s) => s.refresh);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);
  const openSettings = useUIStore((s) => s.openSettings);

  const disabledModels = settings?.disabledModels ?? [];

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handlePull = async () => {
    const name = newModel.trim();
    if (!name) return;

    onStatus?.(null);
    const result = await pullModelByName(name);
    if (result.ok) {
      setNewModel("");
      onStatus?.(`Modèle « ${name} » téléchargé avec succès.`);
      if (settings && !settings.defaultModel) {
        await updateSettings({ defaultModel: name });
      }
    } else {
      onStatus?.(result.error ?? "Échec du téléchargement.");
    }
  };

  const toggleModelEnabled = async (modelName: string) => {
    if (!settings) return;

    const disabled = isModelDisabled(modelName, disabledModels);
    const nextDisabled = disabled
      ? disabledModels.filter((m) => m !== modelName)
      : [...disabledModels, modelName];

    const updates: Partial<typeof settings> = { disabledModels: nextDisabled };

    if (!disabled && settings.defaultModel === modelName) {
      const fallback =
        getEnabledModelNames(models, nextDisabled).find((m) => m !== modelName) ?? "";
      updates.defaultModel = fallback;
    }

    await updateSettings(updates);
    onStatus?.(
      disabled
        ? `Modèle « ${modelName} » réactivé.`
        : `Modèle « ${modelName} » désactivé — il n'apparaît plus dans le sélecteur.`
    );
  };

  const openDeleteDialog = async (modelName: string) => {
    const convCount = await countConversationsUsingModel(modelName);
    const isDefault = settings?.defaultModel === modelName;
    setDeleteTarget({ modelName, convCount, isDefault });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const { modelName } = deleteTarget;
    onStatus?.(null);

    const result = await deleteModelByName(modelName);
    if (!result.ok) {
      onStatus?.(result.error ?? "Échec de la suppression.");
      return;
    }

    const nextDisabled = disabledModels.filter((m) => m !== modelName);
    const updates: Partial<NonNullable<typeof settings>> = {
      disabledModels: nextDisabled,
    };

    if (settings?.defaultModel === modelName) {
      const fallback = getEnabledModelNames(
        useOllamaStore.getState().models,
        nextDisabled
      )[0] ?? "";
      updates.defaultModel = fallback;
    }

    await updateSettings(updates);
    setDeleteTarget(null);
    onStatus?.(`Modèle « ${modelName} » supprimé.`);
  };

  const disabled = !online || pulling || !!deleting;

  const deleteWarnings: string[] = [];
  if (deleteTarget) {
    if (deleteTarget.convCount > 0) {
      deleteWarnings.push(
        `${deleteTarget.convCount} conversation(s) utilisent encore ce modèle.`
      );
    }
    if (deleteTarget.isDefault) {
      deleteWarnings.push(
        "C'est votre modèle par défaut — un autre modèle sera sélectionné automatiquement."
      );
    }
  }

  const activeModels = models.filter((m) => !isModelDisabled(m.name, disabledModels));
  const hiddenModels = models.filter((m) => isModelDisabled(m.name, disabledModels));

  const renderModelRow = (model: (typeof models)[0], isHidden: boolean) => (
    <li
      key={model.name}
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3",
        isHidden && "bg-muted/30"
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "truncate font-medium",
              isHidden ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {model.name}
          </p>
          {settings?.defaultModel === model.name && (
            <Badge variant="success">Par défaut</Badge>
          )}
          {isHidden && <Badge variant="outline">Désactivé</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatModelSize(model.size)}
          {model.modified_at &&
            ` · ${formatDistanceToNow(new Date(model.modified_at), {
              addSuffix: true,
              locale: fr,
            })}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => void toggleModelEnabled(model.name)}
          disabled={disabled}
          title={isHidden ? "Réactiver le modèle" : "Désactiver le modèle"}
          className="text-muted-foreground hover:text-foreground"
        >
          {isHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => void openDeleteDialog(model.name)}
          disabled={disabled}
          title="Supprimer le modèle"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );

  const content = (
    <>
        <div
          className={cn(
            embedded && "sticky top-0 z-10 -mx-1 bg-card/95 pb-3 backdrop-blur-sm"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              {!embedded && (
                <h2 className="font-semibold text-foreground">Modèles installés</h2>
              )}
              <p className={cn("text-sm text-muted-foreground", !embedded && "mt-1")}>
                Recherchez dans la bibliothèque Ollama, téléchargez, désactivez ou supprimez des modèles.{" "}
                <a
                  href="https://ollama.com/library"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Bibliothèque Ollama
                </a>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => void refresh()}
              disabled={!online || pulling || refreshing}
              title="Rafraîchir la liste"
            >
              {refreshing ? (
                <Loader variant="ring" size="sm" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          </div>

          {!online && (
            <SettingsAlert variant="warning" className="mt-3">
              Ollama est hors ligne — impossible de gérer les modèles.{" "}
              <button
                type="button"
                onClick={() => openSettings("ollama")}
                className="font-medium text-primary hover:underline"
              >
                Vérifier la connexion
              </button>
            </SettingsAlert>
          )}

          <div className="mt-3">
            <ModelLibrarySearch
              value={newModel}
              onChange={setNewModel}
              onDownload={() => void handlePull()}
              installedNames={models.map((m) => m.name)}
              disabled={disabled}
              downloading={pulling}
            />
          </div>
        </div>

        {pulling && pullProgress && (
          <div className="space-y-2 rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-foreground">
                {pullModelName} — {pullProgress.status}
              </span>
              {pullProgress.percent !== undefined && (
                <span className="text-muted-foreground">{pullProgress.percent}%</span>
              )}
            </div>
            {pullProgress.percent !== undefined && (
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${pullProgress.percent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {models.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {online
                ? "Aucun modèle installé — téléchargez-en un ci-dessus."
                : "Connectez Ollama pour voir vos modèles installés."}
            </p>
            {!online && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => openSettings("ollama")}
              >
                Ouvrir les paramètres Ollama
              </Button>
            )}
          </div>
        ) : (
          <div className={cn("space-y-4", embedded && "max-h-[280px] overflow-y-auto scrollbar-thin pr-1")}>
            {activeModels.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {activeModels.map((model) => renderModelRow(model, false))}
              </ul>
            )}

            {hiddenModels.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Modèles désactivés ({hiddenModels.length})
                </p>
                <ul className="divide-y divide-border rounded-lg border border-dashed border-border">
                  {hiddenModels.map((model) => renderModelRow(model, true))}
                </ul>
              </div>
            )}

            {activeModels.length === 0 && hiddenModels.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Tous les modèles sont désactivés — réactivez-en un pour l&apos;utiliser dans le chat.
              </p>
            )}
          </div>
        )}
    </>
  );

  return (
    <>
      {embedded ? (
        <div className="space-y-5">{content}</div>
      ) : (
        <section className="space-y-5 rounded-xl border border-border p-6">
          {content}
        </section>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        title={
          deleteTarget
            ? `Supprimer « ${deleteTarget.modelName} » ?`
            : "Supprimer le modèle ?"
        }
        description="Cette action est irréversible. Le modèle sera définitivement retiré de votre machine."
        warnings={deleteWarnings}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        loading={!!deleting}
        loadingLabel="Suppression…"
        onConfirm={confirmDelete}
      />
    </>
  );
}
