"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ModelLibrarySearch } from "@/components/ollama/ModelLibrarySearch";
import { formatModelSize } from "@/lib/ollama/client";
import { getEnabledModelNames, isModelDisabled } from "@/lib/ollama/models";
import { countConversationsUsingModel } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { useOllamaStore } from "@/stores/ollama-store";
import { useSettingsStore } from "@/stores/settings-store";

type ModelManagerProps = {
  onStatus?: (message: string | null) => void;
};

type DeleteTarget = {
  modelName: string;
  convCount: number;
  isDefault: boolean;
};

export function ModelManager({ onStatus }: ModelManagerProps) {
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
        <p
          className={cn(
            "truncate font-medium",
            isHidden ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {model.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatModelSize(model.size)}
          {model.modified_at &&
            ` · ${formatDistanceToNow(new Date(model.modified_at), {
              addSuffix: true,
              locale: fr,
            })}`}
          {settings?.defaultModel === model.name && " · par défaut"}
          {isHidden && " · désactivé"}
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

  return (
    <>
      <section className="space-y-5 rounded-xl border border-border p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-foreground">Modèles installés</h2>
            <p className="mt-1 text-sm text-muted-foreground">
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
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {!online && (
          <p className="text-sm text-amber-600">
            Ollama est hors ligne — impossible de gérer les modèles.
          </p>
        )}

        <ModelLibrarySearch
          value={newModel}
          onChange={setNewModel}
          onDownload={() => void handlePull()}
          installedNames={models.map((m) => m.name)}
          disabled={disabled}
          downloading={pulling}
        />

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
          <p className="text-sm text-muted-foreground">
            Aucun modèle installé — téléchargez-en un ci-dessus.
          </p>
        ) : (
          <div className="space-y-4">
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
      </section>

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
