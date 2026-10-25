"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/modal/Modal";
import { AlertIcon } from "@/components/icons";
import { errorMessage } from "@/lib/estudos";
import { btnDangerSolid, btnSecondary } from "@/lib/ui";

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  /** executa a ação; o modal fecha sozinho quando a promessa resolve */
  onConfirm: () => Promise<void>;
};

export function ConfirmModal({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Excluir",
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      icon={
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
        >
          <AlertIcon className="size-5" />
        </span>
      }
    >
      <ConfirmBody onClose={onClose} confirmLabel={confirmLabel} onConfirm={onConfirm} />
    </Modal>
  );
}

function ConfirmBody({
  onClose,
  confirmLabel,
  onConfirm,
}: Pick<ConfirmModalProps, "onClose" | "onConfirm"> & { confirmLabel: string }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setWorking(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setWorking(false);
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          disabled={working}
          className={btnSecondary}
        >
          Cancelar
        </button>
        <button type="button" onClick={handleConfirm} disabled={working} className={btnDangerSolid}>
          {working ? "Excluindo…" : confirmLabel}
        </button>
      </div>
    </>
  );
}