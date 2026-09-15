O catálogo do planner contém **apenas as missões conferidas nos prints da janela de missão do jogo**, guardados em `docs/quests/<frequência>/<local>/`. Cada linha abaixo tem um print correspondente; missão sem print não entra no catálogo.

São **12 diárias** e **9 semanais**. Títulos, objetivos e recompensas foram transcritos do próprio jogo, então o texto aqui é o texto que a janela de missão mostra.

> Ao acrescentar uma missão, coloque o print em `docs/quests/` no mesmo padrão de pasta e atualize esta tabela junto com `QUEST_GROUPS` em `lib/data.ts`.

---

### Ilha de Iliya

| Frequência  | NPC    | Missão                                                           | Objetivo                                             | Recompensas                                                                                                                                                                                                                       |
| ----------- | ------ | ---------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diária      | Dario  | **[Permuta][Diário] Transporte de Suprimentos (Olho da Okilua)** | Entregar Suprimentos para Ravikel no Olho da Okilua  | **Artefato Cox (Negociação de Baixo Nível) x2**, Moeda Corvo x100, EXP Navegação/Permuta                                                                                                                                            |
| Diária      | Dario  | **[Permuta][Diário] Novas Ilhas, Novos Horizontes**              | Fazer 20 Permutas                                    | Moeda Corvo x50, Caixa de Bens Comerciais Perdida x1, Parte de Bússola de Explorador x1                                                                                                                                             |
| Diária      | Aldeão | **[Permuta][Diário] Ilha de Iliya Agitada**                      | Fazer **15 Permutas**                                | **Madeira Compensada Revestida de Rubus Aprimorada x10**, **Artefato Cox (Negociação de Alto Nível) x1**, **Cristal de Pérola Pura x2**, **Cola com Memórias do Mar Profundo x8**, **Escultura de Recife Puro x8**, Moeda Corvo x50 |
| **Semanal** | Friko  | **[Permuta][Semanal] Centro de Permuta, Ilha de Iliya**          | Fazer **100 Permutas**                               | Moeda Corvo x200, Baú Misterioso de Permuta x3                                                                                                                                                                                      |

O Transporte de Suprimentos tem tempo limite: os suprimentos estragam.

---

### Velia

Sobrou uma única diária de Velia com print. O print está arquivado em `docs/quests/diaria/olho-da-okilua/transporte-suprimentos-iliya.png`, mas o texto da própria missão diz que quem pede é **Croix, da Vila Velia** — é por isso que ela fica em Velia no catálogo.

| Frequência | NPC   | Missão                                                          | Objetivo                                       | Recompensas                                                                     |
| ---------- | ----- | --------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| Diária     | Croix | **[Permuta][Diário] Transporte de Suprimentos (Ilha de Iliya)** | Entregar Suprimentos para Dario na Ilha de Iliya | **Artefato Cox (Negociação de Baixo Nível) x1**, Moeda Corvo x50, EXP Navegação/Permuta |

---

### Olho da Okilua

É a região com mais missões relevantes para **Carraca e materiais de navio**.

