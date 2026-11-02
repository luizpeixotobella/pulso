import type { Metadata } from "next";
import "./globals.css";
import { PulsoHeader, PulsoCredits } from "@/components/pulso-brand";

export const metadata: Metadata = {
  metadataBase: new URL("https://pulso.rocks"),
  title: {
    default: "Pulso · LBArtes Luiz",
    template: "%s | Pulso",
  },
  description: "Conheça o Pulso, uma rede social experimental da LBArtes Luiz com foco em conversa humana, segurança e participação consentida.",
  applicationName: "Pulso",
  openGraph: {
    type: "website",
    siteName: "Pulso · LBArtes Luiz",
    title: "Pulso · LBArtes Luiz",
    description: "Uma rede social experimental com foco em conversa humana, segurança e participação consentida.",
    url: "https://pulso.rocks/",
    locale: "pt_BR",
    images: [{ url: "/pulso-open-graph.png", width: 1200, height: 630, alt: "Pulso · LBArtes Luiz" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulso · LBArtes Luiz",
    description: "Uma rede social experimental com foco em conversa humana, segurança e participação consentida.",
    images: ["/pulso-open-graph.png"],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://luiz-bella-artes.net/#organization",
      name: "LBArtes Luiz",
      url: "https://luiz-bella-artes.net/",
    },
    {
      "@type": "WebSite",
      "@id": "https://pulso.rocks/#website",
      name: "Pulso",
      url: "https://pulso.rocks/",
      inLanguage: "pt-BR",
      publisher: { "@id": "https://luiz-bella-artes.net/#organization" },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <a className="skip-link" href="#pulso-content">Pular para o conteúdo</a>
        <PulsoHeader />
        <div id="pulso-content">{children}</div>
        <div className="container"><PulsoCredits /></div>
      </body>
    </html>
  );
}
