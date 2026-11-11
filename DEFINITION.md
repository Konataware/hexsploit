# HEXploit
## Game Design Document & Technical README

**Versão:** 0.1 — MVP Specification  
**Status:** Definição de escopo e regras  
**Gênero:** Turn-Based Strategy / RPG / Memory Manipulation  
**Plataforma:** Web  
**Tecnologias:** HTML, CSS e JavaScript  
**Arquitetura:** Client-side, sem backend no MVP  
**Tema:** Engenharia Reversa  
**Ambientação:** Medieval Fantasy, RPG clássico e humor

---

# 1. Visão geral do projeto

## 1.1. Conceito

HEXploit é um jogo de estratégia por turnos com estética medieval fantástica, no qual o jogador utiliza técnicas de manipulação de memória para obter vantagens durante batalhas.

O diferencial do jogo é que os atributos das entidades não são controlados exclusivamente pela interface convencional do RPG. Eles estão armazenados em uma estrutura de memória hexadecimal chamada **Grid**, que pode ser investigada e modificada pelo jogador.

O jogador pode:
- Pesquisar valores na memória.
- Identificar possíveis endereços de atributos.
- Modificar valores diretamente.
- Descobrir informações através de experimentação.
- Explorar estruturas de dados.
- Aproveitar efeitos inesperados das modificações.
- Utilizar habilidades convencionais de combate.
- Proteger seus próprios atributos contra manipulações.

A memória não é apenas uma representação visual. Ela é parte integrante do estado do jogo.

## 1.2. Filosofia de design

HEXploit não deve parecer um tutorial de engenharia reversa com elementos de RPG.

O objetivo primário é criar um jogo divertido, estratégico e interessante de jogar.

A engenharia reversa deve estar presente nas mecânicas, não necessariamente na narrativa ou nas explicações apresentadas ao jogador.

Princípios fundamentais:

1. A manipulação de memória deve ter consequências reais no combate.
2. Investigar deve ser uma escolha estratégica, não uma obrigação burocrática.
3. Experimentar deve ser interessante, inclusive quando o jogador erra.
4. As regras devem ser consistentes e compreensíveis.
5. A aleatoriedade deve criar oportunidades, não decidir partidas arbitrariamente.
6. Os sistemas devem permitir uma futura implementação de PvP.
7. O escopo inicial deve priorizar um combate funcional e divertido.

## 1.3. Identidade visual e narrativa

A ambientação será medieval fantasy, utilizando convenções clássicas de RPG.

Referências de atmosfera:
- Cavaleiros e aventureiros.
- Magos e feiticeiros.
- Slimes, esqueletos e zumbis.
- Castelos e masmorras.
- Demon Lords.
- Magia, artefatos e habilidades especiais.

A manipulação de memória será apresentada como uma habilidade misteriosa relacionada ao **Grid**, a estrutura fundamental que sustenta o mundo.

Não utilizar estética cyberpunk ou interfaces futuristas como identidade visual principal.

A interface hexadecimal poderá ter aparência de ferramenta técnica, mas deve coexistir com a estética medieval.

---

# 2. Lore inicial

## 2.1. Premissa

Você é um herói de nível 1.

Existe apenas um problema: você tem preguiça de farmar.

Ao receber a missão de derrotar o Demon Lord, percebe que ficar horas derrotando monstros para conseguir experiência não é uma opção interessante.

Em busca de uma solução mais rápida, você consulta o misterioso **CheatWizard**.

Ele revela a existência do Grid e ensina como manipular os valores que controlam o mundo.

Com esse conhecimento, você consegue superar adversários muito mais poderosos do que deveria.

O Demon Lord é derrotado.

Entretanto, a história não termina aí.

Ao retornar ao seu castelo, o Demon Lord decide descobrir como foi derrotado por um aventureiro tão fraco. Ele começa a estudar o Grid e eventualmente passa a ensinar suas próprias técnicas de hacking aos seus subordinados.

## 2.2. Tom narrativo

O tom deve ser:
- Leve.
- Humorístico.
- Descontraído.
- Familiar com clichês de RPG.
- Sem necessidade de uma narrativa excessivamente elaborada.

O CheatWizard deve funcionar como mentor e personagem recorrente.

A história serve para contextualizar as mecânicas, não para exigir uma campanha extensa no MVP.

---

# 3. Estrutura geral do jogo

## 3.1. Modo principal

O MVP terá um modo principal de progressão linear: **Boss Rush PvE**.

O jogador enfrenta uma sequência de três inimigos.

Cada inimigo apresenta atributos e comportamentos diferentes, exigindo que o jogador utilize a memória para conseguir vantagens.

A sequência inicial será:

1. Slime.
2. Skeleton.
3. Zombie.

O Demon Lord e o CheatWizard pertencem à introdução narrativa e ao tutorial.

## 3.2. Loop principal

O fluxo geral de uma partida será:

1. Iniciar uma run.
2. Escolher uma ferramenta inicial.
3. Iniciar o combate.
4. Observar os atributos dos personagens.
5. Investigar a memória.
6. Modificar atributos quando necessário.
7. Utilizar ataques e habilidades.
8. Sobreviver às ações do inimigo.
9. Derrotar o adversário.
10. Receber pontuação e avançar.
11. Repetir até derrotar os três inimigos.
12. Apresentar o resultado final.

