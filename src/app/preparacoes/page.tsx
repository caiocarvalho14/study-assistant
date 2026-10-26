// src/app/preparacoes/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Alert } from "@/components/Alert";
import { ConfirmModal } from "@/components/modal/Confirmmodal";
import { FieldsModal } from "@/components/FiledsModal";
import {
  CalendarIcon,
  ExternalLinkIcon,
  FlagIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import { preparacaoCreateFields, preparacaoFields } from "@/lib/campos";
import { formatarData, proximaProva, rotuloProva } from "@/lib/datas";
import { errorMessage } from "@/lib/estudos";
import {
  createAvaliacao,
  createPreparacao,
  deletePreparacao,
  listPreparacoes,
  updatePreparacao,
} from "@/lib/preparacoes";
import { btnPrimary, iconBtn, iconBtnDanger } from "@/lib/ui";
import { normalizeUrl } from "@/lib/url";
import type { PreparacaoComAvaliacoes } from "@/types/estudos";
import { listBlocos } from "@/lib/preparacoes";

type ModalState =
  | { kind: "form"; item?: PreparacaoComAvaliacoes }
  | { kind: "delete"; item: PreparacaoComAvaliacoes }
  | null;

export default function PreparacoesPage() {
  return (
    <AppShell>
      <PreparacoesContent />
    </AppShell>
  );
}

function PreparacoesContent() {
  const [items, setItems] = useState<PreparacaoComAvaliacoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);



  const closeModal = useCallback(() => setModal(null), []);

  const load = useCallback(async () => {
    try {
      setItems(await listPreparacoes());
      
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const formModal = modal?.kind === "form" ? modal : null;
  const deleteTarget = modal?.kind === "delete" ? modal.item : null;

  async function handleSave(values: Record<string, string>) {
    const input = {
      cargo: values.cargo,
      banca: values.banca,
      url: normalizeUrl(values.url) ?? "",
      instituicao: values.instituicao
    };

    if (formModal?.item) {
      await updatePreparacao(formModal.item.id, input);
      await load();
      return;
    }

    const id = await createPreparacao(input);

    if (values.data) {
      try {
        await createAvaliacao(id, values.data, "");
      } catch {
        await load();
        throw new Error(
          "A preparação foi criada, mas não foi possível salvar a data da prova. Adicione-a pela página da preparação.",
        );
      }
    }

    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deletePreparacao(deleteTarget.id);
    await load();
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Preparações</h1>
          <p className="mt-1 text-sm text-gray-500">
            Cada preparação se resume ao concurso ou a prova para a qual você está estudando.
          </p>
        </div>
        <button onClick={() => setModal({ kind: "form" })} className={btnPrimary}>
          <PlusIcon className="size-4" />
          Nova preparação
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
              className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-white"
            />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FlagIcon className="size-6" />
          </span>
          <h2 className="mt-4 font-semibold text-gray-900">Nenhuma preparação ainda</h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Cadastre o cargo, a banca e a data da prova para acompanhar a contagem regressiva.
          </p>
          <button onClick={() => setModal({ kind: "form" })} className={`${btnPrimary} mt-6`}>
            <PlusIcon className="size-4" />
            Criar preparação
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const prova = proximaProva((item.avaliacao ?? []).map((a) => a.data_prova));

            return (
              <li
                key={item.id}
                className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md focus-within:border-blue-400 focus-within:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden
                    className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
                  >
                    <FlagIcon className="size-5" />
                  </span>

                  <div className="relative z-10 flex gap-1">
                    <button
                      onClick={() => setModal({ kind: "form", item })}
                      aria-label={`Editar ${item.cargo}`}
                      title="Editar"
                      className={iconBtn}
                    >
                      <PencilIcon className="size-4" />
                    </button>
                    <button
                      onClick={() => setModal({ kind: "delete", item })}
                      aria-label={`Excluir ${item.cargo}`}
                      title="Excluir"
                      className={iconBtnDanger}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </div>

                <h2 className="mt-4 text-base font-semibold text-gray-900">
                  <Link
                    href={`/preparacoes/${item.id}`}
                    className="line-clamp-2 after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
                  >
                    {item.cargo ?? "Sem cargo"}
                  </Link>
                </h2>
                <p className="my-1 truncate text-sm text-gray-500">
                  {item.instituicao ?? "Instituição não informada"} / {item.banca_organizadora ?? "Banca não informada"}
                </p>

                <div className="mt-auto flex items-end justify-between gap-3 border-t border-gray-100 pt-4">
                  {prova ? (
                    <div className="flex items-start gap-2">
                      <CalendarIcon className="mt-0.5 size-4 shrink-0 text-blue-600" />
                      <div>l
                        <p className="text-sm font-medium text-gray-900">
                          {rotuloProva(prova.dias)}
                        </p>
                        <p className="text-xs text-gray-500">{formatarData(prova.iso)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <CalendarIcon className="size-4 shrink-0 text-gray-400" />
                      Sem prova agendada
                    </div>
                  )}

                  {item.url_do_edital && (
                    <a
                      href={item.url_do_edital}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative z-10 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      Edital
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FieldsModal
        open={formModal !== null}
        onClose={closeModal}
        title={formModal?.item ? "Editar preparação" : "Nova preparação"}
        description={
          formModal?.item
            ? undefined
            : "Informe o cargo e a banca. Se já souber, coloque também a data da prova."
        }
        fields={formModal?.item ? preparacaoFields : preparacaoCreateFields}
        initialValues={{
          cargo: formModal?.item?.cargo ?? "",
          banca: formModal?.item?.banca_organizadora ?? "",
          url: formModal?.item?.url_do_edital ?? "",
          instituicao: formModal?.item?.instituicao ?? ""
        }}
        submitLabel={formModal?.item ? "Salvar" : "Criar preparação"}
        onSubmit={handleSave}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={closeModal}
        title="Excluir preparação"
        message={
          <>
            Tem certeza que deseja excluir <strong className="font-medium text-gray-900">{deleteTarget?.cargo}</strong>?
            As provas cadastradas nela também serão excluídas. Essa ação não pode ser desfeita.
          </>
        }
        onConfirm={handleDelete}
      />
    </>
  );
}