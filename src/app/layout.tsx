import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Momento",
  description: "Um espaço pessoal para acompanhar sua evolução.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