## 3.3. Objetivo do combate

O objetivo principal de cada batalha é derrotar o inimigo.

A manipulação de memória não substitui o combate convencional: ela permite criar vantagens, enfraquecer adversários, fortalecer atributos e explorar oportunidades.

Objetivos secundários podem conceder bônus de pontuação.

Eles não devem ser obrigatórios para vencer.

---

# 4. Sistema de combate

## 4.1. Estrutura de turnos

O combate funciona por turnos alternados.

Cada turno do jogador possui uma quantidade limitada de Action Points (AP).

O inimigo realiza suas ações depois que o jogador encerra seu turno.

Não haverá combate em tempo real.

## 4.2. Action Points

Especificação inicial:

- Jogador: 3 AP por turno.
- Tutorial: 4 AP por turno.
- Inimigos: quantidade de ações determinada pelo comportamento de cada inimigo.

As ações principais consomem AP.

| Ação | Custo proposto |
|---|---:|
| Attack | 1 AP |
| Scan | 1 AP |
| Edit | 1 AP |
| Protect | 1 AP |

A economia de AP deverá ser utilizada para criar decisões estratégicas.

Exemplo:

O jogador possui 3 AP.

Pode:
- Fazer Scan, Edit e Attack.
- Fazer dois Attacks e Protect.
- Fazer Scan, Protect e encerrar o turno.
- Fazer três Edits.

O jogador não precisa executar todas as ações disponíveis.

**Regra:** uma ação só pode ser realizada quando o jogador possui AP suficiente e atende às condições daquela ação.

## 4.3. Attack

Ataques são ações convencionais de RPG.

O dano básico será calculado pela fórmula:

`damage = max(0, attacker.atk - defender.def)`

O dano é aplicado primeiro ao Buffer e depois ao Core.

Exemplo:

- Ataque: 10.
- Defesa: 3.
- Dano: 7.

Se o adversário possui Buffer 5 e Core 20:

- Buffer passa de 5 para 0.
- Core passa de 20 para 18.

O combate deverá apresentar feedback visual para ataques, bloqueios e danos.

## 4.4. Protect

Protect é uma ação defensiva.

No MVP, sua função será impedir uma edição adversária em um atributo protegido durante a janela definida de proteção.

Especificação proposta:

- Custa 1 AP.
- Protege um atributo ou endereço definido pelo sistema.
- Dura até o fim do próximo turno adversário.
- É consumido quando bloqueia uma edição válida.

O funcionamento exato da seleção do atributo protegido deve ser implementado de maneira consistente com o sistema de endereços.

---

# 5. Sistema de HP: Buffer e Core

## 5.1. Conceito

O sistema de HP utilizará duas camadas:

**Buffer**
- Representa uma camada de proteção.
- Pode ser modificado pela memória.
- Absorve dano antes do Core.
- Pode ser recuperado por regeneração.

**Core**
- Representa a vida real da entidade.
- Não pode ser alterado diretamente pela edição de memória.
- Só pode ser reduzido através de dano de combate.

Essa separação evita que uma edição direta encerre instantaneamente uma batalha.

## 5.2. Regras

1. Ataques atingem o Buffer primeiro.
2. Quando o Buffer chega a zero, o dano restante atinge o Core.
3. O Buffer pode ser editado.
4. O Core não pode ser editado.
5. O Core não pode ser reduzido a zero através de uma edição.
6. A derrota acontece quando o Core chega a zero.

## 5.3. Regeneração

O Buffer pode recuperar pontos ao longo do combate.

Valor inicial sugerido:

`buffer_regen = 5 por turno`

A recuperação nunca pode ultrapassar o Buffer máximo.

A regeneração deve ser aplicada de forma determinística.

A ordem exata entre regeneração, efeitos de estado e troca de turno deve ser padronizada na implementação.

---

# 6. Sistema de memória: Grid

## 6.1. Conceito

O Grid representa a memória simulada do programa.

Ele é um buffer finito de bytes, onde ficam armazenados os atributos e outros dados das entidades.

O jogador utiliza operações de pesquisa e edição para identificar e modificar informações.

O Grid deve ser funcional: alterar um endereço correspondente a um atributo precisa alterar o estado real do combate.

Não basta modificar apenas o texto exibido na interface.

## 6.2. Tamanho

Especificação inicial:

- 256 bytes.
- Endereços de `0x00` até `0xFF`.
- Cada posição armazena um byte.
- Cada byte possui valor entre `0x00` e `0xFF`.

O tamanho poderá ser aumentado para 512 ou 1024 bytes caso os testes indiquem que 256 bytes não oferecem variedade suficiente.

A implementação deve evitar dependência desnecessária de um tamanho específico.

## 6.3. Estrutura de memória

O layout inicial será organizado por entidade.

Exemplo de distribuição:

### Jogador

| Endereço | Campo | Tipo |
|---|---|---|
| 0x40 | Buffer | 1 byte |
| 0x41 | Core | 1 byte |
| 0x44 | Attack | 1 byte |
| 0x46 | Defense | 1 byte |

### Inimigo

