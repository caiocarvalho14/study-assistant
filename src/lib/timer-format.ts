// src/lib/timer-format.ts
import { formatarTempo } from "@/lib/tempo";

/** 90 segundos viram "01:30"; mais de uma hora vira "1:05:09". */
export function formatarRelogio(ms: number, sentido: "regressivo" | "progressivo"): string {
  const totalSeg =
    sentido === "regressivo" ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);

  const horas = Math.floor(totalSeg / 3600);
  const minutos = String(Math.floor((totalSeg % 3600) / 60)).padStart(2, "0");
  const segundos = String(totalSeg % 60).padStart(2, "0");

  return horas > 0 ? `${horas}:${minutos}:${segundos}` : `${minutos}:${segundos}`;
}

/** "45s", "12 min", "1h 30min". */
export function formatarDuracao(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  return formatarTempo(Math.floor(ms / 60_000));
}