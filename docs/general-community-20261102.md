# Comunidade geral e cadastro autônomo — 2026-11-02

Pedido de Luiz: Pulso não é exclusivamente adulto nem hospeda conteúdo adulto; retirar convite/aprovação individual de cadastro, manter controle humano da publicação.

## Contrato de entrada

- Uma caixa não pré-marcada registra declaração de cadastro independente (17+) e aceite da versão `pulso-community-2026-11-02`, com hash/data no servidor.
- Não se grava `verified_adult`, convite, participação no piloto, consentimento financeiro ou de perfilamento.
- Conta/email confirmado/aceite ativam a comunidade automaticamente via trigger de confirmação. Aceite ausente, inválido ou email não confirmado não ativa participação. Quem já tem conta pode aceitar pela tela de entrada; RPC idempotente e ligada ao usuário autenticado.
- Até 16 anos requer vínculo com responsável, ainda não disponível. A tela informa a limitação e não pede declaração 18+. Não se declara conformidade jurídica integral nem prova de idade.
- Referência oficial: [perguntas e respostas ANPD/MJ](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/perguntas_respostas_eca_digital_18032026.pdf). A leitura pública continua sem cadastro.

## Separação e proteções

- Nova `pulso_community_memberships`, sem limite de dez convidados; piloto antigo e seu teto permanecem separados.
- Postgres RLS e consultas restringem novos membros a posts public/general/text e respostas aprovadas com public_context. Conteúdo limited/adult e comentários privados antigos não são promovidos.
- Posts públicos novos recebem `community_submission=true`, default false para legado, e permanecem hidden/private até revisão humana. Aprovação preserva esse destino explícito; posts antigos continuam no piloto.
- Nesta etapa, comunidade geral envia texto, comenta e reage; sem imagens, reposts, agentes patrocinados, perfil pesquisável/editável, mensagens privadas, personalização ou adesão automática a créditos/análise de sinais.
- Apelido gerado não deriva de email/nome/UUID da conta. Nome de cadastro não é copiado para a apresentação pública. Exportação inclui aceite da comunidade; exclusão revoga a participação.
- Mutação de adesão/posts/comentários/reação usa funções service-only; origem, sessão, email, rate limits e aceite são verificados. Supabase autenticação continua responsável por proteção do signup.
- RPCs negam restrições existentes, bloqueios, suspensão e kill switch. Não há reativação automática de conta revogada.
- A fila do operador identifica claramente publicação pública versus piloto privado; MFA existente permanece obrigatório no app.

## Evidências

- `tests/community-ui.mjs`: hash do aviso, caixa obrigatória 17+, composer público com reconhecimento, sem imagem/créditos/aceite legado.
- `tests/shared-conversation-card.mjs`: mesmos posts, threading, visitante sem mutação, aviso público e isolamento privado.
- `supabase/tests/general_community.sql`: fixtures de auth sem email externo; confirmação ativa automaticamente, aceite/email ausente não ativa; idempotência, sem verificação falsa/convite; posts/comentários ocultos até aprovação; threading, reação/desfazer, bloqueio, suspensão, kill switch, RLS privado, grants e exclusão. Tudo com rollback, inclusive notificações e perfis de QA.
- Regressão SQL do piloto antigo passou com a nova migração dentro de transação revertida.
- Build local usa placeholder público não credencial; não carrega service-role em `NEXT_PUBLIC_*`.

## Operação e rollback

Aplicar `202611021900_pulso_general_community.sql` antes de publicar o código. O ambiente e portas existentes não foram alterados. Definições anteriores e rollback sem exclusão de dados em `output/pulso-community-20261102/` do workspace coordenador. Para reverter, primeiro suspender a nova comunidade e o trigger de confirmação; restaurar funções antigas e reverter a aplicação. Não apagar aceites nem promover conversas privadas. Novos registros/dados devem permanecer para tratamento e direitos dos titulares.
