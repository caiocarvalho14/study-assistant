// src/lib/timer-sound.ts

let contexto: AudioContext | null = null;

/** Cria/retoma o AudioContext. Precisa ser chamado a partir de um gesto do usuário (clique). */
export function prepararAudio() {
  if (typeof window === "undefined") return;
  try {
    contexto ??= new AudioContext();
    if (contexto.state === "suspended") void contexto.resume();
  } catch {
    // navegador sem suporte a áudio: o timer continua funcionando sem som
  }
}

type Aviso = "foco" | "pausa" | "fim";

const NOTAS: Record<Aviso, number[]> = {
  foco: [523.25, 659.25],
  pausa: [659.25, 523.25],
  fim: [523.25, 659.25, 783.99],
};

export function tocarAviso(tipo: Aviso) {
  const ctx = contexto;
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") void ctx.resume();
    const inicio = ctx.currentTime;

    NOTAS[tipo].forEach((frequencia, i) => {
      const oscilador = ctx.createOscillator();
      const ganho = ctx.createGain();
      const t0 = inicio + i * 0.22;

      oscilador.type = "sine";
      oscilador.frequency.value = frequencia;
      ganho.gain.setValueAtTime(0.0001, t0);
      ganho.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);

      oscilador.connect(ganho).connect(ctx.destination);
      oscilador.start(t0);
      oscilador.stop(t0 + 0.22);
    });
  } catch {
    // sem som
  }
}