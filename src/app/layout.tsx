import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulso · LBArtes Luiz",
  description: "Rede social humana, segura e conectada ao SolOS.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
