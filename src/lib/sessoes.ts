// src/lib/sessoes.ts
import { supabase } from "@/lib/supabase";
import { fail } from "@/lib/estudos";
import type {
  ConteudoOpcao,
  DisciplinaOpcao,
  PreparacaoOpcao,
  SessaoCompleta,
  SessaoInput,
} from "@/types/sessoes";

/** "Analista de TI (IFPI)" */
export function rotuloPreparacao(p: { cargo: string | null; instituicao: string | null }): string {
  const cargo = p.cargo ?? "Sem cargo";
  return p.instituicao ? `${cargo} (${p.instituicao})` : cargo;
}

/* ---------- Listagens ---------- */

export async function listSessoes(): Promise<SessaoCompleta[]> {
  const { data, error } = await supabase
    .from("sessao")
    .select(
      "*, disciplina(nome), conteudo(nome), preparacao(cargo, instituicao), sessao_topico(topico(id, topico))",
    )
    .order("created_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []) as SessaoCompleta[];
}

export async function listDisciplinaOpcoes(): Promise<DisciplinaOpcao[]> {
  const { data, error } = await supabase
    .from("disciplina")
    .select("id, nome")
    .order("nome", { ascending: true });
  if (error) fail(error);
  return (data ?? []) as DisciplinaOpcao[];
}

export async function listPreparacaoOpcoes(): Promise<PreparacaoOpcao[]> {
  const { data, error } = await supabase
    .from("preparacao")
    .select("id, cargo, instituicao, banca_organizadora")
    .order("created_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []) as PreparacaoOpcao[];
}

export async function listConteudoOpcoes(): Promise<ConteudoOpcao[]> {
  const { data, error } = await supabase
    .from("conteudo")
    .select("id, nome, disciplina_id, topico(id, topico)")
    .order("nome", { ascending: true })
    .order("created_at", { referencedTable: "topico", ascending: true });
  if (error) fail(error);
  return (data ?? []) as ConteudoOpcao[];
}

/* ---------- Sessões ---------- */

export async function createSessao(input: SessaoInput) {
  const { data, error } = await supabase
    .from("sessao")
    .insert({
      preparacao_id: input.preparacaoId,
      disciplina_id: input.disciplinaId,
      conteudo_id: input.conteudoId,
      tempo: input.tempo,
    })
    .select("id")
    .single();
  if (error) fail(error);

  const sessaoId = (data as { id: string }).id;
  const topicoIds = input.conteudoId ? input.topicoIds : [];

  if (topicoIds.length > 0) {
    const { error: topicosError } = await supabase
      .from("sessao_topico")
      .insert(topicoIds.map((topicoId) => ({ sessao_id: sessaoId, topico_id: topicoId })));

    if (topicosError) {
      // desfaz a sessão para não ficar uma sessão sem os tópicos escolhidos
      await supabase.from("sessao").delete().eq("id", sessaoId);
      fail(topicosError);
    }
  }
}

/** topicosAtuais: ids dos tópicos já vinculados à sessão antes da edição. */
export async function updateSessao(id: string, input: SessaoInput, topicosAtuais: string[]) {
  const { error } = await supabase
    .from("sessao")
    .update({
      preparacao_id: input.preparacaoId,
      disciplina_id: input.disciplinaId,
      conteudo_id: input.conteudoId,
      tempo: input.tempo,
    })
    .eq("id", id);
  if (error) fail(error);

  const desejados = new Set(input.conteudoId ? input.topicoIds : []);
  const atuais = new Set(topicosAtuais);

  const remover = topicosAtuais.filter((topicoId) => !desejados.has(topicoId));
  const adicionar = [...desejados].filter((topicoId) => !atuais.has(topicoId));

  if (remover.length > 0) {
    const { error: removeError } = await supabase
      .from("sessao_topico")
      .delete()
      .eq("sessao_id", id)
      .in("topico_id", remover);
    if (removeError) fail(removeError);
  }

  if (adicionar.length > 0) {
    const { error: addError } = await supabase
      .from("sessao_topico")
      .insert(adicionar.map((topicoId) => ({ sessao_id: id, topico_id: topicoId })));
    if (addError) fail(addError);
  }
}

export async function deleteSessao(id: string) {
  const { error } = await supabase.from("sessao").delete().eq("id", id);
  if (error) fail(error);
}