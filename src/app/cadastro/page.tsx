"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AuthShell } from "@/components/AuthShell";
import { FormField } from "@/components/FormField";
import { Alert } from "@/components/Alert";

export default function CadastroPage() {
  const router = useRouter();
  const { user, loading, signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    const result = await signUp(name.trim(), email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      setNotice("Conta criada! Enviamos um link de confirmação para o seu e-mail.");
      return;
    }

    router.replace("/");
  }

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Comece a organizar seus estudos em poucos minutos."
      footer={
        <>
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary-hover hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert variant="error">{error}</Alert>}
        {notice && <Alert variant="success">{notice}</Alert>}

        <FormField
          label="Nome"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Como você quer ser chamado"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={submitting}
        />

        <FormField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={submitting}
        />

        <FormField
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 6 caracteres."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          disabled={submitting}
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Criando conta…" : "Criar conta"}
        </button>
      </form>
    </AuthShell>
  );
}