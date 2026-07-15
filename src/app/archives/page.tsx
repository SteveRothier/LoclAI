"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ArchivesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?archives=1");
  }, [router]);

  return null;
}
