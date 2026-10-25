// src/lib/datas.ts

/** Converte "YYYY-MM-DD" em Date local (new Date(iso) deslocaria o dia por causa do fuso). */
export function parseData(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

/** Dias de hoje até a data: 0 = hoje, negativo = já passou. */
export function diasAte(iso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((parseData(iso).getTime() - hoje.getTime()) / 86_400_000);
}

export function formatarData(iso: string): string {
  return parseData(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatarDataLonga(iso: string): string {
  return parseData(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function partesCalendario(iso: string) {
  const data = parseData(iso);
  return {
    dia: String(data.getDate()),
    mes: data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
  };
}

/** Texto para os cards: "Prova em 12 dias". */
export function rotuloProva(dias: number): string {
  if (dias < 0) return "Prova realizada";
  if (dias === 0) return "Prova hoje";
  if (dias === 1) return "Prova amanhã";
  return `Prova em ${dias} dias`;
}

/** Texto curto para etiquetas: "Em 12 dias". */
export function rotuloCurto(dias: number): string {
  if (dias < 0) return "Realizada";
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  return `Em ${dias} dias`;
}

/** A próxima prova futura; se não houver, a mais recente que já passou. */
export function proximaProva(datas: (string | null)[]): { iso: string; dias: number } | null {
  const validas = datas
    .filter((data): data is string => Boolean(data))
    .map((iso) => ({ iso, dias: diasAte(iso) }));

  if (validas.length === 0) return null;

  const futuras = validas.filter((d) => d.dias >= 0).sort((a, b) => a.dias - b.dias);
  if (futuras.length > 0) return futuras[0];

  return validas.sort((a, b) => b.dias - a.dias)[0];
}