import type { CarrackDefinition, CarrackGearDefinition, CarrackTarget, GearDefinition, GearKey, MaterialDefinition, MaterialId, QuestCadence, QuestCadenceDefinition, QuestDefinition, QuestGroupDefinition, ShipBranch } from "@/types";

const req = (gradual: number, equilibrio: number, ascensao: number, bravura: number): Record<CarrackTarget, number> => ({ gradual, equilibrio, ascensao, bravura });

export const CARRACKS: Record<CarrackTarget, CarrackDefinition> = {
  gradual: {
    id: "gradual",
    name: "Carraca de Epheria: Gradual",
    shortName: "Gradual",
    branch: "caravel",
    sourceShip: "Navio Mercante de Epheria",
    role: "Permuta / carga",
    description: "Maior capacidade de carga e inventário. Rota voltada para permuta e logística marítima.",
  },
  equilibrio: {
    id: "equilibrio",
    name: "Carraca de Epheria: Equilíbrio",
    shortName: "Equilíbrio",
    branch: "caravel",
    sourceShip: "Navio Mercante de Epheria",
    role: "Híbrida",
    description: "Equilibra carga, manobrabilidade e combate sem especializar totalmente em uma única função.",
  },
  ascensao: {
    id: "ascensao",
    name: "Carraca de Epheria: Emergência",
    shortName: "Emergência",
    branch: "galleass",
    sourceShip: "Contratorpedeiro de Epheria",
    role: "Velocidade / manobra",
    description: "Linha veloz do Contratorpedeiro. O ID interno é 'ascensao' por compatibilidade; o nome exibido no jogo é Emergência.",
  },
  bravura: {
    id: "bravura",
    name: "Carraca de Epheria: Bravura",
    shortName: "Bravura",
    branch: "galleass",
    sourceShip: "Contratorpedeiro de Epheria",
    role: "Combate",
    description: "Linha de combate do Contratorpedeiro, com foco em poder de fogo e menor tempo de recarga.",
  },
};

export const CARRACK_ORDER: CarrackTarget[] = ["gradual", "equilibrio", "ascensao", "bravura"];

