// src/lib/preparacoes.ts
import { supabase } from "@/lib/supabase";
import { fail } from "@/lib/estudos";
import type {
  Avaliacao,
  BlocoComDisciplina,
  Preparacao,
  PreparacaoComAvaliacoes,
} from "@/types/estudos";

const orNull = (value: string) => (value.trim() ? value.trim() : null);

export type PreparacaoInput = { banca: string; cargo: string; url: string, instituicao: string };

/* ---------- Preparações ---------- */

export async function listPreparacoes(): Promise<PreparacaoComAvaliacoes[]> {
  const { data, error } = await supabase
    .from("preparacao")
    .select("*, avaliacao(id, data_prova)")
    .order("created_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []) as PreparacaoComAvaliacoes[];
}

export async function getPreparacao(id: string): Promise<Preparacao | null> {
  const { data, error } = await supabase
    .from("preparacao")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error);
  return data as Preparacao | null;
}

export async function createPreparacao(input: PreparacaoInput): Promise<string> {
  const { data, error } = await supabase
    .from("preparacao")
    .insert({
      banca_organizadora: input.banca,
      cargo: input.cargo,
      url_do_edital: orNull(input.url),
      istituicao:input.instituicao
    })
    .select("id")
    .single();
  if (error) fail(error);
  return (data as { id: string }).id;
}

export async function updatePreparacao(id: string, input: PreparacaoInput) {
  const { error } = await supabase
    .from("preparacao")
    .update({
      banca_organizadora: input.banca,
      cargo: input.cargo,
      url_do_edital: orNull(input.url),
    })
    .eq("id", id);
  if (error) fail(error);
}

export async function deletePreparacao(id: string) {
  const { error } = await supabase.from("preparacao").delete().eq("id", id);
  if (error) fail(error);
}

/* ---------- Avaliações (provas) ---------- */

export async function listAvaliacoes(preparacaoId: string): Promise<Avaliacao[]> {
  const { data, error } = await supabase
    .from("avaliacao")
    .select("*")
    .eq("preparacao_id", preparacaoId)
    .order("data_prova", { ascending: true, nullsFirst: false });
  if (error) fail(error);
  return (data ?? []) as Avaliacao[];
}

export async function createAvaliacao(preparacaoId: string, dataProva: string, url: string) {
  const { error } = await supabase
    .from("avaliacao")
    .insert({ preparacao_id: preparacaoId, data_prova: dataProva, url_avaliacao: orNull(url) });
  if (error) fail(error);
}

export async function updateAvaliacao(id: string, dataProva: string, url: string) {
  const { error } = await supabase
    .from("avaliacao")
    .update({ data_prova: dataProva, url_avaliacao: orNull(url) })
    .eq("id", id);
  if (error) fail(error);
}

export async function deleteAvaliacao(id: string) {
  const { error } = await supabase.from("avaliacao").delete().eq("id", id);
  if (error) fail(error);
}

/* ---------- Blocos de questões ---------- */

export async function listBlocos(avaliacaoIds: string[]): Promise<BlocoComDisciplina[]> {
  if (avaliacaoIds.length === 0) return [];

  const { data, error } = await supabase
    .from("avaliacao_questoes")
    .select("*, disciplina(nome)")
    .in("avaliacao_id", avaliacaoIds)
    .order("created_at", { ascending: true });
  if (error) fail(error);
  return (data ?? []) as BlocoComDisciplina[];
}

export async function createBloco(
  avaliacaoId: string,
  disciplinaId: string,
  total: number,
  acertos: number,
) {
  const { error } = await supabase.from("avaliacao_questoes").insert({
    avaliacao_id: avaliacaoId,
    disciplina_id: disciplinaId,
    questoes_total: total,
    questoes_acertadas: acertos,
  });
  if (error) fail(error);
}

export async function updateBloco(
  id: string,
  disciplinaId: string,
  total: number,
  acertos: number,
) {
  const { error } = await supabase
    .from("avaliacao_questoes")
    .update({
      disciplina_id: disciplinaId,
      questoes_total: total,
      questoes_acertadas: acertos,
    })
    .eq("id", id);
  if (error) fail(error);
}

export async function deleteBloco(id: string) {
  const { error } = await supabase.from("avaliacao_questoes").delete().eq("id", id);
  if (error) fail(error);
}