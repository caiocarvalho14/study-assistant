// src/lib/flashcards.ts
import { supabase } from "@/lib/supabase";
import { fail } from "@/lib/estudos";
import type { ConteudoBasico, Flashcard } from "@/types/flashcards";

export async function listConteudosBasicos(): Promise<ConteudoBasico[]> {
  const { data, error } = await supabase
    .from("conteudo")
    .select("id, nome, disciplina_id")
    .order("nome", { ascending: true });
  if (error) fail(error);
  return (data ?? []) as ConteudoBasico[];
}

export async function listFlashcards(conteudoId: string): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from("flashcard")
    .select("*")
    .eq("conteudo_id", conteudoId)
    .order("created_at", { ascending: true });
  if (error) fail(error);
  return (data ?? []) as Flashcard[];
}

export async function createFlashcard(conteudoId: string, pergunta: string, resposta: string) {
  const { error } = await supabase
    .from("flashcard")
    .insert({ conteudo_id: conteudoId, pergunta, resposta, quantidade_respondida: 0 });
  if (error) fail(error);
}

export async function updateFlashcard(id: string, pergunta: string, resposta: string) {
  const { error } = await supabase.from("flashcard").update({ pergunta, resposta }).eq("id", id);
  if (error) fail(error);
}

export async function deleteFlashcard(id: string) {
  const { error } = await supabase.from("flashcard").delete().eq("id", id);
  if (error) fail(error);
}

/** Soma 1 em quantidade_respondida de cada cartão que foi virado no estudo. */
export async function registrarRespostas(cards: Flashcard[]) {
  const results = await Promise.all(
    cards.map((card) =>
      supabase
        .from("flashcard")
        .update({ quantidade_respondida: Math.min(32767, (card.quantidade_respondida ?? 0) + 1) })
        .eq("id", card.id),
    ),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) fail(failed.error);
}