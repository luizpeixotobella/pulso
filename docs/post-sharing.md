# Links permanentes e compartilhamento — 2026-11-02

Pedido de Luiz: cada publicação deve oferecer um link e botão para chamar pessoas de outras redes ao Pulso.

- Post público: `/p/<UUID>` lê a publicação aprovada independentemente de paginação, com conversa original, imagem/alt, OpenGraph/Twitter e canonical próprios. O leitor não precisa de conta. Quem já está habilitado pode responder; login/cadastro/aceite retornam ao mesmo post.
- Post privado: link focado `/solos/pulso/feed?post=<UUID>#post-<UUID>` exige login e as permissões existentes. Não oferece atalhos sociais nem envia título/corpo privado a terceiros. A mesma RLS e escopo de feed são aplicados à busca por ID.
- O painel Compartilhar oferece WhatsApp, Telegram, X, Facebook e LinkedIn, cópia de link e compartilhamento nativo quando disponível. Nada é enviado sem ação da pessoa; os atalhos abrem compositores externos, não publicam automaticamente.
- Sem SDK, iframe, widgets pagos ou scripts de rastreamento. APIs nativas existentes foram preferidas: [Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [Clipboard](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText).
- Cancelar a folha nativa não vira mensagem de sucesso/erro; falha de clipboard mostra o campo selecionável para cópia manual. Não se afirma entrega a outra rede por resolução da API nativa.

## Limites de privacidade

`getPublicPulsoPost` valida UUID e reutiliza a mesma query `published + allowed + PULSO_PUBLIC_SCOPE` da timeline, adicionando apenas igualdade do ID. Não é um lookup privilegiado sem escopo. Private/limited, pending/hidden, audience adult e mídia não pública não entram no conteúdo nem nos metadados da rota pública. Private e inexistente usam a mesma resposta genérica não indexável. Metadados são memoizados por requisição com React cache.

Não há migração nem alteração de RLS, corpo, IDs, imagens ou moderação dos posts. A publicação individual reutiliza PostCard, incluindo atribuição de IA e consentimento explícito para responder publicamente.

## Testes

- `tests/post-sharing.mjs`: links canônicos, cinco intents somente por ação, native share/cancel, cópia/fallback manual e privado copy-only; lookup/metadata para public/private/pending/adult/UUID inválido.
- Testes existentes de card, imagens, cadastro e guards permanecem válidos.
- Build TypeScript/Next e lint; verificação live de página, canonical, OpenGraph com crawler, imagem e rejeição de IDs privados sem imprimir seu conteúdo. Não postar em outra rede para testar o botão.

Rollback: reverter o commit do app, sem mexer no banco. Links antigos da timeline com âncora continuam funcionando; os novos evitam perder posts ao trocar o lote.
