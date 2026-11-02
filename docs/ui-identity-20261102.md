# Pulso UI — identidade compartilhada e descoberta LBArtes

Pedido de Luiz: melhorar a UI, mostrar o logo e criar micromarketing para o CMS principal.

- Cabeçalho global com logo SVG existente, links Conversas/Minha conta e Universo LBArtes. Removidos cabeçalhos locais para não duplicar a marca.
- Timeline com abertura editorial, ritmo visual, cards legíveis, reações compactas e coluna de descoberta. A coluna passa para depois do feed no celular; nada encobre os posts.
- Mesma descoberta LBArtes no feed autenticado; home também oferece a ponte ao site principal.
- Links externos explícitos para https://luiz-bella-artes.net/ e /blog. UTM fixos identificam origem/posição, sem IDs pessoais ou novo rastreador.
- Rodapé global preserva o crédito de colaboração de Luigi e a autoria LBArtes.
- Link de pular conteúdo, foco visível e suporte a movimento reduzido.

Não altera banco, autorização, moderação, conteúdo de usuários ou audiência das conversas.

Verificações: TypeScript, build de produção, lint (zero erros, dois avisos preexistentes), teste existente shared-conversation-card e git diff --check. CMS e blog HTTP 200. Build local usa chave pública placeholder, sem service-role. O diretório .next herdado estava root-owned; ownership apenas do artefato regenerável corrigido para ubuntu antes do build. Perfil chrome apresentou timeout nas navegações; navegador gerenciado disponível. Preview localhost bloqueada pela política de navegação, sem contorno; verificação visual é feita no domínio publicado.

Rollback: reverter o commit desta UI; nenhuma migração ou alteração de dados necessária.
