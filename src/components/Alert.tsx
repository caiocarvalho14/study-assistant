type AlertProps = {
  variant: "error" | "success";
  children: React.ReactNode;
};

export function Alert({ variant, children }: AlertProps) {
  const styles =
    variant === "error"
      ? "border-danger/20 bg-danger-soft text-danger"
      : "border-success/20 bg-success-soft text-success";

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3.5 py-2.5 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}