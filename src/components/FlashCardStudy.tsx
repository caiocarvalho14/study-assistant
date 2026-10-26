// src/components/FlashcardStudy.tsx
"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCw, X } from "lucide-react";
import { ConfirmModal } from "@/components/modal/Confirmmodal";
import { ProgressBar } from "@/components/ProgressBar";
import { errorMessage } from "@/lib/estudos";
import { btnPrimary } from "@/lib/ui";
import type { Flashcard } from "@/types/flashcards";
import "./flashcard.css";

type FlashcardStudyProps = {
  cards: Flashcard[];
  materia: string;
  conteudo: string;
  /** recebe os ids dos cartões virados; salva e volta para a tela de flashcards */
  onConcluir: (revisadosIds: string[]) => Promise<void>;
  /** volta para a tela de flashcards sem salvar */
  onSair: () => void;
};

const navButton =
  "inline-flex size-12 cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40";

export function FlashcardStudy({
  cards,
  materia,
  conteudo,
  onConcluir,
  onSair,
}: FlashcardStudyProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const total = cards.length;
  const card = cards[index];

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [index]);

  function virar() {
    setFlipped((value) => !value);
    setRevealed((current) => (current.has(card.id) ? current : new Set(current).add(card.id)));
  }

  function ir(delta: number) {
    const proximo = index + delta;
    if (proximo < 0 || proximo >= total) return;
    setIndex(proximo);
    setFlipped(false);
  }

  async function concluir() {
    setError(null);
    setSaving(true);
    try {
      await onConcluir(Array.from(revealed));
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  function sair() {
    if (revealed.size === 0) onSair();
    else setConfirmOpen(true);
  }

  function handleKeys(e: KeyboardEvent<HTMLDivElement>) {
    if (confirmOpen) return;
    if (e.key === "ArrowRight") ir(1);
    if (e.key === "ArrowLeft") ir(-1);
  }

  return (
    <div onKeyDown={handleKeys} className="mx-auto w-full max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">
            {materia}
          </p>
          <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900">
            {conteudo}
          </h1>
        </div>
        <button
          type="button"
          onClick={sair}
          disabled={saving}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-60"
        >
          <X className="size-4" />
          Sair
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="flex-1">
          <ProgressBar value={((index + 1) / total) * 100} label="Progresso no estudo" />
        </div>
        <span className="text-xs font-medium tabular-nums text-gray-500">
          {index + 1} de {total}
        </span>
      </div>

      <div
        key={card.id}
        className="fc-scene fc-enter mt-6 h-[22rem] w-full sm:h-[26rem]"
      >
        <div
          ref={cardRef}
          role="button"
          tabIndex={0}
          aria-label={
            flipped
              ? "Cartão virado, mostrando a resposta. Pressione para voltar à pergunta."
              : "Pressione para virar o cartão e ver a resposta."
          }
          onClick={virar}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              virar();
            }
          }}
          className={`fc-card ${flipped ? "is-flipped" : ""}`}
        >
          <div className="fc-face fc-front-face flex flex-col p-6 sm:p-8" aria-hidden={flipped}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-600">
                <span className="size-1.5 rounded-full bg-blue-500" />
                Pergunta
              </span>
              <span className="text-xs font-medium tabular-nums text-gray-400">
                {index + 1} / {total}
              </span>
            </div>

            <div className="relative flex flex-1 overflow-y-auto py-4">
              <p className="m-auto max-h-full whitespace-pre-line text-center text-xl font-semibold leading-snug tracking-tight text-gray-900 sm:text-2xl">
                {card.pergunta}
              </p>
            </div>

            <p className="relative flex items-center justify-center gap-2 text-sm text-gray-400">
              <RotateCw className="size-4" />
              Toque pra virar
            </p>
          </div>

          <div className="fc-face fc-back-face flex flex-col p-6 sm:p-8" aria-hidden={!flipped}>
            <div className="relative flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-100">
                <span className="size-1.5 rounded-full bg-white" />
                Resposta
              </span>
              <span className="text-xs font-medium tabular-nums text-blue-200">
                {index + 1} / {total}
              </span>
            </div>

            <div className="relative flex flex-1 overflow-y-auto py-4">
              <p className="m-auto max-h-full whitespace-pre-line text-center text-lg leading-relaxed text-white sm:text-xl">
                {card.resposta}
              </p>
            </div>

            <p className="relative flex items-center justify-center gap-2 text-sm text-blue-200">
              <RotateCw className="size-4" />
              Toque pra voltar
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => ir(-1)}
          disabled={index === 0 || saving}
          aria-label="Cartão anterior"
          className={navButton}
        >
          <ChevronLeft className="size-5" />
        </button>

        <button type="button" onClick={concluir} disabled={saving} className={btnPrimary}>
          <Check className="size-4" />
          {saving ? "Salvando…" : "Concluir"}
        </button>

        <button
          type="button"
          onClick={() => ir(1)}
          disabled={index === total - 1 || saving}
          aria-label="Próximo cartão"
          className={navButton}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        {revealed.size} de {total} {revealed.size === 1 ? "cartão virado" : "cartões virados"}.
        Use as setas do teclado para navegar e espaço para virar.
      </p>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Sair do estudo"
        message="O progresso desta sessão não será salvo. Para registrar os cartões que você virou, use o botão Concluir."
        confirmLabel="Sair sem salvar"
        onConfirm={async () => onSair()}
      />
    </div>
  );
}