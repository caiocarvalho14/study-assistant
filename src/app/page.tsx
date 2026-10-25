"use client";

import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { displayName } = useAuth();

  return (
    <AppShell>
      <h1 className="text-4xl font-bold text-ink">Olá, {displayName}</h1>
      <p className="mt-3 max-w-xl text-muted">
        Sua conta está pronta. Em breve você poderá cadastrar matérias, registrar sessões de
        estudo e acompanhar suas metas por aqui.
      </p>
    </AppShell>
  );
}