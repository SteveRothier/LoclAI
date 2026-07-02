"use client";

import { use } from "react";
import { ChatView } from "@/components/chat/ChatView";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function ConversationPage({ params }: PageProps) {
  const { id } = use(params);

  return <ChatView conversationId={id} />;
}
