"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

type Props = {
  moduleId: string;
  prompt: string;
  optionA: string;
  optionB: string;
  initialSelectedOption?: "a" | "b" | null;
  initialIsCorrect?: boolean | null;
  isAuthenticated: boolean;
};

export default function CourseQuestionCard({
  moduleId,
  prompt,
  optionA,
  optionB,
  initialSelectedOption = null,
  initialIsCorrect = null,
  isAuthenticated,
}: Props) {
  const [selectedOption, setSelectedOption] = useState<"a" | "b" | null>(initialSelectedOption);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(initialIsCorrect);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    initialSelectedOption ? "Sua resposta já foi registrada." : null,
  );

  async function submitAnswer() {
    if (!selectedOption || !isAuthenticated) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      setLoading(false);
      setError("Você precisa entrar para registrar progresso.");
      return;
    }

    const { data: question, error: questionError } = await supabase
      .from("course_questions")
      .select("correct_option")
      .eq("module_id", moduleId)
      .single();

    if (questionError || !question) {
      setLoading(false);
      setError("Não foi possível carregar a questão deste módulo.");
      return;
    }

    const correct = question.correct_option === selectedOption;

    const { error: saveError } = await supabase.from("course_progress").upsert({
      user_id: user.id,
      module_id: moduleId,
      selected_option: selectedOption,
      is_correct: correct,
      answered_at: new Date().toISOString(),
    });

    setLoading(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setIsCorrect(correct);
    setMessage(correct ? "Resposta correta. Progresso salvo." : "Resposta registrada. Você pode revisar o módulo.");
  }

  return (
    <section className="panel" style={{ marginTop: 18 }}>
      <p style={{ margin: 0, color: "var(--accent-2)", letterSpacing: ".08em", textTransform: "uppercase", fontSize: 12 }}>
        Questão do módulo
      </p>
      <h3 style={{ marginTop: 10 }}>{prompt}</h3>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <label className="comment-card" style={{ cursor: isAuthenticated ? "pointer" : "not-allowed" }}>
          <input
            type="radio"
            name="module-question"
            checked={selectedOption === "a"}
            onChange={() => setSelectedOption("a")}
            disabled={!isAuthenticated}
            style={{ width: 18, marginRight: 10 }}
          />
          <span>{optionA}</span>
        </label>

        <label className="comment-card" style={{ cursor: isAuthenticated ? "pointer" : "not-allowed" }}>
          <input
            type="radio"
            name="module-question"
            checked={selectedOption === "b"}
            onChange={() => setSelectedOption("b")}
            disabled={!isAuthenticated}
            style={{ width: 18, marginRight: 10 }}
          />
          <span>{optionB}</span>
        </label>
      </div>

      {!isAuthenticated ? (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <p style={{ margin: 0 }}>Entre ou crie sua conta para registrar seu progresso neste curso.</p>
          <div className="action-row">
            <Link className="btn primary" href="/cadastro">
              Criar conta
            </Link>
            <Link className="btn" href="/login">
              Entrar
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <button className="btn primary" type="button" disabled={!selectedOption || loading} onClick={submitAnswer}>
            {loading ? "Salvando..." : "Responder questão"}
          </button>
        </div>
      )}

      {message ? <p style={{ color: "#9ff7c2", marginTop: 12 }}>{message}</p> : null}
      {error ? <p style={{ color: "#ff9ea8", marginTop: 12 }}>{error}</p> : null}
      {isCorrect === false ? <p style={{ color: "#ffd479", marginTop: 12 }}>Resposta incorreta. Revise o módulo e tente consolidar a ideia central.</p> : null}
    </section>
  );
}
