// src/components/FlashcardModal.tsx
"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Modal } from "@/components/modal/Modal";
import { errorMessage } from "@/lib/estudos";
import { btnPrimary, btnSecondary, inputClass, inputErrorClass } from "@/lib/ui";

type FlashcardModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  initialPergunta?: string;
  initialResposta?: string;
  submitLabel: string;
  /** salva o flashcard; o modal fecha sozinho quando a promessa resolve */
  onSubmit: (values: { pergunta: string; resposta: string }) => Promise<void>;
};

export function FlashcardModal(props: FlashcardModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      description={props.description}
    >
      <FlashcardBody {...props} />
    </Modal>
  );
}

function FlashcardBody({
  onClose,
  initialPergunta = "",
  initialResposta = "",
  submitLabel,
  onSubmit,
}: FlashcardModalProps) {
  const baseId = useId();
  const [pergunta, setPergunta] = useState(initialPergunta);
  const [resposta, setResposta] = useState(initialResposta);
  const [errors, setErrors] = useState<{ pergunta?: string; resposta?: string }>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const found: { pergunta?: string; resposta?: string } = {};
    if (!pergunta.trim()) found.pergunta = "Escreva a pergunta.";
    if (!resposta.trim()) found.resposta = "Escreva a resposta.";
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setSaving(true);

    try {
      await onSubmit({ pergunta: pergunta.trim(), resposta: resposta.trim() });
      onClose();
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSaving(false);
    }
  }

  const label = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      <div className="space-y-4">
        <div>
          <label htmlFor={`${baseId}-pergunta`} className={label}>
            Pergunta
          </label>
          <textarea
            id={`${baseId}-pergunta`}
            rows={3}
            value={pergunta}
            onChange={(e) => {
              setPergunta(e.target.value);
              if (errors.pergunta) setErrors((current) => ({ ...current, pergunta: undefined }));
            }}
            disabled={saving}
            aria-invalid={errors.pergunta ? true : undefined}
            className={`${errors.pergunta ? inputErrorClass : inputClass} resize-none`}
          />
          {errors.pergunta && <p className="mt-1.5 text-xs text-red-600">{errors.pergunta}</p>}
        </div>

        <div>
          <label htmlFor={`${baseId}-resposta`} className={label}>
            Resposta
          </label>
          <textarea
            id={`${baseId}-resposta`}
            rows={5}
            value={resposta}
            onChange={(e) => {
              setResposta(e.target.value);
              if (errors.resposta) setErrors((current) => ({ ...current, resposta: undefined }));
            }}
            disabled={saving}
            aria-invalid={errors.resposta ? true : undefined}
            className={`${errors.resposta ? inputErrorClass : inputClass} resize-none`}
          />
          {errors.resposta && <p className="mt-1.5 text-xs text-red-600">{errors.resposta}</p>}
        </div>
      </div>

      {submitError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={saving} className={btnSecondary}>
          Cancelar
        </button>
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? "Salvando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}