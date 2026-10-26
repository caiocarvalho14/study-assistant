// src/types/flashcards.ts

export type Flashcard = {
  id: string;
  created_at: string;
  criador_id: string | null;
  pergunta: string | null;
  resposta: string | null;
  conteudo_id: string | null;
  quantidade_respondida: number | null;
};

export type ConteudoBasico = {
  id: string;
  nome: string | null;
  disciplina_id: string | null;
};