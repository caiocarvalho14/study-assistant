"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Modal } from "@/components/modal/Modal";
import { errorMessage } from "@/lib/estudos";
import { btnPrimary, btnSecondary, inputClass, inputErrorClass } from "@/lib/ui";

export type FormValues = { title: string; obs: string };

type FormModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  titleLabel: string;
  titlePlaceholder?: string;
  withObs?: boolean;
  obsLabel?: string;
  obsPlaceholder?: string;
  initialTitle?: string;
  initialObs?: string;
  submitLabel: string;
  /** salva os dados; o modal fecha sozinho quando a promessa resolve */
  onSubmit: (values: FormValues) => Promise<void>;
};

export function FormModal(props: FormModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      description={props.description}
    >
      <FormBody {...props} />
    </Modal>
  );
}

function FormBody({
  onClose,
  titleLabel,
  titlePlaceholder,
  withObs = false,
  obsLabel = "Observações",
  obsPlaceholder = "Opcional",
  initialTitle = "",
  initialObs = "",
  submitLabel,
  onSubmit,
}: FormModalProps) {
  const titleId = useId();
  const obsId = useId();

  const [title, setTitle] = useState(initialTitle);
  const [obs, setObs] = useState(initialObs);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setFieldError("Informe um nome.");
      return;
    }

    setFieldError(null);
    setSubmitError(null);
    setSaving(true);

    try {
      await onSubmit({ title: title.trim(), obs: obs.trim() });
      onClose();
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      <div className="space-y-4">
        <div>
          <label htmlFor={titleId} className="mb-1.5 block text-sm font-medium text-gray-700">
            {titleLabel}
          </label>
          <input
            id={titleId}
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            placeholder={titlePlaceholder}
            disabled={saving}
            aria-invalid={fieldError ? true : undefined}
            className={fieldError ? inputErrorClass : inputClass}
          />
          {fieldError && <p className="mt-1.5 text-xs text-red-600">{fieldError}</p>}
        </div>

        {withObs && (
          <div>
            <label htmlFor={obsId} className="mb-1.5 block text-sm font-medium text-gray-700">
              {obsLabel}
            </label>
            <textarea
              id={obsId}
              rows={4}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder={obsPlaceholder}
              disabled={saving}
              className={`${inputClass} resize-none`}
            />
          </div>
        )}
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