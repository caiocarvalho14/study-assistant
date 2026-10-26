"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

import { House, Book , ClockPlus , Flag , Layers} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  /** páginas ainda não construídas aparecem desabilitadas */
  disabled?: boolean;
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    label: "Início",
    href: "/",
    icon: (
      <House></House>
    ),
  },
  {
    label: "Matérias",
    href: "/materias",
    disabled: false,
    icon: (
      <Book></Book>
    ),
  },
  {
    label: "Preparações",
    href: "/preparacoes",
    disabled: false,
    icon: (
      <Flag></Flag>
    ),
  },
  {
    label: "Sessões",
    href: "/sessoes",
    disabled: false,
    icon: (
      <ClockPlus></ClockPlus>
    ),
  },
  {
  label: "Flashcards",
  href: "/flashcards",
  disabled: false,
  icon: <Layers className="size-5 shrink-0" />,
},
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { displayName, user, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-16 flex-col border-r text-black md:w-64 border-gray-300">
      <div className="flex h-16 items-center gap-3 px-4 md:px-5 border-b border-gray-300">
        {/* <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-navy"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z" />
            <path d="M4 20a2 2 0 0 1 2-2h13v3H6a2 2 0 0 1-2-1z" />
          </svg>
        </span> */}
        <p className="hidden text-base font-bold leading-tight md:block">Study-Assistant</p>
      </div>

      <nav aria-label="Principal" className="mt-4 flex-1 space-y-1 px-2 md:px-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const base =
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";

          if (item.disabled) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                title={`${item.label} (em breve)`}
                className={`${base} cursor-not-allowed text-white/40`}
              >
                {item.icon}
                <span className="hidden flex-1 md:inline">{item.label}</span>
                <span className="hidden rounded bg-white/10 px-1.5 py-0.5 text-xs md:inline">
                  Em breve
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={`${base} ${active ? "bg-blue-500 text-white " : "text-gray-500 hover:bg-gray-200 hover:text-black"
                }`}
            >
              {item.icon}
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-2 md:p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-navy border"
          >
            {initial}
          </span>
          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-gray-800">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          title="Sair"
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-black transition-colors cursor-pointer"
        >
          <Icon>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </Icon>
          <span className="hidden md:inline">Sair</span>
        </button>
      </div>
    </aside>
  );
}