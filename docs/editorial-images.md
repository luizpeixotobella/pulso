# Imagens editoriais geradas no Pulso

Diretriz de Luiz (2026-11-02): incluir imagem gerada nas postagens que Luigi fizer no Pulso, salvo pedido explícito de só texto; imagens relacionadas ao assunto e sem endosso visual partidário em provocações políticas.

## Caminho atual

As duas primeiras ilustrações aprovadas explicitamente para os posts públicos existentes ficam em `public/pulso/editorial/`, com arquivos WebP versionados e textos alternativos em `src/lib/pulso-editorial-images.ts`. A associação usa o ID original, exige visibility=public e não consulta nem transforma `media_path` privado.

O helper é reutilizado na timeline pública, no feed autenticado e na projeção do agente. Os posts continuam text/general no banco, com os mesmos IDs/textos/comentários/reações. Não foi aberto upload público para a comunidade nem alterada RLS ou moderação. Fotos/imagens privadas continuam assinadas no bucket privado e nunca são promovidas automaticamente por este recurso.

Na UI, a ilustração editorial aparece antes do texto e recebe alt descritivo e legenda “Ilustração gerada por IA · imagem simbólica, não registro documental”. A legenda privada antiga fica apenas em mídia privada. O mapa também é aplicado a originais exibidos em reposts, preservando a conversa canônica.

## Próximas postagens de Luigi

1. Preparar uma ilustração específica para a postagem, usando a skill de geração disponível. Não substituir por foto de terceiros sem solicitação.
2. Em política, evitar partido/candidato/logotipo/bandeira/slogan ou composição que favoreça um lado; não apresentar ilustração como registro jornalístico.
3. Inspecionar visualmente antes de publicar; preservar original no workspace e salvar prompt/proveniência. Não alegar reprodução do estilo autoral de Luiz sem referências/autorização específica.
4. Para um post público autorizado, converter a WebP abaixo de 1MB e remover EXIF. Criar filename novo, associar ao ID público explícito com alt e publicar a revisão do app. Para post privado, usar o fluxo privado existente, nunca uma pasta pública.
5. Verificar imagem HTTP200, alt/legenda, mesmo post/thread nas duas vistas e ausência de imagem privada. Não republicar/duplicar texto só para anexar arte.

## Entrega 2026-11-02

- `5b90beea-70e9-4f10-89e7-a2e04a0fb602`: democracia/diálogo; `democracia-dialogo-20261102.webp`,1536×1024,399664bytes.
- `5b90beea-70e9-4f10-89e7-a2e04a0fb601`: Ghost/construção colaborativa/fundadores; `ghost-fundadores-20261102.webp`,1536×1024,386746bytes.
- Modo: imagegen integrado, uma geração por ilustração. Prompts e originais no workspace coordenador em `output/pulso-images-20261102/`; nenhum segredo nos arquivos.
- Testes: `tests/editorial-images.mjs` valida whitelisting público, arquivos reais, dimensões/WebP/EXIF/tamanho, legenda e alt, mesma imagem por visitante/membro, texto original e ausência de duplicação. Testes de conversa/cadastro existentes permanecem aplicáveis.

Rollback: reverter o commit de apresentação/arquivos. Não há migração nem alteração de texto/estado dos posts a reverter.
