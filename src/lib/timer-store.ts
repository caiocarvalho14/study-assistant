// src/lib/timer-store.ts
//
// Motor do timer/cronômetro. Vive fora do React: continua contando ao navegar entre páginas,
// sobrevive a recarregamentos (localStorage) e usa carimbos de tempo, então não perde precisão
// quando a aba fica em segundo plano.
import { useSyncExternalStore } from "react";
import { prepararAudio, tocarAviso } from "@/lib/timer-sound";

export type Modo = "timer" | "cronometro";
export type Fase = "foco" | "pausa";
export type Status = "parado" | "rodando" | "pausado" | "concluido";

export type TimerConfig = {
  modo: Modo;
  /** tempo total do timer, incluindo as pausas */
  duracaoMin: number;
  pausasQtd: number;
  pausaMin: number;
};

export type Segmento = { fase: Fase; duracaoSeg: number };

export type TimerEstado = {
  config: TimerConfig;
  status: Status;
  /** etapas do timer (foco e pausa); vazio no cronômetro */
  plano: Segmento[];
  indice: number;
  /** timer rodando: instante (ms) em que a etapa atual termina */
  fimEm: number | null;
  /** timer pausado: ms que faltam na etapa atual */
  restanteMs: number | null;
  /** cronômetro rodando: instante (ms) em que o trecho atual começou */
  iniciouEm: number | null;
  /** cronômetro: ms acumulados antes do trecho atual */
  acumuladoMs: number;
  /** timer: soma das etapas de foco já concluídas */
  focoConcluidoMs: number;
  resumo: { focoMs: number; pausas: number; modo: Modo } | null;
};

export const LIMITES = {
  duracaoMin: { min: 1, max: 600 },
  pausasQtd: { min: 0, max: 10 },
  pausaMin: { min: 1, max: 60 },
} as const;

const CONFIG_PADRAO: TimerConfig = { modo: "timer", duracaoMin: 60, pausasQtd: 1, pausaMin: 10 };

const ESTADO_INICIAL: TimerEstado = {
  config: CONFIG_PADRAO,
  status: "parado",
  plano: [],
  indice: 0,
  fimEm: null,
  restanteMs: null,
  iniciouEm: null,
  acumuladoMs: 0,
  focoConcluidoMs: 0,
  resumo: null,
};

/* ---------- configuração e plano ---------- */

function limitar(valor: number, { min, max }: { min: number; max: number }) {
  const numero = Number.isFinite(valor) ? Math.round(valor) : min;
  return Math.min(max, Math.max(min, numero));
}

function normalizarConfig(c: TimerConfig): TimerConfig {
  return {
    modo: c.modo === "cronometro" ? "cronometro" : "timer",
    duracaoMin: limitar(c.duracaoMin, LIMITES.duracaoMin),
    pausasQtd: limitar(c.pausasQtd, LIMITES.pausasQtd),
    pausaMin: limitar(c.pausaMin, LIMITES.pausaMin),
  };
}

/** Mensagem de erro quando as pausas não cabem no tempo total; null quando está tudo certo. */
export function validarConfig(c: TimerConfig): string | null {
  if (c.modo !== "timer") return null;

  const focoSeg = c.duracaoMin * 60 - c.pausasQtd * c.pausaMin * 60;
  if (focoSeg <= 0) {
    return "As pausas ocupam todo o tempo. Reduza as pausas ou aumente o tempo total.";
  }
  if (focoSeg / (c.pausasQtd + 1) < 60) {
    return "Cada bloco de foco precisa ter pelo menos 1 minuto. Reduza as pausas ou aumente o tempo total.";
  }
  return null;
}

/** Divide o tempo de foco em blocos iguais, com uma pausa entre cada bloco. */
export function montarPlano(c: TimerConfig): Segmento[] {
  const partes = c.pausasQtd + 1;
  const focoSeg = c.duracaoMin * 60 - c.pausasQtd * c.pausaMin * 60;
  const base = Math.floor(focoSeg / partes);
  const resto = focoSeg - base * partes;

  const plano: Segmento[] = [];
  for (let i = 0; i < partes; i++) {
    plano.push({ fase: "foco", duracaoSeg: base + (i === partes - 1 ? resto : 0) });
    if (i < c.pausasQtd) plano.push({ fase: "pausa", duracaoSeg: c.pausaMin * 60 });
  }
  return plano;
}

