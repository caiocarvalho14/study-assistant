// src/lib/tempo.ts

/** 90 vira "1h 30min"; 45 vira "45 min"; 120 vira "2h". */
export function formatarTempo(minutos: number | null): string {
  if (!minutos) return "0 min";
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas}h`;
  return `${horas}h ${resto}min`;
}

export function dividirTempo(minutos: number | null) {
  const total = minutos ?? 0;
  return { horas: Math.floor(total / 60), minutos: total % 60 };
}

/** Data e hora em que a sessão foi registrada (created_at vem em UTC e é convertido para o fuso local). */
export function formatarRegistro(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
}