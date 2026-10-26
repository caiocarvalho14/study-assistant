// src/app/flashcards/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Layers, Pencil, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Alert } from "@/components/Alert";
import { ConfirmModal } from "@/components/modal/Confirmmodal";
import { Disclosure } from "@/components/Disclosure";
import { FlashcardModal } from "@/components/FlashCardModal";
import { FlashcardStudy } from "@/components/FlashCardStudy";
import { GeracaoPanel } from "@/components/GeracaoPanel";
import { errorMessage } from "@/lib/estudos";
import {
  createFlashcard,
  deleteFlashcard,
  listConteudosBasicos,
  listFlashcards,
  registrarRespostas,
  updateFlashcard,
} from "@/lib/flashcards";
import {
  dispensarGeracao,
  getServerSnapshot,
  getSnapshot,
  iniciarGeracao,
  subscribe,
} from "@/lib/geracao-flashcards";
import { listDisciplinaOpcoes } from "@/lib/sessoes";
import { btnPrimary, btnSecondary, iconBtn, iconBtnDanger, inputClass } from "@/lib/ui";
import type { ConteudoBasico, Flashcard } from "@/types/flashcards";
import type { DisciplinaOpcao } from "@/types/sessoes";

type ModalState =
  | { kind: "form"; card?: Flashcard }
  | { kind: "delete"; card: Flashcard }
  | null;

export default function FlashcardsPage() {
  return (
    <AppShell>
      <FlashcardsContent />
    </AppShell>
  );
}

