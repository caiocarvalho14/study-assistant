// src/components/timer/TimerWidget.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Hourglass, Pause, PictureInPicture2, Play, Timer } from "lucide-react";
import { TimerPanel } from "@/components/timer/TimerPanel";
import { useFloatingLayout, type ResizeDir } from "@/lib/use-floating-layout";
import { useAuth } from "@/contexts/AuthContext";
import { formatarRelogio } from "@/lib/timer-format";
import { prepararAudio } from "@/lib/timer-sound";
import {
  alternarPausa,
  avancar,
  decorridoMs,
  restanteSegMs,
  useTimerState,
} from "@/lib/timer-store";

/** API de Picture-in-Picture para documentos (Chrome e Edge 116+). */
type PipApi = {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
};

function getPipApi(): PipApi | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { documentPictureInPicture?: PipApi }).documentPictureInPicture;
}

/** Copia os estilos da página para a janela flutuante, que nasce vazia. */
function copiarEstilos(destino: Window) {
  destino.document.documentElement.className = document.documentElement.className;
  destino.document.documentElement.lang = document.documentElement.lang;
  destino.document.body.className = document.body.className;
  destino.document.title = "Timer de estudo";

  for (const folha of Array.from(document.styleSheets)) {
    try {
      const regras = Array.from(folha.cssRules)
        .map((regra) => regra.cssText)
        .join("");
      const estilo = document.createElement("style");
      estilo.textContent = regras;
      destino.document.head.appendChild(estilo);
    } catch {
      if (folha.href) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = folha.href;
        destino.document.head.appendChild(link);
      }
    }
  }
}

/**
 * Relógio da interface. Usa o setInterval da janela onde o timer está sendo exibido: a janela
 * flutuante não sofre a limitação de timers das abas em segundo plano.
 */
function useNow(ativo: boolean, janela: Window | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ativo || !janela) return;

    const tick = () => {
      const agora = Date.now();
      avancar(agora);
      setNow(agora);
    };

    const primeiro = janela.setTimeout(tick, 0);
    const intervalo = janela.setInterval(tick, 250);
    return () => {
      janela.clearTimeout(primeiro);
      janela.clearInterval(intervalo);
    };
  }, [ativo, janela]);

  return now;
}

/** Áreas de redimensionamento: bordas e cantos do painel. */
const HANDLES: { dir: ResizeDir; className: string }[] = [
  { dir: "n", className: "inset-x-3 -top-1 h-2 cursor-ns-resize" },
  { dir: "s", className: "inset-x-3 -bottom-1 h-2 cursor-ns-resize" },
  { dir: "w", className: "inset-y-3 -left-1 w-2 cursor-ew-resize" },
  { dir: "e", className: "inset-y-3 -right-1 w-2 cursor-ew-resize" },
  { dir: "nw", className: "-left-1 -top-1 size-4 cursor-nwse-resize" },
  { dir: "ne", className: "-right-1 -top-1 size-4 cursor-nesw-resize" },
  { dir: "sw", className: "-bottom-1 -left-1 size-4 cursor-nesw-resize" },
  { dir: "se", className: "-bottom-1 -right-1 size-4 cursor-nwse-resize" },
];

const limitar = (valor: number, min: number, max: number) => Math.min(Math.max(valor, min), max);

/** Só aparece para quem está logado. */
export function TimerWidget() {
  const { user } = useAuth();
  if (!user) return null;
  return <TimerWidgetInner />;
}

