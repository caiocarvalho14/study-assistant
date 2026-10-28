// src/components/timer/TimerPanel.tsx
"use client";

import { useState, type HTMLAttributes } from "react";
import {
  Check,
  ChevronDown,
  GripVertical,
  Hourglass,
  Pause,
  PictureInPicture2,
  Play,
  SkipForward,
  Square,
  Timer,
} from "lucide-react";
import { NumberStepper } from "@/components/timer/NumberStepper";
import { TimerRing } from "@/components/timer/TimerRing";
import { formatarDuracao, formatarRelogio } from "@/lib/timer-format";
import {
  LIMITES,
  alternarPausa,
  configurar,
  decorridoMs,
  encerrar,
  focoTotalMs,
  iniciar,
  montarPlano,
  pularPausa,
  reiniciar,
  restanteSegMs,
  resumoPlano,
  useTimerState,
  validarConfig,
  type Modo,
  type Segmento,
  type TimerEstado,
} from "@/lib/timer-store";

type TimerPanelProps = {
  now: number;
  variant: "docked" | "pip";
  pipSupported: boolean;
  pipActive: boolean;
  onTogglePip: () => void;
  /** só no modo encaixado na página */
  onMinimize?: () => void;
  /** eventos de arrastar, aplicados ao cabeçalho (só no modo encaixado) */
  headerProps?: HTMLAttributes<HTMLElement>;
  dragging?: boolean;
  /** diâmetro do anel; acompanha o tamanho do componente */
  ringSize?: number;
};

const primaryButton =
  "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50";
const headerButton =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40";

export function TimerPanel({
  now,
  variant,
  pipSupported,
  pipActive,
  onTogglePip,
  onMinimize,
  headerProps,
  dragging = false,
  ringSize = 208,
}: TimerPanelProps) {
  const estado = useTimerState();
  const timer = estado.config.modo === "timer";

  const pipTitulo = !pipSupported
    ? "Janela flutuante indisponível neste navegador (use Chrome ou Edge)"
    : pipActive
      ? "Voltar para a página"
      : "Abrir em janela flutuante";

  return (
    <div
      className={
        variant === "pip"
          ? "flex min-h-screen flex-col bg-white p-5"
          : "min-h-0 flex-1 overflow-y-auto p-5"
      }
    >
      <header
        {...headerProps}
        className={`flex items-center justify-between gap-2 ${
          headerProps
            ? `touch-none select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`
            : ""
        }`}
      >
        <div className="flex items-center gap-2.5">
          {headerProps && <GripVertical className="-ml-1.5 size-4 text-gray-300" aria-hidden />}
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            {timer ? <Hourglass className="size-4" /> : <Timer className="size-4" />}
          </span>
          <h2 className="text-sm font-semibold text-gray-900">{timer ? "Timer" : "Cronômetro"}</h2>
        </div>

        <div className="flex gap-0.5">
          <button
            type="button"
            data-no-drag
            onClick={onTogglePip}
            disabled={!pipSupported}
            title={pipTitulo}
            aria-label={pipTitulo}
            className={`${headerButton} ${pipActive ? "bg-blue-50 text-blue-600" : ""}`}
          >
            <PictureInPicture2 className="size-4" />
          </button>
          {onMinimize && (
            <button
              type="button"
              data-no-drag
              onClick={onMinimize}
              title="Minimizar"
              aria-label="Minimizar"
              className={headerButton}
            >
              <ChevronDown className="size-4" />
            </button>
          )}
        </div>
      </header>

      <div className="mt-5 flex-1">
        {estado.status === "parado" && <ConfigView />}
        {(estado.status === "rodando" || estado.status === "pausado") && (
          <RunView estado={estado} now={now} ringSize={ringSize} />
        )}
        {estado.status === "concluido" && <DoneView estado={estado} />}
      </div>
    </div>
  );
}

/* ---------- configuração ---------- */

const MODOS: { modo: Modo; label: string; Icone: typeof Timer }[] = [
  { modo: "timer", label: "Timer", Icone: Hourglass },
  { modo: "cronometro", label: "Cronômetro", Icone: Timer },
];