export const MATERIALS: MaterialDefinition[] = [
  {
    id: "redSeaGold",
    name: "Barra de Ouro do Mar Vermelho",
    shortName: "Barra de Ouro do Mar Vermelho",
    icon: "/assets/items/red-sea-gold.png",
    category: "blue-gear",
    required: req(90, 90, 100, 100),
    difficulty: 4,
    crowPrice: 200,
    sources: [
      { type: "weekly", label: "[Semanal] Para o bem dos jovens Vendedores Lontras", detail: "Recompensa x15 no Olho de Okilua.", yield: 15, questId: "weekly-okilua-young-otters" },
      { type: "daily", label: "[Diário] Pequena Retribuição da Guilda Lua Minguante I", detail: "Escolha de recompensa x4; alternativa à Pequena Retribuição II.", yield: 4, group: "pequena-retribuicao", questId: "daily-okilua-retribution-1" },
      { type: "weekly", label: "[Semanal] Caçador de Kandidum", detail: "Escolha de recompensa x4.", yield: 4, group: "semanal-cacador-de-kandidum", questId: "weekly-okilua-kandidum" },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 4]", detail: "Pode aparecer nas rotas de material de navio." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "200 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "enhancedPlywood",
    name: "Madeira Compensada Revestida de Rubus Aprimorada",
    shortName: "Madeira Compensada Revestida de Rubus Aprimorada",
    icon: "/assets/items/enhanced-plywood.png",
    category: "blue-gear",
    required: req(300, 300, 300, 300),
    difficulty: 3,
    crowPrice: 40,
    sources: [
      { type: "daily", label: "[Permuta][Diário] Ilha de Iliya Agitada", detail: "Recompensa x10 ao concluir 15 permutas.", yield: 10, questId: "daily-iliya-agitated" },
      { type: "hunt", label: "Criaturas Marinhas", detail: "Pode ser obtida eliminando criaturas marinhas." },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 4]", detail: "Material de navio em rotas de permuta." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "40 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "seaweedStalk",
    name: "Caule de Alga Profunda",
    shortName: "Caule de Alga Profunda",
    icon: "/assets/items/seaweed-stalk.png",
    category: "blue-gear",
    required: req(205, 205, 250, 250),
    difficulty: 4,
    crowPrice: 80,
    sources: [
      { type: "weekly", label: "[Semanal] Para o bem dos jovens Vendedores Lontras", detail: "Recompensa x45 no Olho de Okilua.", yield: 45, questId: "weekly-okilua-young-otters" },
      { type: "daily", label: "[Diário] Pequena Retribuição da Guilda Lua Minguante I", detail: "Escolha de recompensa x8; alternativa à Pequena Retribuição II.", yield: 8, group: "pequena-retribuicao", questId: "daily-okilua-retribution-1" },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 4]", detail: "Pode aparecer nas rotas de material de navio." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "80 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "greatOceanIron",
    name: "Ferro Forjado Rígido do Oceano",
    shortName: "Ferro Forjado Rígido do Oceano",
    icon: "/assets/items/great-ocean-iron.png",
    category: "blue-gear",
    required: req(150, 150, 150, 150),
    difficulty: 3,
    crowPrice: 130,
    sources: [
      { type: "hunt", label: "Criaturas Marinhas", detail: "Pode ser obtido eliminando criaturas marinhas." },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 4]", detail: "Material de navio em rotas de permuta." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "130 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "purePearl",
    name: "Cristal de Pérola Pura",
    shortName: "Cristal de Pérola Pura",
    icon: "/assets/items/pure-pearl.png",
    category: "blue-gear",
    required: req(45, 45, 45, 45),
    difficulty: 3,
    crowPrice: 200,
    sources: [
      { type: "daily", label: "[Permuta][Diário] Ilha de Iliya Agitada", detail: "Recompensa x2 ao concluir 15 permutas.", yield: 2, questId: "daily-iliya-agitated" },
      { type: "daily", label: "[Diário] Pequena Retribuição da Guilda Lua Minguante I", detail: "Escolha de recompensa x4; alternativa à Pequena Retribuição II.", yield: 4, group: "pequena-retribuicao", questId: "daily-okilua-retribution-1" },
      { type: "hunt", label: "Criaturas Marinhas", detail: "Pode ser obtido eliminando criaturas marinhas." },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 3]", detail: "Pode aparecer nas rotas marítimas." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "200 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "coxLow",
    name: "Artefato dos Piratas Cox(Negociação de Baixo Nível)",
    shortName: "Artefato dos Piratas Cox(Negociação de Baixo Nível)",
    icon: "/assets/items/cox-low.png",
    category: "blue-gear",
    required: req(60, 60, 60, 60),
    difficulty: 3,
    crowPrice: 120,
    sources: [
      { type: "daily", label: "[Permuta][Diário] Transporte de Suprimentos (Olho da Okilua)", detail: "Dario entrega x2 na Ilha de Iliya.", yield: 2, questId: "daily-iliya-supply-okilua" },
      { type: "daily", label: "Transporte de Suprimentos (Ilha de Iliya)", detail: "Croix entrega x1 em Velia.", yield: 1, questId: "daily-velia-supply-iliya" },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 2]", detail: "Pode aparecer nas rotas marítimas." },
      { type: "hunt", label: "Criaturas Marinhas", detail: "Pode ser obtido eliminando criaturas marinhas." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "120 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "coxCombat",
    name: "Artefato dos Piratas Cox(Combate)",
    shortName: "Artefato dos Piratas Cox(Combate)",
    icon: "/assets/items/cox-combat.png",
    category: "blue-gear",
    required: req(120, 120, 250, 250),
    difficulty: 5,
    crowPrice: 120,
    sources: [
      { type: "processing", label: "Alquimia Simples — Símbolo de Subjugação dos Piratas Cox", detail: "200 símbolos → 1 Artefato dos Piratas Cox(Combate)." },
      { type: "processing", label: "Alquimia Simples — Canhão Quebrado dos Piratas Cox", detail: "10 canhões quebrados → 1 Artefato dos Piratas Cox(Combate)." },
      { type: "daily", label: "[Diário] Preciso proteger pelo menos o meu corpo", detail: "Escolha de recompensa x3.", yield: 3, group: "diario-preciso-proteger-pelo-menos-o-meu-corpo", questId: "daily-okilua-protect-body" },
      { type: "daily", label: "[Diário] Pequena Retribuição da Guilda Lua Minguante II", detail: "Escolha de recompensa x6; alternativa à Pequena Retribuição I.", yield: 6, group: "pequena-retribuicao", questId: "daily-okilua-retribution-2" },
      { type: "weekly", label: "[Semanal] Relatório de Aumento da População", detail: "Recompensa x2.", yield: 2, questId: "weekly-okilua-population" },
      { type: "weekly", label: "[Semanal] Caçador de Dente de Aço Negro", detail: "Escolha de recompensa x6.", yield: 6, group: "semanal-cacador-de-dente-de-aco-negro", questId: "weekly-okilua-black-rust" },
      { type: "hunt", label: "Criaturas Marinhas / Piratas Cox", detail: "Drops usados diretamente ou no processamento." },
      { type: "barter", label: "Permuta [Nível 4] e [Nível 5]", detail: "Pode aparecer nas rotas marítimas." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "120 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "moonScalePlywood",
    name: "Madeira Compensada Gravada com Escama da Lua",
    shortName: "Madeira Compensada Gravada com Escama da Lua",
    icon: "/assets/items/moon-scale-plywood.png",
    category: "blue-gear",
    required: req(400, 400, 600, 600),
    difficulty: 4,
    crowPrice: 15,
    sources: [
      { type: "processing", label: "Secar — Escama do Khan", detail: "Escama do Khan x1 → 10 unidades." },
      { type: "hunt", label: "Khan, Olho de Okilua", detail: "A Escama do Khan é obtida derrotando Khan." },
      { type: "daily", label: "[Diário] Caçador de Rei do Mar Jovem da Lua Minguante", detail: "Recompensa x10.", yield: 10, questId: "daily-okilua-young-sea-king" },
      { type: "daily", label: "[Diário] Pequena Retribuição da Guilda Lua Minguante II", detail: "Escolha de recompensa x20; alternativa à Pequena Retribuição I.", yield: 20, group: "pequena-retribuicao", questId: "daily-okilua-retribution-2" },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 5]", detail: "Pode aparecer nas rotas marítimas." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "15 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "tideTimber",
    name: "Madeira de Construção com um brilho de onda",
    shortName: "Madeira de Construção com um brilho de onda",
    icon: "/assets/items/tide-timber.png",
    category: "blue-gear",
    required: req(180, 180, 180, 180),
    difficulty: 4,
    crowPrice: 80,
    sources: [
      { type: "processing", label: "Corte — Destroço do Navio Fantasma Naufragado", detail: "Processamento de material obtido no oceano." },
      { type: "daily", label: "[Diário] A guilda não é uma instituição de caridade", detail: "Escolha de recompensa x5.", yield: 5, group: "diario-a-guilda-nao-e-uma-instituicao-de-caridade", questId: "daily-okilua-charity" },
      { type: "daily", label: "[Diário] Pequena Retribuição da Guilda Lua Minguante II", detail: "Escolha de recompensa x6; alternativa à Pequena Retribuição I.", yield: 6, group: "pequena-retribuicao", questId: "daily-okilua-retribution-2" },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 4]", detail: "Pode aparecer nas rotas marítimas." },
      { type: "hunt", label: "Fantasma dos Piratas Cox / Navio Fantasma Naufragado", detail: "Fonte do material usado no processamento." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "80 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "reefPiece",
    name: "Escultura de Recife Puro",
    shortName: "Escultura de Recife Puro",
    icon: "/assets/items/reef-piece.png",
    category: "blue-gear",
    required: req(180, 180, 180, 180),
    difficulty: 3,
    crowPrice: 30,
    sources: [
      { type: "daily", label: "[Permuta][Diário] Ilha de Iliya Agitada", detail: "Recompensa x8 ao concluir 15 permutas.", yield: 8, questId: "daily-iliya-agitated" },
      { type: "daily", label: "[Diário] Pequena Retribuição da Guilda Lua Minguante I", detail: "Escolha de recompensa x16; alternativa à Pequena Retribuição II.", yield: 16, group: "pequena-retribuicao", questId: "daily-okilua-retribution-1" },
      { type: "hunt", label: "Criaturas Marinhas", detail: "Pode ser obtida eliminando criaturas marinhas." },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 3]", detail: "Pode aparecer nas rotas marítimas." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "30 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "coxHigh",
    name: "Artefato dos Piratas Cox(Negociação de Alto Nível)",
    shortName: "Artefato dos Piratas Cox(Negociação de Alto Nível)",
    icon: "/assets/items/cox-high.png",
    category: "blue-gear",
    required: req(30, 30, 30, 30),
    difficulty: 4,
    crowPrice: 400,
    sources: [
      { type: "daily", label: "[Permuta][Diário] Ilha de Iliya Agitada", detail: "Recompensa x1 ao concluir 15 permutas.", yield: 1, questId: "daily-iliya-agitated" },
      { type: "daily", label: "[Diário] Pequena Retribuição da Guilda Lua Minguante I", detail: "Escolha de recompensa x2; alternativa à Pequena Retribuição II.", yield: 2, group: "pequena-retribuicao", questId: "daily-okilua-retribution-1" },
      { type: "hunt", label: "Criaturas Marinhas", detail: "Pode ser obtido eliminando criaturas marinhas." },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 4]", detail: "Pode aparecer nas rotas marítimas." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "400 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "luminousCobalt",
    name: "Barra de Cobalto Brilhante",
    shortName: "Barra de Cobalto Brilhante",
    icon: "/assets/items/luminous-cobalt.png",
    category: "blue-gear",
    required: req(30, 30, 30, 30),
    difficulty: 5,
    crowPrice: 400,
    sources: [
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 4]", detail: "Pode aparecer nas rotas marítimas." },
      { type: "hunt", label: "Criaturas Marinhas", detail: "Pode ser obtida eliminando criaturas marinhas." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "400 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "moonVeinFlax",
    name: "Tecido de Linho com a veia da lua gravada",
    shortName: "Tecido de Linho com a veia da lua gravada",
    icon: "/assets/items/moon-vein-flax.png",
    category: "carrack",
    required: req(180, 180, 210, 180),
    difficulty: 4,
    crowPrice: 40,
    sources: [
      { type: "processing", label: "Secar — Tendão do Khan", detail: "Tendão do Khan x1 → 10 unidades." },
      { type: "daily", label: "[Diário] Caçador de Rei do Mar Jovem da Lua Minguante", detail: "Recompensa x3.", yield: 3, questId: "daily-okilua-young-sea-king" },
      { type: "daily", label: "[Diário] Pequena Retribuição da Guilda Lua Minguante II", detail: "Escolha de recompensa x6; alternativa à Pequena Retribuição I.", yield: 6, group: "pequena-retribuicao", questId: "daily-okilua-retribution-2" },
      { type: "hunt", label: "Khan, Olho de Okilua", detail: "O Tendão do Khan é obtido derrotando Khan." },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 5]", detail: "Pode aparecer nas rotas marítimas." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "40 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "blueMarineTimber",
    name: "Madeira de Construção Envolto com um Brilho Azul Marinho",
    shortName: "Madeira de Construção Envolto com um Brilho Azul Marinho",
    icon: "/assets/items/blue-marine-timber.png",
    category: "carrack",
    required: req(144, 144, 144, 170),
    difficulty: 4,
    crowPrice: 80,
    sources: [
      { type: "processing", label: "Corte — Estilhaço do Navio Pirata Utilizável", detail: "1 estilhaço → 1 unidade." },
      { type: "daily", label: "[Diário] Bom para você, bom para mim", detail: "Escolha de recompensa x4.", yield: 4, group: "diario-bom-para-voce-bom-para-mim", questId: "daily-okilua-good-for-both" },
      { type: "daily", label: "[Diário] Pequena Retribuição da Guilda Lua Minguante II", detail: "Escolha de recompensa x6; alternativa à Pequena Retribuição I.", yield: 6, group: "pequena-retribuicao", questId: "daily-okilua-retribution-2" },
      { type: "hunt", label: "Navios/Piratas Cox no oceano", detail: "Fonte do Estilhaço do Navio Pirata Utilizável." },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 5]", detail: "Pode aparecer nas rotas marítimas." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "80 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "saltRock",
    name: "Barra de Sal de Rocha Exuberante",
    shortName: "Barra de Sal de Rocha Exuberante",
    icon: "/assets/items/salt-rock.png",
    category: "carrack",
    required: req(35, 30, 30, 30),
    difficulty: 5,
    crowPrice: 400,
    sources: [
      { type: "hunt", label: "Criaturas Marinhas", detail: "Drop raro de conteúdo oceânico." },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 5]", detail: "Material brilhante de Carraca." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "400 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "brilliantPearl",
    name: "Cristal de Pérola Brilhante",
    shortName: "Cristal de Pérola Brilhante",
    icon: "/assets/items/brilliant-pearl.png",
    category: "carrack",
    required: req(35, 30, 30, 30),
    difficulty: 5,
    crowPrice: 400,
    sources: [
      { type: "hunt", label: "Criaturas Marinhas", detail: "Drop raro de conteúdo oceânico." },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 5]", detail: "Material brilhante de Carraca." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "400 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "abyssalEye",
    name: "Olho Abissal",
    shortName: "Olho Abissal",
    icon: "/assets/items/abyssal-eye.png",
    category: "carrack",
    required: req(42, 50, 42, 42),
    difficulty: 5,
    crowPrice: 400,
    sources: [
      { type: "processing", label: "Alquimia Simples — Gema do Mar Profundo", detail: "Gema do Mar Profundo x2 → 1 Olho Abissal." },
      { type: "daily", label: "[Diário] Caçador de Rei do Mar Jovem da Lua Minguante", detail: "Recompensa x1.", yield: 1, questId: "daily-okilua-young-sea-king" },
      { type: "weekly", label: "[Semanal] Caçador de Nineshark", detail: "Escolha de recompensa x2.", yield: 2, group: "semanal-cacador-de-nineshark", questId: "weekly-okilua-nineshark" },
      { type: "daily", label: "[Diário] Pequena Retribuição da Guilda Lua Minguante II", detail: "Escolha de recompensa x2; alternativa à Pequena Retribuição I.", yield: 2, group: "pequena-retribuicao", questId: "daily-okilua-retribution-2" },
      { type: "barter", label: "Permuta de Mercadoria Marítima [Nível 5]", detail: "Pode aparecer nas rotas marítimas." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "400 Moedas Corvo por unidade." },
    ],
  },
  {
    id: "waveStone",
    name: "Pedra Negra da Onda",
    shortName: "Pedra Negra da Onda",
    icon: "/assets/items/wave-stone.png",
    category: "enhancement",
    required: req(0, 0, 0, 0),
    difficulty: 3,
    sources: [
      { type: "weekly", label: "[Semanal] Caçador de Kandidum", detail: "Escolha de recompensa x60.", yield: 60, group: "semanal-cacador-de-kandidum", questId: "weekly-okilua-kandidum" },
      { type: "weekly", label: "[Semanal] Caçador de Nineshark", detail: "Escolha de recompensa x60.", yield: 60, group: "semanal-cacador-de-nineshark", questId: "weekly-okilua-nineshark" },
      { type: "weekly", label: "[Semanal] Caçador de Dente de Aço Negro", detail: "Escolha de recompensa x60.", yield: 60, group: "semanal-cacador-de-dente-de-aco-negro", questId: "weekly-okilua-black-rust" },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "Baús/pacotes semanais conforme a loja atual." },
    ],
  },
  {
    id: "violentWavePlywood",
    name: "Madeira compensada com gravação de uma onda violenta",
    shortName: "Madeira compensada com gravação de uma onda violenta",
    icon: "/assets/items/violent-wave-plywood.png",
    category: "carrack-gear",
    required: req(400, 400, 400, 400),
    difficulty: 4,
    sources: [
      { type: "processing", label: "Fábrica — Escama da Besta Marinha Selvagem", detail: "Escama da Besta Marinha Selvagem x1 ou Escama do Crocodilo do Mar x1 na oficina de Shiro." },
      { type: "daily", label: "[Diário] A guilda não é uma instituição de caridade", detail: "Escolha de recompensa x1.", yield: 1, group: "diario-a-guilda-nao-e-uma-instituicao-de-caridade", questId: "daily-okilua-charity" },
      { type: "daily", label: "[Diário] Caçador de Kandidum da Guilda Lua Minguante", detail: "Escolha de recompensa x1.", yield: 1, group: "diario-cacador-de-kandidum-da-guilda-lua-minguante", questId: "daily-okilua-kandidum" },
      { type: "weekly", label: "[Semanal] Caçador de Kandidum", detail: "Escolha de recompensa x1.", yield: 1, group: "semanal-cacador-de-kandidum", questId: "weekly-okilua-kandidum" },
      { type: "hunt", label: "Criaturas Marinhas", detail: "Origem das escamas usadas na fabricação." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "Comprar com Lavinia, no Ninho do Corvo." },
    ],
  },
  {
    id: "polishedSupport",
    name: "Suporte com um acabamento elaborado",
    shortName: "Suporte com um acabamento elaborado",
    icon: "/assets/items/polished-support.png",
    category: "carrack-gear",
    required: req(400, 400, 400, 400),
    difficulty: 4,
    sources: [
      { type: "processing", label: "Fábrica — Osso da Besta Marinha Selvagem", detail: "Osso da Besta Marinha Selvagem x1 ou Endurecedor de Luz Estrelar x1 na oficina de Shiro." },
      { type: "daily", label: "[Diário] Preciso proteger pelo menos o meu corpo", detail: "Escolha de recompensa x1.", yield: 1, group: "diario-preciso-proteger-pelo-menos-o-meu-corpo", questId: "daily-okilua-protect-body" },
      { type: "daily", label: "[Diário] Caçador de Nineshark da Guilda Lua Minguante", detail: "Escolha de recompensa x1.", yield: 1, group: "diario-cacador-de-nineshark-da-guilda-lua-minguante", questId: "daily-okilua-nineshark" },
      { type: "weekly", label: "[Semanal] Caçador de Nineshark", detail: "Escolha de recompensa x1.", yield: 1, group: "semanal-cacador-de-nineshark", questId: "weekly-okilua-nineshark" },
      { type: "hunt", label: "Criaturas Marinhas", detail: "Origem dos ossos usados na fabricação." },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "Comprar com Lavinia, no Ninho do Corvo." },
    ],
  },
  {
    id: "waveAdhesive",
    name: "Cola com traços de onda",
    shortName: "Cola com traços de onda",
    icon: "/assets/items/wave-adhesive.png",
    category: "carrack-gear",
    required: req(400, 400, 400, 400),
    difficulty: 4,
    sources: [
      { type: "processing", label: "Alquimia Simples — Essência de Criatura Marinha Cruel", detail: "Essência de Criatura Marinha Cruel x1 ou Emulsificante Luz Estrelar x1." },
      { type: "daily", label: "[Diário] Bom para você, bom para mim", detail: "Escolha de recompensa x1.", yield: 1, group: "diario-bom-para-voce-bom-para-mim", questId: "daily-okilua-good-for-both" },
      { type: "daily", label: "[Diário] Caçador de Dente de Aço Negro da Guilda Lua Minguante", detail: "Escolha de recompensa x1.", yield: 1, group: "diario-cacador-de-dente-de-aco-negro-da-guilda-lua-minguante", questId: "daily-okilua-black-rust" },
      { type: "weekly", label: "[Semanal] Caçador de Dente de Aço Negro", detail: "Escolha de recompensa x1.", yield: 1, group: "semanal-cacador-de-dente-de-aco-negro", questId: "weekly-okilua-black-rust" },
      { type: "crow", label: "Loja de Moeda Corvo", detail: "Comprar com Lavinia, no Ninho do Corvo." },
    ],
  },
  {
    id: "shiroFigureheadBlueprint",
    name: "Planta de Construção: Proa de Shiro",
    shortName: "Planta de Construção: Proa de Shiro",
    icon: "/assets/items/blueprint-shiro-figurehead.png",
    category: "carrack-gear",
    required: req(10, 10, 10, 10),
    difficulty: 5,
    sources: [
      { type: "workers", label: "Escavação na Ilha de Tinberra", detail: "Enviar trabalhadores ao nó da ilha. O guia oficial ainda cita a Ilha de Racid nesta linha." },
    ],
  },
  {
    id: "shiroPlatingBlueprint",
    name: "Planta de Construção: Casco Negro de Shiro",
    shortName: "Planta de Construção: Casco Negro de Shiro",
    icon: "/assets/items/blueprint-shiro-plating.png",
    category: "carrack-gear",
    required: req(10, 10, 10, 10),
    difficulty: 5,
    sources: [
      { type: "workers", label: "Escavação na Ilha de Lerao", detail: "Enviar trabalhadores ao nó da ilha." },
    ],
  },
  {
    id: "shiroCannonBlueprint",
    name: "Planta de Construção: Canhão de Shiro",
    shortName: "Planta de Construção: Canhão de Shiro",
    icon: "/assets/items/blueprint-shiro-cannon.png",
    category: "carrack-gear",
    required: req(10, 10, 10, 10),
    difficulty: 5,
    sources: [
      { type: "workers", label: "Escavação na Ilha de Al-Naha", detail: "Enviar trabalhadores ao nó da ilha." },
    ],
  },
  {
    id: "shiroSailBlueprint",
    name: "Planta de Construção: Vela de Shiro",
    shortName: "Planta de Construção: Vela de Shiro",
    icon: "/assets/items/blueprint-shiro-sail.png",
    category: "carrack-gear",
    required: req(10, 10, 10, 10),
    difficulty: 5,
    sources: [
      { type: "workers", label: "Escavação na Ilha de Racid", detail: "Enviar trabalhadores ao nó da ilha." },
    ],
  },
];

export const MATERIAL_BY_ID = Object.fromEntries(MATERIALS.map((item) => [item.id, item])) as Record<MaterialId, MaterialDefinition>;

const sharedBlueIcons = {
  figurehead: { blue: "/assets/gear/figurehead-blue.png", base: "/assets/gear/figurehead-base.png" },
  plating: { blue: "/assets/gear/plating-blue.png", base: "/assets/gear/plating-base.png" },
  cannon: { blue: "/assets/gear/cannon-blue.png", base: "/assets/gear/cannon-base.png" },
  sail: { blue: "/assets/gear/sail-blue.png", base: "/assets/gear/sail-base.png" },
};

export const GEAR_SETS: Record<ShipBranch, Record<GearKey, GearDefinition>> = {
  caravel: {
    figurehead: {
      name: "Navio Mercante de Epheria: Proa de Dragão Negro",
      icon: sharedBlueIcons.figurehead.blue,
      base: "Navio Mercante de Epheria: Proa de Latão +10",
      baseIcon: sharedBlueIcons.figurehead.base,
      materials: { redSeaGold: 50, enhancedPlywood: 300, seaweedStalk: 125, greatOceanIron: 150 },
    },
    plating: {
      name: "Navio Mercante de Epheria: Casco Refinado",
      icon: sharedBlueIcons.plating.blue,
      base: "Navio Mercante de Epheria: Casco Aprimorado +10",
      baseIcon: sharedBlueIcons.plating.base,
      materials: { purePearl: 45, coxLow: 60, coxCombat: 60, moonScalePlywood: 200 },
    },
    cannon: {
      name: "Navio Mercante de Epheria: Canhão Meina",
      icon: sharedBlueIcons.cannon.blue,
      base: "Navio Mercante de Epheria: Canhão Verisha +10",
      baseIcon: sharedBlueIcons.cannon.base,
      materials: { tideTimber: 180, coxCombat: 60, moonScalePlywood: 200, reefPiece: 180 },
    },
    sail: {
      name: "Navio Mercante de Epheria: Vela de Camada",
      icon: sharedBlueIcons.sail.blue,
      base: "Navio Mercante de Epheria: Vela de Vento Branca +10",
      baseIcon: sharedBlueIcons.sail.base,
      materials: { redSeaGold: 40, coxHigh: 30, seaweedStalk: 80, luminousCobalt: 30 },
    },
  },
  galleass: {
    figurehead: {
      name: "Contratorpedeiro de Epheria: Proa de Dragão Negro",
      icon: sharedBlueIcons.figurehead.blue,
      base: "Contratorpedeiro de Epheria: Proa de Quartzo Branco +10",
      baseIcon: sharedBlueIcons.figurehead.base,
      materials: { redSeaGold: 50, enhancedPlywood: 300, seaweedStalk: 125, greatOceanIron: 150 },
    },
    plating: {
      name: "Contratorpedeiro de Epheria: Casco Refinado",
      icon: sharedBlueIcons.plating.blue,
      base: "Contratorpedeiro de Epheria: Casco Aprimorado +10",
      baseIcon: sharedBlueIcons.plating.base,
      materials: { purePearl: 45, coxLow: 60, coxCombat: 125, moonScalePlywood: 300 },
    },
    cannon: {
      name: "Contratorpedeiro de Epheria: Canhão Meina",
      icon: sharedBlueIcons.cannon.blue,
      base: "Contratorpedeiro de Epheria: Canhão Verisha +10",
      baseIcon: sharedBlueIcons.cannon.base,
      materials: { tideTimber: 180, coxCombat: 125, moonScalePlywood: 300, reefPiece: 180 },
    },
    sail: {
      name: "Contratorpedeiro de Epheria: Vela de Camada",
      icon: sharedBlueIcons.sail.blue,
      base: "Contratorpedeiro de Epheria: Vela de Vento Branca +10",
      baseIcon: sharedBlueIcons.sail.base,
      materials: { redSeaGold: 50, coxHigh: 30, seaweedStalk: 125, luminousCobalt: 30 },
    },
  },
};

// Equipamento de grau azul da própria Carraca (conjunto de Shiro), fabricado depois que a Carraca existe.
// A peça base verde (Toro) é comprada com Lavinia; cada Carraca usa a sua própria versão da peça azul.
const SHIRO_PIECES: Record<GearKey, { piece: string; base: string; baseIcon: string; workshop: string; blueprint: MaterialId }> = {
  figurehead: { piece: "Proa de Shiro", base: "Carraca de Epheria: Proa de Toro +10", baseIcon: "/assets/gear/carrack/toro-figurehead.png", workshop: "Oficina de Proa de Shiro — Ilha de Tinberra", blueprint: "shiroFigureheadBlueprint" },
  plating: { piece: "Casco Negro de Shiro", base: "Carraca de Epheria: Casco de Toro +10", baseIcon: "/assets/gear/carrack/toro-plating.png", workshop: "Oficina de Casco Negro de Shiro — Ilha de Lerao", blueprint: "shiroPlatingBlueprint" },
  cannon: { piece: "Canhão de Shiro", base: "Carraca de Epheria: Canhão de Toro +10", baseIcon: "/assets/gear/carrack/toro-cannon.png", workshop: "Oficina de Canhão de Shiro — Ilha de Al-Naha", blueprint: "shiroCannonBlueprint" },
  sail: { piece: "Vela de Shiro", base: "Carraca de Epheria: Vela de Toro +10", baseIcon: "/assets/gear/carrack/toro-sail.png", workshop: "Oficina de Vela de Shiro — Ilha de Racid", blueprint: "shiroSailBlueprint" },
};

// A permissão de alteração de peça ainda usa o nome antigo da linha veloz (Emergência).
const PERMIT_NAME: Record<CarrackTarget, string> = { gradual: "Gradual", equilibrio: "Equilíbrio", ascensao: "Emergência", bravura: "Bravura" };

const SHIRO_GEAR_KEYS = Object.keys(SHIRO_PIECES) as GearKey[];

/**
 * As peças verdes de Toro são vendidas prontas com Lavinia, no Ninho do Corvo, e só saem por
 * Moeda Corvo — não há missão nem permuta que as entregue. Por isso elas não são material de
 * inventário: são uma decisão de saldo, e o preço fica aqui, ao lado das peças que as usam.
 */
export const CARRACK_PART_CROW_PRICE = 10_000;

/** Proa, casco, canhão e vela: as quatro peças de Toro que a Carraca pode receber. */
export const CARRACK_PART_COUNT = SHIRO_GEAR_KEYS.length;

function carrackGearSet(target: CarrackTarget): Record<GearKey, CarrackGearDefinition> {
  const entries = SHIRO_GEAR_KEYS.map((key) => {
    const piece = SHIRO_PIECES[key];
    const blueprint = MATERIAL_BY_ID[piece.blueprint];
    const definition: CarrackGearDefinition = {
      name: `Carraca de Epheria ${CARRACKS[target].shortName}: ${piece.piece}`,
      icon: `/assets/gear/carrack/shiro-${target}-${key}.png`,
      base: piece.base,
      baseIcon: piece.baseIcon,
      workshop: piece.workshop,
      blueprint: piece.blueprint,
      blueprintSource: blueprint.sources[0].label,
      permit: `Permissão de alteração de peça da Carraca de Epheria: ${PERMIT_NAME[target]}`,
      materials: { [piece.blueprint]: 10, violentWavePlywood: 100, polishedSupport: 100, waveAdhesive: 100 },
    };
    return [key, definition] as const;
  });
  return Object.fromEntries(entries) as Record<GearKey, CarrackGearDefinition>;
}

export const CARRACK_GEAR_SETS = Object.fromEntries(
  CARRACK_ORDER.map((target) => [target, carrackGearSet(target)]),
) as Record<CarrackTarget, Record<GearKey, CarrackGearDefinition>>;

/**
 * Frequências reconhecidas pelo planner. Uma missão de evento entra somando o identificador
 * em `QuestCadence` e uma linha aqui: ritmo, chave de reinício e abas passam a tratá-la.
 */
export const QUEST_CADENCES: QuestCadenceDefinition[] = [
  { id: "daily", label: "Diária", plural: "Diárias", periodDays: 1, reset: "day" },
  { id: "weekly", label: "Semanal", plural: "Semanais", periodDays: 7, reset: "week" },
];

export const CADENCE_BY_ID = Object.fromEntries(QUEST_CADENCES.map((cadence) => [cadence.id, cadence])) as Record<QuestCadence, QuestCadenceDefinition>;

const QUEST_SOURCES = {
  ocean2025: {
    source: "Notas da Atualização — 06/02/2025",
    sourceUrl: "https://www.sa.playblackdesert.com/pt-br/News/Detail?groupContentNo=5779",
  },
  iliya2025: {
    source: "Notas da Atualização — 15/05/2025",
    sourceUrl: "https://www.sa.playblackdesert.com/pt-br/News/Detail?countryType=pt-br&groupContentNo=6198",
  },
  iliyaCodex: {
    source: "BDO Codex — Ilha de Iliya Agitada",
    sourceUrl: "https://bdocodex.com/pt/quest/3736/12/",
  },
  supplyCodex: {
    source: "BDO Codex — Transporte de Suprimentos",
    sourceUrl: "https://bdocodex.com/pt/quest/3736/2/",
  },
  retributionCodex: {
    source: "BDO Codex — Pequena Retribuição",
    sourceUrl: "https://bdocodex.com/pt/quest/3707/12/",
  },
  youngKingCodex: {
    source: "BDO Codex — Caçador de Rei do Mar Jovem",
    sourceUrl: "https://bdocodex.com/pt/quest/3707/23/",
  },
  panokseon2023: {
    source: "Notas da Atualização — 14/06/2023",
    sourceUrl: "https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=3026",
  },
  lyngbakr2026: {
    source: "Notas da Atualização — 27/08/2026",
    sourceUrl: "https://www.sa.playblackdesert.com/pt-br/News/Detail?countryType=pt-br&groupContentNo=8511",
  },
} as const;

/**
 * Catálogo de missões, agrupado por NPC e frequência. O grupo carrega o que se repete —
 * NPC, local, frequência e a regra de aceite do jogo — e cada missão descreve apenas o
 * próprio conteúdo. Para acrescentar uma missão, some uma entrada em `quests` do grupo
 * correspondente; para um NPC ou um evento novo, some um grupo. Nada mais precisa mudar:
 * abas, filtros, ritmo e seleção do jogador leem esta lista.
 */
export const QUEST_GROUPS: QuestGroupDefinition[] = [
  {
    id: "iliya-dario-daily", npc: "Dario", location: "Ilha de Iliya", cadence: "daily", selection: "all",
    quests: [
      {
        id: "daily-iliya-supply-okilua", title: "[Permuta][Diário] Transporte de Suprimentos (Olho da Okilua)",
        objective: "Entregar suprimentos para Ravikel.",
        rewards: ["Artefato dos Piratas Cox(Negociação de Baixo Nível) x2", "Moeda Corvo x100", "EXP de Navegação e Permuta"],
        recommendedFor: ["coxLow"], priority: 5, ...QUEST_SOURCES.supplyCodex,
      },
      {
        id: "daily-iliya-new-horizons", title: "[Permuta][Diário] Novas Ilhas, Novos Horizontes",
        objective: "Fazer 20 permutas.",
        rewards: ["Moeda Corvo x50", "Caixa de Bens Comerciais Perdida x1", "Parte de Bússola de Explorador x1"],
        recommendedFor: [], priority: 3, ...QUEST_SOURCES.iliya2025,
      },
    ],
  },
  {
    id: "iliya-baori-daily", npc: "Baori", location: "Ilha de Iliya", cadence: "daily", selection: "all",
    quests: [
      {
        id: "daily-iliya-trade-supplies-1", title: "Suporte de Suprimentos de Comércio I",
        objective: "Entregar 1 item de Permuta Nv.1.",
        rewards: ["EXP de Navegação e Permuta"], recommendedFor: [], priority: 2, ...QUEST_SOURCES.iliya2025,
      },
    ],
  },
  {
    id: "iliya-maonil-daily", npc: "Maonil", location: "Ilha de Iliya", cadence: "daily", selection: "all",
    quests: [
      {
        id: "daily-iliya-trade-supplies-2", title: "Suporte de Suprimentos de Comércio II",
        objective: "Entregar 1 item de Permuta Nv.1.",
        rewards: ["EXP de Navegação e Permuta"], recommendedFor: [], priority: 2, ...QUEST_SOURCES.iliya2025,
      },
    ],
  },
  {
    id: "iliya-friko-daily", npc: "Friko", location: "Ilha de Iliya", cadence: "daily", selection: "all",
    quests: [
      {
        id: "daily-iliya-end-world-ancado", title: "Para o Fim do Mundo I: Porto Interior de Ancado",
        objective: "Entregar suprimentos no Porto Interior de Ancado.",
        rewards: ["Moeda Corvo x50", "Baú Misterioso de Permuta x1"], recommendedFor: [], priority: 3, ...QUEST_SOURCES.iliya2025,
      },
      {
        id: "daily-iliya-end-world-hakoven", title: "Para o Fim do Mundo II: Ilha de Hakoven",
        objective: "Entregar suprimentos na Ilha de Hakoven.",
        rewards: ["Moeda Corvo x100", "Baú Misterioso de Permuta x1"], recommendedFor: [], priority: 3, ...QUEST_SOURCES.iliya2025,
      },
    ],
  },
  {
    id: "iliya-aldeao-daily", npc: "Aldeão", location: "Ilha de Iliya", cadence: "daily", selection: "all",
    quests: [
      {
        id: "daily-iliya-agitated", title: "[Permuta][Diário] Ilha de Iliya Agitada",
        objective: "Fazer 15 permutas.",
        rewards: ["Madeira Compensada Revestida de Rubus Aprimorada x10", "Artefato dos Piratas Cox(Negociação de Alto Nível) x1", "Cristal de Pérola Pura x2", "Cola com Memórias do Mar Profundo x8", "Escultura de Recife Puro x8", "Moeda Corvo x50"],
        recommendedFor: ["enhancedPlywood", "coxHigh", "purePearl", "reefPiece"], priority: 5, ...QUEST_SOURCES.iliyaCodex,
      },
    ],
  },
  {
    id: "iliya-friko-weekly", npc: "Friko", location: "Ilha de Iliya", cadence: "weekly", selection: "all",
    quests: [
      {
        id: "weekly-iliya-barter-center", title: "[Permuta][Semanal] Centro de Permuta, Ilha de Iliya",
        objective: "Fazer 100 permutas.",
        rewards: ["Moeda Corvo x200", "Baú Misterioso de Permuta x3"], recommendedFor: [], priority: 4, ...QUEST_SOURCES.iliya2025,
      },
    ],
  },
  {
    id: "velia-croix-daily", npc: "Croix", location: "Velia", cadence: "daily", selection: "all",
    quests: [
      {
        id: "daily-velia-wanted-sea-monster", title: "Procurado: Hekaru OU Procurado: Perseguidor de Oceano",
        objective: "Eliminar o monstro marinho indicado.",
        rewards: ["Origem do Vento x50", "EXP de Navegação dobrada"], recommendedFor: [], priority: 3,
        note: "As duas versões são alternativas.", ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "daily-velia-imminent-threat", title: "Ameaça Iminente no Oceano",
        objective: "Destruir o Grande Navio Goldmont.",
        rewards: ["Origem do Vento x50"], recommendedFor: [], priority: 3, ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "daily-velia-ocean-raiders", title: "Saqueadores de Oceano",
        objective: "Destruir o Pequeno Navio Goldmont.",
        rewards: ["Origem do Vento x50"], recommendedFor: [], priority: 3, ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "daily-velia-supply-iliya", title: "Transporte de Suprimentos (Ilha de Iliya)",
        objective: "Levar suprimentos de Velia até Dario.",
        rewards: ["Artefato dos Piratas Cox(Negociação de Baixo Nível) x1", "Moeda Corvo x50"],
        recommendedFor: ["coxLow"], priority: 5, ...QUEST_SOURCES.ocean2025,
      },
    ],
  },
  {
    id: "velia-phrawa-daily", npc: "Phrawa", location: "Velia", cadence: "daily", selection: "all",
    quests: [
      {
        id: "daily-velia-hungry-sea-creature", title: "Procurado: Criatura Marinha Faminta",
        objective: "Eliminar Hekaru Faminto e Perseguidor Faminto.",
        rewards: ["Moeda Corvo x50"], recommendedFor: [], priority: 3, ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "daily-velia-cox-scout", title: "Procurado: Batedor Cox Infiltrado",
        objective: "Eliminar 20 Piratas Cox.",
        rewards: ["Moeda Corvo x50"], recommendedFor: [], priority: 3, ...QUEST_SOURCES.ocean2025,
      },
    ],
  },
  {
    id: "velia-mia-daily", npc: "Mia", location: "Velia", cadence: "daily", selection: "all",
    note: "As três missões da Mia podem ficar ativas ao mesmo tempo.",
    quests: [
      {
        id: "daily-velia-baremi-goods", title: "Obter bens insuficientes: Ilha de Baremi",
        objective: "Entregar a mercadoria pedida na Ilha de Baremi.",
        rewards: ["Moeda Corvo x20", "EXP de Permuta"], recommendedFor: [], priority: 3, ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "daily-velia-narvo-goods", title: "Obter bens insuficientes: Ilha de Narvo",
        objective: "Entregar a mercadoria pedida na Ilha de Narvo.",
        rewards: ["Moeda Corvo x20", "EXP de Permuta"], recommendedFor: [], priority: 3, ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "daily-velia-tinberra-goods", title: "Obter bens insuficientes: Ilha de Tinberra",
        objective: "Entregar a mercadoria pedida na Ilha de Tinberra.",
        rewards: ["Moeda Corvo x20", "EXP de Permuta"], recommendedFor: [], priority: 3, ...QUEST_SOURCES.ocean2025,
      },
    ],
  },
  {
    id: "velia-lovinia-daily", npc: "Lovinia", location: "Velia", cadence: "daily", selection: "all",
    quests: [
      {
        id: "daily-velia-supply-tinberra", title: "Transporte de Suprimentos (Ilha de Tinberra)",
        objective: "Levar suprimentos de Velia até Tinberra.",
        rewards: ["Moeda Corvo x100", "EXP de Permuta"], recommendedFor: [], priority: 3, ...QUEST_SOURCES.ocean2025,
      },
    ],
  },
  {
    id: "velia-phrawa-weekly", npc: "Phrawa", location: "Velia", cadence: "weekly", selection: "all",
    quests: [
      {
        id: "weekly-velia-sailor-health", title: "Método de Recuperação de Saúde dos Marinheiros",
        objective: "Entregar Chowder x20.",
        rewards: ["Moeda Corvo x200", "Refeição Especial de Balenos x10", "Grande EXP de Navegação"],
        recommendedFor: [], priority: 4, ...QUEST_SOURCES.ocean2025,
      },
    ],
  },
  {
    id: "okilua-soldado-daily", npc: "Soldado", location: "Olho da Okilua", cadence: "daily", selection: "all",
    quests: [
      {
        id: "daily-okilua-charity", title: "A guilda não é uma instituição de caridade",
        objective: "Concluir a tarefa solicitada pelo Soldado.",
        rewards: ["Escolha: Madeira de Construção com um brilho de onda x5 / Madeira compensada com gravação de uma onda violenta x1"],
        recommendedFor: ["tideTimber", "violentWavePlywood"], priority: 5, ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "daily-okilua-protect-body", title: "Preciso proteger pelo menos o meu corpo",
        objective: "Concluir a tarefa solicitada pelo Soldado.",
        rewards: ["Escolha: Artefato dos Piratas Cox(Combate) x3 / Suporte com um acabamento elaborado x1"],
        recommendedFor: ["coxCombat", "polishedSupport"], priority: 5, ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "daily-okilua-good-for-both", title: "Bom para você, bom para mim",
        objective: "Concluir a tarefa solicitada pelo Soldado.",
        rewards: ["Escolha: Madeira de Construção Envolto com um Brilho Azul Marinho x4 / Cola com traços de onda x1"],
        recommendedFor: ["blueMarineTimber", "waveAdhesive"], priority: 5, ...QUEST_SOURCES.ocean2025,
      },
    ],
  },
  {
    id: "okilua-ravikel-daily", npc: "Ravikel", location: "Olho da Okilua", cadence: "daily", selection: "one-track",
    note: "Ou a caçada ao Rei do Mar Jovem, ou as três caçadas da Guilda Lua Minguante: aceitar uma trilha bloqueia a outra no mesmo dia.",
    defaultTrack: "rei-do-mar-jovem",
    trackLabels: { "rei-do-mar-jovem": "Rei do Mar Jovem", "cacadas-da-guilda": "Caçadas da Guilda Lua Minguante" },
    quests: [
      {
        id: "daily-okilua-young-sea-king", title: "Caçador de Rei do Mar Jovem da Lua Minguante", track: "rei-do-mar-jovem",
        objective: "Eliminar 5 monstros marinhos jovens.",
        rewards: ["Madeira Compensada Gravada com Escama da Lua x10", "Tecido de Linho com a veia da lua gravada x3", "Olho Abissal x1", "Moeda de Okilua x3"],
        recommendedFor: ["moonScalePlywood", "moonVeinFlax", "abyssalEye"], priority: 5,
        note: "Trilha da Carraca: é a única diária do Ravikel que entrega Olho Abissal e Escama da Lua.", ...QUEST_SOURCES.youngKingCodex,
      },
      {
        id: "daily-okilua-kandidum", title: "Caçador de Kandidum da Guilda Lua Minguante", track: "cacadas-da-guilda",
        objective: "Eliminar Kandidum.",
        rewards: ["Moeda Corvo x100", "Escolha: Pedra Negra da Onda x14 / Madeira compensada com gravação de uma onda violenta x1"],
        recommendedFor: ["waveStone", "violentWavePlywood"], priority: 5, ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "daily-okilua-nineshark", title: "Caçador de Nineshark da Guilda Lua Minguante", track: "cacadas-da-guilda",
        objective: "Eliminar Nineshark.",
        rewards: ["Moeda Corvo x100", "Escolha: Pedra Negra da Onda x14 / Suporte com um acabamento elaborado x1"],
        recommendedFor: ["waveStone", "polishedSupport"], priority: 5, ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "daily-okilua-black-rust", title: "Caçador de Dente de Aço Negro da Guilda Lua Minguante", track: "cacadas-da-guilda",
        objective: "Eliminar Dente de Aço Negro.",
        rewards: ["Moeda Corvo x100", "Escolha: Pedra Negra da Onda x14 / Cola com traços de onda x1"],
        recommendedFor: ["waveStone", "waveAdhesive"], priority: 5, ...QUEST_SOURCES.ocean2025,
      },
    ],
  },
  {
    id: "okilua-herrad-daily", npc: "Herrad Romson", location: "Olho da Okilua", cadence: "daily", selection: "one-track",
    note: "Pequena Retribuição I e II são alternativas: as duas não podem ser aceitas ao mesmo tempo.",
    trackLabels: { "daily-okilua-retribution-1": "Retribuição I", "daily-okilua-retribution-2": "Retribuição II" },
    quests: [
      {
        id: "daily-okilua-retribution-1", title: "Pequena Retribuição da Guilda Lua Minguante I",
        objective: "Entregar 150 Moedas de Okilua.",
        rewards: ["Escolha: Caule de Alga Profunda x8 / Barra de Ouro do Mar Vermelho x4 / Cristal de Pérola Pura x4 / Cola com Memórias do Mar Profundo x16 / Escultura de Recife Puro x16 / Madeira Compensada Revestida de Rubus Aprimorada x20 / Artefato dos Piratas Cox(Negociação de Alto Nível) x2"],
        recommendedFor: ["seaweedStalk", "redSeaGold", "purePearl", "reefPiece", "enhancedPlywood", "coxHigh"], priority: 5,
        ...QUEST_SOURCES.retributionCodex,
      },
      {
        id: "daily-okilua-retribution-2", title: "Pequena Retribuição da Guilda Lua Minguante II",
        objective: "Entregar 150 Moedas de Okilua.",
        rewards: ["Escolha: Madeira de Construção com um brilho de onda x6 / Artefato dos Piratas Cox(Combate) x6 / Madeira de Construção Envolto com um Brilho Azul Marinho x6 / Madeira Compensada Gravada com Escama da Lua x20 / Tecido de Linho com a veia da lua gravada x6 / Olho Abissal x2"],
        recommendedFor: ["tideTimber", "coxCombat", "blueMarineTimber", "moonScalePlywood", "moonVeinFlax", "abyssalEye"], priority: 5,
        ...QUEST_SOURCES.retributionCodex,
      },
    ],
  },
  {
    id: "okilua-hae-ran-daily", npc: "Hae-Ran", location: "Olho da Okilua", cadence: "daily", selection: "all",
    quests: [
      {
        id: "daily-okilua-route-monsters", title: "Monstros que Bloqueiam a Rota Marítima",
        objective: "Eliminar Dente de Aço Negro e Nineshark da Onda Negra.",
        rewards: ["Moeda Corvo x200", "Água de Okilua"], recommendedFor: [], priority: 4, ...QUEST_SOURCES.ocean2025,
      },
    ],
  },
  {
    id: "okilua-kario-weekly", npc: "Kario", location: "Olho da Okilua", cadence: "weekly", selection: "all",
    quests: [
      {
        id: "weekly-okilua-stay", title: "Você quer ficar em Okilua?",
        objective: "Entregar Peixe-Espada Amarelo x1.",
        rewards: ["Moeda de Okilua x10"], recommendedFor: [], priority: 3, ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "weekly-okilua-young-otters", title: "Para o bem dos jovens Vendedores Lontras",
        objective: "Concluir a tarefa semanal solicitada por Kario.",
        rewards: ["Caule de Alga Profunda x45", "Barra de Ouro do Mar Vermelho x15", "Moeda de Okilua x15"],
        recommendedFor: ["seaweedStalk", "redSeaGold"], priority: 5, ...QUEST_SOURCES.ocean2025,
      },
    ],
  },
  {
    id: "okilua-ravikel-weekly", npc: "Ravikel", location: "Olho da Okilua", cadence: "weekly", selection: "all",
    quests: [
      {
        id: "weekly-okilua-kandidum", title: "Caçador de Kandidum",
        objective: "Eliminar Kandidum.",
        rewards: ["Moeda Corvo x500", "Escolha: Barra de Ouro do Mar Vermelho x4 / Pedra Negra da Onda x60 / Madeira compensada com gravação de uma onda violenta x1"],
        recommendedFor: ["redSeaGold", "waveStone", "violentWavePlywood"], priority: 5, ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "weekly-okilua-nineshark", title: "Caçador de Nineshark",
        objective: "Eliminar Nineshark.",
        rewards: ["Moeda Corvo x500", "Escolha: Olho Abissal x2 / Pedra Negra da Onda x60 / Suporte com um acabamento elaborado x1"],
        recommendedFor: ["abyssalEye", "waveStone", "polishedSupport"], priority: 5, ...QUEST_SOURCES.ocean2025,
      },
      {
        id: "weekly-okilua-black-rust", title: "Caçador de Dente de Aço Negro",
        objective: "Eliminar Dente de Aço Negro.",
        rewards: ["Moeda Corvo x500", "Escolha: Artefato dos Piratas Cox(Combate) x6 / Pedra Negra da Onda x60 / Cola com traços de onda x1"],
        recommendedFor: ["coxCombat", "waveStone", "waveAdhesive"], priority: 5, ...QUEST_SOURCES.ocean2025,
      },
    ],
  },
  {
    id: "okilua-soldado-weekly", npc: "Soldado", location: "Olho da Okilua", cadence: "weekly", selection: "all",
    quests: [
      {
        id: "weekly-okilua-population", title: "Relatório de Aumento da População",
        objective: "Concluir o relatório de aumento da população.",
        rewards: ["Artefato dos Piratas Cox(Combate) x2"], recommendedFor: ["coxCombat"], priority: 5, ...QUEST_SOURCES.ocean2025,
      },
    ],
  },
  {
    id: "okilua-hae-ran-weekly", npc: "Hae-Ran", location: "Olho da Okilua", cadence: "weekly", selection: "all",
    quests: [
      {
        id: "weekly-okilua-ruthless-monsters", title: "Monstros Impiedosos",
        objective: "Eliminar os monstros indicados por Hae-Ran.",
        rewards: ["Moeda Corvo x500", "Água Fresca de Okilua x3"], recommendedFor: [], priority: 4, ...QUEST_SOURCES.ocean2025,
      },
    ],
  },
  {
    id: "morning-light-yu-an-weekly", npc: "Yu-An", location: "Nam-Po · Terra do Amanhecer", cadence: "weekly", selection: "all",
    quests: [
      {
        id: "weekly-morning-light-panokseon", title: "Piratas do Meio do Caminho",
        objective: "Destruir 3 Navios Piratas Goldmont e entregar 3 Artefatos Goldmont.",
        rewards: ["Projeto: Panokseon x2"], recommendedFor: [], priority: 4, ...QUEST_SOURCES.panokseon2023,
      },
    ],
  },
  {
    id: "azure-silk-kangman-weekly", npc: "Kangman", location: "Ilha da Seda Azure", cadence: "weekly", selection: "all",
    quests: [
      {
        id: "weekly-azure-silk-lyngbakr", title: "Investigar a ecologia da área de Lyngbakr",
        objective: "Eliminar Lyngbakr x2.",
        rewards: ["EXP de Navegação", "Moeda Corvo x500", "Filé de Peixe Vermelho de Monstro Marinho x6", "Essência do Oceano x3"],
        recommendedFor: [], priority: 4, ...QUEST_SOURCES.lyngbakr2026,
      },
    ],
  },
];

export const QUEST_GROUP_BY_ID = Object.fromEntries(QUEST_GROUPS.map((group) => [group.id, group])) as Record<string, QuestGroupDefinition>;

/** Catálogo achatado: cada missão já com NPC, local, frequência e trilha herdados do grupo. */
export const QUESTS: QuestDefinition[] = QUEST_GROUPS.flatMap((group) => group.quests.map((quest) => ({
  ...quest,
  cadence: group.cadence,
  npc: group.npc,
  location: group.location,
  group: group.id,
  track: quest.track ?? quest.id,
  defaultActive: quest.defaultActive ?? true,
})));

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((quest) => [quest.id, quest])) as Record<string, QuestDefinition>;

export const SOURCES = [
  { label: "Atualização — Missões marítimas de 2025", href: "https://www.sa.playblackdesert.com/pt-br/News/Detail?groupContentNo=5779" },
  { label: "Atualização — Ilha de Iliya Agitada consolidada", href: "https://www.sa.playblackdesert.com/pt-br/News/Detail?countryType=pt-br&groupContentNo=6198" },
  { label: "Atualização — Projeto semanal da Panokseon", href: "https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=3026" },
  { label: "Pearl Abyss — 4 Carracas (27/08/2026)", href: "https://www.sa.playblackdesert.com/pt-br/News/Detail?countryType=pt-br&groupContentNo=8511" },
  { label: "Guia oficial — Melhorias em Navios", href: "https://www.sa.playblackdesert.com/pt-br/Wiki?wikiNo=291" },
  { label: "Atualização — Loja Corvo 21/05/2026", href: "https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=7988" },
  { label: "BDO Codex — banco de itens, receitas e missões", href: "https://bdocodex.com/pt/" },
  { label: "Black Desert Foundry — Epheria Carrack Guide", href: "https://www.blackdesertfoundry.com/epheria-carrack-guide/" },
];
