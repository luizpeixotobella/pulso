export default function SoftwareStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": "https://pulso.rocks/#application",
    name: "Pulso",
    applicationCategory: "SocialNetworkingApplication",
    operatingSystem: "Web",
    url: "https://pulso.rocks/",
    description: "Rede social experimental com foco em conversa humana, segurança e participação consentida.",
    inLanguage: "pt-BR",
    publisher: { "@id": "https://luiz-bella-artes.net/#organization" },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
    />
  );
}
