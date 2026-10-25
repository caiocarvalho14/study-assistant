// src/components/ImportModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Disclosure } from "@/components/Disclosure";
import { Modal } from "@/components/modal/Modal";
import { UploadIcon } from "@/components/icons";
import { errorMessage } from "@/lib/estudos";
import { countImport, parseImport, plural, type ImportMateria } from "@/lib/importacao";
import { btnPrimary, btnSecondary, inputClass } from "@/lib/ui";

type ImportModalProps = {
  open: boolean;
  onClose: () => void;
  /** nomes (minúsculos) das matérias que já existem, para avisar sobre duplicidade */
  existingNames: Set<string>;
  /** grava a estrutura; o modal fecha sozinho quando a promessa resolve */
  onImport: (data: ImportMateria[]) => Promise<void>;
};

type ViewMode = "default" | "all" | "none";

export function ImportModal({ open, ...rest }: ImportModalProps) {
  if (!open) return null;
  return <ImportFlow {...rest} />;
}

function ImportFlow({ onClose, existingNames, onImport }: Omit<ImportModalProps, "open">) {
  const [step, setStep] = useState<"input" | "review">("input");
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [data, setData] = useState<ImportMateria[]>([]);
  const [view, setView] = useState<{ mode: ViewMode; version: number }>({
    mode: "default",
    version: 0,
  });
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === "review") reviewRef.current?.focus();
  }, [step]);

  const totals = useMemo(() => countImport(data), [data]);
  const hasDuplicates = data.some((m) => existingNames.has(m.materia.trim().toLowerCase()));

  function safeClose() {
    if (!importing) onClose();
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setRaw(await file.text());
    setFileName(file.name);
    setErrors([]);
    e.target.value = "";
  }

  function handleReview() {
    const result = parseImport(raw);
    if (result.errors.length > 0) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setData(result.data);
    setView((v) => ({ mode: "default", version: v.version + 1 }));
    setStep("review");
  }

  async function handleImport() {
    setImportError(null);
    setImporting(true);
    try {
      await onImport(data);
      onClose();
    } catch (err) {
      setImportError(errorMessage(err));
      setImporting(false);
    }
  }

  const isReview = step === "review";

  return (
    <Modal
      open
      onClose={safeClose}
      size="lg"
      title={isReview ? "Revisar importação" : "Importar JSON"}
      description={
        isReview
          ? `Serão adicionados: ${plural(totals.materias, "matéria", "matérias")}, ${plural(totals.conteudos, "conteúdo", "conteúdos")} e ${plural(totals.topicos, "tópico", "tópicos")}. Confira antes de confirmar.`
          : "Envie um arquivo ou cole o JSON com matérias, conteúdos e tópicos. Você revisa tudo antes de criar."
      }
    >
      {isReview ? (
        <div ref={reviewRef} tabIndex={-1} className="mt-5 outline-none">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Estrutura identificada</p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setView((v) => ({ mode: "all", version: v.version + 1 }))}
                className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
              >
                Expandir tudo
              </button>
              <button
                type="button"
                onClick={() => setView((v) => ({ mode: "none", version: v.version + 1 }))}
                className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
              >
                Recolher tudo
              </button>
            </div>
          </div>

          <ul key={view.version} className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {data.map((materia, i) => {
              const exists = existingNames.has(materia.materia.trim().toLowerCase());

              return (
                <li key={i} className="rounded-xl border border-gray-200 bg-white p-1">
                  <Disclosure
                    defaultOpen={view.mode !== "none"}
                    title={materia.materia}
                    badge={
                      <>
                        {exists && (
                          <span
                            title="Já existe uma matéria com este nome. Será criada outra."
                            className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                          >
                            Já existe
                          </span>
                        )}
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {plural(materia.conteudo.length, "conteúdo", "conteúdos")}
                        </span>
                      </>
                    }
                  >
                    {materia.conteudo.length === 0 ? (
                      <p className="ml-4 border-l border-gray-100 py-1 pl-5 text-sm text-gray-500">
                        Nenhum conteúdo nesta matéria.
                      </p>
                    ) : (
                      <ul className="ml-4 space-y-0.5 border-l border-gray-100 pb-1 pl-2">
                        {materia.conteudo.map((conteudo, j) => (
                          <li key={j}>
                            <Disclosure
                              defaultOpen={view.mode === "all"}
                              title={conteudo.conteudo}
                              badge={
                                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  {plural(conteudo.topicos.length, "tópico", "tópicos")}
                                </span>
                              }
                            >
                              {conteudo.topicos.length === 0 ? (
                                <p className="py-1 pl-10 pr-3 text-sm text-gray-500">
                                  Nenhum tópico neste conteúdo.
                                </p>
                              ) : (
                                <ul className="space-y-1.5 pb-3 pl-10 pr-3">
                                  {conteudo.topicos.map((topico, k) => (
                                    <li
                                      key={k}
                                      className="flex items-start gap-2 text-sm text-gray-600"
                                    >
                                      <span
                                        aria-hidden
                                        className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-400"
                                      />
                                      {topico.topico}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </Disclosure>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Disclosure>
                </li>
              );
            })}
          </ul>

          {hasDuplicates && (
            <p className="mt-3 text-xs text-gray-500">
              Matérias marcadas com “Já existe” serão criadas novamente, sem alterar as existentes.
            </p>
          )}

          {importError && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {importError}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep("input")}
              disabled={importing}
              className={btnSecondary}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className={btnPrimary}
            >
              {importing ? "Importando…" : "Confirmar importação"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition hover:border-blue-400 hover:bg-blue-50/40 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15">
            <UploadIcon className="size-6 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">
              {fileName ?? "Selecionar arquivo .json"}
            </span>
            <span className="text-xs text-gray-500">ou cole o conteúdo no campo abaixo</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFile}
              className="sr-only"
            />
          </label>

          <label htmlFor="import-json" className="mb-1.5 mt-4 block text-sm font-medium text-gray-700">
            JSON
          </label>
          <textarea
            id="import-json"
            data-autofocus
            rows={8}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setFileName(null);
              if (errors.length) setErrors([]);
            }}
            placeholder='[{ "materia": "Nome", "conteudo": [{ "conteudo": "Nome", "topicos": [{ "topico": "Nome" }] }] }]'
            className={`${inputClass} resize-none font-mono text-xs`}
          />

          {errors.length > 0 && (
            <div role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <p className="font-medium">Não foi possível ler o JSON:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {errors.slice(0, 6).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
              {errors.length > 6 && (
                <p className="mt-1">e mais {errors.length - 6} problemas.</p>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleReview}
              disabled={!raw.trim()}
              className={btnPrimary}
            >
              Revisar importação
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}