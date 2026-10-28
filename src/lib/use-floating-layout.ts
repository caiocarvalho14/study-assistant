// src/components/timer/use-floating-layout.ts
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/** Posição (distância das bordas direita e inferior da tela) e tamanho do componente. */
export type Layout = { right: number; bottom: number; w: number; h: number | null };

export const TAMANHO = { minW: 280, maxW: 640, minH: 450 } as const;

const MARGEM = 16;
const PADRAO: Layout = { right: MARGEM, bottom: MARGEM, w: 336, h: null };
const CHAVE = "study-timer:layout:v1";

const limitar = (valor: number, min: number, max: number) => Math.min(Math.max(valor, min), max);

function ler(): Layout {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return PADRAO;

    const lido = JSON.parse(bruto) as Partial<Layout>;
    const ok =
      Number.isFinite(lido.right) &&
      Number.isFinite(lido.bottom) &&
      Number.isFinite(lido.w) &&
      (lido.h === null || Number.isFinite(lido.h));

    return ok ? (lido as Layout) : PADRAO;
  } catch {
    return PADRAO;
  }
}

function salvar(layout: Layout) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(layout));
  } catch {
    // sem persistência
  }
}

/** Mantém o componente inteiro dentro da tela, mesmo se a janela do navegador encolher. */
function ajustar(layout: Layout, larguraReal: number, alturaReal: number): Layout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const w = limitar(layout.w, TAMANHO.minW, Math.min(TAMANHO.maxW, vw - MARGEM / 2));
  const h = layout.h === null ? null : limitar(layout.h, TAMANHO.minH, vh - MARGEM / 2);
  const larguraFinal = layout.h === null && larguraReal !== layout.w ? larguraReal : w;
  const alturaFinal = h ?? alturaReal;

  return {
    w,
    h,
    right: limitar(layout.right, 0, Math.max(0, vw - larguraFinal)),
    bottom: limitar(layout.bottom, 0, Math.max(0, vh - alturaFinal)),
  };
}

/**
 * Posição e tamanho do timer na página: arrastar pelo cabeçalho (ou pela pílula) e
 * redimensionar pelas bordas e cantos. O resultado é guardado no navegador.
 */
export function useFloatingLayout() {
  const [layout, setLayout] = useState<Layout>(() =>
    typeof window === "undefined" ? PADRAO : ler(),
  );
  const [arrastando, setArrastando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const layoutRef = useRef(layout);
  const arrastou = useRef(false);

  const aplicar = useCallback((proximo: Layout) => {
    layoutRef.current = proximo;
    setLayout(proximo);
  }, []);

  const reajustar = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    aplicar(ajustar(layoutRef.current, rect.width, rect.height));
  }, [aplicar]);

  useEffect(() => {
    const inicial = window.setTimeout(reajustar, 0);
    window.addEventListener("resize", reajustar);
    return () => {
      window.clearTimeout(inicial);
      window.removeEventListener("resize", reajustar);
    };
  }, [reajustar]);

  const onDragStart = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;

      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const alvo = e.currentTarget;
      const pointerId = e.pointerId;
      const inicio = {
        x: e.clientX,
        y: e.clientY,
        right: layoutRef.current.right,
        bottom: layoutRef.current.bottom,
      };
      let moveu = false;

      const mover = (ev: PointerEvent) => {
        const dx = ev.clientX - inicio.x;
        const dy = ev.clientY - inicio.y;
        if (!moveu && Math.hypot(dx, dy) < 4) return;

        if (!moveu) {
          moveu = true;
          setArrastando(true);
          document.body.style.userSelect = "none";
          // só captura o ponteiro quando vira arrasto: um clique simples continua chegando nos botões
          alvo.setPointerCapture(pointerId);
        }

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        aplicar({
          ...layoutRef.current,
          right: limitar(inicio.right - dx, 0, Math.max(0, vw - rect.width)),
          bottom: limitar(inicio.bottom - dy, 0, Math.max(0, vh - rect.height)),
        });
      };

      const soltar = () => {
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
        window.removeEventListener("pointercancel", soltar);

        if (alvo.hasPointerCapture(pointerId)) alvo.releasePointerCapture(pointerId);
        document.body.style.userSelect = "";
        setArrastando(false);

        if (moveu) {
          arrastou.current = true;
          window.setTimeout(() => {
            arrastou.current = false;
          }, 100);
          salvar(layoutRef.current);
        }
      };

      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
      window.addEventListener("pointercancel", soltar);
    },
    [aplicar],
  );

  const onResizeStart = useCallback(
    (e: ReactPointerEvent<HTMLElement>, dir: ResizeDir) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const alvo = e.currentTarget;
      const pointerId = e.pointerId;
      const inicio = {
        x: e.clientX,
        y: e.clientY,
        left: rect.left,
        top: rect.top,
        w: rect.width,
        h: rect.height,
      };
      const mudaAltura = dir.includes("n") || dir.includes("s");

      alvo.setPointerCapture(pointerId);
      document.body.style.userSelect = "none";

      const mover = (ev: PointerEvent) => {
        const dx = ev.clientX - inicio.x;
        const dy = ev.clientY - inicio.y;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let left = inicio.left;
        let top = inicio.top;
        let w = inicio.w;
        let h = inicio.h;

        if (dir.includes("e")) {
          w = limitar(inicio.w + dx, TAMANHO.minW, Math.min(TAMANHO.maxW, vw - inicio.left));
        }
        if (dir.includes("w")) {
          w = limitar(inicio.w - dx, TAMANHO.minW, Math.min(TAMANHO.maxW, inicio.left + inicio.w));
          left = inicio.left + inicio.w - w;
        }
        if (dir.includes("s")) {
          h = limitar(inicio.h + dy, TAMANHO.minH, vh - inicio.top);
        }
        if (dir.includes("n")) {
          h = limitar(inicio.h - dy, TAMANHO.minH, inicio.top + inicio.h);
          top = inicio.top + inicio.h - h;
        }

        aplicar({
          w,
          // se só a largura mudou, a altura continua acompanhando o conteúdo
          h: mudaAltura ? h : layoutRef.current.h,
          right: vw - (left + w),
          bottom: vh - (top + h),
        });
      };

      const soltar = () => {
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
        window.removeEventListener("pointercancel", soltar);

        if (alvo.hasPointerCapture(pointerId)) alvo.releasePointerCapture(pointerId);
        document.body.style.userSelect = "";
        salvar(layoutRef.current);
      };

      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
      window.addEventListener("pointercancel", soltar);
    },
    [aplicar],
  );

  /** true se o último gesto foi um arrasto; use para ignorar o clique que vem junto. */
  const consumirClique = useCallback(() => {
    const foiArrasto = arrastou.current;
    arrastou.current = false;
    return foiArrasto;
  }, []);

  const reset = useCallback(() => {
    aplicar(PADRAO);
    try {
      window.localStorage.removeItem(CHAVE);
    } catch {
      // sem persistência
    }
  }, [aplicar]);

  return { layout, ref, arrastando, onDragStart, onResizeStart, consumirClique, reset, reajustar };
}