export function resumoPlano(c: TimerConfig) {
  const focoTotalMin = c.duracaoMin - c.pausasQtd * c.pausaMin;
  const blocos = c.pausasQtd + 1;
  return { focoTotalMin, blocos, focoBlocoMin: Math.round(focoTotalMin / blocos) };
}

/* ---------- cálculos de tempo (puros) ---------- */

export function restanteSegMs(s: TimerEstado, agora: number): number {
  if (s.config.modo !== "timer") return 0;
  if (s.status === "rodando" && s.fimEm !== null) return Math.max(0, s.fimEm - agora);
  if (s.status === "pausado") return s.restanteMs ?? 0;
  return 0;
}

export function decorridoMs(s: TimerEstado, agora: number): number {
  if (s.status === "rodando" && s.iniciouEm !== null) {
    return s.acumuladoMs + Math.max(0, agora - s.iniciouEm);
  }
  return s.acumuladoMs;
}

/** Tempo realmente estudado (sem contar as pausas). */
export function focoTotalMs(s: TimerEstado, agora: number): number {
  if (s.config.modo === "cronometro") return decorridoMs(s, agora);

  const segmento = s.plano[s.indice];
  if ((s.status === "rodando" || s.status === "pausado") && segmento?.fase === "foco") {
    return s.focoConcluidoMs + Math.max(0, segmento.duracaoSeg * 1000 - restanteSegMs(s, agora));
  }
  return s.focoConcluidoMs;
}

function pausasFeitas(s: TimerEstado): number {
  return s.plano.slice(0, s.indice).filter((seg) => seg.fase === "pausa").length;
}

/* ---------- armazenamento ---------- */

const CHAVE = "study-timer:v1";
const listeners = new Set<() => void>();
let estado: TimerEstado = ESTADO_INICIAL;
let hidratado = false;

function formatoValido(valor: unknown): valor is TimerEstado {
  if (typeof valor !== "object" || valor === null) return false;
  const v = valor as Partial<TimerEstado>;
  return (
    typeof v.config === "object" &&
    v.config !== null &&
    typeof v.status === "string" &&
    ["parado", "rodando", "pausado", "concluido"].includes(v.status) &&
    Array.isArray(v.plano) &&
    typeof v.indice === "number" &&
    typeof v.acumuladoMs === "number" &&
    typeof v.focoConcluidoMs === "number"
  );
}

function hidratar() {
  if (hidratado || typeof window === "undefined") return;
  hidratado = true;

  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return;
    const lido: unknown = JSON.parse(bruto);
    if (formatoValido(lido)) estado = { ...lido, config: normalizarConfig(lido.config) };
  } catch {
    // armazenamento indisponível ou corrompido: começa do zero
  }
}

function definir(proximo: TimerEstado) {
  estado = proximo;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(proximo));
  } catch {
    // sem persistência
  }
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): TimerEstado {
  hidratar();
  return estado;
}

export const getServerSnapshot = (): TimerEstado => ESTADO_INICIAL;

