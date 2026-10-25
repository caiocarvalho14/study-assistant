import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Painel lateral: folha de caderno pautada com margem marcada */}
      <aside
        className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-between lg:p-14"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 39px, rgba(255,255,255,0.07) 39px, rgba(255,255,255,0.07) 40px)",
        }}
      >
        <span aria-hidden className="absolute inset-y-0 left-20 w-0.5 bg-white" />

        <p className="pl-14 text-2xl font-semibold">Study-Assistant</p>

        <div className="pl-14">
          <p className="max-w-sm text-4xl font-medium leading-tight">
            Constância vence intensidade.
          </p>
          <p className="mt-4 max-w-sm leading-relaxed text-white/70">
            Registre o que você estuda, acompanhe sua evolução e mantenha o ritmo todos os dias.
          </p>
        </div>

        <div aria-hidden className="h-6" />
      </aside>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <p className="mb-10 font-serif text-xl font-semibold text-ink lg:hidden">
            Gerenciador de Estudos
          </p>

          <h1 className="text-3xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <p className="mt-8 text-sm text-muted">{footer}</p>
        </div>
      </section>
    </main>
  );
}