"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  isSettingsSection,
  useUIStore,
} from "@/stores/ui-store";

function OverlayDeepLinksInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (params.get("archives") === "1") {
      useUIStore.getState().setArchivesFlyoutOpen(true);
      params.delete("archives");
      changed = true;
    }

    const settingsSection = params.get("settings");
    if (isSettingsSection(settingsSection)) {
      useUIStore.getState().openSettings(settingsSection);
      params.delete("settings");
      changed = true;
    }

    if (!changed) return;

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}

export function OverlayDeepLinks() {
  return (
    <Suspense fallback={null}>
      <OverlayDeepLinksInner />
    </Suspense>
  );
}
