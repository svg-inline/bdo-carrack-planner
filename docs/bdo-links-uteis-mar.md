Para conteúdo exclusivamente de mar, navegação, permuta, barcos e Carraca, eu ficaria com estas fontes:

1. Black Desert SA — Wiki oficial
   Principal fonte para nomes PT-BR, sistemas atuais, barcos, Carracas, Navegação e Permuta.
   - Navegação e Permuta: [Guia oficial de Navegação e Permuta](https://www.sa.playblackdesert.com/pt-BR/Wiki?wikiNo=321&utm_source=chatgpt.com)
   - Melhorias em Navios/Carracas: [Guia oficial de Melhorias em Navios](https://www.sa.playblackdesert.com/pt-br/Wiki?wikiNo=291&utm_source=chatgpt.com)
   - Grande Expedição: [Guia oficial da Grande Expedição](https://www.sa.playblackdesert.com/pt-BR/Wiki?wikiNo=173&utm_source=chatgpt.com)

   É a fonte prioritária para:
   - Veleiro/Fragata
   - Navio Mercante
   - Contratorpedeiro
   - 4 Carracas
   - Panokseon
   - habilidades de Navegação
   - marinheiros
   - Permuta
   - materiais de navio
   - Loja de Moeda Corvo
   - materiais de Carraca. ([Black Desert SA][1])

2. Black Desert SA — Notícias / Patch Notes
   Essencial porque a Wiki nem sempre acompanha imediatamente alterações de custos, quests e recompensas.
   Use para:
   - novas diárias/semanais marítimas
   - mudanças de Moeda Corvo
   - mudanças de Permuta
   - novos materiais
   - alterações de Carraca
   - eventos de Navegação
   - Passe de Navegação.

3. BDO Codex PT-BR
   [BDO Codex PT-BR](https://bdocodex.com/pt/?utm_source=chatgpt.com)

   Para o sistema que estamos fazendo, provavelmente é a segunda fonte mais importante depois da Pearl Abyss. Permite mapear:
   - ID real dos itens
   - nome PT-BR
   - ícone
   - descrição
   - como obter
   - quests relacionadas
   - NPC
   - processamento
   - receitas
   - equipamentos de navio
   - stats dos barcos
   - materiais das Carracas
   - equipamentos Toro/Shiro.

   Por exemplo, ele expõe diretamente os dados da Carraca Equilíbrio e Bravura, incluindo navio anterior e materiais necessários. ([BDO Codex][2])

   Também é excelente para descobrir todas as fontes de um material. `Artefato dos Piratas Cox(Combate)`, por exemplo, lista processamento, Loja Corvo, diária, semanal, monstros e Permuta. ([BDO Codex][3])

4. Black Desert Foundry
   [Black Desert Foundry](https://www.blackdesertfoundry.com/?utm_source=chatgpt.com)

   Eu usaria principalmente os guias:
   - Bartering Guide
   - Sailing Guide
   - Ship Upgrade Guide
   - Carrack Guide
   - Ship Gear.

   É muito útil para explicar a progressão prática, enquanto Codex é melhor para dados brutos. O guia de Permuta foi atualizado em janeiro de 2026 e cobre inclusive a progressão até Caravel/Galleass e Carraca. ([Black Desert Foundry][4])

5. Garmoth
   [Garmoth](https://garmoth.com/?utm_source=chatgpt.com)

   Menos importante que Codex para Carraca, mas útil para:
   - ferramentas
   - equipamentos
   - alguns dados de itens
   - comparação/planejamento
   - confirmação cruzada de conteúdo.

6. BDOLytics
   [BDOLytics](https://bdolytics.com/?utm_source=chatgpt.com)

   Complementar para:
   - itens
   - processamento
   - materiais
   - preços
   - relações entre receitas.

   Não usaria como fonte principal de Permuta/Carraca.

7. GrumpyG / GrumpyGreen
   [GrumpyG BDO Guides](https://grumpygreen.cricket/?utm_source=chatgpt.com)

   Bom como terceira fonte para:
   - Sailing
   - Bartering
   - Carrack
   - ship gear
   - sailors
   - sea monster hunting.

   Eu usaria para explicações e estratégias, não como banco de dados canônico.

8. `bdo-data-extractor` + arquivos do próprio jogo
   Para nosso projeto, isso é extremamente importante.

   Os arquivos locais permitem obter diretamente:
   - itens
   - nomes/localização PT
   - ícones
   - quests
   - NPCs
   - recipes
   - processing
   - mapas
   - regiões
   - dados de navios disponíveis no client.

   O extractor já possui parsers de items, recipes, NPCs, world, regions e outras tabelas que podem alimentar nosso sistema sem depender de scraping.

Para o nosso projeto de Carraca, eu usaria esta prioridade:

**1. Pearl Abyss SA → 2. BDO Codex → 3. arquivos locais/extractor → 4. Black Desert Foundry → 5. Garmoth/BDOLytics/GrumpyG como validação.**

Para esse nicho específico, APIs de Mercado Central como Velia Inn ou BlackDesertMarket têm utilidade bem menor, porque a maior parte dos materiais de Carraca/Permuta não depende do Mercado Central tradicional.

[1]: https://www.sa.playblackdesert.com/pt-BR/Wiki?wikiNo=321&utm_source=chatgpt.com "[Guia do Aventureiro] Navegação e Permuta | Black Desert SA"
[2]: https://bdocodex.com/pt/mount/31055/?utm_source=chatgpt.com "Carraca de Epheria: Equilíbrio"
[3]: https://bdocodex.com/pt/item/5824/?utm_source=chatgpt.com "Artefato dos Piratas Cox(Combate)"
[4]: https://www.blackdesertfoundry.com/bartering-guide/?utm_source=chatgpt.com "Bartering Lifeskill Guide - BDFoundry"
