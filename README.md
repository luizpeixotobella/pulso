# Pulso · LBArtes Luiz

Rede social humana, segura e conectada ao SolOS — agora organizada como um
produto próprio da LBArtes Luiz.

## Estado desta primeira fase

Este repositório é o **snapshot inicial da extração** do Pulso a partir do
`lbartes-cms`. Ele contém as rotas públicas e administrativas do Pulso, APIs,
bibliotecas de segurança, migrations Supabase e documentação relacionada.

O Pulso ainda compartilha infraestrutura com o CMS original (autenticação,
layout, componentes e o projeto Supabase). Por isso, o deploy de produção
continua no serviço atual até concluirmos a separação operacional. Não remover
o serviço atual nem alterar DNS nesta fase.

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

O caminho de compatibilidade inicial é `/solos/pulso`. O domínio futuro será
`https://pulso.rocks` depois que o novo serviço Render passar por smoke tests.

## Variáveis mínimas

Consulte `.env.example`. Os valores reais devem ser cadastrados no cofre do
Render/OpenClaw, nunca neste repositório.

## Próximas fases

- completar o adapter de autenticação e layout independente;
- criar o serviço Render `pulso` sem tocar no `lbartes-platform`;
- configurar `pulso.rocks` e validar SSL, login, feed, publicação, segurança e
  endpoints de cron;
- só então retirar o Pulso do CMS e arquivar a integração antiga.

## Portfólio LBArtes Luiz

- [LBArtes CMS](https://github.com/luizpeixotobella/lbartes-cms)
- [SolOS](https://github.com/luizpeixotobella/solos)
- Pulso (este projeto)
