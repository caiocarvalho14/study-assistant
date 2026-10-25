"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthResult = { error: string | null };

type SignUpResult = AuthResult & {
  /** true quando o Supabase exige confirmação por e-mail antes do login */
  needsEmailConfirmation: boolean;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  /** nome informado no cadastro (ou o início do e-mail como fallback) */
  displayName: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function translateError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("already registered")) return "Este e-mail já está cadastrado.";
  if (msg.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (msg.includes("password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (msg.includes("invalid email") || msg.includes("unable to validate email"))
    return "Informe um e-mail válido.";
  if (msg.includes("rate limit")) return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  return "Não foi possível concluir a ação. Tente novamente.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? translateError(error.message) : null };
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return {
      error: error ? translateError(error.message) : null,
      needsEmailConfirmation: !error && !data.session,
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const user = session?.user ?? null;

  const displayName = useMemo(() => {
    if (!user) return "";
    const name = user.user_metadata?.name as string | undefined;
    return name?.trim() || user.email?.split("@")[0] || "";
  }, [user]);

  const value = useMemo(
    () => ({ user, session, displayName, loading, signIn, signUp, signOut }),
    [user, session, displayName, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }
  return context;
}