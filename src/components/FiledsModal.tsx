// src/components/FieldsModal.tsx
"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Modal } from "@/components/modal/Modal";
import { errorMessage } from "@/lib/estudos";
import { btnPrimary, btnSecondary, inputClass, inputErrorClass } from "@/lib/ui";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "url" | "date" | "number" | "select";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  /** opções do campo type "select" */
  options?: { value: string; label: string }[];
  /** retorna a mensagem de erro, ou null quando o valor é válido; recebe todos os valores para validações cruzadas */
  validate?: (value: string, values: Record<string, string>) => string | null;
};

type FieldsModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  fields: Field[];
  initialValues?: Record<string, string>;
  submitLabel: string;
  /** salva os dados; o modal fecha sozinho quando a promessa resolve */
  onSubmit: (values: Record<string, string>) => Promise<void>;
};

export function FieldsModal(props: FieldsModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      description={props.description}
    >
      <FieldsBody {...props} />
    </Modal>
  );
}

function FieldsBody({
  onClose,
  fields,
  initialValues = {},
  submitLabel,
  onSubmit,
}: FieldsModalProps) {
  const baseId = useId();

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, initialValues[field.name] ?? ""])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const trimmedValues = () =>
    Object.fromEntries(Object.entries(values).map(([name, value]) => [name, value.trim()]));

  function validateAll(): Record<string, string> {
    const all = trimmedValues();
    const found: Record<string, string> = {};

    for (const field of fields) {
      const value = all[field.name];
      if (!value && field.required) {
        found[field.name] = "Campo obrigatório.";
      } else if (value && field.validate) {
        const message = field.validate(value, all);
        if (message) found[field.name] = message;
      }
    }
    return found;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const found = validateAll();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setSaving(true);

    try {
      await onSubmit(trimmedValues());
      onClose();
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      <div className="space-y-4">
        {fields.map((field) => {
          const id = `${baseId}-${field.name}`;
          const error = errors[field.name];
          const className = error ? inputErrorClass : inputClass;

          const handleChange = (value: string) => {
            setValues((current) => ({ ...current, [field.name]: value }));
            if (error) setErrors((current) => ({ ...current, [field.name]: "" }));
          };

          return (
            <div key={field.name}>
              <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
                {field.label}
              </label>

              {field.type === "select" ? (
                <select
                  id={id}
                  value={values[field.name]}
                  onChange={(e) => handleChange(e.target.value)}
                  disabled={saving}
                  aria-invalid={error ? true : undefined}
                  className={`${className} cursor-pointer`}
                >
                  <option value="">Selecione…</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  type={field.type ?? "text"}
                  inputMode={field.type === "number" ? "numeric" : undefined}
                  min={field.type === "number" ? 0 : undefined}
                  value={values[field.name]}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder={field.placeholder}
                  disabled={saving}
                  aria-invalid={error ? true : undefined}
                  className={className}
                />
              )}

              {error ? (
                <p className="mt-1.5 text-xs text-red-600">{error}</p>
              ) : (
                field.hint && <p className="mt-1.5 text-xs text-gray-500">{field.hint}</p>
              )}
            </div>
          );
        })}
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