export function useTimerState(): TimerEstado {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ---------- ações ---------- */

export function configurar(parcial: Partial<TimerConfig>) {
  if (estado.status !== "parado") return;
  definir({ ...estado, config: normalizarConfig({ ...estado.config, ...parcial }) });
}

/** Inicia a contagem. Retorna a mensagem de erro, ou null quando iniciou. */
export function iniciar(): string | null {
  const s = estado;
  if (s.status !== "parado") return null;

  prepararAudio();
  const agora = Date.now();

  if (s.config.modo === "cronometro") {
    definir({
      ...s,
      status: "rodando",
      plano: [],
      indice: 0,
      fimEm: null,
      restanteMs: null,
      iniciouEm: agora,
      acumuladoMs: 0,
      focoConcluidoMs: 0,
      resumo: null,
    });
    return null;
  }

  const erro = validarConfig(s.config);
  if (erro) return erro;

  const plano = montarPlano(s.config);
  definir({
    ...s,
    status: "rodando",
    plano,
    indice: 0,
    fimEm: agora + plano[0].duracaoSeg * 1000,
    restanteMs: null,
    iniciouEm: null,
    acumuladoMs: 0,
    focoConcluidoMs: 0,
    resumo: null,
  });
  return null;
}

/** Pausa ou retoma a contagem (vale para timer e cronômetro). */
export function alternarPausa() {
  const s = estado;
  const agora = Date.now();
  const cronometro = s.config.modo === "cronometro";

  if (s.status === "rodando") {
    definir(
      cronometro
        ? {
            ...s,
            status: "pausado",
            acumuladoMs: s.acumuladoMs + Math.max(0, agora - (s.iniciouEm ?? agora)),
            iniciouEm: null,
          }
        : {
            ...s,
            status: "pausado",
            restanteMs: Math.max(0, (s.fimEm ?? agora) - agora),
            fimEm: null,
          },
    );
  } else if (s.status === "pausado") {
    definir(
      cronometro
        ? { ...s, status: "rodando", iniciouEm: agora }
        : { ...s, status: "rodando", fimEm: agora + (s.restanteMs ?? 0), restanteMs: null },
    );
  }
}

/** Encerra a pausa programada antes da hora e volta para o foco. */
export function pularPausa() {
  const s = estado;
  if (s.config.modo !== "timer") return;
  if (s.status !== "rodando" && s.status !== "pausado") return;
  if (s.plano[s.indice]?.fase !== "pausa") return;

  const proximo = s.indice + 1;
  const duracaoMs = s.plano[proximo].duracaoSeg * 1000;
  const agora = Date.now();

  definir({
    ...s,
    indice: proximo,
    fimEm: s.status === "rodando" ? agora + duracaoMs : null,
    restanteMs: s.status === "pausado" ? duracaoMs : null,
  });
}

export function encerrar() {
  const s = estado;
  if (s.status !== "rodando" && s.status !== "pausado") return;

  const agora = Date.now();
  const focoMs = focoTotalMs(s, agora);

  definir({
    ...s,
    status: "concluido",
    fimEm: null,
    restanteMs: null,
    iniciouEm: null,
    acumuladoMs: s.config.modo === "cronometro" ? focoMs : s.acumuladoMs,
    resumo: { focoMs, pausas: pausasFeitas(s), modo: s.config.modo },
  });
}

/** Volta para a tela de configuração, mantendo as escolhas anteriores. */
export function reiniciar() {
  definir({ ...ESTADO_INICIAL, config: estado.config });
}

/**
 * Avança as etapas do timer quando o tempo delas acaba. Chamado várias vezes por segundo
 * pela interface; se a página ficou parada, avança várias etapas de uma vez.
 */
export function avancar(agora: number) {
  const s = estado;
  if (s.status !== "rodando" || s.config.modo !== "timer" || s.fimEm === null) return;
  if (agora < s.fimEm) return;

  let indice = s.indice;
  let fim = s.fimEm;
  let focoConcluido = s.focoConcluidoMs;
  let atraso = 0;

  while (agora >= fim) {
    const segmento = s.plano[indice];
    if (segmento.fase === "foco") focoConcluido += segmento.duracaoSeg * 1000;
    atraso = agora - fim;

    if (indice + 1 >= s.plano.length) {
      definir({
        ...s,
        status: "concluido",
        indice: s.plano.length - 1,
        fimEm: null,
        focoConcluidoMs: focoConcluido,
        resumo: {
          focoMs: focoConcluido,
          pausas: s.plano.filter((seg) => seg.fase === "pausa").length,
          modo: "timer",
        },
      });
      if (atraso < 5000) tocarAviso("fim");
      return;
    }

    indice += 1;
    fim += s.plano[indice].duracaoSeg * 1000;
  }

  definir({ ...s, indice, fimEm: fim, focoConcluidoMs: focoConcluido });
  if (atraso < 5000) tocarAviso(s.plano[indice].fase === "pausa" ? "pausa" : "foco");
}