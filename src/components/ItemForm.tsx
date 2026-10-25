"use client";

import { useState, type FormEvent } from "react";
import { btnPrimary, inputClass } from "@/lib/ui";

type ItemFormProps = {
  titlePlaceholder: string;
  submitLabel: string;
  /** exibe o campo de observações */
  withObs?: boolean;
  obsPlaceholder?: string;
  initialTitle?: string;
  initialObs?: string;
  onSubmit: (values: { title: string; obs: string }) => Promise<void>;
  /** quando informado, o formulário vira modo de edição com botão Cancelar */
  onCancel?: () => void;
};

export function ItemForm({
  titlePlaceholder,
  submitLabel,
  withObs = false,
  obsPlaceholder = "Observações (opcional)",
  initialTitle = "",
  initialObs = "",
  onSubmit,
  onCancel,
}: ItemFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [obs, setObs] = useState(initialObs);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(onCancel);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Informe um nome.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), obs: obs.trim() });
      if (!isEditing) {
        setTitle("");
        setObs("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
          aria-label={titlePlaceholder}
          disabled={saving}
          className={inputClass}
        />
        {!withObs && (
          <div className="flex shrink-0 gap-2">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Salvando…" : submitLabel}
            </button>
            {onCancel && (
              <button type="button" onClick={onCancel} disabled={saving} className={btnPrimary}>
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>

      {withObs && (
        <>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder={obsPlaceholder}
            aria-label={obsPlaceholder}
            rows={2}
            disabled={saving}
            className={inputClass}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Salvando…" : submitLabel}
            </button>
            {onCancel && (
              <button type="button" onClick={onCancel} disabled={saving} className={btnPrimary}>
                Cancelar
              </button>
            )}
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}