export const SUPPORT_EMAIL = "contato@luiz-bella-artes.net";
export const SUPPORT_WHATSAPP = "5511951518438";
export const SUPPORT_TOPICS = {
  acesso: "Cadastro e acesso", publicacao: "Publicação e moderação",
  privacidade: "Privacidade e meus dados", problema: "Problema técnico",
  reclamacao: "Reclamação ou cancelamento", outro: "Outro assunto",
} as const;
export const SUPPORT_STATUSES = { open: "Aguardando atendimento", in_progress: "Em atendimento", answered: "Respondida", resolved: "Concluída" } as const;
export type SupportStatus = keyof typeof SUPPORT_STATUSES;
export type SupportMessage = { id: string; author: "visitor" | "operator"; body: string; created_at: string };
export type SupportView = { id: string; topic: keyof typeof SUPPORT_TOPICS; message: string; status: SupportStatus; created_at: string; messages: SupportMessage[] };
