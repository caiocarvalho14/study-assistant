// src/lib/importacao.ts

export type ImportTopico = { topico: string; obs: string | null };

export type ImportConteudo = {
  conteudo: string;
  obs: string | null;
  topicos: ImportTopico[];
};

export type ImportMateria = {
  materia: string;
  conteudo: ImportConteudo[];
};

export type ParseResult = { data: ImportMateria[]; errors: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/**
 * Lê o JSON no formato:
 * [{ "materia": "...", "conteudo": [{ "conteudo": "...", "topicos": [{ "topico": "..." }] }] }]
 * Aceita também um único objeto no lugar da lista, e tópicos escritos como texto simples.
 */
export function parseImport(raw: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {
      data: [],
      errors: ["O texto não é um JSON válido. Verifique vírgulas, aspas, colchetes e chaves."],
    };
  }

  const errors: string[] = [];
  const data: ImportMateria[] = [];
  const root = Array.isArray(json) ? json : [json];

  root.forEach((item, i) => {
    if (!isRecord(item)) {
      errors.push(`Item ${i + 1}: esperado um objeto com os campos "materia" e "conteudo".`);
      return;
    }

    const materia = text(item.materia);
    if (!materia) {
      errors.push(`Item ${i + 1}: o campo "materia" está ausente ou vazio.`);
      return;
    }

    const conteudoRaw = item.conteudo ?? [];
    const conteudoList = Array.isArray(conteudoRaw) ? conteudoRaw : [conteudoRaw];
    const conteudos: ImportConteudo[] = [];

    conteudoList.forEach((c, j) => {
      if (!isRecord(c)) {
        errors.push(`Matéria "${materia}", conteúdo ${j + 1}: esperado um objeto.`);
        return;
      }

      const nome = text(c.conteudo);
      if (!nome) {
        errors.push(`Matéria "${materia}", conteúdo ${j + 1}: o campo "conteudo" está ausente ou vazio.`);
        return;
      }

      const topicosRaw = c.topicos ?? [];
      if (!Array.isArray(topicosRaw)) {
        errors.push(`Conteúdo "${nome}": o campo "topicos" deve ser uma lista.`);
        return;
      }

      const topicos: ImportTopico[] = [];
      topicosRaw.forEach((t, k) => {
        const nomeTopico = typeof t === "string" ? text(t) : isRecord(t) ? text(t.topico) : null;
        if (!nomeTopico) {
          errors.push(`Conteúdo "${nome}", tópico ${k + 1}: o campo "topico" está ausente ou vazio.`);
          return;
        }
        topicos.push({ topico: nomeTopico, obs: isRecord(t) ? text(t.obs) : null });
      });

      conteudos.push({ conteudo: nome, obs: text(c.obs), topicos });
    });

    data.push({ materia, conteudo: conteudos });
  });

  if (errors.length === 0 && data.length === 0) {
    errors.push("Nenhuma matéria encontrada no JSON.");
  }

  return { data, errors };
}

export function countImport(data: ImportMateria[]) {
  let conteudos = 0;
  let topicos = 0;
  for (const materia of data) {
    conteudos += materia.conteudo.length;
    for (const conteudo of materia.conteudo) topicos += conteudo.topicos.length;
  }
  return { materias: data.length, conteudos, topicos };
}