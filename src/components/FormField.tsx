import type { InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function FormField({ label, hint, id, ...props }: FormFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={fieldId}
        className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        {...props}
      />
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}