// src/lib/geracao-flashcards.ts
//
// A geração roda fora dos componentes React: a requisição continua e os flashcards são
// salvos mesmo que o usuário troque de página, e o status é reexibido ao voltar.
import { supabase } from "@/lib/supabase";

const ENDPOINT = "https://n8n.caiocarv.com/webhook/study-assistant-api?acao=gerar_flashcards";
const TIMEOUT_MS = 5 * 60 * 1000;
const MENSAGEM_ERRO =
  "Não foi possível gerar os flashcards. Os detalhes foram registrados no console do navegador.";

export type GeracaoStatus = "gerando" | "concluido" | "erro";

export type Geracao = {
  id: string;
  materia: string;
  conteudo: string;
  conteudoId: string;
  status: GeracaoStatus;
  /** flashcards novos salvos */
  criados?: number;
  /** flashcards ignorados por já existirem neste conteúdo */
  ignorados?: number;
  erro?: string;
};

const VAZIO: Geracao[] = [];
let geracoes: Geracao[] = VAZIO;
const listeners = new Set<() => void>();

function publicar(proximo: Geracao[]) {
  geracoes = proximo;
  listeners.forEach((listener) => listener());
}

function atualizar(id: string, patch: Partial<Geracao>) {
  publicar(geracoes.map((g) => (g.id === id ? { ...g, ...patch } : g)));
}

/* API para useSyncExternalStore */
export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export const getSnapshot = () => geracoes;
export const getServerSnapshot = () => VAZIO;

export function dispensarGeracao(id: string) {
  publicar(geracoes.filter((g) => g.id !== id));
}

export function iniciarGeracao(dados: { materia: string; conteudo: string; conteudoId: string }) {
  const geracao: Geracao = { id: crypto.randomUUID(), ...dados, status: "gerando" };
  publicar([geracao, ...geracoes]);
  void executar(geracao);
}

/* ---------- internos ---------- */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizar = (texto: string) => texto.trim().toLowerCase().replace(/\s+/g, " ");

function extrairFlashcards(json: unknown): { pergunta: string; resposta: string }[] {
  if (!Array.isArray(json)) {
    throw new Error("A resposta do endpoint não é uma lista de flashcards.");
  }

  const validos: { pergunta: string; resposta: string }[] = [];
  const invalidos: unknown[] = [];

  for (const item of json) {
    if (
      isRecord(item) &&
      typeof item.pergunta === "string" &&
      item.pergunta.trim() &&
      typeof item.resposta === "string" &&
      item.resposta.trim()
    ) {
      validos.push({ pergunta: item.pergunta.trim(), resposta: item.resposta.trim() });
    } else {
      invalidos.push(item);
    }
  }

  if (invalidos.length > 0) {
    console.warn("[flashcards] Itens ignorados por formato inválido:", invalidos);
  }
  if (validos.length === 0) {
    throw new Error("A resposta do endpoint não trouxe nenhum flashcard válido.");
  }
  return validos;
}

async function executar(geracao: Geracao) {
  const body = { materia: geracao.materia, conteudo: geracao.conteudo };
  const inicio = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resposta: Response | null = null;
  let corpo = "";

  try {
    resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    corpo = await resposta.text();

    if (!resposta.ok) {
      throw new Error(`O endpoint respondeu com status ${resposta.status}.`);
    }

    let json: unknown;
    try {
      json = JSON.parse(corpo);
    } catch {
      throw new Error("A resposta do endpoint não é um JSON válido.");
    }

    const gerados = extrairFlashcards(json);

    // Evita duplicar perguntas que já existem neste conteúdo.
    const { data: existentes, error: existentesError } = await supabase
      .from("flashcard")
      .select("pergunta")
      .eq("conteudo_id", geracao.conteudoId);
    if (existentesError) {
      throw new Error(`Erro ao consultar os flashcards existentes: ${existentesError.message}`, {
        cause: existentesError,
      });
    }

    const jaExistem = new Set((existentes ?? []).map((r) => normalizar(r.pergunta ?? "")));
    const novos = gerados.filter((item) => {
      const chave = normalizar(item.pergunta);
      if (jaExistem.has(chave)) return false;
      jaExistem.add(chave);
      return true;
    });

    if (novos.length > 0) {
      const { error } = await supabase.from("flashcard").insert(
        novos.map((item) => ({
          conteudo_id: geracao.conteudoId,
          pergunta: item.pergunta,
          resposta: item.resposta,
          quantidade_respondida: 0,
        })),
      );
      if (error) {
        throw new Error(`Erro ao salvar os flashcards no banco: ${error.message}`, { cause: error });
      }
    }

    atualizar(geracao.id, {
      status: "concluido",
      criados: novos.length,
      ignorados: gerados.length - novos.length,
    });
  } catch (err) {
    const abortou = err instanceof DOMException && err.name === "AbortError";

    console.error("[flashcards] Falha ao gerar flashcards com IA", {
      mensagem: abortou
        ? `Tempo esgotado após ${TIMEOUT_MS / 1000}s sem resposta do endpoint.`
        : err instanceof Error
          ? err.message
          : String(err),
      erro: err,
      causa: err instanceof Error ? err.cause : undefined,
      requisicao: {
        url: ENDPOINT,
        metodo: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      },
      resposta: resposta
        ? {
            status: resposta.status,
            statusText: resposta.statusText,
            ok: resposta.ok,
            url: resposta.url,
            headers: Object.fromEntries(resposta.headers.entries()),
            corpo,
          }
        : null,
      dica:
        err instanceof TypeError
          ? "TypeError costuma indicar falha de rede ou bloqueio de CORS. Confira se o webhook do n8n permite a origem deste site."
          : undefined,
      duracaoMs: Date.now() - inicio,
      quando: new Date().toISOString(),
    });

    atualizar(geracao.id, { status: "erro", erro: MENSAGEM_ERRO });
  } finally {
    clearTimeout(timer);
  }
}