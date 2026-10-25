// src/lib/blocos.ts
import { supabase } from "@/lib/supabase";
import { fail } from "@/lib/estudos";

export type BlocoValues = { disciplinaId: string; total: number; acertos: number };

export type BlocoChanges = {
  creates: BlocoValues[];
  updates: (BlocoValues & { id: string })[];
  deletes: string[];
};

/** Aplica de uma vez as alterações feitas no editor de blocos de uma prova. */
export async function salvarBlocos(avaliacaoId: string, changes: BlocoChanges) {
  if (changes.deletes.length > 0) {
    const { error } = await supabase
      .from("avaliacao_questoes")
      .delete()
      .in("id", changes.deletes);
    if (error) fail(error);
  }

  if (changes.updates.length > 0) {
    const results = await Promise.all(
      changes.updates.map((bloco) =>
        supabase
          .from("avaliacao_questoes")
          .update({
            disciplina_id: bloco.disciplinaId,
            questoes_total: bloco.total,
            questoes_acertadas: bloco.acertos,
          })
          .eq("id", bloco.id),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) fail(failed.error);
  }

  if (changes.creates.length > 0) {
    const { error } = await supabase.from("avaliacao_questoes").insert(
      changes.creates.map((bloco) => ({
        avaliacao_id: avaliacaoId,
        disciplina_id: bloco.disciplinaId,
        questoes_total: bloco.total,
        questoes_acertadas: bloco.acertos,
      })),
    );
    if (error) fail(error);
  }
}