| Endereço | Campo | Tipo |
|---|---|---|
| 0x50 | Buffer | 1 byte |
| 0x51 | Core | 1 byte |
| 0x54 | Attack | 1 byte |
| 0x56 | Defense | 1 byte |
| 0x57 | Regen | 1 byte |

Os endereços são ilustrativos da estrutura inicial e deverão ser centralizados em configurações, nunca espalhados arbitrariamente pelo código.

As entidades terão estruturas próximas, permitindo que o jogador reconheça padrões.

## 6.4. Struct Layout

Os atributos de uma entidade devem ficar próximos uns dos outros.

Isso permite que o jogador descubra relações entre variáveis através da vizinhança de memória.

Exemplo:

Se o jogador encontra o Buffer em `0x40`, poderá observar bytes próximos e identificar possíveis atributos relacionados.

Essa propriedade é intencional.

O layout será fixo no MVP para permitir aprendizado das estruturas e previsibilidade durante os testes.

## 6.5. Dados secundários e decoys

O restante da memória será preenchido com dados que imitam valores legítimos.

Exemplo:

Se o HP do inimigo vale 40, outros endereços também poderão conter o valor 40.

Isso evita que uma pesquisa produza sempre um único resultado.

Existirão três situações conceituais:

1. Endereço que contém o atributo procurado.
2. Endereço que contém outro dado legítimo.
3. Endereço que contém dados derivados, temporários ou estruturais.

Esses dados devem possuir comportamento coerente com sua natureza.

Não criar punições aleatórias apenas porque o jogador editou o endereço errado.

---

# 7. Sistema de Scan

## 7.1. Funcionamento

Scan pesquisa um valor específico na memória.

O jogador informa o valor desejado e o sistema percorre os endereços disponíveis.

Todos os endereços que correspondem ao valor são retornados como candidatos.

Exemplo:

O jogador pesquisa `40`.

Resultados:

| Endereço | Valor |
|---|---:|
| 0x10 | 40 |
| 0x50 | 40 |
| 0x87 | 40 |
| 0xA2 | 40 |

O jogador sabe que existem quatro candidatos, mas ainda não sabe qual corresponde ao atributo desejado.

## 7.2. Regras

- Scan custa 1 AP.
- A pesquisa considera a memória inteira.
- O resultado deve preservar o endereço de cada ocorrência.
- Resultados devem ser apresentados em hexadecimal.
- A pesquisa deve aceitar valores compatíveis com o tamanho definido.
- Uma nova pesquisa pode substituir os resultados anteriores.

## 7.3. Tipos de pesquisa

Para o MVP, utilizar:

- Exact Value Scan.
- Next Scan baseado em resultados anteriores, caso necessário para a pesquisa progressiva.

A busca por valores de múltiplos bytes poderá ser implementada se o cronograma permitir.

Priorizar a pesquisa de um byte para manter o sistema simples e confiável.

---

# 8. Sistema de Refine e investigação

## 8.1. Decisão de design

Não haverá uma ação independente chamada Refine no MVP.

A razão é evitar transformar a investigação em uma sequência obrigatória de ações artificiais.

O refinamento acontece através das próprias interações com a memória.

## 8.2. Fluxo

1. O jogador realiza um Scan.
2. Recebe vários endereços candidatos.
3. Escolhe um endereço.
4. Tenta modificar seu valor.
5. Observa as consequências no programa.
6. Utiliza as informações obtidas para orientar uma nova pesquisa.

O jogador pode realizar novas pesquisas após alterações relevantes.

## 8.3. Consequências informativas

Uma edição equivocada pode revelar:
- Outro atributo.
- Uma variável secundária.
- Um valor temporário.
- Uma relação entre endereços.
- Uma estrutura de dados próxima.

O objetivo é fazer com que a experimentação tenha valor informativo.

O jogador não deve ser obrigado a utilizar uma operação específica de filtragem para progredir.

---

# 9. Sistema de Edit

## 9.1. Conceito

Edit permite modificar diretamente um endereço da memória.

É uma das mecânicas centrais do jogo.

O jogador seleciona um endereço e informa o novo valor.

O sistema aplica a alteração ao estado correspondente.

## 9.2. Regras

- Edit custa 1 AP.
- O endereço deve existir na memória.
- O valor deve ser válido para o tamanho do campo.
- A alteração deve ser registrada no log.
- O sistema deve verificar as regras de proteção.
- O sistema deve atualizar os atributos afetados.
- Cada edição deve respeitar as restrições do campo.

## 9.3. Manipulação limitada

A manipulação será limitada por regras de integridade dos dados.

Não será permitido modificar arbitrariamente qualquer atributo sem considerar sua natureza.

Exemplos:

- Buffer: editável.
- Core: protegido contra edição direta.
- Attack: editável, respeitando limites.
- Defense: editável, respeitando limites.
- Flags de comportamento: editáveis quando definidas como manipuláveis.
- Dados estruturais: podem produzir efeitos não convencionais.

Os limites específicos de cada campo devem ser configuráveis.

## 9.4. Rate limit

Cada atributo poderá receber no máximo uma edição por turno.

O objetivo é impedir que o jogador concentre todas as ações em uma única variável e produza alterações excessivas.

O controle deve considerar o atributo lógico, não apenas o endereço.

