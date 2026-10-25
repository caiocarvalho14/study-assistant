// src/lib/url.ts

/**
 * Aceita "www.site.com" ou "https://site.com" e devolve uma URL completa.
 * Retorna null quando vazio ou inválido.
 */
export function normalizeUrl(value: string): string | null {
  const text = value.trim();
  if (!text) return null;

  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}