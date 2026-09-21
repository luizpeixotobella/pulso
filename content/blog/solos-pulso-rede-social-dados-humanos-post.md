# SolOS Pulso: uma rede social para transformar sinais humanos em valor com IA

**Slug sugerido:** `solos-pulso-rede-social-dados-humanos`

**Resumo curto:**
SolOS Pulso é o primeiro desenho de uma rede social fechada para usuários SolOS, criada para captar sinais humanos consentidos, organizar temas periódicos e testar como a IA pode devolver valor para quem participa.

**Imagem sugerida:**
`/blog-assets/solos-pulso-human-signal-network.png`

**Protótipo público:**
`/solos/pulso`

---

A pergunta central não é apenas como a IA vai gerar lucro.

A pergunta mais importante é: **como a IA vai retornar valor para os humanos que alimentam essa inteligência?**

As redes sociais provaram uma coisa: comportamento humano tem valor. Cliques, tempo de tela, comentários, curtidas, vídeos assistidos, palavras escolhidas, temas que mobilizam uma comunidade. Tudo isso forma uma camada de dados.

O problema é que, até hoje, essa camada quase sempre foi capturada sem transparência suficiente e monetizada longe de quem produziu o sinal.

O **SolOS Pulso** nasce como uma resposta experimental a essa falha.

## O que é o SolOS Pulso

SolOS Pulso é um protótipo de rede social fechada para usuários SolOS.

A primeira versão imagina uma experiência simples:

- pessoas publicam textos e vídeos;
- outras pessoas curtem e comentam;
- vídeos geram sinais como clique e visualização qualificada de 3 segundos;
- a plataforma propõe um tema semanal ou a cada três dias;
- cada participante responde ao tema com uma palavra;
- respostas fora da regra são separadas da amostra principal;
- a IA usa dados agregados para entender padrões culturais, linguagem, intenção e valor.

O objetivo não é criar mais um feed infinito.

O objetivo é desenhar uma camada de captação humana com consentimento, utilidade e retorno.

## Por que uma palavra

Uma resposta de uma palavra parece pequena.

Mas exatamente por ser pequena, ela pode virar um sinal limpo.

Quando uma comunidade inteira responde a um tema com uma palavra, a plataforma consegue enxergar vocabulário emocional, prioridades, tensão cultural e direção simbólica.

Se o tema é:

> Quando a IA trabalha junto com você, qual palavra define o valor que continua humano?

Respostas como "critério", "alma", "tempo", "coragem", "memória" ou "confiança" dizem muito sobre o que as pessoas querem preservar.

Mas a regra precisa ser honesta. Uma palavra colada artificialmente com outra não deve entrar como resposta válida. No protótipo, tokens longos ou suspeitos vão para uma fila secundária. No futuro, um classificador pode separar palavra real, composto legítimo, spam e tentativa de burlar a regra.

## O dado não é o produto bruto

A direção do SolOS Pulso precisa ser diferente da lógica extrativa tradicional.

O dado bruto da pessoa não deve ser vendido como mercadoria invisível.

O valor vem da transformação:

1. a pessoa participa de forma consciente;
2. o sistema registra sinais com finalidade declarada;
3. a IA agrega esses sinais em contexto;
4. esse contexto melhora produtos, temas, modelos, campanhas, ferramentas e experiências;
5. parte do valor volta para quem participa como utilidade, acesso, reputação, créditos, creator pool ou outro mecanismo juridicamente definido.

Isso precisa ser construído com cuidado.

Não é promessa de renda.
Não é yield.
Não é dinheiro garantido.

É uma hipótese de produto: se humanos geram a matéria-prima contextual que torna a IA mais útil, então o sistema deve ter uma forma verificável de devolver valor para esses humanos.

## Pulso Credits

O primeiro mecanismo de retorno não deve ser dinheiro.

Deve ser crédito de utilidade.

O nome provisório é **Pulso Credits**.

A lógica é simples: o usuário não ganha crédito apenas por entregar dado. Ele ganha crédito quando sua participação ajuda a rede a produzir contexto útil, consentido e verificável.

Um clique isolado vale pouco.

Três segundos de vídeo valem um pouco mais.

Uma resposta válida de uma palavra em um tema importante vale mais, porque é sinal limpo.

Comentário real e vídeo original com engajamento verdadeiro valem mais ainda.

Spam, repetição e engajamento artificial valem zero.

Esses créditos podem começar como uso interno: Ghost, ferramentas de criação, acesso a temas premium, limite de upload, descontos, reputação e participação em experiências do SolOS.

Isso também protege a economia do projeto. Vídeo custa storage. IA custa processamento. Busca custa chamada. A rede precisa se pagar antes de prometer repartição.

Por isso, Pulso Credits devem nascer com teto mensal, anti-fraude e lastro de custo.

Creator pool, saque ou repartição financeira só fazem sentido depois de receita recorrente, jurídico, imposto e contabilidade.

## Por que isso combina com SolOS

SolOS não é só uma interface.

A tese do projeto é uma operating layer para agentes, identidade, approvals, wallet e apps sobre um runtime intermediário.

Uma rede social de sinais humanos pode entrar nessa arquitetura como app nativo:

- identidade SolOS controla acesso;
- Ghost sugere temas e resume padrões agregados;
- Wallet registra benefícios, créditos ou participação;
- Approvals governam consentimento e uso de dados;
- Apps recebem uma superfície social que não depende de redes externas.

Em vez de depender apenas de plataformas alheias, o ecossistema começa a criar seu próprio circuito de atenção, sinal e valor.

## O primeiro passo

O primeiro passo já é concreto no CMS: uma área interna chamada **SolOS Pulso** e uma prévia pública somente leitura em `/solos/pulso`.

Ela simula:

- feed;
- posts;
- vídeos;
- curtidas;
- comentários;
- clique em vídeo;
- visualização de 3 segundos;
- tema ativo;
- resposta de uma palavra;
- stream de eventos captados.

Ainda não é produto final.

É o laboratório inicial para testar a gramática da rede antes de abrir para usuários reais, Android ou qualquer expansão pública com coleta.

## O que vem depois

O próximo corte técnico é persistir esses dados em Supabase, com tabelas próprias para temas, posts, comentários, reações, respostas de uma palavra, eventos e ledger de Pulso Credits.

Depois vem a camada de acesso SolOS.

Depois, upload real de vídeo, moderação, termos de consentimento, exportação de dados, exclusão de dados e painel de auditoria.

Android deve vir antes de iPhone.

Mas a ordem certa é esta: primeiro provar o circuito de valor, depois empacotar a distribuição.

## A visão

Se a IA minera contexto, a sociedade precisa decidir quem controla a mina, quem fiscaliza o processo e quem recebe valor de volta.

SolOS Pulso é uma tentativa inicial de responder isso com produto.

Não com discurso abstrato.

Com tela, evento, regra, dado e arquitetura.

Porque a próxima rede social relevante talvez não seja apenas uma rede de pessoas.

Talvez seja uma rede de sinais humanos negociando, com inteligência artificial, o direito de continuar valendo alguma coisa.