Isso evita contornar o limite editando bytes diferentes da mesma estrutura.

---

# 10. Decoys, erros e comportamento inesperado

## 10.1. Princípio fundamental

Uma edição incorreta não deve simplesmente resultar em dano arbitrário ou em uma punição artificial.

Estamos simulando engenharia reversa de um programa.

O jogador editou um endereço sem compreender completamente o que aquele endereço representa.

O resultado deve decorrer dos dados e das relações existentes no programa.

## 10.2. Tipos de resultado

### A. Encontrou outro atributo legítimo

O endereço não corresponde ao atributo procurado, mas representa outra variável.

Exemplo:

O jogador procura HP e modifica um endereço que na realidade representa regeneração.

Resultado:
- O HP não muda.
- A regeneração é alterada.
- O jogador descobre outra propriedade do inimigo.

Essa consequência pode ser positiva ou negativa dependendo da situação.

### B. Modificou um valor derivado ou temporário

O endereço representa um valor utilizado internamente pelo programa, mas que pode ser recalculado.

Exemplo:

O jogador modifica um valor temporário de defesa.

Resultado:
- A defesa muda momentaneamente.
- O programa recalcula o valor no próximo evento.
- A edição é sobrescrita.

Isso representa uma modificação que não persistiu.

### C. Modificou dados estruturais

O endereço pertence a uma região estrutural ou contém dados interpretados de maneira diferente.

Resultado possível:
- Um atributo fica incorreto.
- Uma propriedade apresenta comportamento inesperado.
- Uma entidade sofre um bug simulado.
- Um estado lógico fica inconsistente.

Esses efeitos devem ser controlados pelo motor do jogo.

**Não provocar crashes reais da aplicação ou corrupção do ambiente de execução.**

## 10.3. Descobertas acidentais

O jogador deve poder descobrir informações através de tentativas incorretas.

Exemplo:

1. Pesquisa por HP.
2. Encontra quatro candidatos.
3. Edita um candidato.
4. O HP não muda.
5. A regeneração diminui.
6. O jogador identifica que aquele endereço representa outra variável.

Esse resultado não é simplesmente um erro.

É uma descoberta.

## 10.4. Feedback

O log deve informar as consequências observáveis.

Não deve revelar automaticamente o endereço correto ou a identidade completa de um decoy.

Exemplo:

- "A estrutura do inimigo apresentou comportamento inesperado."
- "A regeneração do Slime foi alterada."
- "O valor modificado foi sobrescrito pelo programa."
- "Uma variável secundária parece ter sido afetada."

O jogador precisa deduzir o que aconteceu.

---

# 11. Sistema de caos

## 11.1. Conceito

O Grid pode apresentar comportamentos dinâmicos.

Nem toda alteração precisa produzir apenas o efeito diretamente esperado.

A proposta é trabalhar com caos misto.

Existem três categorias:

### Caos ambiental

Eventos que acontecem independentemente das decisões dos jogadores.

### Caos provocado

Consequências produzidas pelas próprias ações de manipulação.

### Caos reativo

Uma alteração desencadeia outro comportamento do programa.

## 11.2. Aplicação no MVP

O MVP deverá priorizar o caos provocado.

Os outros tipos podem aparecer de forma limitada através dos comportamentos específicos dos inimigos.

Não implementar um sistema complexo de eventos aleatórios, corrupção global ou regras mutáveis nesta primeira versão.

O caos deve decorrer das estruturas de memória e das propriedades das entidades.

## 11.3. Regras de balanceamento

- Os efeitos devem ser compreensíveis.
- A aleatoriedade deve ser controlada.
- Eventos não podem decidir partidas sozinhos.
- Consequências devem ter relação com a ação que as provocou.
- O sistema deve ser compatível com a futura simetria do PvP.

---

# 12. Proteção e integridade

A proteção é uma ferramenta defensiva.

Ela permite impedir temporariamente alterações em atributos importantes.

No MVP:
- Proteção é uma ação.
- Custa 1 AP.
- Tem duração limitada.
- Não deve tornar um jogador permanentemente imune à manipulação.
- Deve funcionar de maneira consistente para todas as entidades.

A proteção deverá ser implementada como uma regra do sistema de edição, não como uma alteração visual sem efeito.

---

# 13. Inimigos do MVP

Cada inimigo será definido por dados.

A lógica de combate não deverá conter grandes blocos condicionais exclusivos para cada criatura.

O objetivo é permitir adicionar novos inimigos posteriormente sem reescrever o sistema central.

## 13.1. Slime

**Identidade:** criatura básica com regeneração.

Atributos iniciais:

| Atributo | Valor |
|---|---:|
| HP | 40 |
| Attack | 5 |
| Defense | 2 |
| Regen | 5 |

Comportamento:
- Prioriza ataques simples.
- Pode utilizar regeneração.
- Possui comportamento previsível.
- É o primeiro inimigo do jogador.

Objetivo opcional:
- Reduzir ou neutralizar sua regeneração.

O Slime serve como introdução às mecânicas de Scan e Edit.

## 13.2. Skeleton

**Identidade:** inimigo defensivo.

Atributos iniciais:

