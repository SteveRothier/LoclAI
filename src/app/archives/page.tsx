"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";

export default function ArchivesPage() {
  const router = useRouter();
  const setArchivesFlyoutOpen = useUIStore((s) => s.setArchivesFlyoutOpen);

  useEffect(() => {
    setArchivesFlyoutOpen(true);
    router.replace("/");
  }, [router, setArchivesFlyoutOpen]);

  return null;
}
