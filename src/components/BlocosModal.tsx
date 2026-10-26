// src/components/BlocosModal.tsx
"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Modal } from "@/components/modal/Modal";
import { PlusIcon, TrashIcon } from "@/components/icons";
import type { BlocoChanges } from "@/lib/blocos";
import { percentual } from "@/lib/desempenho";
import { errorMessage } from "@/lib/estudos";
import { btnPrimary, btnSecondary, iconBtnDanger, inputClass, inputErrorClass } from "@/lib/ui";
import type { BlocoComDisciplina } from "@/types/estudos";

type BlocosModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  disciplinas: { id: string; nome: string | null }[];
  /** blocos que a prova já tem */
  blocos: BlocoComDisciplina[];
  /** recebe só o que mudou; o modal fecha sozinho quando a promessa resolve */
  onSave: (changes: BlocoChanges) => Promise<void>;
};

type Row = { key: string; id?: string; disciplina: string; total: string; acertos: string };
type RowErrors = Partial<Record<"disciplina" | "total" | "acertos", string>>;

const INTEIRO = /^\d+$/;

export function BlocosModal(props: BlocosModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      description={props.description}
      size="lg"
    >
      <BlocosBody {...props} />
    </Modal>
  );
}

function BlocosBody({ onClose, disciplinas, blocos, onSave }: BlocosModalProps) {
  const counter = useRef(1);
  const newKey = () => `novo-${counter.current++}`;

  const [rows, setRows] = useState<Row[]>(() =>
    blocos.length > 0
      ? blocos.map((bloco) => ({
          key: bloco.id,
          id: bloco.id,
          disciplina: bloco.disciplina_id ?? "",
          total: String(bloco.questoes_total ?? ""),
          acertos: String(bloco.questoes_acertadas ?? ""),
        }))
      : [{ key: "novo-0", disciplina: "", total: "", acertos: "" }],
  );
  const [errors, setErrors] = useState<Record<string, RowErrors>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isBlank = (row: Row) =>
    !row.id && !row.disciplina && !row.total.trim() && !row.acertos.trim();

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: {} }));
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function validateRow(row: Row): RowErrors {
    const found: RowErrors = {};
    const total = row.total.trim();
    const acertos = row.acertos.trim();

    if (!row.disciplina) found.disciplina = "Selecione a matéria.";

    if (!INTEIRO.test(total) || Number(total) < 1 || Number(total) > 32767) {
      found.total = "Informe o total de questões (mínimo 1).";
    }

    if (!INTEIRO.test(acertos) || Number(acertos) > 32767) {
      found.acertos = "Informe a quantidade de acertos.";
    } else if (!found.total && Number(acertos) > Number(total)) {
      found.acertos = "Os acertos não podem passar do total.";
    }

    return found;
  }

  // Resumo ao vivo, só com as linhas que já têm números válidos.
  const resumo = rows.reduce(
    (acc, row) => {
      if (INTEIRO.test(row.total.trim()) && INTEIRO.test(row.acertos.trim())) {
        acc.total += Number(row.total);
        acc.acertos += Number(row.acertos);
      }
      return acc;
    },
    { acertos: 0, total: 0 },
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const active = rows.filter((row) => !isBlank(row));

    const found: Record<string, RowErrors> = {};
    for (const row of active) {
      const rowErrors = validateRow(row);
      if (Object.keys(rowErrors).length > 0) found[row.key] = rowErrors;
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setErrors({});

    const originals = new Map(blocos.map((bloco) => [bloco.id, bloco]));
    const keptIds = new Set(active.flatMap((row) => (row.id ? [row.id] : [])));

    const changes: BlocoChanges = {
      creates: [],
      updates: [],
      deletes: blocos.filter((bloco) => !keptIds.has(bloco.id)).map((bloco) => bloco.id),
    };

    for (const row of active) {
      const values = {
        disciplinaId: row.disciplina,
        total: Number(row.total),
        acertos: Number(row.acertos),
      };

      if (!row.id) {
        changes.creates.push(values);
        continue;
      }

      const original = originals.get(row.id);
      if (
        original &&
        (original.disciplina_id !== values.disciplinaId ||
          original.questoes_total !== values.total ||
          original.questoes_acertadas !== values.acertos)
      ) {
        changes.updates.push({ id: row.id, ...values });
      }
    }

    if (
      changes.creates.length === 0 &&
      changes.updates.length === 0 &&
      changes.deletes.length === 0
    ) {
      onClose();
      return;
    }

    setSubmitError(null);
    setSaving(true);
    try {
      await onSave(changes);
      onClose();
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSaving(false);
    }
  }

  const gridCols = "sm:grid-cols-[minmax(0,1fr)_6rem_6rem_2rem]";

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      {disciplinas.length === 0 && (
        <p className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          Você ainda não tem matérias. Cadastre uma em Matérias antes de lançar os blocos.
        </p>
      )}

      <div className={`hidden gap-3 px-1 pb-1 text-xs font-medium text-gray-500 sm:grid ${gridCols}`}>
        <span>Matéria</span>
        <span>Total</span>
        <span>Acertos</span>
        <span />
      </div>

      {rows.length === 0 ? (
        <p className="px-1 py-4 text-sm text-gray-500">
          Nenhum bloco. Adicione uma matéria para lançar o resultado.
        </p>
      ) : (
        <ul className="max-h-[50vh] space-y-3 overflow-y-auto px-1 py-1">
          {rows.map((row, index) => {
            const rowErrors = errors[row.key] ?? {};
            const message = rowErrors.disciplina ?? rowErrors.total ?? rowErrors.acertos;
            const label = "mb-1 block text-xs font-medium text-gray-500 sm:sr-only";

            return (
              <li key={row.key}>
                <div className={`grid grid-cols-2 gap-3 sm:items-center ${gridCols}`}>
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor={`${row.key}-disciplina`} className={label}>
                      Matéria
                    </label>
                    <select
                      id={`${row.key}-disciplina`}
                      data-autofocus={index === 0 ? true : undefined}
                      value={row.disciplina}
                      onChange={(e) => updateRow(row.key, { disciplina: e.target.value })}
                      disabled={saving}
                      aria-invalid={rowErrors.disciplina ? true : undefined}
                      className={`${rowErrors.disciplina ? inputErrorClass : inputClass} cursor-pointer`}
                    >
                      <option value="">Selecione…</option>
                      {disciplinas.map((disciplina) => (
                        <option key={disciplina.id} value={disciplina.id}>
                          {disciplina.nome ?? "Sem nome"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`${row.key}-total`} className={label}>
                      Total
                    </label>
                    <input
                      id={`${row.key}-total`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="30"
                      value={row.total}
                      onChange={(e) => updateRow(row.key, { total: e.target.value })}
                      disabled={saving}
                      aria-invalid={rowErrors.total ? true : undefined}
                      className={rowErrors.total ? inputErrorClass : inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor={`${row.key}-acertos`} className={label}>
                      Acertos
                    </label>
                    <input
                      id={`${row.key}-acertos`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="20"
                      value={row.acertos}
                      onChange={(e) => updateRow(row.key, { acertos: e.target.value })}
                      disabled={saving}
                      aria-invalid={rowErrors.acertos ? true : undefined}
                      className={rowErrors.acertos ? inputErrorClass : inputClass}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    disabled={saving}
                    aria-label="Remover linha"
                    title="Remover"
                    className={`${iconBtnDanger} col-span-2 justify-self-end sm:col-span-1 sm:justify-self-auto`}
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>

                {message && <p className="mt-1.5 text-xs text-red-600">{message}</p>}
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() =>
          setRows((current) => [
            ...current,
            { key: newKey(), disciplina: "", total: "", acertos: "" },
          ])
        }
        disabled={saving}
        className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-60"
      >
        <PlusIcon className="size-4" />
        Adicionar matéria
      </button>

      {submitError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm tabular-nums text-gray-500">
          {resumo.total > 0 && (
            <>
              Total: <span className="font-medium text-gray-900">{resumo.acertos}/{resumo.total}</span>{" "}
              ({percentual(resumo.acertos, resumo.total)}%)
            </>
          )}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={saving} className={btnSecondary}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Salvando…" : "Salvar blocos"}
          </button>
        </div>
      </div>
    </form>
  );
}