function FlashcardsContent() {
  const [disciplinas, setDisciplinas] = useState<DisciplinaOpcao[]>([]);
  const [conteudos, setConteudos] = useState<ConteudoBasico[]>([]);
  const [materiaId, setMateriaId] = useState("");
  const [conteudoId, setConteudoId] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [deck, setDeck] = useState<Flashcard[] | null>(null);

  const conteudoRef = useRef("");
  const pedido = useRef(0);

  const geracoes = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const concluidas = geracoes.filter((g) => g.status === "concluido").length;
  const gerandoEste = geracoes.some((g) => g.conteudoId === conteudoId && g.status === "gerando");

  const closeModal = useCallback(() => setModal(null), []);

  const loadCards = useCallback(async (id: string) => {
    const numero = ++pedido.current;
    setLoadingCards(true);
    try {
      const lista = await listFlashcards(id);
      if (numero === pedido.current) setCards(lista);
    } catch (err) {
      if (numero === pedido.current) setError(errorMessage(err));
    } finally {
      if (numero === pedido.current) setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    async function loadBase() {
      try {
        const [listaDisciplinas, listaConteudos] = await Promise.all([
          listDisciplinaOpcoes(),
          listConteudosBasicos(),
        ]);
        setDisciplinas(listaDisciplinas);
        setConteudos(listaConteudos);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoadingBase(false);
      }
    }
    loadBase();
  }, []);

  // Quando uma geração termina, atualiza a lista do conteúdo que está aberto.
  useEffect(() => {
    if (concluidas > 0 && conteudoRef.current) loadCards(conteudoRef.current);
  }, [concluidas, loadCards]);

  const conteudosDaMateria = conteudos.filter((c) => c.disciplina_id === materiaId);
  const materia = disciplinas.find((d) => d.id === materiaId);
  const conteudo = conteudos.find((c) => c.id === conteudoId);

  const formModal = modal?.kind === "form" ? modal : null;
  const deleteTarget = modal?.kind === "delete" ? modal.card : null;

  function handleMateria(value: string) {
    setMateriaId(value);
    setConteudoId("");
    conteudoRef.current = "";
    pedido.current++;
    setCards([]);
    setLoadingCards(false);
    setNotice(null);
  }

  function handleConteudo(value: string) {
    setConteudoId(value);
    conteudoRef.current = value;
    setNotice(null);
    setError(null);

    if (value) {
      loadCards(value);
    } else {
      pedido.current++;
      setCards([]);
      setLoadingCards(false);
    }
  }

  function gerarComIA() {
    if (!materia?.nome || !conteudo?.nome) return;
    setNotice(null);
    iniciarGeracao({ materia: materia.nome, conteudo: conteudo.nome, conteudoId });
  }

  async function handleSave({ pergunta, resposta }: { pergunta: string; resposta: string }) {
    if (formModal?.card) {
      await updateFlashcard(formModal.card.id, pergunta, resposta);
    } else {
      await createFlashcard(conteudoId, pergunta, resposta);
    }
    await loadCards(conteudoId);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteFlashcard(deleteTarget.id);
    await loadCards(conteudoId);
  }

  function iniciarEstudo() {
    if (cards.length === 0) return;
    setNotice(null);
    setDeck(cards);
  }

  async function concluirEstudo(idsViradas: string[]) {
    const respondidos = (deck ?? []).filter((card) => idsViradas.includes(card.id));
    if (respondidos.length > 0) await registrarRespostas(respondidos);

    setDeck(null);
    setNotice(
      respondidos.length > 0
        ? `Estudo concluído: ${respondidos.length === 1 ? "1 flashcard registrado" : `${respondidos.length} flashcards registrados`} como respondido${respondidos.length === 1 ? "" : "s"}.`
        : "Estudo concluído. Nenhum cartão foi virado, então nada foi registrado.",
    );
    await loadCards(conteudoRef.current);
  }

  if (deck && deck.length > 0) {
    return (
      <FlashcardStudy
        cards={deck}
        materia={materia?.nome ?? ""}
        conteudo={conteudo?.nome ?? ""}
        onConcluir={concluirEstudo}
        onSair={() => setDeck(null)}
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Flashcards</h1>
          <p className="mt-1 text-sm text-gray-500">
            Escolha a matéria e o conteúdo para revisar suas perguntas e respostas.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={gerarComIA}
            disabled={!conteudoId || gerandoEste}
            title={!conteudoId ? "Selecione uma matéria e um conteúdo" : undefined}
            className={btnSecondary}
          >
            <Sparkles className="size-4" />
            Gerar flashcards com IA
          </button>
          <button
            onClick={() => setModal({ kind: "form" })}
            disabled={!conteudoId}
            title={!conteudoId ? "Selecione uma matéria e um conteúdo" : undefined}
            className={btnPrimary}
          >
            <Plus className="size-4" />
            Novo flashcard
          </button>
        </div>
      </div>

      <GeracaoPanel geracoes={geracoes} onDispensar={dispensarGeracao} />

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

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="filtro-materia" className="mb-1.5 block text-sm font-medium text-gray-700">
              Matéria
            </label>
            <select
              id="filtro-materia"
              value={materiaId}
              onChange={(e) => handleMateria(e.target.value)}
              disabled={loadingBase}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">{loadingBase ? "Carregando…" : "Selecione…"}</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome ?? "Sem nome"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtro-conteudo" className="mb-1.5 block text-sm font-medium text-gray-700">
              Conteúdo
            </label>
            <select
              id="filtro-conteudo"
              value={conteudoId}
              onChange={(e) => handleConteudo(e.target.value)}
              disabled={!materiaId}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">
                {!materiaId
                  ? "Escolha a matéria primeiro"
                  : conteudosDaMateria.length === 0
                    ? "Esta matéria não tem conteúdos"
                    : "Selecione…"}
              </option>
              {conteudosDaMateria.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome ?? "Sem nome"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {!conteudoId ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Layers className="size-6" />
          </span>
          <h2 className="mt-4 font-semibold text-gray-900">Selecione uma matéria e um conteúdo</h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Os flashcards aparecem aqui. Você também pode gerar novos com IA para o conteúdo escolhido.
          </p>
        </div>
      ) : loadingCards ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => (
            <li key={i} className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white" />
          ))}
        </ul>
      ) : cards.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Layers className="size-6" />
          </span>
          <h2 className="mt-4 font-semibold text-gray-900">Nenhum flashcard neste conteúdo</h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Gere um conjunto com IA ou crie o primeiro manualmente.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              {cards.length === 1 ? "1 flashcard" : `${cards.length} flashcards`}
            </p>
            <button onClick={iniciarEstudo} className={btnPrimary}>
              <Play className="size-4" />
              Iniciar estudo
            </button>
          </div>

          <ul className="mt-4 grid items-start gap-4 sm:grid-cols-2">
            {cards.map((card) => {
              const vezes = card.quantidade_respondida ?? 0;

              return (
                <li
                  key={card.id}
                  className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                      Pergunta
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setModal({ kind: "form", card })}
                        aria-label="Editar flashcard"
                        title="Editar"
                        className={iconBtn}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setModal({ kind: "delete", card })}
                        aria-label="Excluir flashcard"
                        title="Excluir"
                        className={iconBtnDanger}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-gray-900">
                    {card.pergunta}
                  </p>

                  <div className="-mx-3 mt-3 border-t border-gray-100 pt-2">
                    <Disclosure title="Resposta">
                      <p className="whitespace-pre-line pb-2 pl-9 pr-3 text-sm leading-relaxed text-gray-600">
                        {card.resposta}
                      </p>
                    </Disclosure>
                  </div>

                  <p className="mt-3 text-xs text-gray-400">
                    {vezes === 0
                      ? "Ainda não respondido"
                      : vezes === 1
                        ? "Respondido 1 vez"
                        : `Respondido ${vezes} vezes`}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <FlashcardModal
        open={formModal !== null}
        onClose={closeModal}
        title={formModal?.card ? "Editar flashcard" : "Novo flashcard"}
        description={
          formModal?.card ? undefined : conteudo ? `Para o conteúdo ${conteudo.nome}.` : undefined
        }
        initialPergunta={formModal?.card?.pergunta ?? ""}
        initialResposta={formModal?.card?.resposta ?? ""}
        submitLabel={formModal?.card ? "Salvar" : "Criar flashcard"}
        onSubmit={handleSave}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={closeModal}
        title="Excluir flashcard"
        message={
          <>
            Tem certeza que deseja excluir este flashcard? Essa ação não pode ser desfeita.
          </>
        }
        onConfirm={handleDelete}
      />
    </>
  );
}