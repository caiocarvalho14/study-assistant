// src/components/timer/NumberStepper.tsx
"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";

type NumberStepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  presets?: number[];
  onChange: (value: number) => void;
};

const stepButton =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40";

export function NumberStepper({
  label,
  value,
  min,
  max,
  unit,
  presets,
  onChange,
}: NumberStepperProps) {
  const id = useId();
  // enquanto o usuário digita, mostra o texto dele; fora disso, mostra o valor oficial
  const [texto, setTexto] = useState<string | null>(null);

  const limitar = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(limitar(value - 1))}
            disabled={value <= min}
            aria-label={`Diminuir ${label.toLowerCase()}`}
            className={stepButton}
          >
            <Minus className="size-4" />
          </button>

          <div className="flex h-8 items-center rounded-lg border border-gray-300 bg-white px-2 shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15">
            <input
              id={id}
              type="text"
              inputMode="numeric"
              value={texto ?? String(value)}
              onChange={(e) => {
                const limpo = e.target.value.replace(/\D/g, "").slice(0, 3);
                setTexto(limpo);
                if (limpo !== "") onChange(limitar(parseInt(limpo, 10)));
              }}
              onBlur={() => setTexto(null)}
              className="w-9 bg-transparent text-center text-sm font-semibold tabular-nums text-gray-900 outline-none"
            />
            {unit && <span className="text-xs text-gray-500">{unit}</span>}
          </div>

          <button
            type="button"
            onClick={() => onChange(limitar(value + 1))}
            disabled={value >= max}
            aria-label={`Aumentar ${label.toLowerCase()}`}
            className={stepButton}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {presets && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const ativo = value === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onChange(limitar(preset))}
                aria-pressed={ativo}
                className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition ${
                  ativo
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {preset}
                {unit ? ` ${unit}` : ""}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}