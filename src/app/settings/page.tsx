"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  isSettingsSection,
  useUIStore,
} from "@/stores/ui-store";

function SettingsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openSettings = useUIStore((s) => s.openSettings);

  useEffect(() => {
    const sectionParam = searchParams.get("section");
    const section = isSettingsSection(sectionParam) ? sectionParam : "general";
    openSettings(section);
    router.replace(`/?settings=${section}`);
  }, [openSettings, router, searchParams]);

  return null;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsRedirect />
    </Suspense>
  );
}
