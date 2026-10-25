const inputBase =
  "block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500";

export const inputClass = `${inputBase} border-gray-300 focus:border-blue-500 focus:ring-blue-500/15`;
export const inputErrorClass = `${inputBase} border-red-400 focus:border-red-500 focus:ring-red-500/15`;

const btnBase =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60";

export const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700`;
export const btnSecondary = `${btnBase} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;
export const btnDangerSolid = `${btnBase} bg-red-600 text-white hover:bg-red-700`;

const iconBtnBase =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition";

export const iconBtn = `${iconBtnBase} hover:bg-gray-100 hover:text-gray-700`;
export const iconBtnDanger = `${iconBtnBase} hover:bg-red-50 hover:text-red-600`;