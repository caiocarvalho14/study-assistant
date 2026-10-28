// src/components/timer/TimerRing.tsx
import type { ReactNode } from "react";

type TimerRingProps = {
  /** de 0 a 1 */
  progress: number;
  tone: "foco" | "pausa" | "neutro";
  size?: number;
  children: ReactNode;
};

const TONES = {
  foco: "stroke-blue-600",
  pausa: "stroke-sky-400",
  neutro: "stroke-gray-300",
} as const;

const RAIO = 45;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

export function TimerRing({ progress, tone, size = 208, children }: TimerRingProps) {
  const valor = Math.min(1, Math.max(0, progress));

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={RAIO} fill="none" strokeWidth="6" className="stroke-gray-100" />
        <circle
          cx="50"
          cy="50"
          r={RAIO}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUNFERENCIA}
          strokeDashoffset={CIRCUNFERENCIA * (1 - valor)}
          className={`${TONES[tone]} transition-[stroke-dashoffset] duration-300 ease-linear`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}