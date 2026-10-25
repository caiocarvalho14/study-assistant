// src/types/estudos.ts
export type Disciplina = {
  id: string;
  created_at: string;
  nome: string | null;
  criador_id: string | null;
};

export type Conteudo = {
  id: string;
  created_at: string;
  disciplina_id: string | null;
  nome: string | null;
  obs: string | null;
  criador_id: string | null;
};

export type Topico = {
  id: string;
  created_at: string;
  topico: string | null;
  obs: string | null;
  conteudo_id: string | null;
  criador_id: string | null;
};

export type DisciplinaComContagem = Disciplina & {
  conteudo: { count: number }[];
};

export type ConteudoComTopicos = Conteudo & {
  topico: Topico[];
};

export type Preparacao = {
  id: string;
  created_at: string;
  banca_organizadora: string | null;
  cargo: string | null;
  url_do_edital: string | null;
  criador_id: string | null;
  instituicao: string | null;
};

export type Avaliacao = {
  id: string;
  created_at: string;
  criador_id: string | null;
  preparacao_id: string | null;
  /** data no formato YYYY-MM-DD */
  data_prova: string | null;
  url_avaliacao: string | null;
};

export type PreparacaoComAvaliacoes = Preparacao & {
  avaliacao: Pick<Avaliacao, "id" | "data_prova">[];
};

export type AvaliacaoQuestoes = {
  id: string;
  created_at: string;
  criador_id: string | null;
  disciplina_id: string | null;
  questoes_total: number | null;
  questoes_acertadas: number | null;
  avaliacao_id: string | null;
};

export type BlocoComDisciplina = AvaliacaoQuestoes & {
  disciplina: { nome: string | null } | null;
};