// src/app/preparacoes/[id]/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Alert } from "@/components/Alert";
import { ConfirmModal } from "@/components/modal/Confirmmodal";
import { FieldsModal } from "@/components/FiledsModal";
import { ProgressBar } from "@/components/ProgressBar";
import {
  CalendarIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import { avaliacaoFields, blocoFields, preparacaoFields } from "@/lib/campos";
import {
  diasAte,
  formatarData,
  formatarDataLonga,
  partesCalendario,
  rotuloCurto,
} from "@/lib/datas";
import { agruparPorMateria, percentual, somar } from "@/lib/desempenho";
import { errorMessage, listDisciplinas } from "@/lib/estudos";
import {
  createAvaliacao,
  createBloco,
  deleteAvaliacao,
  deleteBloco,
  getPreparacao,
  listAvaliacoes,
  listBlocos,
  updateAvaliacao,
  updateBloco,
  updatePreparacao,
} from "@/lib/preparacoes";
import { btnPrimary, btnSecondary, iconBtn, iconBtnDanger } from "@/lib/ui";
import { normalizeUrl } from "@/lib/url";
import type {
  Avaliacao,
  BlocoComDisciplina,
  DisciplinaComContagem,
  Preparacao,
} from "@/types/estudos";

type ModalState =
  | { kind: "preparacao-form" }
  | { kind: "avaliacao-form"; avaliacao?: Avaliacao }
  | { kind: "avaliacao-delete"; avaliacao: Avaliacao }
  | { kind: "bloco-form"; avaliacao: Avaliacao; bloco?: BlocoComDisciplina }
  | { kind: "bloco-delete"; bloco: BlocoComDisciplina }
  | null;

export default function PreparacaoPage() {
  return (
    <AppShell>
      <PreparacaoContent />
    </AppShell>
  );
}

function PreparacaoContent() {
  const { id } = useParams<{ id: string }>();

  const [preparacao, setPreparacao] = useState<Preparacao | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [blocos, setBlocos] = useState<BlocoComDisciplina[]>([]);
  const [disciplinas, setDisciplinas] = useState<DisciplinaComContagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const closeModal = useCallback(() => setModal(null), []);

  const load = useCallback(async () => {
    try {
      const found = await getPreparacao(id);
      if (!found) {
        setNotFound(true);
        return;
      }
      setPreparacao(found);

      const [provas, materias] = await Promise.all([listAvaliacoes(id), listDisciplinas()]);
      setAvaliacoes(provas);
      setDisciplinas(materias);
      setBlocos(await listBlocos(provas.map((prova) => prova.id)));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const desempenho = useMemo(() => agruparPorMateria(blocos), [blocos]);
  const geral = useMemo(() => somar(blocos), [blocos]);
  const blocoFieldList = useMemo(
    () => blocoFields(disciplinas.map((d) => ({ id: d.id, nome: d.nome }))),
    [disciplinas],
  );

  const avaliacaoForm = modal?.kind === "avaliacao-form" ? modal : null;
  const avaliacaoDelete = modal?.kind === "avaliacao-delete" ? modal.avaliacao : null;
  const blocoForm = modal?.kind === "bloco-form" ? modal : null;
  const blocoDelete = modal?.kind === "bloco-delete" ? modal.bloco : null;

  async function savePreparacao(values: Record<string, string>) {
    await updatePreparacao(id, {
      cargo: values.cargo,
      banca: values.banca,
      url: normalizeUrl(values.url) ?? "",
      instituicao: values.instituicao
    });
    await load();
  }

  async function saveAvaliacao(values: Record<string, string>) {
    const url = normalizeUrl(values.url) ?? "";
    if (avaliacaoForm?.avaliacao) {
      await updateAvaliacao(avaliacaoForm.avaliacao.id, values.data, url);
    } else {
      await createAvaliacao(id, values.data, url);
    }
    await load();
  }

  async function removeAvaliacao() {
    if (!avaliacaoDelete) return;
    await deleteAvaliacao(avaliacaoDelete.id);
    await load();
  }

  async function saveBloco(values: Record<string, string>) {
    if (!blocoForm) return;
    const total = Number(values.total);
    const acertos = Number(values.acertos);

    if (blocoForm.bloco) {
      await updateBloco(blocoForm.bloco.id, values.disciplina, total, acertos);
    } else {
      await createBloco(blocoForm.avaliacao.id, values.disciplina, total, acertos);
    }
    await load();
  }

  async function removeBloco() {
    if (!blocoDelete) return;
    await deleteBloco(blocoDelete.id);
    await load();
  }

  if (loading) {
    return (
      <div aria-busy="true" className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-72 animate-pulse rounded bg-gray-200" />
        <div className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white" />
      </div>
    );
  }

  if (notFound || !preparacao) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Preparação não encontrada</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ela pode ter sido excluída ou você não tem acesso a ela.
        </p>
        <Link href="/preparacoes" className={`${btnSecondary} mt-6`}>
          Voltar para preparações
        </Link>
      </div>
    );
  }

  return (
    <>
      <nav aria-label="Navegação" className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/preparacoes" className="transition hover:text-gray-900">
          Preparações
        </Link>
        <ChevronRightIcon className="size-4 text-gray-400" />
        <span aria-current="page" className="truncate font-medium text-gray-900">
          {preparacao.cargo}
        </span>
      </nav>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">
        {preparacao.cargo}
      </h1>
      <p className="mt-1 text-sm text-gray-500">{preparacao.banca_organizadora}</p>

      {error && (
        <div className="mt-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Detalhes</h2>
          <button onClick={() => setModal({ kind: "preparacao-form" })} className={btnSecondary}>
            <PencilIcon className="size-4" />
            Editar
          </button>
        </header>

        <dl className="grid gap-5 px-5 py-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Instituição / Banca organizadora
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {preparacao.instituicao ?? "Instituição não informada"} / {preparacao.banca_organizadora ?? "Banca não informada"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Cargo</dt>
            <dd className="mt-1 text-sm text-gray-900">{preparacao.cargo ?? "Não informado"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Edital</dt>
            <dd className="mt-1 text-sm">
              {preparacao.url_do_edital ? (
                <a
                  href={preparacao.url_do_edital}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                >
                  Abrir edital
                  <ExternalLinkIcon className="size-3.5" />
                </a>
              ) : (
                <span className="text-gray-900">Não informado</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">Provas</h2>
            <p className="text-sm text-gray-500">
              Datas das provas e o resultado de cada bloco de questões.
            </p>
          </div>
          <button onClick={() => setModal({ kind: "avaliacao-form" })} className={btnPrimary} disabled={avaliacoes.length>=1}>
            <PlusIcon className="size-4" />
            Adicionar prova
          </button>
        </header>

        {avaliacoes.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarIcon className="size-6" />
            </span>
            <h3 className="mt-4 font-semibold text-gray-900">Nenhuma prova cadastrada</h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Adicione a data da prova para acompanhar a contagem regressiva e lançar os blocos de
              questões.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {avaliacoes.map((avaliacao) => {
              const iso = avaliacao.data_prova;
              const dias = iso ? diasAte(iso) : null;
              const passada = dias !== null && dias < 0;
              const calendario = iso ? partesCalendario(iso) : null;

              const blocosDaProva = blocos.filter((b) => b.avaliacao_id === avaliacao.id);
              const totalProva = somar(blocosDaProva);

              return (
                <li key={avaliacao.id} className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex size-12 shrink-0 flex-col items-center justify-center rounded-xl ${
                        passada ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase leading-none">
                        {calendario?.mes ?? "-"}
                      </span>
                      <span className="text-lg font-semibold leading-tight">
                        {calendario?.dia ?? "-"}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 first-letter:uppercase">
                        {iso ? formatarDataLonga(iso) : "Data não informada"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {dias !== null && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              passada ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {rotuloCurto(dias)}
                          </span>
                        )}
                        {avaliacao.url_avaliacao && (
                          <a
                            href={avaliacao.url_avaliacao}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                          >
                            Ver prova
                            <ExternalLinkIcon className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setModal({ kind: "avaliacao-form", avaliacao })}
                        aria-label="Editar prova"
                        title="Editar"
                        className={iconBtn}
                      >
                        <PencilIcon className="size-4" />
                      </button>
                      <button
                        onClick={() => setModal({ kind: "avaliacao-delete", avaliacao })}
                        aria-label="Excluir prova"
                        title="Excluir"
                        className={iconBtnDanger}
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-gray-50 p-3 sm:ml-16">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-700">Blocos de questões</h3>
                        {blocosDaProva.length > 0 && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-gray-600 ring-1 ring-gray-200">
                            {totalProva.acertos}/{totalProva.total} (
                            {percentual(totalProva.acertos, totalProva.total)}%)
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setModal({ kind: "bloco-form", avaliacao })}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-100/60"
                      >
                        <PlusIcon className="size-4" />
                        Adicionar bloco
                      </button>
                    </div>

                    {blocosDaProva.length === 0 ? (
                      <p className="px-1 pb-1 pt-2 text-sm text-gray-500">
                        Nenhum bloco lançado. Registre o resultado por matéria, por exemplo
                        Português, 20 de 30.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {blocosDaProva.map((bloco) => {
                          const acertos = bloco.questoes_acertadas ?? 0;
                          const total = bloco.questoes_total ?? 0;
                          const pct = percentual(acertos, total);
                          const nome = bloco.disciplina?.nome ?? "Sem matéria";

                          return (
                            <li
                              key={bloco.id}
                              className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                                  {nome}
                                </p>
                                <p className="text-sm tabular-nums">
                                  <span className="font-semibold text-gray-900">{acertos}</span>
                                  <span className="text-gray-400">/{total}</span>
                                </p>
                                <span className="w-10 text-right text-xs font-medium tabular-nums text-blue-700">
                                  {pct}%
                                </span>
                                <div className="flex gap-0.5">
                                  <button
                                    onClick={() =>
                                      setModal({ kind: "bloco-form", avaliacao, bloco })
                                    }
                                    aria-label={`Editar bloco de ${nome}`}
                                    title="Editar"
                                    className={iconBtn}
                                  >
                                    <PencilIcon className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => setModal({ kind: "bloco-delete", bloco })}
                                    aria-label={`Excluir bloco de ${nome}`}
                                    title="Excluir"
                                    className={iconBtnDanger}
                                  >
                                    <TrashIcon className="size-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2">
                                <ProgressBar value={pct} label={`Aproveitamento em ${nome}`} />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {blocos.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-gray-900">Desempenho por matéria</h2>
              <p className="text-sm text-gray-500">
                Acertos e questões somados em todas as provas desta preparação.
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xl font-semibold tabular-nums text-gray-900">
                {percentual(geral.acertos, geral.total)}%
              </p>
              <p className="text-xs tabular-nums text-gray-500">
                {geral.acertos}/{geral.total} no geral
              </p>
            </div>
          </header>

          <ul className="divide-y divide-gray-100">
            {desempenho.map((materia) => {
              const pct = percentual(materia.acertos, materia.total);

              return (
                <li key={materia.disciplinaId ?? "sem-materia"} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{materia.nome}</p>
                      <p className="text-xs text-gray-500">
                        {materia.blocos === 1 ? "1 bloco" : `${materia.blocos} blocos`}
                      </p>
                    </div>
                    <p className="text-sm tabular-nums">
                      <span className="font-semibold text-gray-900">{materia.acertos}</span>
                      <span className="text-gray-400">/{materia.total}</span>
                    </p>
                    <span className="w-10 text-right text-sm font-semibold tabular-nums text-blue-700">
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={pct} label={`Aproveitamento geral em ${materia.nome}`} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <FieldsModal
        open={modal?.kind === "preparacao-form"}
        onClose={closeModal}
        title="Editar preparação"
        fields={preparacaoFields}
        initialValues={{
          cargo: preparacao.cargo ?? "",
          banca: preparacao.banca_organizadora ?? "",
          url: preparacao.url_do_edital ?? "",
          instituicao: preparacao.instituicao??""
        }}
        submitLabel="Salvar"
        onSubmit={savePreparacao}
      />

      <FieldsModal
        open={avaliacaoForm !== null}
        onClose={closeModal}
        title={avaliacaoForm?.avaliacao ? "Editar prova" : "Adicionar prova"}
        description={avaliacaoForm?.avaliacao ? undefined : "Informe a data em que a prova será aplicada."}
        fields={avaliacaoFields}
        initialValues={{
          data: avaliacaoForm?.avaliacao?.data_prova ?? "",
          url: avaliacaoForm?.avaliacao?.url_avaliacao ?? "",
        }}
        submitLabel={avaliacaoForm?.avaliacao ? "Salvar" : "Adicionar prova"}
        onSubmit={saveAvaliacao}
      />

      <FieldsModal
        open={blocoForm !== null}
        onClose={closeModal}
        title={blocoForm?.bloco ? "Editar bloco de questões" : "Novo bloco de questões"}
        description={
          disciplinas.length === 0
            ? "Você ainda não tem matérias. Cadastre uma em Matérias antes de lançar um bloco."
            : blocoForm?.avaliacao.data_prova
              ? `Resultado de uma matéria na prova de ${formatarData(blocoForm.avaliacao.data_prova)}. Ex.: Português, 20 acertos de 30.`
              : "Resultado de uma matéria nesta prova. Ex.: Português, 20 acertos de 30."
        }
        fields={blocoFieldList}
        initialValues={{
          disciplina: blocoForm?.bloco?.disciplina_id ?? "",
          total: String(blocoForm?.bloco?.questoes_total ?? ""),
          acertos: String(blocoForm?.bloco?.questoes_acertadas ?? ""),
        }}
        submitLabel={blocoForm?.bloco ? "Salvar" : "Adicionar bloco"}
        onSubmit={saveBloco}
      />

      <ConfirmModal
        open={avaliacaoDelete !== null}
        onClose={closeModal}
        title="Excluir prova"
        message={
          <>
            Tem certeza que deseja excluir a prova de{" "}
            <strong className="font-medium text-gray-900">
              {avaliacaoDelete?.data_prova ? formatarData(avaliacaoDelete.data_prova) : "data não informada"}
            </strong>
            ? Os blocos de questões dela também serão excluídos. Essa ação não pode ser desfeita.
          </>
        }
        onConfirm={removeAvaliacao}
      />

      <ConfirmModal
        open={blocoDelete !== null}
        onClose={closeModal}
        title="Excluir bloco de questões"
        message={
          <>
            Tem certeza que deseja excluir o bloco de{" "}
            <strong className="font-medium text-gray-900">
              {blocoDelete?.disciplina?.nome ?? "matéria removida"}
            </strong>{" "}
            ({blocoDelete?.questoes_acertadas ?? 0}/{blocoDelete?.questoes_total ?? 0})? Essa ação
            não pode ser desfeita.
          </>
        }
        onConfirm={removeBloco}
      />
    </>
  );
}