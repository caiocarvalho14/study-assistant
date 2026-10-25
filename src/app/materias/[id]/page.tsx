"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Alert } from "@/components/Alert";
import { ConfirmModal } from "@/components/modal/Confirmmodal";
import { FormModal } from "@/components/Formmodal";
import { ChevronRightIcon, ListIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { btnPrimary, btnSecondary, iconBtn, iconBtnDanger } from "@/lib/ui";
import {
  createConteudo,
  createTopico,
  deleteConteudo,
  deleteTopico,
  errorMessage,
  getDisciplina,
  listConteudos,
  updateConteudo,
  updateTopico,
} from "@/lib/estudos";
import type { ConteudoComTopicos, Disciplina, Topico } from "@/types/estudos";

type ModalState =
  | { kind: "conteudo-form"; conteudo?: ConteudoComTopicos }
  | { kind: "topico-form"; conteudoId: string; topico?: Topico }
  | { kind: "conteudo-delete"; conteudo: ConteudoComTopicos }
  | { kind: "topico-delete"; topico: Topico }
  | null;

export default function DisciplinaPage() {
  return (
    <AppShell>
      <DisciplinaContent />
    </AppShell>
  );
}

function DisciplinaContent() {
  const { id } = useParams<{ id: string }>();

  const [disciplina, setDisciplina] = useState<Disciplina | null>(null);
  const [conteudos, setConteudos] = useState<ConteudoComTopicos[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const closeModal = useCallback(() => setModal(null), []);

  const load = useCallback(async () => {
    try {
      const found = await getDisciplina(id);
      if (!found) {
        setNotFound(true);
        return;
      }
      setDisciplina(found);
      setConteudos(await listConteudos(id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const conteudoForm = modal?.kind === "conteudo-form" ? modal : null;
  const topicoForm = modal?.kind === "topico-form" ? modal : null;
  const conteudoDelete = modal?.kind === "conteudo-delete" ? modal.conteudo : null;
  const topicoDelete = modal?.kind === "topico-delete" ? modal.topico : null;

  async function saveConteudo({ title, obs }: { title: string; obs: string }) {
    if (conteudoForm?.conteudo) {
      await updateConteudo(conteudoForm.conteudo.id, title, obs);
    } else {
      await createConteudo(id, title, obs);
    }
    await load();
  }

  async function saveTopico({ title, obs }: { title: string; obs: string }) {
    if (!topicoForm) return;
    if (topicoForm.topico) {
      await updateTopico(topicoForm.topico.id, title, obs);
    } else {
      await createTopico(topicoForm.conteudoId, title, obs);
    }
    await load();
  }

  async function removeConteudo() {
    if (!conteudoDelete) return;
    await deleteConteudo(conteudoDelete.id);
    await load();
  }

  async function removeTopico() {
    if (!topicoDelete) return;
    await deleteTopico(topicoDelete.id);
    await load();
  }

  if (loading) {
    return (
      <div aria-busy="true" className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-72 animate-pulse rounded bg-gray-200" />
        <div className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-white" />
      </div>
    );
  }

  if (notFound || !disciplina) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Matéria não encontrada</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ela pode ter sido excluída ou você não tem acesso a ela.
        </p>
        <Link href="/materias" className={`${btnSecondary} mt-6`}>
          Voltar para matérias
        </Link>
      </div>
    );
  }

  return (
    <>
      <nav aria-label="Navegação" className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/materias" className="transition hover:text-gray-900">
          Matérias
        </Link>
        <ChevronRightIcon className="size-4 text-gray-400" />
        <span aria-current="page" className="truncate font-medium text-gray-900">
          {disciplina.nome}
        </span>
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900">
            {disciplina.nome}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Conteúdos desta matéria e os tópicos que você vai estudar em cada um.
          </p>
        </div>
        <button onClick={() => setModal({ kind: "conteudo-form" })} className={btnPrimary}>
          <PlusIcon className="size-4" />
          Novo conteúdo
        </button>
      </div>

      {error && (
        <div className="mt-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {conteudos.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ListIcon className="size-6" />
          </span>
          <h2 className="mt-4 font-semibold text-gray-900">Nenhum conteúdo ainda</h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Adicione o primeiro conteúdo desta matéria e depois liste os tópicos dele.
          </p>
          <button
            onClick={() => setModal({ kind: "conteudo-form" })}
            className={`${btnPrimary} mt-6`}
          >
            <PlusIcon className="size-4" />
            Criar conteúdo
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {conteudos.map((conteudo) => {
            const total = conteudo.topico.length;

            return (
              <article
                key={conteudo.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-gray-900">{conteudo.nome}</h2>
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {total === 1 ? "1 tópico" : `${total} tópicos`}
                      </span>
                    </div>
                    {conteudo.obs && (
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-500">
                        {conteudo.obs}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setModal({ kind: "conteudo-form", conteudo })}
                      aria-label={`Editar ${conteudo.nome}`}
                      title="Editar"
                      className={iconBtn}
                    >
                      <PencilIcon className="size-4" />
                    </button>
                    <button
                      onClick={() => setModal({ kind: "conteudo-delete", conteudo })}
                      aria-label={`Excluir ${conteudo.nome}`}
                      title="Excluir"
                      className={iconBtnDanger}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </header>

                {total === 0 ? (
                  <p className="px-5 py-4 text-sm text-gray-500">
                    Nenhum tópico neste conteúdo ainda.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {conteudo.topico.map((topico) => (
                      <li
                        key={topico.id}
                        className="flex items-start gap-3 px-5 py-3 transition hover:bg-gray-50"
                      >
                        <span
                          aria-hidden
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-400"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{topico.topico}</p>
                          {topico.obs && (
                            <p className="mt-0.5 whitespace-pre-line text-sm text-gray-500">
                              {topico.obs}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() =>
                              setModal({ kind: "topico-form", conteudoId: conteudo.id, topico })
                            }
                            aria-label={`Editar ${topico.topico}`}
                            title="Editar"
                            className={iconBtn}
                          >
                            <PencilIcon className="size-4" />
                          </button>
                          <button
                            onClick={() => setModal({ kind: "topico-delete", topico })}
                            aria-label={`Excluir ${topico.topico}`}
                            title="Excluir"
                            className={iconBtnDanger}
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <footer className="border-t border-gray-100 px-3 py-2">
                  <button
                    onClick={() => setModal({ kind: "topico-form", conteudoId: conteudo.id })}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                  >
                    <PlusIcon className="size-4" />
                    Adicionar tópico
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <FormModal
        open={conteudoForm !== null}
        onClose={closeModal}
        title={conteudoForm?.conteudo ? "Editar conteúdo" : "Novo conteúdo"}
        description="Agrupe os tópicos que você precisa estudar dentro deste conteúdo."
        titleLabel="Nome"
        titlePlaceholder="Ex.: Funções do 2º grau"
        withObs
        obsPlaceholder="Anotações, referências, links… (opcional)"
        initialTitle={conteudoForm?.conteudo?.nome ?? ""}
        initialObs={conteudoForm?.conteudo?.obs ?? ""}
        submitLabel={conteudoForm?.conteudo ? "Salvar" : "Criar conteúdo"}
        onSubmit={saveConteudo}
      />

      <FormModal
        open={topicoForm !== null}
        onClose={closeModal}
        title={topicoForm?.topico ? "Editar tópico" : "Novo tópico"}
        titleLabel="Nome do tópico"
        titlePlaceholder="Ex.: Vértice da parábola"
        withObs
        obsPlaceholder="Detalhes ou dicas de estudo (opcional)"
        initialTitle={topicoForm?.topico?.topico ?? ""}
        initialObs={topicoForm?.topico?.obs ?? ""}
        submitLabel={topicoForm?.topico ? "Salvar" : "Adicionar tópico"}
        onSubmit={saveTopico}
      />

      <ConfirmModal
        open={conteudoDelete !== null}
        onClose={closeModal}
        title="Excluir conteúdo"
        message={
          <>
            Tem certeza que deseja excluir <strong className="font-medium text-gray-900">{conteudoDelete?.nome}</strong>?
            Os tópicos dele também serão excluídos. Essa ação não pode ser desfeita.
          </>
        }
        onConfirm={removeConteudo}
      />

      <ConfirmModal
        open={topicoDelete !== null}
        onClose={closeModal}
        title="Excluir tópico"
        message={
          <>
            Tem certeza que deseja excluir <strong className="font-medium text-gray-900">{topicoDelete?.topico}</strong>?
            Essa ação não pode ser desfeita.
          </>
        }
        onConfirm={removeTopico}
      />
    </>
  );
}