// src/app/sessoes/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Alert } from "@/components/Alert";
import { ConfirmModal } from "@/components/modal/Confirmmodal";
import { Disclosure } from "@/components/Disclosure";
import { SessaoModal } from "@/components/SessaoModal";
import { ClockIcon, FlagIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { errorMessage } from "@/lib/estudos";
import {
  createSessao,
  deleteSessao,
  listConteudoOpcoes,
  listDisciplinaOpcoes,
  listPreparacaoOpcoes,
  listSessoes,
  rotuloPreparacao,
  updateSessao,
} from "@/lib/sessoes";
import { formatarRegistro, formatarTempo } from "@/lib/tempo";
import { btnPrimary, iconBtn, iconBtnDanger } from "@/lib/ui";
import type {
  ConteudoOpcao,
  DisciplinaOpcao,
  PreparacaoOpcao,
  SessaoCompleta,
  SessaoInput,
} from "@/types/sessoes";

type ModalState =
  | { kind: "form"; sessao?: SessaoCompleta }
  | { kind: "delete"; sessao: SessaoCompleta }
  | null;

export default function SessoesPage() {
  return (
    <AppShell>
      <SessoesContent />
    </AppShell>
  );
}

function SessoesContent() {
  const [sessoes, setSessoes] = useState<SessaoCompleta[]>([]);
  const [preparacoes, setPreparacoes] = useState<PreparacaoOpcao[]>([]);
  const [disciplinas, setDisciplinas] = useState<DisciplinaOpcao[]>([]);
  const [conteudos, setConteudos] = useState<ConteudoOpcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const closeModal = useCallback(() => setModal(null), []);

  const load = useCallback(async () => {
    try {
      const [listaSessoes, listaPreparacoes, listaDisciplinas, listaConteudos] =
        await Promise.all([
          listSessoes(),
          listPreparacaoOpcoes(),
          listDisciplinaOpcoes(),
          listConteudoOpcoes(),
        ]);
      setSessoes(listaSessoes);
      setPreparacoes(listaPreparacoes);
      setDisciplinas(listaDisciplinas);
      setConteudos(listaConteudos);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tempoTotal = useMemo(
    () => sessoes.reduce((soma, sessao) => soma + (sessao.tempo ?? 0), 0),
    [sessoes],
  );

  const formModal = modal?.kind === "form" ? modal : null;
  const deleteTarget = modal?.kind === "delete" ? modal.sessao : null;

  async function handleSave(input: SessaoInput) {
    if (formModal?.sessao) {
      const topicosAtuais = formModal.sessao.sessao_topico.flatMap((item) =>
        item.topico ? [item.topico.id] : [],
      );
      await updateSessao(formModal.sessao.id, input, topicosAtuais);
    } else {
      await createSessao(input);
    }
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteSessao(deleteTarget.id);
    await load();
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Sessões de estudo</h1>
          <p className="mt-1 text-sm text-gray-500">
            {sessoes.length > 0
              ? `${sessoes.length === 1 ? "1 sessão" : `${sessoes.length} sessões`}, ${formatarTempo(tempoTotal)} no total.`
              : "Registre o tempo que você dedica a cada matéria."}
          </p>
        </div>
        <button onClick={() => setModal({ kind: "form" })} className={btnPrimary}>
          <PlusIcon className="size-4" />
          Nova sessão
        </button>
      </div>

      {error && (
        <div className="mt-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-52 animate-pulse rounded-2xl border border-gray-200 bg-white"
            />
          ))}
        </ul>
      ) : sessoes.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ClockIcon className="size-6" />
          </span>
          <h2 className="mt-4 font-semibold text-gray-900">Nenhuma sessão registrada</h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Registre sua primeira sessão informando o tempo, a matéria e, se quiser, o conteúdo e os
            tópicos estudados.
          </p>
          <button onClick={() => setModal({ kind: "form" })} className={`${btnPrimary} mt-6`}>
            <PlusIcon className="size-4" />
            Registrar sessão
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessoes.map((sessao) => {
            const materia = sessao.disciplina?.nome ?? "Matéria removida";
            const topicos = sessao.sessao_topico.flatMap((item) => (item.topico ? [item.topico] : []));

            return (
              <li
                key={sessao.id}
                className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden
                    className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-base font-semibold text-blue-600"
                  >
                    {materia.trim().charAt(0).toUpperCase()}
                  </span>

                  <div className="flex gap-1">
                    <button
                      onClick={() => setModal({ kind: "form", sessao })}
                      aria-label={`Editar sessão de ${materia}`}
                      title="Editar"
                      className={iconBtn}
                    >
                      <PencilIcon className="size-4" />
                    </button>
                    <button
                      onClick={() => setModal({ kind: "delete", sessao })}
                      aria-label={`Excluir sessão de ${materia}`}
                      title="Excluir"
                      className={iconBtnDanger}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </div>

                <h2 className="mt-4 truncate text-base font-semibold text-gray-900">{materia}</h2>
                <p className="truncate text-sm text-gray-500">
                  {sessao.conteudo?.nome ?? "Sem conteúdo específico"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-blue-700">
                    <ClockIcon className="size-3.5" />
                    {formatarTempo(sessao.tempo)}
                  </span>
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    <FlagIcon className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {sessao.preparacao ? rotuloPreparacao(sessao.preparacao) : "Sem preparação"}
                    </span>
                  </span>
                </div>

                {topicos.length > 0 && (
                  <div className="-mx-3 mt-3 border-t border-gray-100 pt-2">
                    <Disclosure
                      title="Tópicos estudados"
                      badge={
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {topicos.length}
                        </span>
                      }
                    >
                      <ul className="space-y-1.5 pb-2 pl-9 pr-3">
                        {topicos.map((topico) => (
                          <li
                            key={topico.id}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <span
                              aria-hidden
                              className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-400"
                            />
                            {topico.topico}
                          </li>
                        ))}
                      </ul>
                    </Disclosure>
                  </div>
                )}

                <p className="mt-4 text-xs text-gray-400">
                  Registrada em {formatarRegistro(sessao.created_at)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <SessaoModal
        open={formModal !== null}
        onClose={closeModal}
        title={formModal?.sessao ? "Editar sessão" : "Nova sessão de estudo"}
        description={
          formModal?.sessao
            ? undefined
            : "Registre o tempo estudado e vincule a matéria, o conteúdo e os tópicos."
        }
        sessao={formModal?.sessao}
        preparacoes={preparacoes}
        disciplinas={disciplinas}
        conteudos={conteudos}
        submitLabel={formModal?.sessao ? "Salvar" : "Registrar sessão"}
        onSubmit={handleSave}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={closeModal}
        title="Excluir sessão"
        message={
          <>
            Tem certeza que deseja excluir a sessão de{" "}
            <strong className="font-medium text-gray-900">
              {deleteTarget?.disciplina?.nome ?? "matéria removida"}
            </strong>{" "}
            ({formatarTempo(deleteTarget?.tempo ?? null)})? Essa ação não pode ser desfeita.
          </>
        }
        onConfirm={handleDelete}
      />
    </>
  );
}