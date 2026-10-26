// src/components/SessaoModal.tsx
"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Modal } from "@/components/modal/Modal";
import { errorMessage } from "@/lib/estudos";
import { rotuloPreparacao } from "@/lib/sessoes";
import { dividirTempo } from "@/lib/tempo";
import { btnPrimary, btnSecondary, inputClass, inputErrorClass } from "@/lib/ui";
import type {
  ConteudoOpcao,
  DisciplinaOpcao,
  PreparacaoOpcao,
  SessaoCompleta,
  SessaoInput,
} from "@/types/sessoes";

type SessaoModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** informe para editar; omita para criar */
  sessao?: SessaoCompleta;
  preparacoes: PreparacaoOpcao[];
  disciplinas: DisciplinaOpcao[];
  conteudos: ConteudoOpcao[];
  submitLabel: string;
  /** salva a sessão; o modal fecha sozinho quando a promessa resolve */
  onSubmit: (input: SessaoInput) => Promise<void>;
};

export function SessaoModal(props: SessaoModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      description={props.description}
      size="lg"
    >
      <SessaoBody {...props} />
    </Modal>
  );
}

function SessaoBody({
  onClose,
  sessao,
  preparacoes,
  disciplinas,
  conteudos,
  submitLabel,
  onSubmit,
}: SessaoModalProps) {
  const baseId = useId();
  const tempoInicial = dividirTempo(sessao?.tempo ?? null);

  const [preparacao, setPreparacao] = useState(sessao?.preparacao_id ?? "");
  const [disciplina, setDisciplina] = useState(sessao?.disciplina_id ?? "");
  const [conteudo, setConteudo] = useState(sessao?.conteudo_id ?? "");
  const [topicoIds, setTopicoIds] = useState<string[]>(() =>
    (sessao?.sessao_topico ?? []).flatMap((item) => (item.topico ? [item.topico.id] : [])),
  );
  const [horas, setHoras] = useState(sessao ? String(tempoInicial.horas) : "");
  const [minutos, setMinutos] = useState(sessao ? String(tempoInicial.minutos) : "");

  const [errors, setErrors] = useState<{ disciplina?: string; tempo?: string }>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const conteudosDaMateria = conteudos.filter((c) => c.disciplina_id === disciplina);
  const topicosDisponiveis = conteudos.find((c) => c.id === conteudo)?.topico ?? [];
  const selecionados = topicosDisponiveis.filter((t) => topicoIds.includes(t.id)).length;

  function handleDisciplina(value: string) {
    setDisciplina(value);
    setConteudo("");
    setTopicoIds([]);
    if (errors.disciplina) setErrors((current) => ({ ...current, disciplina: undefined }));
  }

  function handleConteudo(value: string) {
    setConteudo(value);
    setTopicoIds([]);
  }

  function toggleTopico(id: string) {
    setTopicoIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  /** Converte horas + minutos em minutos totais; null quando inválido. */
  function lerTempo(): number | null {
    const h = horas.trim() === "" ? 0 : Number(horas);
    const m = minutos.trim() === "" ? 0 : Number(minutos);
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0 || m > 59) return null;

    const total = h * 60 + m;
    return total >= 1 && total <= 32767 ? total : null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const tempo = lerTempo();
    const found: { disciplina?: string; tempo?: string } = {};
    if (!disciplina) found.disciplina = "Selecione a matéria.";
    if (tempo === null) found.tempo = "Informe um tempo válido (minutos de 0 a 59, mínimo de 1 minuto).";

    if (Object.keys(found).length > 0 || tempo === null) {
      setErrors(found);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setSaving(true);

    try {
      await onSubmit({
        preparacaoId: preparacao || null,
        disciplinaId: disciplina,
        conteudoId: conteudo || null,
        tempo,
        topicoIds: conteudo
          ? topicoIds.filter((id) => topicosDisponiveis.some((t) => t.id === id))
          : [],
      });
      onClose();
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSaving(false);
    }
  }

  const label = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      {disciplinas.length === 0 && (
        <p className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          Você ainda não tem matérias. Cadastre uma em Matérias antes de registrar uma sessão.
        </p>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor={`${baseId}-preparacao`} className={label}>
            Preparação
          </label>
          <select
            id={`${baseId}-preparacao`}
            data-autofocus
            value={preparacao}
            onChange={(e) => setPreparacao(e.target.value)}
            disabled={saving}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="">Nenhuma</option>
            {preparacoes.map((p) => (
              <option key={p.id} value={p.id}>
                {rotuloPreparacao(p)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500">Opcional.</p>
        </div>

        <fieldset>
          <legend className={label}>Tempo de estudo</legend>
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="0"
                aria-label="Horas"
                value={horas}
                onChange={(e) => {
                  setHoras(e.target.value);
                  if (errors.tempo) setErrors((current) => ({ ...current, tempo: undefined }));
                }}
                disabled={saving}
                aria-invalid={errors.tempo ? true : undefined}
                className={errors.tempo ? inputErrorClass : inputClass}
              />
              <span className="text-sm text-gray-500">h</span>
            </div>
            <div className="flex flex-1 items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                placeholder="30"
                aria-label="Minutos"
                value={minutos}
                onChange={(e) => {
                  setMinutos(e.target.value);
                  if (errors.tempo) setErrors((current) => ({ ...current, tempo: undefined }));
                }}
                disabled={saving}
                aria-invalid={errors.tempo ? true : undefined}
                className={errors.tempo ? inputErrorClass : inputClass}
              />
              <span className="text-sm text-gray-500">min</span>
            </div>
          </div>
          {errors.tempo && <p className="mt-1.5 text-xs text-red-600">{errors.tempo}</p>}
        </fieldset>

        <div>
          <label htmlFor={`${baseId}-disciplina`} className={label}>
            Matéria
          </label>
          <select
            id={`${baseId}-disciplina`}
            value={disciplina}
            onChange={(e) => handleDisciplina(e.target.value)}
            disabled={saving}
            aria-invalid={errors.disciplina ? true : undefined}
            className={`${errors.disciplina ? inputErrorClass : inputClass} cursor-pointer`}
          >
            <option value="">Selecione…</option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome ?? "Sem nome"}
              </option>
            ))}
          </select>
          {errors.disciplina && <p className="mt-1.5 text-xs text-red-600">{errors.disciplina}</p>}
        </div>

        <div>
          <label htmlFor={`${baseId}-conteudo`} className={label}>
            Conteúdo
          </label>
          <select
            id={`${baseId}-conteudo`}
            value={conteudo}
            onChange={(e) => handleConteudo(e.target.value)}
            disabled={saving || !disciplina}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="">Nenhum (sessão geral da matéria)</option>
            {conteudosDaMateria.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome ?? "Sem nome"}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500">
            {!disciplina
              ? "Escolha a matéria para ver os conteúdos."
              : conteudosDaMateria.length === 0
                ? "Esta matéria ainda não tem conteúdos."
                : "Opcional. Ao escolher um conteúdo, você pode marcar os tópicos estudados."}
          </p>
        </div>

        {conteudo && (
          <div className="rounded-xl border border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
              <p className="text-sm font-medium text-gray-700">
                Tópicos estudados{" "}
                <span className="font-normal tabular-nums text-gray-400">
                  ({selecionados}/{topicosDisponiveis.length})
                </span>
              </p>
              {topicosDisponiveis.length > 0 && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTopicoIds(topicosDisponiveis.map((t) => t.id))}
                    disabled={saving}
                    className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                  >
                    Selecionar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopicoIds([])}
                    disabled={saving}
                    className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>

            {topicosDisponiveis.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500">Este conteúdo ainda não tem tópicos.</p>
            ) : (
              <ul className="max-h-52 overflow-y-auto p-1">
                {topicosDisponiveis.map((topico) => (
                  <li key={topico.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={topicoIds.includes(topico.id)}
                        onChange={() => toggleTopico(topico.id)}
                        disabled={saving}
                        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">{topico.topico}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
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