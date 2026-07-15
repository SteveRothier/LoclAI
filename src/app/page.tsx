"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createConversation, getLastConversation } from "@/lib/db/schema";

function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const query = searchParams.toString();
      const suffix = query ? `?${query}` : "";
      const last = await getLastConversation();
      if (last) {
        router.replace(`/c/${last.id}${suffix}`);
        return;
      }
      const conv = await createConversation();
      router.replace(`/c/${conv.id}${suffix}`);
    }
    void init().finally(() => setReady(true));
  }, [router, searchParams]);

  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground">
      {ready ? "Redirection…" : "Initialisation…"}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Initialisation…
      </div>
    }>
      <HomeRedirect />
    </Suspense>
  );
}
