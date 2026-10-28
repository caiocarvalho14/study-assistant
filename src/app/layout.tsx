import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";
import { TimerWidget } from "@/components/timer/TimerWidget";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  title: "Gerenciador de Estudos",
  description: "Organize seus estudos, matérias e metas em um só lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={publicSans.variable}>
      <body>
        <AuthProvider>{children}<TimerWidget/></AuthProvider>
      </body>
    </html>
  );
}