function TimerWidgetInner() {
  const estado = useTimerState();
  const [expandido, setExpandido] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const tituloOriginal = useRef<string | null>(null);

  const { layout, ref, arrastando, onDragStart, onResizeStart, consumirClique, reset, reajustar } =
    useFloatingLayout();

  const pipSupported = Boolean(getPipApi());
  const rodando = estado.status === "rodando";
  const pausado = estado.status === "pausado";
  const emSessao = rodando || pausado;
  const concluido = estado.status === "concluido";
  const timer = estado.config.modo === "timer";

  const now = useNow(rodando, pipWindow ?? (typeof window !== "undefined" ? window : null));

  const segmento = timer ? estado.plano[estado.indice] : null;
  const relogio = emSessao
    ? timer
      ? formatarRelogio(restanteSegMs(estado, now), "regressivo")
      : formatarRelogio(decorridoMs(estado, now), "progressivo")
    : "";
  const faseTexto = pausado
    ? "Pausado"
    : timer
      ? segmento?.fase === "pausa"
        ? "Pausa"
        : "Foco"
      : "Cronômetro";

  // O anel e o relógio crescem e encolhem junto com o painel.
  const porLargura = layout.w - 128;
  const porAltura = layout.h === null ? Infinity : layout.h - 352;
  const ringSize = limitar(Math.min(porLargura, porAltura), 100, 340);

  // O áudio do navegador só libera após um gesto do usuário.
  useEffect(() => {
    document.addEventListener("pointerdown", prepararAudio, { once: true });
    return () => document.removeEventListener("pointerdown", prepararAudio);
  }, []);

  // Mostra o tempo na aba do navegador enquanto o timer está ativo.
  useEffect(() => {
    if (emSessao) {
      if (tituloOriginal.current === null) tituloOriginal.current = document.title;
      document.title = `${relogio} · ${faseTexto}`;
    } else if (tituloOriginal.current !== null) {
      document.title = tituloOriginal.current;
      tituloOriginal.current = null;
    }
  }, [emSessao, relogio, faseTexto]);

  useEffect(
    () => () => {
      if (tituloOriginal.current !== null) document.title = tituloOriginal.current;
    },
    [],
  );

  // Fecha a janela flutuante se o componente sair da tela.
  useEffect(() => () => pipWindow?.close(), [pipWindow]);

  const abrirPip = useCallback(async () => {
    const api = getPipApi();
    if (!api) return;

    try {
      const janela = await api.requestWindow({ width: 360, height: 520 });
      copiarEstilos(janela);
      janela.addEventListener("pagehide", () => {
        setPipWindow((atual) => (atual === janela ? null : atual));
      });
      setPipWindow(janela);
    } catch (err) {
      console.error("[timer] Não foi possível abrir a janela flutuante:", err);
    }
  }, []);

  const fecharPip = useCallback(() => {
    pipWindow?.close();
    setPipWindow(null);
  }, [pipWindow]);

  const alternarPip = pipWindow ? fecharPip : abrirPip;

  // Ao trocar entre pílula e painel, garante que o novo formato caiba na tela.
  function alternarExpandido(valor: boolean) {
    setExpandido(valor);
    window.requestAnimationFrame(reajustar);
  }

  const pillBase =
    "fixed z-40 flex h-12 touch-none select-none items-center rounded-full border border-gray-200 bg-white shadow-lg shadow-blue-900/10";
  const pillCursor = arrastando ? "cursor-grabbing" : "cursor-grab";

  return (
    <>
      {pipWindow ? (
        <div
          ref={ref}
          onPointerDown={onDragStart}
          style={{ right: layout.right, bottom: layout.bottom }}
          className={`${pillBase} ${pillCursor} gap-3 pl-4 pr-1.5`}
        >
          <PictureInPicture2 className="size-4 text-blue-600" />
          <div className="leading-tight">
            <p className="text-xs font-semibold text-gray-900">Em janela flutuante</p>
            {emSessao && (
              <p className="text-xs tabular-nums text-gray-500">
                {relogio} · {faseTexto}
              </p>
            )}
          </div>
          <button
            type="button"
            data-no-drag
            onClick={fecharPip}
            className="h-9 cursor-pointer rounded-full bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            Trazer de volta
          </button>
        </div>
      ) : expandido ? (
        <div
          ref={ref}
          style={{
            right: layout.right,
            bottom: layout.bottom,
            width: layout.w,
            height: layout.h ?? undefined,
          }}
          className="fixed z-40 max-w-[calc(100vw-1rem)]"
        >
          <div className="flex h-full max-h-[calc(100vh-1rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-blue-900/15">
            <TimerPanel
              now={now}
              variant="docked"
              pipSupported={pipSupported}
              pipActive={false}
              onTogglePip={alternarPip}
              onMinimize={() => alternarExpandido(false)}
              dragging={arrastando}
              ringSize={ringSize}
              headerProps={{
                onPointerDown: onDragStart,
                onDoubleClick: (e) => {
                  if (!(e.target as HTMLElement).closest("[data-no-drag]")) reset();
                },
                title: "Arraste para mover. Clique duas vezes para restaurar posição e tamanho.",
              }}
            />
          </div>

          {HANDLES.map(({ dir, className }) => (
            <div
              key={dir}
              aria-hidden
              onPointerDown={(e) => onResizeStart(e, dir)}
              className={`absolute z-10 touch-none ${className}`}
            />
          ))}

          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className="pointer-events-none absolute bottom-1.5 right-1.5 size-3 text-gray-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M11 3 3 11M11 7 7 11" />
          </svg>
        </div>
      ) : (
        <div
          ref={ref}
          onPointerDown={onDragStart}
          style={{ right: layout.right, bottom: layout.bottom }}
          className={`${pillBase} ${pillCursor} pl-1.5 ${emSessao ? "pr-1.5" : "pr-4"}`}
        >
          <button
            type="button"
            onClick={() => {
              if (consumirClique()) return;
              alternarExpandido(true);
            }}
            aria-expanded={false}
            aria-label={emSessao ? `Abrir timer. ${faseTexto}, ${relogio}` : "Abrir timer"}
            className="flex h-9 cursor-pointer items-center gap-2.5 rounded-full pl-1 pr-2"
          >
            <span className="relative flex size-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              {concluido ? (
                <Check className="size-4" />
              ) : timer ? (
                <Hourglass className="size-4" />
              ) : (
                <Timer className="size-4" />
              )}
              {rodando && (
                <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-pulse rounded-full border-2 border-white bg-blue-600" />
              )}
            </span>

            {emSessao ? (
              <span className="text-left leading-tight">
                <span className="block text-base font-semibold tabular-nums text-gray-900">
                  {relogio}
                </span>
                <span className="block text-[11px] font-medium text-gray-500">{faseTexto}</span>
              </span>
            ) : (
              <span className="text-sm font-medium text-gray-700">
                {concluido ? "Sessão concluída" : "Timer"}
              </span>
            )}
          </button>

          {emSessao && (
            <button
              type="button"
              data-no-drag
              onClick={alternarPausa}
              aria-label={pausado ? "Retomar" : "Pausar"}
              title={pausado ? "Retomar" : "Pausar"}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700"
            >
              {pausado ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
          )}
        </div>
      )}

      {pipWindow &&
        createPortal(
          <TimerPanel
            now={now}
            variant="pip"
            pipSupported={pipSupported}
            pipActive
            onTogglePip={alternarPip}
          />,
          pipWindow.document.body,
        )}
    </>
  );
}