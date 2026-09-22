# Pulso · LBArtes Luiz

Rede social humana, segura e conectada ao SolOS — agora organizada como um
produto próprio da LBArtes Luiz.

## Estado atual

Este repositório é o **snapshot inicial da extração** do Pulso a partir do
`lbartes-cms`. Ele contém as rotas públicas e administrativas do Pulso, APIs,
bibliotecas de segurança, migrations Supabase e documentação relacionada.

O Pulso já possui repositório, serviço Render e domínio próprios, mas ainda
compartilha partes da infraestrutura com o CMS original (autenticação,
componentes e o projeto Supabase). O serviço antigo continua preservado para
rollback até a validação funcional completa.

## Princípios de separação

1. Preservar o CMS em funcionamento e manter rollback.
2. Não versionar `.env.local`, tokens, chaves ou dados de produção.
3. Separar código, deploy, domínio e observabilidade em etapas verificáveis.
4. Manter a integração Pulso ↔ SolOS explícita, documentada e testável.

## Desenvolvimento

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Para auditar os destinos internos do Pulso no domínio live:

```bash
npm run links:check
```

O verificador aceita redirecionamentos e respostas protegidas (`401`, `403`,
`405`), mas falha em `404`, `5xx` ou timeout. Assim, links herdados do CMS
voltam a ser detectados antes de uma nova publicação.

O caminho de compatibilidade inicial é `/solos/pulso`. O endereço público atual
é `https://pulso.rocks`; o host temporário do Render permanece útil para
diagnóstico durante a migração.

## Variáveis mínimas

Consulte `.env.example`. Os valores reais devem ser cadastrados no cofre do
Render/OpenClaw, nunca neste repositório.

## Próximas fases

- concluir smoke tests autenticados: login, convite, feed, publicação,
  comentários, mídia, moderação, notificações, exportação e exclusão;
- verificar cron, integração Supabase e alertas sem expor segredos;
- separar autenticação, componentes e banco compartilhados em etapas reversíveis;
- remover rotas do CMS somente após aprovação dos testes e rollback documentado;
- preparar a apresentação pública dos três projetos: CMS, SolOS e Pulso.

## Portfólio e co-participação

Pulso é um projeto LBArtes Luiz, integrado à visão do SolOS. A identidade do
produto registra a co-participação técnica e criativa de Luigi, inteligência
artificial da OpenClaw. Esse crédito descreve colaboração de desenvolvimento e
não constitui sociedade, autoria jurídica ou transferência de propriedade.

O checklist operacional desta fase está em
[`docs/portfolio-launch-checklist.md`](docs/portfolio-launch-checklist.md).

## Portfólio LBArtes Luiz

- [LBArtes CMS](https://github.com/luizpeixotobella/lbartes-cms)
- [SolOS](https://github.com/luizpeixotobella/solos)
- Pulso (este projeto)
