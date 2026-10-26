import React from "react";
import { InteractiveWorkspace } from "@/components/loyerclair/interactive-workspace";

export default function DashboardPage() {
  return (
    <main className="min-h-dvh bg-bg">
      <InteractiveWorkspace initialTab="own" />
    </main>
  );
}
