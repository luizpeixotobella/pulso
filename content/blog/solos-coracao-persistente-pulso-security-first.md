# SolOS ganhou um coração: Daemon persistente, Pulso protegido e uma nova fase

Vídeo:
https://bkmzbbohunqkmcaeppqf.supabase.co/storage/v1/object/public/videos/solos/solos-nova-fase-security-first.mp4

CTA:
Quero construir essa nova fase
/solos/fundadores

---

O SolOS ganhou um coração.

Não como metáfora vazia. Como arquitetura.

Nesta nova fase, o projeto passa a contar com um Daemon persistente em Rust: uma camada intermediária que permanece ativa, observa o estado do sistema, atende a shell por um canal local restrito e reconecta automaticamente quando necessário.

Isso muda a natureza do SolOS.

A interface deixa de carregar responsabilidades que pertencem ao sistema. A shell apresenta, solicita e explica. O Daemon persiste, medeia e coordena. Linux continua sendo o chão confiável. O SolOS vira, de forma cada vez mais concreta, a operating layer que organiza a relação entre pessoas, agentes e máquina.

## Um coração persistente, não uma lógica espalhada

A regra arquitetural agora é clara: tudo o que for persistente, sistêmico ou de mediação deve viver no Daemon. Cada capacidade restante deve permanecer em seu espaço natural.

Essa separação reduz improviso, melhora a segurança e cria uma base mais limpa para evoluir approvals, apps, identidade, wallet e Ghost.

O resultado já existe em código: serviço persistente, socket Unix local com restrição por usuário, health check, snapshots, eventos controlados, reinício por systemd e fallback seguro na shell nativa.

## Pulso: segurança antes de crescimento

A mesma maturidade orienta o SolOS Pulso.

Uma rede social não pode tratar segurança pessoal como detalhe de lançamento. Quando crianças e adolescentes podem estar no horizonte do produto, proteção precisa vir antes de alcance, engajamento e pressa.

Por isso, o Pulso permanece fechado e somente leitura por padrão enquanto os controles etários e operacionais amadurecem.

A fundação atual inclui:

- políticas de acesso no banco;
- bloqueios e denúncias;
- perfis de segurança;
- exportação de dados;
- auditoria;
- moderação de IA com falha fechada;
- revisão humana para situações de risco;
- ausência deliberada de mensagens diretas e upload de mídia nesta etapa.

Security first não é slogan. É ordem de construção.

## IA como serviço de proteção

No Pulso, a IA não deve existir apenas para recomendar conteúdo e prolongar tempo de tela.

Ela deve ajudar a reconhecer risco, reduzir exposição, organizar revisão e proteger a comunidade. Quando a moderação não estiver disponível ou não tiver confiança suficiente, o sistema deve interromper a publicação — não liberar por conveniência.

Essa postura pode parecer conservadora. É exatamente o ponto.

Uma rede mais humana precisa saber dizer “ainda não” quando não consegue garantir cuidado suficiente.

## Founder: apoio com utilidade e auditoria

A infraestrutura de apoio Founder também entrou em produção.

Agora existem três formas de participar desta fase:

- Apoiador — R$ 25 e 10 Pulso Credits;
- Founder Heart — R$ 100, reconhecimento Founder Heart e 50 Pulso Credits;
- Patrono — R$ 500, reconhecimento Patrono e 250 Pulso Credits.

Os apoios são avulsos. Não representam equity, dívida, rendimento, promessa de lucro ou resgate em dinheiro. As recompensas são simbólicas e de utilidade dentro do ecossistema.

Depois da liquidação, o fluxo é auditado automaticamente. Falha assíncrona, reembolso e disputa também entram na trilha de eventos. O objetivo é que apoio e recompensa tenham uma relação verificável — não uma planilha esquecida.

## Uma nova fase, com menos promessa e mais sistema

O SolOS ainda está sendo construído. O Pulso ainda não está aberto. A proteção de públicos vulneráveis ainda exige trabalho contínuo.

Mas a diferença desta fase é concreta:

- o coração persiste;
- a shell sabe onde termina sua responsabilidade;
- a rede nasce com limites;
- a IA é chamada para proteger;
- o apoio Founder ganhou checkout e auditoria reais.

Menos espetáculo de futuro.

Mais fundação para que o futuro possa existir.

Se essa direção faz sentido para você, venha acompanhar, testar e sustentar a nova fase do SolOS.

https://luiz-bella-artes.net/solos/fundadores
