"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type TotpEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export default function PulsoMfaSetup({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadFactors() {
      const supabase = createClient();
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (!active) return;
      if (factorsError) {
        setError("Não foi possível consultar o autenticador. Entre novamente e tente de novo.");
      } else {
        const unfinishedTotp = data.all.filter((factor) => factor.factor_type === "totp" && factor.status === "unverified");
        await Promise.all(unfinishedTotp.map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })));
        setFactorId(data.totp[0]?.id ?? null);
      }
      setLoading(false);
    }

    void loadFactors();
    return () => { active = false; };
  }, []);

  async function enroll() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Pulso Operator",
      issuer: "LBArtes Pulso",
    });
    setSubmitting(false);
    if (enrollError) {
      setError("Não foi possível criar a segunda etapa. Tente novamente.");
      return;
    }
    setFactorId(data.id);
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify(formData: FormData) {
    const code = String(formData.get("code") ?? "").replace(/\s/g, "");
    const selectedFactorId = enrollment?.factorId ?? factorId;
    if (!selectedFactorId || !/^\d{6}$/.test(code)) {
      setError("Digite os seis números exibidos no autenticador.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: selectedFactorId,
      code,
    });
    setSubmitting(false);
    if (verifyError) {
      setError("Código inválido ou expirado. Aguarde o próximo código e tente novamente.");
      return;
    }

    router.replace(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/admin/pulso/seguranca");
    router.refresh();
  }

  if (loading) return <p>Verificando proteção…</p>;

  const qrSrc = enrollment
    ? enrollment.qrCode.startsWith("data:image/")
      ? enrollment.qrCode
      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.qrCode)}`
    : null;

  return (
    <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
      {!factorId ? (
        <div className="comment-card">
          <h2>1. Vincular autenticador</h2>
          <p>Use Google Authenticator, Microsoft Authenticator, 1Password ou outro app TOTP.</p>
          <button className="btn primary" type="button" onClick={enroll} disabled={submitting}>
            {submitting ? "Preparando…" : "Gerar QR protegido"}
          </button>
        </div>
      ) : null}

      {enrollment && qrSrc ? (
        <div className="comment-card">
          <h2>2. Ler o QR</h2>
          {/* O QR contém o segredo TOTP e nunca é enviado ao servidor do CMS. */}
          <Image src={qrSrc} alt="QR para configurar o autenticador do Pulso" width={240} height={240} unoptimized style={{ background: "#fff", padding: 8, borderRadius: 12 }} />
          <details style={{ marginTop: 12 }}>
            <summary>Não consigo ler o QR</summary>
            <p>Digite manualmente este segredo no autenticador:</p>
            <code style={{ wordBreak: "break-all" }}>{enrollment.secret}</code>
          </details>
        </div>
      ) : null}

      {factorId ? (
        <form action={verify} className="comment-form">
          <h2>{enrollment ? "3. Confirmar" : "Confirmar identidade"}</h2>
          <label>
            Código de seis números
            <input name="code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="one-time-code" required />
          </label>
          <button className="btn primary" type="submit" disabled={submitting}>
            {submitting ? "Confirmando…" : "Desbloquear operação do Pulso"}
          </button>
        </form>
      ) : null}

      {error ? <p style={{ color: "#ff9ea8" }}>{error}</p> : null}
    </div>
  );
}
