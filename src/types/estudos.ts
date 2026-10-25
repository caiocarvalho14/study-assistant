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