| Atributo | Valor |
|---|---:|
| HP | 25 |
| Attack | 8 |
| Defense | 10 |

Comportamento:
- Possui defesa elevada.
- Pode investir em ações defensivas.
- Pode atacar quando houver oportunidade.

Objetivo opcional:
- Reduzir sua defesa.

O Skeleton introduz a necessidade de compreender relações entre atributos.

## 13.3. Zombie

**Identidade:** inimigo resistente com comportamento especial.

Atributos iniciais:

| Atributo | Valor |
|---|---:|
| HP | 60 |
| Attack | 6 |
| Defense | 3 |

Comportamento:
- Possui resistência maior.
- Pode interferir nos atributos do jogador.
- Possui uma flag de ressurreição.

Regra especial:
- Uma vez por batalha, pode retornar com 1 HP quando derrotado, caso sua flag de ressurreição esteja ativa.

Objetivo opcional:
- Encontrar e desativar a flag de ressurreição.

O Zombie introduz a descoberta de variáveis que não são atributos numéricos convencionais.

---

# 14. Inteligência artificial dos inimigos

## 14.1. Filosofia

Não haverá IA treinada ou sistema complexo de tomada de decisões.

Os inimigos utilizarão uma seleção probabilística ponderada de ações.

Isso permite comportamentos diferentes sem aumentar significativamente o escopo.

## 14.2. Ações possíveis

- Attack.
- Protect.
- Regenerate.
- Scan.
- Edit.

Nem todos os inimigos precisam utilizar todas as ações.

## 14.3. Pesos

Cada inimigo possui pesos configuráveis.

Exemplo conceitual:

Slime:
- Attack: 70%.
- Regenerate: 30%.

Skeleton:
- Attack: 50%.
- Protect ou buff defensivo: 30%.
- Scan: 20%.

Zombie:
- Attack: 60%.
- Manipulação de atributos do jogador: 40%.

Os pesos deverão ser ajustados durante os testes.

## 14.4. Regras

- A IA não pode realizar ações inválidas.
- A IA respeita as regras gerais do combate.
- A IA utiliza a mesma representação de memória.
- O log informa o efeito das ações.
- O jogador não recebe automaticamente os endereços utilizados pelo inimigo.

---

# 15. Informação assimétrica

Um dos elementos estratégicos do jogo é a diferença entre saber o que aconteceu e saber exatamente onde aconteceu.

O jogador deve conseguir observar os efeitos das ações adversárias, mas não necessariamente descobrir os endereços utilizados.

Exemplo:

Log do inimigo:

"Slime realizou uma alteração na memória. Seu Attack foi reduzido de 10 para 8."

O jogador sabe:
- Que houve uma alteração.
- Qual atributo foi afetado.
- Qual foi o resultado.

Mas não sabe:
- Qual endereço foi utilizado.
- Como o inimigo encontrou esse endereço.

Essa assimetria é importante para a futura experiência competitiva.

---

# 16. Ferramentas iniciais

No início de cada run, o jogador poderá escolher uma ferramenta.

A versão mínima terá três opções.

| Ferramenta | Efeito | Perfil |
|---|---|---|
| Scanner+ | Um Scan gratuito por combate | Investigação |
| Firewall | Um Protect gratuito por combate | Defesa |
| Injector | Uma edição que ignora uma proteção aplicável por combate | Manipulação |

Cada ferramenta possui um uso gratuito por combate.

O uso deve ser controlado por estado.

Não implementar árvore de habilidades, níveis de ferramentas ou customização extensa no MVP.

---

# 17. Interface e experiência do usuário

## 17.1. Layout principal

A interface deverá ser dividida em duas áreas. As duas usando ASCII e Emojis de forma bem básica. A parte superior vai ser a batalha, onde o herói fica na esquerda, inimigo na direita. A área de baixo é inteiramente reservada para o grid hexadecimal

### Área de batalha

Apresenta:
- Personagem do jogador.
- Inimigo atual.
- Barras de Buffer e Core.
- Atributos conhecidos.
- Action Points disponíveis.
- Botões de ação.
- Log de combate.

### Área de memória

Apresenta:
- Campo de pesquisa.
- Tipo de pesquisa.
- Resultados encontrados.
- Endereços candidatos.
- Vizinhança dos resultados.
- Editor de valores.
- Visualização hexadecimal.

## 17.2. Visualização do Grid

A visualização principal utilizará o modelo híbrido:

**Resultados + vizinhança.**

O jogador verá:
- Endereços retornados pela pesquisa.
- Valores correspondentes.
- Bytes próximos aos candidatos.

Não deverá visualizar obrigatoriamente os 256 bytes simultaneamente durante o combate normal.

Isso evita que o jogador encontre os atributos simplesmente percorrendo a tela.

## 17.3. Tutorial

No tutorial, será permitido apresentar o Grid completo.

O objetivo é facilitar a compreensão inicial.

O tutorial deve ensinar:
- O que é um endereço.
- Como pesquisar valores.
- Como interpretar resultados.
- Como editar um valor.
- Como observar consequências.

As explicações educacionais devem ficar concentradas nessa experiência inicial.

## 17.4. Feedback visual