function ConfigView() {
  const { config } = useTimerState();
  const [erroInicio, setErroInicio] = useState<string | null>(null);

  const timer = config.modo === "timer";
  const validacao = validarConfig(config);
  const plano = timer && !validacao ? montarPlano(config) : [];
  const resumo = resumoPlano(config);

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Tipo" className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
        {MODOS.map(({ modo, label, Icone }) => {
          const ativo = config.modo === modo;
          return (
            <button
              key={modo}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => {
                setErroInicio(null);
                configurar({ modo });
              }}
              className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium transition ${
                ativo ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icone className="size-4" />
              {label}
            </button>
          );
        })}
      </div>

      {timer ? (
        <>
          <NumberStepper
            label="Tempo total"
            value={config.duracaoMin}
            min={LIMITES.duracaoMin.min}
            max={LIMITES.duracaoMin.max}
            unit="min"
            presets={[25, 45, 60, 90]}
            onChange={(duracaoMin) => configurar({ duracaoMin })}
          />

          <NumberStepper
            label="Pausas"
            value={config.pausasQtd}
            min={LIMITES.pausasQtd.min}
            max={LIMITES.pausasQtd.max}
            presets={[0, 1, 2, 3]}
            onChange={(pausasQtd) => configurar({ pausasQtd })}
          />

          {config.pausasQtd > 0 && (
            <NumberStepper
              label="Duração de cada pausa"
              value={config.pausaMin}
              min={LIMITES.pausaMin.min}
              max={LIMITES.pausaMin.max}
              unit="min"
              presets={[5, 10, 15]}
              onChange={(pausaMin) => configurar({ pausaMin })}
            />
          )}

          <div className="rounded-xl bg-gray-50 p-3">
            {plano.length > 0 ? (
              <>
                <div className="flex h-2.5 gap-0.5" aria-hidden>
                  {plano.map((segmento, i) => (
                    <div
                      key={i}
                      style={{ flexGrow: segmento.duracaoSeg }}
                      className={`rounded-full ${segmento.fase === "foco" ? "bg-blue-600" : "bg-sky-300"}`}
                    />
                  ))}
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-gray-500">
                  <span className="font-medium text-gray-700">
                    Foco total de {resumo.focoTotalMin} min
                  </span>
                  {", em "}
                  {resumo.blocos === 1 ? "1 bloco" : `${resumo.blocos} blocos de ~${resumo.focoBlocoMin} min`}
                  {config.pausasQtd > 0 &&
                    `, com ${config.pausasQtd === 1 ? "1 pausa" : `${config.pausasQtd} pausas`} de ${config.pausaMin} min.`}
                  {config.pausasQtd === 0 && ", sem pausas."}
                </p>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-red-600">{validacao}</p>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-xl bg-gray-50 px-4 py-6 text-center">
          <p className="text-4xl font-semibold tabular-nums tracking-tight text-gray-300">00:00</p>
          <p className="mx-auto mt-3 max-w-[16rem] text-xs leading-relaxed text-gray-500">
            Sem tempo definido. Conte o tempo livremente e use o botão Pausar sempre que precisar
            parar.
          </p>
        </div>
      )}

      {erroInicio && (
        <p role="alert" className="text-xs text-red-600">
          {erroInicio}
        </p>
      )}

      <button
        type="button"
        onClick={() => setErroInicio(iniciar())}
        disabled={Boolean(validacao)}
        className={primaryButton}
      >
        <Play className="size-4" />
        Iniciar
      </button>
    </div>
  );
}

/* ---------- em andamento ---------- */

function SegmentStrip({
  plano,
  indice,
  progresso,
}: {
  plano: Segmento[];
  indice: number;
  progresso: number;
}) {
  return (
    <div className="flex h-2 gap-0.5" aria-hidden>
      {plano.map((segmento, i) => {
        const largura = i < indice ? 100 : i === indice ? progresso * 100 : 0;
        return (
          <div
            key={i}
            style={{ flexGrow: segmento.duracaoSeg }}
            className="overflow-hidden rounded-full bg-gray-200"
          >
            <div
              style={{ width: `${largura}%` }}
              className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
                segmento.fase === "foco" ? "bg-blue-600" : "bg-sky-400"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

function RunView({
  estado,
  now,
  ringSize,
}: {
  estado: TimerEstado;
  now: number;
  ringSize: number;
}) {
  const [confirmando, setConfirmando] = useState(false);

  const timer = estado.config.modo === "timer";
  const pausado = estado.status === "pausado";
  const segmento = timer ? estado.plano[estado.indice] : null;
  const emPausa = segmento?.fase === "pausa";

  const restante = restanteSegMs(estado, now);
  const decorrido = decorridoMs(estado, now);

  const progresso = timer && segmento ? 1 - restante / (segmento.duracaoSeg * 1000) : (decorrido % 60_000) / 60_000;
  const relogio = timer ? formatarRelogio(restante, "regressivo") : formatarRelogio(decorrido, "progressivo");

  const blocosFoco = estado.plano.filter((s) => s.fase === "foco").length;
  const focoAtual = estado.plano.slice(0, estado.indice + 1).filter((s) => s.fase === "foco").length;
  const totalPausas = estado.plano.length - blocosFoco;
  const pausaAtual = estado.plano.slice(0, estado.indice + 1).filter((s) => s.fase === "pausa").length;

  const etapa = timer
    ? emPausa
      ? `Pausa ${pausaAtual} de ${totalPausas}`
      : `Foco ${focoAtual} de ${blocosFoco}`
    : "Tempo estudado";

  return (
    <div className="space-y-5">
      <TimerRing
        progress={progresso}
        tone={pausado ? "neutro" : emPausa ? "pausa" : "foco"}
        size={ringSize}
      >
        <span
          style={{ fontSize: Math.round(ringSize * 0.23) }}
          className={`font-semibold tabular-nums tracking-tight ${
            pausado ? "text-gray-400" : "text-gray-900"
          }`}
        >
          {relogio}
        </span>
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              emPausa ? "bg-sky-50 text-sky-700" : "bg-blue-50 text-blue-700"
            }`}
          >
            {timer ? (emPausa ? "Pausa" : "Foco") : "Cronômetro"}
          </span>
          {pausado && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
              Pausado
            </span>
          )}
        </div>
      </TimerRing>

      {timer && (
        <SegmentStrip plano={estado.plano} indice={estado.indice} progresso={progresso} />
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="font-medium text-gray-700">{etapa}</span>
        <span className="tabular-nums">
          Foco acumulado: {formatarDuracao(focoTotalMs(estado, now))}
        </span>
      </div>

      <div className="space-y-2">
        <button type="button" onClick={alternarPausa} className={primaryButton}>
          {pausado ? <Play className="size-4" /> : <Pause className="size-4" />}
          {pausado ? "Retomar" : "Pausar"}
        </button>

        {confirmando ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-600">
              Finalizar agora? O tempo estudado até aqui será mantido no resumo.
            </p>
            <div className="mt-2.5 flex gap-2">
              <button type="button" onClick={() => setConfirmando(false)} className={secondaryButton}>
                Continuar
              </button>
              <button
                type="button"
                onClick={encerrar}
                className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800"
              >
                Finalizar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {emPausa && (
              <button type="button" onClick={pularPausa} className={secondaryButton}>
                <SkipForward className="size-4" />
                Pular pausa
              </button>
            )}
            <button type="button" onClick={() => setConfirmando(true)} className={secondaryButton}>
              <Square className="size-4" />
              Finalizar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- concluído ---------- */

function DoneView({ estado }: { estado: TimerEstado }) {
  const resumo = estado.resumo;
  const timer = resumo?.modo === "timer";

  return (
    <div className="space-y-5 py-2 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Check className="size-7" />
      </span>

      <div>
        <h3 className="text-base font-semibold text-gray-900">
          {timer ? "Sessão concluída" : "Cronômetro finalizado"}
        </h3>
        <p className="mt-1 text-sm text-gray-500">Bom trabalho! Veja o resumo abaixo.</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-left">
        <div className="rounded-xl bg-gray-50 p-3">
          <dt className="text-xs font-medium text-gray-500">Tempo focado</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
            {formatarDuracao(resumo?.focoMs ?? 0)}
          </dd>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <dt className="text-xs font-medium text-gray-500">Pausas feitas</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
            {timer ? resumo?.pausas ?? 0 : "-"}
          </dd>
        </div>
      </dl>

      <button type="button" onClick={reiniciar} className={primaryButton}>
        Nova sessão
      </button>
    </div>
  );
}