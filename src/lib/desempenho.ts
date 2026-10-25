// src/lib/desempenho.ts
import type { BlocoComDisciplina } from "@/types/estudos";

export type DesempenhoMateria = {
  disciplinaId: string | null;
  nome: string;
  acertos: number;
  total: number;
  blocos: number;
};

export function percentual(acertos: number, total: number): number {
  return total > 0 ? Math.round((acertos / total) * 100) : 0;
}

export function somar(blocos: BlocoComDisciplina[]): { acertos: number; total: number } {
  let acertos = 0;
  let total = 0;
  for (const bloco of blocos) {
    acertos += bloco.questoes_acertadas ?? 0;
    total += bloco.questoes_total ?? 0;
  }
  return { acertos, total };
}

/** Soma acertos e questões de todos os blocos, agrupando por matéria. */
export function agruparPorMateria(blocos: BlocoComDisciplina[]): DesempenhoMateria[] {
  const mapa = new Map<string, DesempenhoMateria>();

  for (const bloco of blocos) {
    const chave = bloco.disciplina_id ?? "sem-materia";
    const atual = mapa.get(chave) ?? {
      disciplinaId: bloco.disciplina_id,
      nome: bloco.disciplina?.nome ?? "Sem matéria",
      acertos: 0,
      total: 0,
      blocos: 0,
    };

    atual.acertos += bloco.questoes_acertadas ?? 0;
    atual.total += bloco.questoes_total ?? 0;
    atual.blocos += 1;
    mapa.set(chave, atual);
  }

  return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}