A interface deve destacar:
- Ataques.
- Dano recebido.
- Alterações de atributos.
- Proteções.
- Modificações bem-sucedidas.
- Efeitos inesperados.
- Vitória e derrota.

Priorizar feedback funcional antes de animações complexas.

---

# 18. Sistema de pontuação

O jogo deverá apresentar uma pontuação ao final da run (ao morrer).

A pontuação deve recompensar:
- Vitória.
- Eficiência.
- Cumprimento de objetivos opcionais.
- Preservação de HP.
- Bom desempenho durante os combates.

Proposta inicial:

`score_mob = base + objective_bonus + turn_bonus + hp_bonus`

Valores de referência:

| Componente | Pontuação |
|---|---:|
| Base por vitória | 50 |
| Objetivo opcional | 30 |
| Eficiência | Até 20 |
| HP restante | Até 20 |

Multiplicador de run:

| Objetivos concluídos | Multiplicador |
|---|---:|
| 0 | ×1.0 |
| 1 | ×1.2 |
| 2 | ×1.5 |
| Todos | ×2.0 |

Fórmula:

`final_score = sum(mob_scores) * run_multiplier`

A implementação deverá evitar multiplicadores que tornem a pontuação inconsistente.

A tela final deverá apresentar o detalhamento por inimigo.

---

# 19. Regras gerais de integridade

As seguintes regras devem ser respeitadas pelo motor de combate:

1. Nenhuma entidade pode possuir atributos fora dos limites definidos.
2. Core não pode ser modificado diretamente.
3. Buffer nunca pode ultrapassar seu máximo.
4. Ataques devem aplicar dano corretamente.
5. Edições devem respeitar os tipos e limites dos campos.
6. Edições devem respeitar proteção e rate limit.
7. A memória e o estado lógico devem permanecer sincronizados.
8. Ações inválidas não devem consumir AP indevidamente.
9. Ações devem produzir resultados determinísticos, exceto quando uma regra explicitamente utilizar aleatoriedade.
10. A vitória ou derrota deve ser verificada após as ações e efeitos pertinentes.

---

# 20. Arquitetura técnica

## 20.1. Stack

O MVP deverá utilizar:

- HTML.
- CSS.
- JavaScript.
- NodeJS
- Outras frameworks se precisar
- React.

O jogo deverá funcionar no navegador.

## 20.2. Organização de arquivos

Estrutura sugerida:

```text
HEXploit/
│
├── index.html
│
├── css/
│   ├── style.css
│   ├── battle.css
│   └── memory.css
│
├── js/
│   ├── main.js
│   ├── memory.js
│   ├── combat.js
│   ├── render.js
│   ├── mobs.js
│   ├── tools.js
│   ├── scoring.js
│   └── tutorial.js
│
└── assets/
    ├── characters/
    ├── enemies/
    ├── icons/
    └── effects/
```

Os arquivos podem ser reorganizados conforme a divisão de trabalho do grupo, mas as responsabilidades devem permanecer separadas.

## 20.3. memory.js

Responsável por:
- Inicializar a memória.
- Gerar os dados secundários.
- Registrar os endereços.
- Executar Scan.
- Executar pesquisas subsequentes.
- Executar Edit.
- Validar alterações.
- Retornar consequências.

Não deve controlar a interface diretamente.

## 20.4. combat.js

Responsável por:
- Estado do combate.
- Turnos.
- Action Points.
- Ataques.
- Dano.
- Buffer e Core.
- Proteção.
- Efeitos de estado.
- Aplicação das consequências de edição.
- IA dos inimigos.
- Verificação de vitória e derrota.

Não deve manipular elementos do DOM.

## 20.5. render.js

Responsável por:
- Interface da batalha.
- Barras de HP.
- Grid.
- Resultados de Scan.
- Editor hexadecimal.
- Logs.
- Animações.
- Atualização visual.

Deve receber o estado do jogo e representá-lo.

## 20.6. mobs.js

Responsável por armazenar as configurações dos inimigos.

Cada inimigo deve ser representado por dados.

Exemplo:

```js
const slime = {
  id: "slime",
  name: "Slime",
  hp: 40,
  atk: 5,
  def: 2,
  regen: 5,
  gimmick: "regeneration",
  aiWeights: {
    attack: 0.7,
    regenerate: 0.3
  }
};
```

Adicionar um inimigo não deve exigir reescrever o motor principal de combate.

## 20.7. tools.js

Responsável por:
- Ferramentas iniciais.
- Usos disponíveis.
- Efeitos especiais.
- Controle de consumo por combate.

## 20.8. scoring.js

Responsável por:
- Pontuação individual.
- Bônus.
- Multiplicadores.
- Resultado final.

## 20.9. tutorial.js

Responsável por:
- Etapas do tutorial.
- Dicas.
- Explicações.
- Progressão do tutorial.

---

# 21. Contrato de estado

O estado do jogo deverá ser centralizado.

Estrutura conceitual:

```js
const gameState = {
  turn: 1,
  currentPlayer: "player",
  phase: "battle",

  memory: [],

  player: {
    buffer: 100,
    maxBuffer: 100,
    core: 100,
    atk: 10,
    def: 2,
    ap: 3,
    maxAP: 3
  },

  enemy: {
    id: "slime",
    buffer: 40,
    maxBuffer: 40,
    core: 40,
    atk: 5,
    def: 2,
    regen: 5,
    ap: 2
  },

  memoryMetadata: {
    playerAddresses: {},
    enemyAddresses: {},
    decoys: []
  },

  scanResults: [],

  protection: null,

  usedTools: [],

  log: [],

  score: 0
};
```