| Frequência  | NPC     | Missão                                                             | Objetivo                                                        | Recompensas                                                                                                             |
| ----------- | ------- | ------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Diária      | Soldado | **[Diário] A guilda não é uma instituição de caridade**            | Expulsar 2 Rei do Mar Jovem no lado sul                         | Moeda de Okilua x1 + escolha: **Madeira de Construção com um Brilho de Onda x5** OU Madeira Compensada de Onda Violenta x1 |
| Diária      | Soldado | **[Diário] Preciso proteger pelo menos o meu corpo**               | Expulsar Hekaru no lado noroeste                                | Moeda de Okilua x1 + escolha: **Artefato Cox (Combate) x3** OU Suporte com Acabamento Elaborado x1                        |
| Diária      | Soldado | **[Diário] Bom para você, bom para mim**                           | Expulsar o Perseguidor do Oceano no lado noroeste               | Moeda de Okilua x1 + escolha: Madeira de Construção Azul-Marinho x4 OU Cola com Traços de Onda x1                         |
| Diária      | Ravikel | **[Diário] Caçador de Rei do Mar Jovem da Lua Minguante**          | Expulsar 5 Rei do Mar Jovem no lado sul                         | **Madeira Compensada Gravada com Escama da Lua x10**, Tecido de Linho da Lua x3, **Olho Abissal x1**, Moeda de Okilua x3  |
| Diária      | Ravikel | **[Diário] Caçador de Kandidum da Guilda Lua Minguante**           | Coletar a Amostra de Escama de Kandidum no norte distante       | Moeda Corvo x100, Moeda de Okilua x1 + escolha: Pedra Negra da Onda x14 OU Madeira Compensada de Onda Violenta x1         |
| Diária      | Ravikel | **[Diário] Caçador de Nineshark da Guilda Lua Minguante**          | Expulsar o Nineshark no noroeste distante                       | Moeda Corvo x100, Moeda de Okilua x1 + escolha: Pedra Negra da Onda x14 OU Suporte com Acabamento Elaborado x1            |
| Diária      | Ravikel | **[Diário] Caçador de Dente de Aço Negro da Guilda Lua Minguante** | Coletar Carne Magra dos Dente de Aço Negro no oeste distante    | Moeda Corvo x100, Moeda de Okilua x1 + escolha: Pedra Negra da Onda x14 OU Cola com Traços de Onda x1                     |
| Diária      | Hae-Ran | **[Diário] Monstros que Bloqueiam a Rota Marítima**                | Eliminar 2 Dente de Aço Negro e 2 Nineshark da Onda Negra       | Moeda Corvo x200 + escolha: Água Fresca Alaranjada / Cristalina / Dourada de Okilua x1                                    |
| **Semanal** | Kario   | **[Semanal] Você quer ficar em Okilua?**                           | Entregar Peixe-Espada Amarelo x1                                | Moeda de Okilua x10                                                                                                      |
| **Semanal** | Kario   | **[Semanal] Para o bem dos jovens Vendedores Lontras**             | Entregar Fragmento de Coral x50 e Coral Brilhante de 5 Cores x5 | **Caule de Alga Profunda x45**, **Barra de Ouro do Mar Vermelho x15**, Moeda de Okilua x15                                |
| **Semanal** | Ravikel | **[Semanal] Caçador de Kandidum**                                  | Coletar a Amostra de Escama de Kandidum no norte distante       | Moeda Corvo x500 + escolha: **Barra de Ouro do Mar Vermelho x4** OU Pedra Negra da Onda x60 OU Madeira de Onda Violenta x1 |
| **Semanal** | Ravikel | **[Semanal] Caçador de Nineshark**                                 | Expulsar o Nineshark no noroeste distante                       | Moeda Corvo x500 + escolha: **Olho Abissal x2** OU Pedra Negra da Onda x60 OU Suporte Elaborado x1                        |
| **Semanal** | Ravikel | **[Semanal] Caçador de Dente de Aço Negro**                        | Coletar Carne Magra dos Dente de Aço Negro no oeste distante    | Moeda Corvo x500 + escolha: **Artefato Cox (Combate) x6** OU Pedra Negra da Onda x60 OU Cola com Traços de Onda x1        |
| **Semanal** | Soldado | **[Relatório Semanal] Aumento da População**                       | Expulsar 20 Rei do Mar Jovem no lado sul                        | **Artefato Cox (Combate) x2**                                                                                            |
| **Semanal** | Hae-Ran | **[Semanal] Monstros Impiedosos**                                  | Eliminar 4 Dente de Aço Negro e 4 Nineshark da Onda Negra       | Moeda Corvo x500 + escolha: Água Fresca Alaranjada / Cristalina / Dourada de Okilua x3                                    |

**Exclusividade do Ravikel.** É o único NPC do catálogo com trilhas alternativas. O próprio texto da missão avisa: *"Se receber esta missão, você não poderá receber a missão '[Diário] Caçador da Guilda Lua Minguante'"* — e o recíproco aparece nas três caçadas da Guilda. Ou seja, no mesmo dia você pega **o Rei do Mar Jovem** ou **as três caçadas da Guilda (Kandidum, Nineshark e Dente de Aço Negro)**, nunca os dois lados. As semanais do Ravikel não têm essa restrição.

---

### Terra do Amanhecer

| Frequência  | Local / NPC                  | Missão                                          | Objetivo                              | Recompensas                                                                                              |
| ----------- | ---------------------------- | ----------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Semanal** | Ilha da Seda Azure / Kangman | **[Semanal] Investigar a ecologia da área de Lyngbakr** | Coletar dados de ecologia do Lyngbakr x2 | EXP Navegação, **Moeda Corvo x500**, Filé de Peixe Vermelho de Monstro Marinho x6, Essência do Oceano x3 |

A missão do Lyngbakr foi adicionada em **27/08/2026** na Ilha da Seda Azure. ([Black Desert SA][8])

---

### Fontes

Os prints da janela de missão são a fonte primária. Os links abaixo confirmam nomes de item e quantidades.

[1]: https://www.sa.playblackdesert.com/pt-br/News/Detail?countryType=pt-br&groupContentNo=6198 "[Atualização] Notas da Atualização – 15 de Maio de 2025 (qui.)"
[2]: https://bdocodex.com/pt/quest/3736/2/ "[Permuta][Diário] Transporte de Suprimentos (Olho da Okilua)"
[3]: https://bdocodex.com/pt/quest/3736/12/ "[Permuta][Diário] Ilha de Iliya Agitada"
[4]: https://www.sa.playblackdesert.com/pt-br/News/Detail?groupContentNo=5779 "[Atualização] Notas da Atualização – 06 de Fevereiro de 2025 (qui.)"
[5]: https://bdocodex.com/pt/quest/3726/1/ "[Diário] Monstros que Bloqueiam a Rota Marítima"
[6]: https://bdocodex.com/pt/quest/3707/23/ "[Diário] Caçador de Rei do Mar Jovem da Lua Minguante"
[7]: https://bdocodex.com/pt/quest/3726/2/ "[Semanal] Monstros Impiedosos"
[8]: https://www.sa.playblackdesert.com/pt-br/News/Detail?countryType=pt-br&groupContentNo=8511 "[Atualização] Notas da Atualização – 27 de Agosto de 2026 (qui.)"
