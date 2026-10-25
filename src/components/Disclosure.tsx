// src/components/Disclosure.tsx
"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronRightIcon } from "@/components/icons";

type DisclosureProps = {
  title: ReactNode;
  /** conteúdo exibido à direita do título (contagens, avisos) */
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function Disclosure({ title, badge, defaultOpen = false, children }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left transition hover:bg-gray-50"
      >
        <ChevronRightIcon
          className={`size-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{title}</span>
        {badge}
      </button>

      {open && <div id={panelId}>{children}</div>}
    </div>
  );
}