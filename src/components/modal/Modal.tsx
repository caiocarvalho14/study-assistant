// src/components/Modal.tsx
"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/components/icons";
import "./modal.css";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** ícone exibido à esquerda do título (usado na confirmação de exclusão) */
  icon?: ReactNode;
  /** largura máxima do painel em telas maiores */
  size?: "md" | "lg";
  children?: ReactNode;
};

const SIZES = { md: "sm:max-w-md", lg: "sm:max-w-2xl" } as const;

const FOCUSABLE =
  'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, description, icon, size = "md", children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  // Mantém o onClose mais recente sem reiniciar o efeito a cada render do pai.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const getFocusable = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    const initial =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel?.querySelector<HTMLElement>("input, textarea") ??
      getFocusable()[0];
    initial?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`modal-panel relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 sm:rounded-2xl ${SIZES[size]}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <XIcon className="size-4" />
        </button>

        <div className="flex items-start gap-4 pr-8">
          {icon}
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-gray-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm leading-relaxed text-gray-500">
                {description}
              </p>
            )}
          </div>
        </div>

        {children}
      </div>
    </div>,
    document.body,
  );
}