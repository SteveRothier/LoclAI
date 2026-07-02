"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createConversation, getLastConversation } from "@/lib/db/schema";

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const last = await getLastConversation();
      if (last) {
        router.replace(`/c/${last.id}`);
        return;
      }
      const conv = await createConversation();
      router.replace(`/c/${conv.id}`);
    }
    void init().finally(() => setReady(true));
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground">
      {ready ? "Redirection…" : "Initialisation…"}
    </div>
  );
}