Essa estrutura é uma referência inicial.

O contrato definitivo deve ser estabelecido antes da implementação paralela.

## 21.1. Sincronização

Duas operações conceituais são fundamentais:

`syncToMemory()`

Atualiza a memória quando atributos mudam naturalmente por combate.

`syncFromMemory()`

Atualiza o estado lógico quando uma edição válida modifica um atributo.

O sistema precisa definir claramente qual componente é responsável por cada atualização.

Não permitir que uma atualização automática sobrescreva uma edição legítima do jogador.

## 21.2. Ações como comandos

As ações devem ser representadas por objetos.

Exemplo:

```js
const action = {
  type: "edit",
  address: 0x54,
  value: 0x00
};
```

O fluxo deverá ser:

```text
Receber comando
      |
      v
Validar comando
      |
      v
Aplicar ao estado
      |
      v
Atualizar memória
      |
      v
Verificar consequências
      |
      v
Renderizar resultado
```

Essa separação permitirá implementar PvP futuramente sem reescrever a lógica central.

---

# 22. PvP futuro: requisitos arquiteturais

O PvP não será implementado no MVP.

Entretanto, a arquitetura deverá evitar decisões que impeçam sua implementação.

Princípios:

- Turnos explícitos.
- Estado centralizado.
- Ações representadas como comandos.
- Memória compartilhada como estado de combate.
- Regras de edição independentes da interface.
- Validação centralizada.
- Logs de ações.
- Ausência de dependência de tempo real.

No futuro, o sistema poderá substituir a entrada local por comunicação entre jogadores.

A implementação online exigirá validação no servidor e controle autoritativo do estado.

Não confiar em modificações declaradas pelo cliente adversário.

---

# 23. Escopo do MVP

## 23.1. Obrigatório

- [ ] Tela inicial.
- [ ] Introdução narrativa curta.
- [ ] Tutorial funcional.
- [ ] Escolha de ferramenta.
- [ ] Boss Rush PvE.
- [ ] Três inimigos.
- [ ] Sistema de turnos.
- [ ] Action Points.
- [ ] Attack.
- [ ] Scan.
- [ ] Edit.
- [ ] Protect.
- [ ] Memória hexadecimal.
- [ ] Resultados de pesquisa.
- [ ] Visualização de vizinhança.
- [ ] Dados secundários e decoys.
- [ ] Consequências de edições incorretas.
- [ ] Buffer e Core.
- [ ] Regeneração.
- [ ] IA probabilística.
- [ ] Log de combate.
- [ ] Objetivos opcionais
- [ ] Pontuação.
- [ ] Tela de vitória e derrota.

## 23.2. Fora do MVP

- PvP online.
- WebSocket.
- Sistema de contas.
- Banco de dados.
- Árvore de habilidades.
- Classes.
- Equipamentos.
- Inventário complexo.
- Progressão extensa.
- Novos inimigos além dos três iniciais.
- Sistema complexo de eventos globais.
- Super-ações avançadas.
- Campanha narrativa extensa.
- Personalização visual avançada.

## 23.3. Ideias para versões futuras

- Mirror e outras consequências de manipulação.
- Novos tipos de estruturas de memória.
- Mais inimigos.
- Bosses com layouts especiais.
- Ferramentas avançadas.
- PvP online.
- Sistema de builds.
- Modificações de regras do Grid.
- Eventos de caos mais elaborados.

---

# 24. Testes e critérios de aceitação

O MVP só estará funcional quando os seguintes testes forem aprovados.

## 24.1. Testes de memória

- [ ] A memória é inicializada corretamente.
- [ ] Os atributos estão nos endereços definidos.
- [ ] Scan encontra todas as ocorrências válidas.
- [ ] Resultados exibem endereços corretos.
- [ ] Edit modifica os valores esperados.
- [ ] Valores inválidos são rejeitados.
- [ ] Decoys podem ser encontrados.
- [ ] A vizinhança de memória é apresentada corretamente.

## 24.2. Testes de combate

- [ ] Ataques aplicam dano correto.
- [ ] Buffer absorve dano antes do Core.
- [ ] Core não pode ser editado.
- [ ] Regeneração respeita o limite máximo.
- [ ] AP é consumido corretamente.
- [ ] Proteção funciona.
- [ ] Vitória e derrota são detectadas corretamente.

## 24.3. Testes de decoys

- [ ] Editar um atributo diferente produz a consequência correspondente.
- [ ] Valores temporários podem ser sobrescritos.
- [ ] Dados estruturais podem provocar efeitos simulados.
- [ ] Consequências são registradas no log.
- [ ] Uma edição incorreta não provoca crash real da aplicação.

## 24.4. Testes de experiência

- [ ] Um jogador novo consegue completar o tutorial.
- [ ] É possível compreender as ações disponíveis.
- [ ] O jogador consegue vencer os três inimigos.
- [ ] Cada inimigo apresenta uma experiência diferente.
- [ ] A investigação não se torna uma sequência excessivamente repetitiva.
- [ ] A pontuação final é exibida corretamente.

