"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/Sidebar";

/** Layout das páginas autenticadas: protege a rota e exibe a barra lateral. */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Carregando…</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="pl-16 md:pl-64 ">
        <div className="  px-6 py-12 md:px-10 ">{children}</div>
      </main>
    </div>
  );
}