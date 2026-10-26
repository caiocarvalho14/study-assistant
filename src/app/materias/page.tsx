// src/app/materias/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Alert } from "@/components/Alert";
import { ConfirmModal } from "@/components/modal/Confirmmodal";
import { FormModal } from "@/components/Formmodal";
import { ImportModal } from "@/components/ImportModal";
import { BookIcon, PencilIcon, PlusIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { btnPrimary, btnSecondary, iconBtn, iconBtnDanger } from "@/lib/ui";
import {
  createDisciplina,
  deleteDisciplina,
  errorMessage,
  importEstrutura,
  listDisciplinas,
  updateDisciplina,
} from "@/lib/estudos";
import { countImport, plural, type ImportMateria } from "@/lib/importacao";
import type { DisciplinaComContagem } from "@/types/estudos";

type ModalState =
  | { kind: "form"; item?: DisciplinaComContagem }
  | { kind: "delete"; item: DisciplinaComContagem }
  | { kind: "import" }
  | null;

export default function MateriasPage() {
  return (
    <AppShell>
      <MateriasContent />
    </AppShell>
  );
}

function MateriasContent() {
  const [items, setItems] = useState<DisciplinaComContagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const closeModal = useCallback(() => setModal(null), []);

  function openModal(state: ModalState) {
    setNotice(null);
    setModal(state);
  }

  const load = useCallback(async () => {
    try {
      setItems(await listDisciplinas());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const existingNames = useMemo(
    () => new Set(items.map((item) => (item.nome ?? "").trim().toLowerCase())),
    [items],
  );

  const formModal = modal?.kind === "form" ? modal : null;
  const deleteTarget = modal?.kind === "delete" ? modal.item : null;

  async function handleSave({ title }: { title: string }) {
    if (formModal?.item) {
      await updateDisciplina(formModal.item.id, title);
    } else {
      await createDisciplina(title);
    }
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteDisciplina(deleteTarget.id);
    await load();
  }

  async function handleImport(data: ImportMateria[]) {
    await importEstrutura(data);
    await load();

    const totals = countImport(data);
    setNotice(
      `Importação concluída: ${plural(totals.materias, "matéria", "matérias")}, ${plural(totals.conteudos, "conteúdo", "conteúdos")} e ${plural(totals.topicos, "tópico", "tópicos")} adicionados.`,
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Matérias</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize o que você estuda em cada matéria.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => openModal({ kind: "import" })} className={btnSecondary}>
            <UploadIcon className="size-4" />
            Importar JSON
          </button>
          <button onClick={() => openModal({ kind: "form" })} className={btnPrimary}>
            <PlusIcon className="size-4" />
            Nova matéria
          </button>
        </div>
      </div>

      {notice && (
        <div className="mt-6">
          <Alert variant="success">{notice}</Alert>
        </div>
      )}

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
              className="h-36 animate-pulse rounded-2xl border border-gray-200 bg-white"
            />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BookIcon className="size-6" />
          </span>
          <h2 className="mt-4 font-semibold text-gray-900">Nenhuma matéria ainda</h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Crie sua primeira matéria ou importe um JSON para começar a cadastrar conteúdos e
            tópicos de estudo.
          </p>
          <button onClick={() => openModal({ kind: "form" })} className={`${btnPrimary} mt-6`}>
            <PlusIcon className="size-4" />
            Criar matéria
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const total = item.conteudo?.[0]?.count ?? 0;
            const initial = (item.nome ?? "?").trim().charAt(0).toUpperCase();

            return (
              <li
                key={item.id}
                className="group relative rounded-2xl border border-gray-200 bg-white p-5  transition hover:border-blue-300 hover:shadow-md focus-within:border-blue-400 focus-within:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">

                  <div>
                    <h2 className="truncate text-base font-semibold text-gray-900">
                      <Link
                        href={`/materias/${item.id}`}
                        className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
                      >
                        {item.nome}
                      </Link>
                    </h2>

                    <span className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {total === 1 ? "1 conteúdo" : `${total} conteúdos`}
                    </span>
                  </div>

                  <div className="relative z-10 flex gap-1">
                    <button
                      onClick={() => openModal({ kind: "form", item })}
                      aria-label={`Renomear ${item.nome}`}
                      title="Renomear"
                      className={iconBtn}
                    >
                      <PencilIcon className="size-4" />
                    </button>
                    <button
                      onClick={() => openModal({ kind: "delete", item })}
                      aria-label={`Excluir ${item.nome}`}
                      title="Excluir"
                      className={iconBtnDanger}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>

                </div>


              </li>
            );
          })}
        </ul>
      )}

      <FormModal
        open={formModal !== null}
        onClose={closeModal}
        title={formModal?.item ? "Renomear matéria" : "Nova matéria"}
        description={
          formModal?.item ? undefined : "Dê um nome para a matéria. Você adiciona os conteúdos depois."
        }
        titleLabel="Nome"
        titlePlaceholder="Ex.: Matemática"
        initialTitle={formModal?.item?.nome ?? ""}
        submitLabel={formModal?.item ? "Salvar" : "Criar matéria"}
        onSubmit={handleSave}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={closeModal}
        title="Excluir matéria"
        message={
          <>
            Tem certeza que deseja excluir <strong className="font-medium text-gray-900">{deleteTarget?.nome}</strong>?
            Os conteúdos e tópicos dela também serão excluídos. Essa ação não pode ser desfeita.
          </>
        }
        onConfirm={handleDelete}
      />

      <ImportModal
        open={modal?.kind === "import"}
        onClose={closeModal}
        existingNames={existingNames}
        onImport={handleImport}
      />
    </>
  );
}