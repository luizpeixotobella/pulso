# Pulso — checklist de lançamento e portfólio

## Estado verificado

- [x] Repositório público `luizpeixotobella/pulso`.
- [x] Serviço Render independente no plano Free.
- [x] `pulso.rocks` e `www.pulso.rocks` apontando para o serviço novo.
- [x] HTTPS, logo, favicon e rotas públicas respondendo.
- [x] Variáveis individuais aplicadas no Render; rotas que davam `500` voltaram a `200`.
- [x] CMS antigo preservado para rollback.
- [x] Logo e favicon publicados no commit `c64ecd4`.
- [x] Auditoria live de destinos internos: 17/17 válidos em `pulso.rocks`.
- [x] Links herdados do CMS removidos; a checagem agora falha se eles regressarem.
- [x] Gate anônimo de APIs: cron sem segredo retorna `401`; exportação/notificações sem sessão retornam `401`; mutações acessadas por `GET` retornam `405`.
- [x] Mutação de notificações protegida por origem confiável; endpoints de sessão mantêm rejeição CSRF (`PATCH /api/solos/pulso/notifications`).
- [x] Helper RLS de bloqueios não é mais executável por `anon`; a função fica restrita a `authenticated`.

## Gate funcional pendente

- [ ] Login e logout com uma conta de teste.
- [ ] Convite: validação, aceite de políticas e entrada no feed.
- [ ] Feed: leitura, paginação/lote e ausência de dados sem autorização.
- [ ] Publicação: texto, imagem, pré-moderação e rejeição segura.
- [ ] Comentários, reações, reposts e notificações.
- [ ] Perfil, exportação e exclusão de dados sociais.
- [ ] Moderação e denúncia com conta de operador autorizada.
- [ ] Cron de notificações, value loop e shadow, com autenticação própria.
- [ ] Verificação de logs, limites de taxa e falhas sem vazamento de segredo.

## Gate de separação

- [ ] Mapear cada dependência restante do CMS: auth, componentes, banco e mídia.
- [ ] Confirmar migrações Supabase aplicadas e reversíveis.
- [ ] Definir rollback do DNS e do serviço antigo.
- [ ] Remover rotas Pulso do CMS somente após o gate funcional.
- [ ] Atualizar README e documentação pública com a arquitetura final.

## Gate de portfólio

- [ ] Revisar screenshots, descrição e links do CMS, SolOS e Pulso.
- [ ] Preparar a página de serviços no Squarespace.
- [ ] Preparar publicação no LinkedIn; publicar somente após aprovação humana.
- [ ] Explicar a co-participação técnica/criativa de Luigi sem sugerir sociedade
      ou propriedade jurídica.
