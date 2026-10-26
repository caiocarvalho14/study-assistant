// src/components/GeracaoPanel.tsx
"use client";

import { CircleAlert, CircleCheck, LoaderCircle, X } from "lucide-react";
import type { Geracao } from "@/lib/geracao-flashcards";

type GeracaoPanelProps = {
  geracoes: Geracao[];
  onDispensar: (id: string) => void;
};

export function GeracaoPanel({ geracoes, onDispensar }: GeracaoPanelProps) {
  if (geracoes.length === 0) return null;

  return (
    <div aria-live="polite" className="mt-6 space-y-3">
      {geracoes.map((geracao) => {
        const nome = (
          <strong className="font-semibold">{geracao.conteudo}</strong>
        );

        if (geracao.status === "gerando") {
          return (
            <div
              key={geracao.id}
              className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
            >
              <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-blue-600" />
              <p>
                Gerando flashcards de {nome} com IA… Isso pode levar alguns instantes. Você pode
                continuar usando o app, avisamos aqui quando terminar.
              </p>
            </div>
          );
        }

        const sucesso = geracao.status === "concluido";

        return (
          <div
            key={geracao.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              sucesso
                ? "border-blue-200 bg-blue-50 text-blue-900"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {sucesso ? (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-blue-600" />
            ) : (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600" />
            )}
            <p className="flex-1">
              {sucesso ? (
                <>
                  {geracao.criados === 0
                    ? <>Nenhum flashcard novo para {nome}: todos os gerados já existiam.</>
                    : <>
                        {geracao.criados === 1 ? "1 flashcard criado" : `${geracao.criados} flashcards criados`}{" "}
                        para {nome}.
                      </>}
                  {(geracao.ignorados ?? 0) > 0 && geracao.criados !== 0 && (
                    <>
                      {" "}
                      {geracao.ignorados === 1
                        ? "1 já existia e foi ignorado."
                        : `${geracao.ignorados} já existiam e foram ignorados.`}
                    </>
                  )}
                </>
              ) : (
                <>
                  Falha ao gerar os flashcards de {nome}. {geracao.erro}
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => onDispensar(geracao.id)}
              aria-label="Dispensar aviso"
              className="-mr-1 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-60 transition hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}