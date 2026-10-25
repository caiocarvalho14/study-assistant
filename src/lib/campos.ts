// src/lib/campos.ts
import type { Field } from "@/components/FiledsModal";
import { normalizeUrl } from "@/lib/url";

const validarUrl = (value: string) => (normalizeUrl(value) ? null : "Informe um link válido.");

export const preparacaoFields: Field[] = [
  {
    name: "cargo",
    label: "Cargo",
    required: true,
    placeholder: "Ex.: Analista de Tecnologia da Informação",
  },
  {
    name: "instituicao",
    label: "Instituição",
    required: true,
    placeholder: "Ex.: IFPI, UFDPAR",
  },
  {
    name: "banca",
    label: "Banca organizadora",
    required: true,
    placeholder: "Ex.: FGV, Cebraspe, FCC",
  },
  {
    name: "url",
    label: "Link do edital",
    type: "url",
    placeholder: "https://…",
    hint: "Opcional.",
    validate: validarUrl,
  },
];

/** Na criação da preparação já dá para informar a data da primeira prova. */
export const preparacaoCreateFields: Field[] = [
  ...preparacaoFields,
  {
    name: "data",
    label: "Data da prova",
    type: "date",
    hint: "Opcional. Você pode adicionar outras provas depois.",
  },
];

export const avaliacaoFields: Field[] = [
  { name: "data", label: "Data da prova", type: "date", required: true },
  {
    name: "url",
    label: "Link da prova",
    type: "url",
    placeholder: "https://…",
    hint: "Opcional. Caderno de questões ou gabarito.",
    validate: validarUrl,
  },
];

const inteiro = (value: string) =>
  /^\d+$/.test(value) && Number(value) <= 32767 ? null : "Informe um número inteiro.";

/** Campos do bloco de questões; as matérias vêm do banco, por isso é uma função. */
export function blocoFields(disciplinas: { id: string; nome: string | null }[]): Field[] {
  return [
    {
      name: "disciplina",
      label: "Matéria",
      type: "select",
      required: true,
      options: disciplinas.map((d) => ({ value: d.id, label: d.nome ?? "Sem nome" })),
    },
    {
      name: "total",
      label: "Total de questões",
      type: "number",
      required: true,
      placeholder: "Ex.: 30",
      validate: (value) =>
        inteiro(value) ?? (Number(value) < 1 ? "O total deve ser de pelo menos 1." : null),
    },
    {
      name: "acertos",
      label: "Quantidade de acertos",
      type: "number",
      required: true,
      placeholder: "Ex.: 20",
      validate: (value, values) => {
        const erro = inteiro(value);
        if (erro) return erro;
        if (/^\d+$/.test(values.total ?? "") && Number(value) > Number(values.total)) {
          return "Os acertos não podem passar do total.";
        }
        return null;
      },
    },
  ];
}