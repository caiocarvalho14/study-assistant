// src/types/sessoes.ts

export type Sessao = {
  id: string;
  criador_id: string | null;
  created_at: string;
  disciplina_id: string | null;
  conteudo_id: string | null;
  preparacao_id: string | null;
  /** duração em minutos */
  tempo: number | null;
};

export type SessaoCompleta = Sessao & {
  disciplina: { nome: string | null } | null;
  conteudo: { nome: string | null } | null;
  preparacao: { cargo: string | null; instituicao: string | null } | null;
  sessao_topico: { topico: { id: string; topico: string | null } | null }[];
};

export type DisciplinaOpcao = { id: string; nome: string | null };

export type PreparacaoOpcao = {
  id: string;
  cargo: string | null;
  instituicao: string | null;
  banca_organizadora: string | null;
};

export type ConteudoOpcao = {
  id: string;
  nome: string | null;
  disciplina_id: string | null;
  topico: { id: string; topico: string | null }[];
};

export type SessaoInput = {
  preparacaoId: string | null;
  disciplinaId: string;
  conteudoId: string | null;
  /** duração em minutos */
  tempo: number;
  topicoIds: string[];
};