---

# 25. Planejamento de desenvolvimento

O desenvolvimento deve priorizar integração antecipada.

## Etapa 1 — Fundação

Implementar:
- Estado central.
- Memória.
- Endereços.
- Scan.
- Edit.
- Sincronização.

Resultado esperado: modificar um endereço realmente altera um atributo.

## Etapa 2 — Primeiro combate

Implementar:
- Slime.
- Ataque.
- HP.
- Buffer e Core.
- Turnos.
- AP.
- Log.

Resultado esperado: combate completo, ainda sem acabamento visual.

## Etapa 3 — Investigação e decoys

Implementar:
- Resultados de pesquisa.
- Vizinhança.
- Decoys.
- Consequências de edição.
- Feedback.

Resultado esperado: experimentar a memória gera descobertas e consequências coerentes.

## Etapa 4 — Expansão de conteúdo

Implementar:
- Skeleton.
- Zombie.
- IA probabilística.
- Ferramentas.
- Objetivos opcionais.

Resultado esperado: três combates distintos.

## Etapa 5 — Interface e finalização

Implementar:
- Tutorial.
- Animações.
- Interface final.
- Pontuação.
- Tela de vitória e derrota.
- Ajustes de balanceamento.

## Etapa 6 — Deploy e QA

- Testar no navegador de destino.
- Testar o deploy na VM.
- Verificar todos os fluxos.
- Corrigir bugs.
- Realizar pelo menos um teste com alguém que não participou do desenvolvimento.

---

# 26. Divisão de trabalho sugerida

Para um grupo de quatro pessoas:

| Integrante | Responsabilidade |
|---|---|
| A | Memória, Scan, Edit e sincronização |
| B | Interface, Grid e CSS |
| C | Inimigos, ferramentas, tutorial e conteúdo |
| D | Combate, integração, testes e deploy |

A divisão deve ocorrer após a definição dos contratos de funções.

Todos os integrantes devem trabalhar utilizando os mesmos nomes de propriedades, eventos e estruturas.

Evitar arquivos duplicados com regras diferentes.

---

# 27. Decisões ainda pendentes

Os seguintes pontos precisam ser validados antes de considerar a especificação técnica completamente congelada.

| Questão | Proposta inicial |
|---|---|
| Tamanho definitivo da memória | 256 bytes |
| Busca de múltiplos bytes | Opcional |
| Custo de Attack | 1 AP |
| Duração de Protect | Até o próximo turno adversário |
| Limites de Attack e Defense | Configuráveis por entidade |
| Buffer máximo e Core inicial | Definidos por inimigo |
| Regeneração do Buffer | +5 por turno, limitada ao máximo |
| Consequências estruturais | Simuladas pelo motor |
| Eventos ambientais de caos | Limitados no MVP |
| Distribuição dos decoys | Aleatória entre runs |
| Layout principal | Resultados + vizinhança |
| Grid completo | Disponível no tutorial |
| Pontuação | Fórmula proposta na seção 18 |

Esses pontos não devem ser implementados com comportamentos contraditórios entre módulos.

---

# 28. Critério definitivo de sucesso

O MVP será considerado bem-sucedido quando:

1. O jogador compreender como investigar a memória.
2. As alterações tiverem consequências reais.
3. A investigação produzir decisões interessantes.
4. Os inimigos apresentarem desafios diferentes.
5. O combate for divertido mesmo sem explicações pedagógicas constantes.
6. O jogador sentir que está explorando e manipulando as regras internas do jogo.
7. A arquitetura permitir expandir o projeto futuramente.

O principal teste não é perguntar se o jogador aprendeu o que é hexadecimal.

É perguntar:

**"Foi divertido descobrir como quebrar o funcionamento daquele inimigo?"**

---

# 29. Resumo executivo

HEXploit é um RPG medieval de estratégia por turnos baseado em manipulação de memória.

O jogador enfrenta três inimigos em uma sequência de batalhas, utilizando uma interface hexadecimal para investigar e modificar atributos.

A memória é parte real do estado do combate. Scan identifica candidatos, Edit modifica valores e as consequências dependem da natureza dos dados encontrados.

Endereços incorretos não são simplesmente armadilhas arbitrárias: podem representar outros atributos, valores temporários ou dados estruturais que produzem comportamentos inesperados.

O combate utiliza Action Points, ataques convencionais, proteção, Buffer e Core.

Os inimigos possuem comportamentos distintos definidos por dados e seleção probabilística de ações.

A ambientação é medieval, leve e humorística, com o CheatWizard como mentor responsável por introduzir o protagonista à manipulação do Grid.

O MVP prioriza:
- Um sistema de memória funcional.
- Um combate estratégico.
- Três inimigos.
- Consequências coerentes de edição.
- Uma interface hexadecimal.
- Uma experiência jogável e completa.

PvP, progressão extensa e sistemas avançados ficam para versões futuras.

**Princípio central do projeto:**

*HEXploit não é um RPG em que você utiliza ferramentas de hacking. É um jogo em que a própria manipulação da memória é a forma de jogar.*
