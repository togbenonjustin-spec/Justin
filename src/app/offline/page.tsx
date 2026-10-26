import React from "react";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[520px] items-center justify-center px-4">
      <Card className="w-full p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-warn/15 text-warn">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="font-display text-xl font-extrabold">
          Vous êtes hors-ligne
        </h1>
        <p className="mt-1.5 text-sm text-mut">
          Vérifiez votre connexion mobile (MTN, Moov ou Celtiis 3G/4G). Vos
          reçus déjà chargés restent consultables.
        </p>
        <Button asChild className="mt-5 w-full">
          <Link href="/">Réessayer</Link>
        </Button>
      </Card>
    </main>
  );
}
