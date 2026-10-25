// src/lib/estudos.ts
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { ImportMateria } from "@/lib/importacao";
import type {
  ConteudoComTopicos,
  Disciplina,
  DisciplinaComContagem,
} from "@/types/estudos";

export function fail(error: PostgrestError): never {
  if (error.code === "23503") {
    throw new Error("Este item possui dados vinculados e não pôde ser excluído.");
  }
  if (error.code === "42501") {
    throw new Error(
      "Sem permissão para essa ação. Verifique as políticas de segurança (RLS) no Supabase.",
    );
  }
  throw new Error("Não foi possível concluir a ação. Tente novamente.");
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Algo deu errado. Tente novamente.";
}

const orNull = (value: string) => (value.trim() ? value.trim() : null);

/* ---------- Disciplinas ---------- */

export async function listDisciplinas(): Promise<DisciplinaComContagem[]> {
  const { data, error } = await supabase
    .from("disciplina")
    .select("*, conteudo(count)")
    .order("nome", { ascending: true });
  if (error) fail(error);
  return (data ?? []) as DisciplinaComContagem[];
}

export async function getDisciplina(id: string): Promise<Disciplina | null> {
  const { data, error } = await supabase
    .from("disciplina")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error);
  return data as Disciplina | null;
}

export async function createDisciplina(nome: string) {
  const { error } = await supabase.from("disciplina").insert({ nome });
  if (error) fail(error);
}

export async function updateDisciplina(id: string, nome: string) {
  const { error } = await supabase.from("disciplina").update({ nome }).eq("id", id);
  if (error) fail(error);
}

export async function deleteDisciplina(id: string) {
  const { error } = await supabase.from("disciplina").delete().eq("id", id);
  if (error) fail(error);
}

/* ---------- Conteúdos ---------- */

export async function listConteudos(disciplinaId: string): Promise<ConteudoComTopicos[]> {
  const { data, error } = await supabase
    .from("conteudo")
    .select("*, topico(*)")
    .eq("disciplina_id", disciplinaId)
    .order("created_at", { ascending: true })
    .order("created_at", { referencedTable: "topico", ascending: true });
  if (error) fail(error);
  return (data ?? []) as ConteudoComTopicos[];
}

export async function createConteudo(disciplinaId: string, nome: string, obs: string) {
  const { error } = await supabase
    .from("conteudo")
    .insert({ disciplina_id: disciplinaId, nome, obs: orNull(obs) });
  if (error) fail(error);
}

export async function updateConteudo(id: string, nome: string, obs: string) {
  const { error } = await supabase
    .from("conteudo")
    .update({ nome, obs: orNull(obs) })
    .eq("id", id);
  if (error) fail(error);
}

export async function deleteConteudo(id: string) {
  const { error } = await supabase.from("conteudo").delete().eq("id", id);
  if (error) fail(error);
}

/* ---------- Tópicos ---------- */

export async function createTopico(conteudoId: string, topico: string, obs: string) {
  const { error } = await supabase
    .from("topico")
    .insert({ conteudo_id: conteudoId, topico, obs: orNull(obs) });
  if (error) fail(error);
}

export async function updateTopico(id: string, topico: string, obs: string) {
  const { error } = await supabase
    .from("topico")
    .update({ topico, obs: orNull(obs) })
    .eq("id", id);
  if (error) fail(error);
}

export async function deleteTopico(id: string) {
  const { error } = await supabase.from("topico").delete().eq("id", id);
  if (error) fail(error);
}

/* ---------- Importação em lote ---------- */

function chunk<T>(items: T[], size: number): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size));
  return parts;
}

/**
 * Cria matérias, conteúdos e tópicos de uma vez. Os ids são gerados aqui para
 * ligar os registros entre si sem depender da ordem do retorno do banco.
 * Se alguma etapa falhar, as matérias já criadas são removidas (rollback manual).
 */
export async function importEstrutura(estrutura: ImportMateria[]) {
  const disciplinaRows: { id: string; nome: string }[] = [];
  const conteudoRows: { id: string; disciplina_id: string; nome: string; obs: string | null }[] = [];
  const topicoRows: { conteudo_id: string; topico: string; obs: string | null }[] = [];

  for (const materia of estrutura) {
    const disciplinaId = crypto.randomUUID();
    disciplinaRows.push({ id: disciplinaId, nome: materia.materia });

    for (const conteudo of materia.conteudo) {
      const conteudoId = crypto.randomUUID();
      conteudoRows.push({
        id: conteudoId,
        disciplina_id: disciplinaId,
        nome: conteudo.conteudo,
        obs: conteudo.obs,
      });

      for (const topico of conteudo.topicos) {
        topicoRows.push({ conteudo_id: conteudoId, topico: topico.topico, obs: topico.obs });
      }
    }
  }

  try {
    for (const part of chunk(disciplinaRows, 200)) {
      const { error } = await supabase.from("disciplina").insert(part);
      if (error) fail(error);
    }
    for (const part of chunk(conteudoRows, 200)) {
      const { error } = await supabase.from("conteudo").insert(part);
      if (error) fail(error);
    }
    for (const part of chunk(topicoRows, 500)) {
      const { error } = await supabase.from("topico").insert(part);
      if (error) fail(error);
    }
  } catch (err) {
    for (const part of chunk(disciplinaRows, 50)) {
      await supabase.from("disciplina").delete().in("id", part.map((row) => row.id));
    }
    throw err;
  }
}