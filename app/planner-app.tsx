"use client";

import { flushPending, loadFromCloud } from "@/lib/cloud-sync";
import {
  CADENCE_BY_ID,
  CARRACKS,
  CATEGORY_LABELS,
  SOURCE_TYPE_LABELS,
  CARRACK_GEAR_SETS,
  CARRACK_ORDER,
  CARRACK_PART_COUNT,
  FALASI_PERMIT_SELLER,
  FALASI_PERMIT_SILVER,
  GEAR_SETS,
  LYNGBAKR_HORN_EXCHANGE,
  MATERIALS,
  MATERIAL_BY_ID,
  QUESTS,
  QUEST_BY_ID,
  QUEST_CADENCES,
  SET_STATS,
  SOURCES,
  YELLOW_ENHANCEMENT,
  YELLOW_GEAR_SETS,
  YELLOW_MARKET_PRICES,
  YELLOW_PROCESSING,
  YELLOW_ROUTE_ITEMS,
} from "@/lib/data";
import type { CoinPlan, EstimateContext, MaterialEstimate } from "@/lib/estimate";
import {
  carrackGearEstimate,
  carrackGearSetEstimate,
  categoryEstimate,
  estimateContext,
  estimatedFarmPerDay,
  formatDuration,
  formatRate,
  gearEstimate,
  isRoutineFarmSource,
  materialEstimate,
  materialRate,
  questContext,
  questRatePerDay,
  recommendedChoiceOption,
  shipEstimate,
  stalledRoute,
  yellowGearEstimate,
  yellowGearSetEstimate,
} from "@/lib/estimate";
import {
  bottlenecks,
  carrackGearCompletion,
  categoryCompletion,
  getGoal,
  getMissing,
  getPlanRequired,
  materialCompletion,
  nextActions,
  overallCompletion,
  questResetKey,
} from "@/lib/planner";
import {
  groupsOfCadence,
  isQuestAcquisition,
  isQuestActive,
  questChoiceOf,
  questCounts,
  questsOfGroup,
  tracksOfGroup,
} from "@/lib/quests";
import {
  createPresetId,
  switchStorageScope,
  usePlannerStore,
} from "@/lib/store";
import { accountNotice } from "@/lib/notices";
import {
  CARRACK_SLUGS,
  carrackPath,
  PLANNER_PAGES,
  tabOfPath,
  type PlannerTab,
} from "@/lib/routes";
import { planImport, shouldOfferImport } from "@/lib/sync";
import type {
  Account,
  Acquisition,
  AcquisitionType,
  CarrackTarget,
  FarmActivity,
  GearKey,
  GearState,
  MaterialCategory,
  MaterialDefinition,
  MaterialId,
  PlannerPreset,
  PlannerProfile,
  QuestCadence,
  QuestChoice,
  QuestDefinition,
  QuestGroupDefinition,
  ShipBranch,
  ShipSetStats,
} from "@/types";
import { cva, type VariantProps } from "class-variance-authority";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AccountBar from "./account-bar";

type SourceFilter =
  | "all"
  | "missions"
  | "crow"
  | "processing"
  | "hunt"
  | "barter";
type InventorySort = {
  key: "name" | "stock" | "missing" | "days";
  dir: "asc" | "desc";
};

/** Atividades de farm que o preset pode tirar da conta. Processar segue a caça, que traz a matéria-prima. */
const FARM_ROUTINE_OPTIONS: { id: FarmActivity; title: string; detail: string }[] = [
  {
    id: "barter",
    title: "Permuta",
    detail: "Trocas de Mercadoria Marítima nas ilhas do Grande Oceano",
  },
  {
    id: "hunt",
    title: "Caça no oceano",
    detail: "Piratas Cox, Khan e criaturas marinhas, incluindo processar o que eles dropam",
  },
  {
    id: "workers",
    title: "Escavação",
    detail: "Trabalhadores nos nós das ilhas",
  },
];
const FARM_ACTIVITY_LABEL: Partial<Record<AcquisitionType, string>> = {
  barter: "Permuta",
  hunt: "Caça no oceano",
  processing: "Caça no oceano",
  workers: "Escavação",
};
const shipArt: Record<ShipBranch, { src: string; alt: string }> = {
  caravel: {
    src: "/assets/epheria-caravel.png",
    alt: "Navio Mercante de Epheria",
  },
  galleass: {
    src: "/assets/epheria-caravel.png",
    alt: "Contratorpedeiro de Epheria",
  },
};

function number(v: number) {
  return new Intl.NumberFormat("pt-BR").format(v);
}
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Moeda Corvo não é material do plano — não há missão nem permuta que a entregue —, então ela
 * não está em `MATERIALS`. Mesmo assim o jogo a mostra como item, e o planner a trata como tal
 * em toda quantia: o ícone vem daqui para os dois lados não divergirem.
 */
const CROW_COIN_ICON = "/assets/items/ravencoin.png";

const itemAliasPairs: Array<[string, { label: string; icon: string }]> = [
  ...MATERIALS.flatMap(
    (item) =>
      [
        [item.name, { label: item.name, icon: item.icon }],
        [item.shortName, { label: item.name, icon: item.icon }],
      ] as Array<[string, { label: string; icon: string }]>,
  ),
  [
    "Artefato Cox (Combate)",
    {
      label: MATERIAL_BY_ID.coxCombat.name,
      icon: MATERIAL_BY_ID.coxCombat.icon,
    },
  ],
  [
    "Artefato dos Piratas Cox (Combate)",
    {
      label: MATERIAL_BY_ID.coxCombat.name,
      icon: MATERIAL_BY_ID.coxCombat.icon,
    },
  ],
  ...Object.values(YELLOW_ROUTE_ITEMS).map(
    (item) =>
      [item.name, { label: item.name, icon: item.icon }] as [
        string,
        { label: string; icon: string },
      ],
  ),
  // O plural vem primeiro por clareza; o padrão ordena por tamanho, então "Moedas" vence sozinho.
  ["Moedas Corvo", { label: "Moedas Corvo", icon: CROW_COIN_ICON }],
  ["Moeda Corvo", { label: "Moeda Corvo", icon: CROW_COIN_ICON }],
];

const ITEM_MENTION_MAP = new Map<string, { label: string; icon: string }>();
for (const [alias, data] of itemAliasPairs)
  ITEM_MENTION_MAP.set(alias.toLowerCase(), data);
const itemMentionPattern = new RegExp(
  `(${[...ITEM_MENTION_MAP.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|")})`,
  "gi",
);

function Sigil({ children }: { children: React.ReactNode }) {
  return <span className="sigil">{children}</span>;
}
function Progress({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const progress = Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0;
  return (
    <div
      role="progressbar"
      aria-label="Progresso de materiais"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className={`progress ${className}`}
    >
      <span style={{ width: `${progress}%` }} />
    </div>
  );
}
const badgeVariants = cva("badge", {
  variants: {
    kind: {
      default: "badge-default",
      gold: "badge-gold",
      red: "badge-red",
      blue: "badge-blue",
      done: "badge-done",
      shiro: "badge-shiro",
      yellow: "badge-yellow",
      daily: "badge-daily",
      weekly: "badge-weekly",
      barter: "badge-barter",
      crow: "badge-crow",
      hunt: "badge-hunt",
      processing: "badge-processing",
      workers: "badge-workers",
      market: "badge-market",
    },
  },
  defaultVariants: { kind: "default" },
});
function Badge({
  children,
  kind,
}: { children: React.ReactNode } & VariantProps<typeof badgeVariants>) {
  return <span className={badgeVariants({ kind })}>{children}</span>;
}

// Prazos são estimativas: o texto sempre aparece com "≈", menos quando já não falta nada
// ou quando não há prazo nenhum para aproximar.
function etaText(days: number) {
  return days > 0 && Number.isFinite(days) ? `≈ ${formatDuration(days)}` : formatDuration(days);
}
function etaKind(days: number) {
  return days <= 0
    ? ("done" as const)
    : !Number.isFinite(days) || days > 30
      ? ("red" as const)
      : ("gold" as const);
}
// Quando a compra fica paga: hoje, ou depois de juntar a moeda nas missões.
function purchaseWhen(days: number) {
  return days <= 0 ? "agora" : etaText(days);
}
// Quando o saldo de Moeda Corvo cobre tudo que falta, o material deixa de depender de farm.
// Sem fonte na rotina, o material não tem prazo: só a loja resolve o que falta.
function materialEtaText(estimate: MaterialEstimate) {
  return estimate.missing <= 0
    ? "pronto"
    : estimate.remaining <= 0 && estimate.days <= 0
      ? "com moedas"
      : estimate.remaining > 0 && estimate.perDay <= 0
        ? "sem fonte"
        : etaText(estimate.days);
}
function materialEtaTitle(estimate: MaterialEstimate, customFarm = false) {
  if (estimate.remaining > 0 && estimate.perDay <= 0)
    return "Nenhuma fonte deste material está na sua rotina: marque a missão ou a atividade na aba Estratégia, informe sua média de drop por dia, ou compre com Moeda Corvo";
  const rate = customFarm
    ? `Ritmo: ${formatRate(estimate.perDay)}, com a sua média de drop por dia`
    : `Ritmo estimado: ${formatRate(estimate.perDay)}`;
  return estimate.covered > 0
    ? `${rate} · ${number(estimate.covered)} un. cobertas pelo saldo de Moeda Corvo`
    : rate;
}
function materialEtaLine(
  profile: PlannerProfile,
  id: MaterialId,
  context: EstimateContext,
) {
  const estimate = materialEstimate(profile, id, context);
  if (estimate.remaining <= 0)
    return estimate.days <= 0
      ? `compra imediata com ${number(estimate.covered)} un. de Moeda Corvo`
      : `${etaText(estimate.days)} para juntar a Moeda Corvo de ${number(estimate.covered)} un.`;
  if (estimate.perDay <= 0)
    return "nenhuma fonte na sua rotina, só a loja";
  const coins =
    estimate.covered > 0
      ? ` · ${number(estimate.covered)} un. com Moeda Corvo`
      : "";
  return `${etaText(estimate.days)} no ritmo de ${formatRate(materialRate(profile, id, context.quests).perDay)}${coins}`;
}

const rateNumber = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

/**
 * Média de drop por dia que o jogador informa para um material. É texto com teclado decimal, e
 * não `type=number`, para aceitar vírgula e não apagar um "0," no meio da digitação. Vazio volta
 * para a estimativa do planner, que aparece como dica no próprio campo.
 */
function FarmRateInput({ id }: { id: MaterialId }) {
  const profile = useActivePreset().profile;
  const setFarmRate = usePlannerStore((state) => state.setFarmRate);
  const [draft, setDraft] = useState<string | null>(null);
  const value = profile.farmRates[id];
  const shown = draft ?? (value === undefined ? "" : rateNumber.format(value));
  return (
    <input
      aria-label={`Drop por dia de ${MATERIAL_BY_ID[id].name}`}
      title="Quantas unidades você consegue por dia fora das missões, em média. Vazio usa a estimativa do planner."
      className={`qty-input farm-rate-input ${value !== undefined ? "custom" : ""}`.trim()}
      type="text"
      inputMode="decimal"
      placeholder={`≈ ${rateNumber.format(estimatedFarmPerDay(profile, id))}`}
      value={shown}
      onChange={(e) => {
        const text = e.target.value;
        const normalized = text.trim().replace(",", ".");
        if (normalized && !/^\d*\.?\d*$/.test(normalized)) return;
        setDraft(text);
        if (!normalized) setFarmRate(id, null);
        else if (normalized !== ".") setFarmRate(id, Number(normalized));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

function StorageStatus() {
  const available = usePlannerStore((state) => state.storageAvailable);
  return available ? (
    <div className="status-dot">
      <i />
      SALVO LOCALMENTE
    </div>
  ) : (
    <p role="status" className="text-gold-bright">
      Salvamento indisponível. O progresso vale apenas nesta sessão.
    </p>
  );
}

function ItemIcon({
  src,
  alt,
  size = 28,
  className = "",
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      className={`item-icon ${className}`.trim()}
      src={src}
      alt={alt}
      width={size}
      height={size}
    />
  );
}

function ShipImage({
  branch,
  className = "",
  decorative = false,
}: {
  branch: ShipBranch;
  className?: string;
  decorative?: boolean;
}) {
  const art = shipArt[branch];
  return (
    <Image
      className={`${className} ship-branch-${branch}`.trim()}
      src={art.src}
      alt={decorative ? "" : art.alt}
      width={960}
      height={600}
      sizes="(max-width: 780px) 100vw, 340px"
    />
  );
}

function MaterialLabel({
  id,
  size = 28,
  className = "",
}: {
  id: MaterialId;
  size?: number;
  className?: string;
}) {
  const item = MATERIAL_BY_ID[id];
  return (
    <span className={`item-label ${className}`.trim()}>
      <ItemIcon src={item.icon} alt={item.name} size={size} />
      <span className="item-label-text">{item.name}</span>
    </span>
  );
}

/** Quantia de Moeda Corvo com o ícone do jogo, do mesmo jeito que um material aparece. */
function CrowCoinAmount({
  value,
  suffix = "",
  size = 18,
  className = "",
}: {
  value: number;
  suffix?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`item-label crow-coin-amount ${className}`.trim()}>
      <ItemIcon src={CROW_COIN_ICON} alt="Moeda Corvo" size={size} />
      <span className="item-label-text">
        {number(value)}
        {suffix && ` ${suffix}`}
      </span>
    </span>
  );
}

function GearLabel({
  branch,
  gearKey,
  base = false,
  size = 30,
  className = "",
}: {
  branch: ShipBranch;
  gearKey: GearKey;
  base?: boolean;
  size?: number;
  className?: string;
}) {
  const gear = GEAR_SETS[branch][gearKey];
  const label = base ? gear.base : gear.name;
  const icon = base ? gear.baseIcon : gear.icon;
  return (
    <span className={`item-label ${className}`.trim()}>
      <ItemIcon src={icon} alt={label} size={size} />
      <span className="item-label-text">{label}</span>
    </span>
  );
}

function CarrackGearLabel({
  target,
  gearKey,
  base = false,
  size = 30,
  className = "",
}: {
  target: CarrackTarget;
  gearKey: GearKey;
  base?: boolean;
  size?: number;
  className?: string;
}) {
  const gear = CARRACK_GEAR_SETS[target][gearKey];
  const label = base ? gear.base : gear.name;
  const icon = base ? gear.baseIcon : gear.icon;
  return (
    <span className={`item-label ${className}`.trim()}>
      <ItemIcon src={icon} alt={label} size={size} />
      <span className="item-label-text">{label}</span>
    </span>
  );
}

function YellowGearLabel({
  target,
  gearKey,
  size = 30,
  className = "",
}: {
  target: CarrackTarget;
  gearKey: GearKey;
  size?: number;
  className?: string;
}) {
  const gear = YELLOW_GEAR_SETS[target][gearKey];
  return (
    <span className={`item-label ${className}`.trim()}>
      <ItemIcon src={gear.icon} alt={gear.name} size={size} />
      <span className="item-label-text">{gear.name}</span>
    </span>
  );
}

/** Item da rota amarela que não é material do plano, com o ícone do jogo. */
function RouteItemLabel({
  item,
  suffix = "",
  size = 26,
}: {
  item: keyof typeof YELLOW_ROUTE_ITEMS;
  suffix?: string;
  size?: number;
}) {
  const data = YELLOW_ROUTE_ITEMS[item];
  return (
    <span className="item-label">
      <ItemIcon src={data.icon} alt={data.name} size={size} />
      <span className="item-label-text">
        {data.name}
        {suffix}
      </span>
    </span>
  );
}

function TextWithItemIcons({ text }: { text: string }) {
  const parts = text.split(itemMentionPattern).filter(Boolean);
  return (
    <>
      {parts.map((part, index) => {
        const match = ITEM_MENTION_MAP.get(part.toLowerCase());
        if (!match) return <span key={`${part}-${index}`}>{part}</span>;
        return (
          <span className="inline-item-mention" key={`${part}-${index}`}>
            <ItemIcon src={match.icon} alt={match.label} size={22} />
            <span>{match.label}</span>
          </span>
        );
      })}
    </>
  );
}

function useActivePreset(): PlannerPreset {
  return usePlannerStore((state) =>
    state.presets.find((preset) => preset.id === state.activePresetId),
  )!;
}

function confirmPresetRemoval(name: string | undefined) {
  return confirm(`Excluir o preset “${name}” e todo o progresso dele?`);
}

function CarrackChoices({
  onSelect,
}: {
  onSelect: (target: CarrackTarget) => void;
}) {
  return (
    <div className="carrack-selector">
      {CARRACK_ORDER.map((id) => {
        const carrack = CARRACKS[id];
        return (
          <button key={id} onClick={() => onSelect(id)}>
            <ShipImage
              branch={carrack.branch}
              className="carrack-choice-image"
              decorative
            />
            <span className="carrack-choice-copy">
              <span className="carrack-role">{carrack.role}</span>
              <strong>{carrack.shortName}</strong>
              <small>{carrack.sourceShip}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PresetSetup({
  canCancel,
  onClose,
}: {
  canCancel: boolean;
  onClose: () => void;
}) {
  const addPreset = usePlannerStore((state) => state.addPreset);
  function chooseCarrack(target: CarrackTarget) {
    addPreset(target);
    onClose();
  }
  return (
    <section className="preset-setup" aria-labelledby="preset-setup-title">
      <div className="preset-setup-heading">
        <div>
          <p className="eyebrow">NOVO PRESET</p>
          <h1 id="preset-setup-title">Qual Carraca você quer planejar?</h1>
          <p>
            O preset terá inventário, equipamentos, missões e progresso
            próprios. Você pode criar Carracas diferentes ou repetir o mesmo
            modelo.
          </p>
        </div>
        {canCancel && (
          <button className="button ghost" onClick={onClose}>
            Cancelar
          </button>
        )}
      </div>
      <CarrackChoices onSelect={chooseCarrack} />
      <StorageStatus />
    </section>
  );
}

function Sidebar({
  tab,
  onNavigate,
  onAddPreset,
}: {
  tab: PlannerTab | null;
  onNavigate: () => void;
  onAddPreset: () => void;
}) {
  const { presets, activePresetId, selectPreset, removePreset } =
    usePlannerStore();
  const activePreset = useActivePreset();
  const profile = activePreset.profile;
  const carrack = CARRACKS[profile.target];
  function removeActivePreset() {
    if (activePresetId && confirmPresetRemoval(activePreset.name))
      removePreset(activePresetId);
  }
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">☸</div>
        <div>
          <span>CARRACK</span>
          <strong>LEDGER</strong>
        </div>
      </div>
      <div className="preset-control">
        <label htmlFor="active-preset">PRESET ATIVO</label>
        <select
          id="active-preset"
          value={activePresetId ?? ""}
          onChange={(event) => selectPreset(event.target.value)}
        >
          {presets.map((preset) => (
            <option value={preset.id} key={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <div className="preset-actions">
          <button onClick={onAddPreset}>＋ Adicionar preset</button>
          <button className="preset-remove" onClick={removeActivePreset}>
            ✕ Remover preset ativo
          </button>
        </div>
      </div>
      <div className="ship-route-card">
        <ShipImage
          branch={carrack.branch}
          className="ship-route-image"
          decorative
        />
        <div>
          <span>ROTA ATUAL</span>
          <strong>{carrack.sourceShip}</strong>
          <i>↓</i>
          <em>{carrack.name}</em>
        </div>
      </div>
      <nav aria-label="Seções do planner">
        {/* As páginas são dinâmicas (leem a sessão), e o Next só pré-carrega rota dinâmica
            quando pedido. Sem isso, cada clique no menu esperaria o servidor para trocar a aba;
            um loading.tsx resolveria a espera, mas entregaria o guia escondido sem JavaScript. */}
        {PLANNER_PAGES.map((page, idx) => (
          <Link
            key={page.tab}
            href={page.path}
            prefetch
            aria-current={tab === page.tab ? "page" : undefined}
            className={tab === page.tab ? "active" : ""}
            onClick={onNavigate}
          >
            <span>0{idx + 1}</span>
            {page.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span>{activePreset.name}</span>
        <strong>{carrack.shortName}</strong>
        <small>
          <CrowCoinAmount
            value={profile.crowCoins}
            suffix="Moedas Corvo"
            size={14}
          />
        </small>
      </div>
    </aside>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  const profile = useActivePreset().profile;
  const setProfile = usePlannerStore((state) => state.setProfile);
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">GRANDE OCEANO · PLANEJAMENTO</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="topbar-actions">
        <div className="coin-box">
          <Sigil>
            <Image
              className="crow-coin-icon"
              src="/assets/items/ravencoin.png"
              alt=""
              width={44}
              height={44}
            />
          </Sigil>
          <span>
            <small>Moeda Corvo</small>
            <input
              aria-label="Moedas Corvo"
              type="number"
              min={0}
              value={profile.crowCoins}
              onChange={(e) =>
                setProfile({ crowCoins: Number(e.target.value) })
              }
            />
          </span>
        </div>
        <StorageStatus />
      </div>
    </header>
  );
}

/**
 * Peça marcada como pronta: os materiais dela já foram consumidos na fabricação e saem da meta,
 * do que falta e do prazo. Usa o `crafted` do preset, então a marcação é salva com o plano.
 */
function GearReadyToggle({
  name,
  checked,
  onChange,
}: {
  name: string;
  checked: boolean;
  onChange: (crafted: boolean) => void;
}) {
  return (
    <label className="gear-ready-toggle" title="Os materiais desta peça deixam de contar na meta e no prazo">
      <input
        type="checkbox"
        aria-label={`${name} pronta, fora do cálculo`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      Pronta · fora do cálculo
    </label>
  );
}

function GearStatus({ state }: { state: GearState }) {
  if (state.crafted && state.blueEnhancement >= 10) return <em>✓ +10</em>;
  return <em>{state.crafted ? "✓ PRONTA" : "PENDENTE"}</em>;
}

/**
 * Coloca o equipamento amarelo na conta do preset. É a mesma escolha no inventário e na aba do
 * equipamento: fora da conta, os materiais de Falasi ficam sem meta, sem falta e sem prazo.
 */
function YellowGearInclusionToggle({ compact = false }: { compact?: boolean }) {
  const included = useActivePreset().profile.yellowGear.included;
  const setYellowGear = usePlannerStore((state) => state.setYellowGear);
  return (
    <label
      className={compact ? "hide-completed-toggle" : "yellow-include-toggle"}
      title="Os materiais de Falasi passam a ter meta, falta e prazo neste preset"
    >
      <input
        type="checkbox"
        aria-label="Contar o equipamento amarelo no cálculo deste preset"
        checked={included}
        onChange={(e) => setYellowGear({ included: e.target.checked })}
      />
      {compact ? (
        <span>Contar equip. amarelo</span>
      ) : (
        <span>
          <strong>Contar o equipamento amarelo no cálculo deste preset</strong>
          <small>
            Ligado, os materiais de Falasi ganham meta, falta e prazo no
            inventário, em “Como obter” e na Visão geral. Desligado, o estoque
            continua guardado, sem entrar em conta nenhuma.
          </small>
        </span>
      )}
    </label>
  );
}

function Overview() {
  const profile = useActivePreset().profile;
  const setGear = usePlannerStore((state) => state.setGear);
  const setCarrackGear = usePlannerStore((state) => state.setCarrackGear);
  const carrack = CARRACKS[profile.target];
  const completion = overallCompletion(profile);
  const hard = bottlenecks(profile).slice(0, 5);
  const actions = nextActions(profile);
  const bluePct = categoryCompletion(profile, "blue-gear");
  const carrackPct = categoryCompletion(profile, "carrack");
  const gearSet = GEAR_SETS[carrack.branch];
  const carrackGearSet = CARRACK_GEAR_SETS[profile.target];
  const context = estimateContext(profile);
  const ship = shipEstimate(profile, context);
  const shiroSet = carrackGearSetEstimate(profile, context);

  return (
    <>
      <Header
        title="Rota para sua Carraca"
        subtitle="Cada preset mantém seu próprio inventário, equipamentos, missões e progresso."
      />
      <section className={`hero-panel carrack-hero ${carrack.branch}`}>
        <div className="hero-art">
          <ShipImage branch={carrack.branch} />
          <div className="hero-vignette" />
        </div>
        <div className="hero-copy">
          <Badge kind="gold">{carrack.role}</Badge>
          <h2>{carrack.name}</h2>
          <p>{carrack.description}</p>
          <div className="route-line">
            <span>{carrack.sourceShip}</span>
            <i>→</i>
            <strong>{carrack.shortName}</strong>
          </div>
          <div className="hero-stats">
            <div>
              <span>Progresso geral</span>
              <strong>{completion}%</strong>
            </div>
            <div>
              <span>Materiais azuis</span>
              <strong>{bluePct}%</strong>
            </div>
            <div>
              <span>Materiais Carraca</span>
              <strong>{carrackPct}%</strong>
            </div>
            <div>
              <span>Tempo estimado</span>
              <strong>{etaText(ship.days)}</strong>
            </div>
          </div>
          <p className="hero-eta-note">
            {ship.slowest ? (
              <>
                Ritmo estimado com as missões diárias e semanais em dia e o
                restante do tempo no oceano. O prazo é ditado por{" "}
                <MaterialLabel id={ship.slowest} size={18} />.
                {ship.covered > 0 && (
                  <>
                    {" Suas "}
                    <CrowCoinAmount
                      value={profile.crowCoins}
                      suffix="Moedas Corvo"
                    />
                    {` já cobrem ${number(ship.covered)} unidades da rota.`}
                  </>
                )}
              </>
            ) : (
              "Todos os materiais da rota estão completos."
            )}
          </p>
        </div>
        <div
          className="completion-ring"
          style={
            { "--progress": `${completion * 3.6}deg` } as React.CSSProperties
          }
        >
          <div>
            <strong>{completion}%</strong>
            <span>concluído</span>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel priority-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">ORDEM DE FOCO</span>
              <h3>Gargalos atuais</h3>
            </div>
            <Badge kind="red">DINÂMICO</Badge>
          </div>
          <div className="bottleneck-list">
            {hard.map((m, index) => (
              <div className="bottleneck" key={m.id}>
                <span className="rank">0{index + 1}</span>
                <div className="bottle-main">
                  <div>
                    <div className="item-heading">
                      <MaterialLabel id={m.id} size={28} />
                    </div>
                    <span>
                      Dificuldade {"◆".repeat(m.difficulty)}
                      {"◇".repeat(5 - m.difficulty)}
                    </span>
                  </div>
                  <Progress value={materialCompletion(profile, m.id) * 100} />
                  <small>
                    {number(profile.materials[m.id])} / {number(m.required)} ·
                    faltam {number(m.missing)} ·{" "}
                    {materialEtaLine(profile, m.id, context)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">AGORA</span>
              <h3>Próximas ações</h3>
            </div>
          </div>
          <div className="action-list">
            {actions.map((a) => (
              <article key={a.title} className={`action ${a.tone}`}>
                <i />
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel gear-overview">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{carrack.sourceShip.toUpperCase()}</span>
            <h3>Quatro equipamentos azuis obrigatórios</h3>
          </div>
          <Badge kind="blue">TODOS +10</Badge>
        </div>
        <div className="gear-mini-grid">
          {(Object.keys(gearSet) as GearKey[]).map((key) => {
            const state = profile.gear[carrack.branch][key];
            const eta = gearEstimate(profile, carrack.branch, key, context);
            return (
              <div className={`gear-mini ${state.crafted ? "done" : ""}`} key={key}>
                <div>
                  <div className="item-heading">
                    <GearLabel
                      branch={carrack.branch}
                      gearKey={key}
                      size={34}
                    />
                  </div>
                  <span>
                    {state.crafted
                      ? `Azul +${state.blueEnhancement}`
                      : `Base +${state.baseEnhancement} · não fabricada`}
                  </span>
                  <span className="gear-mini-eta">
                    {state.crafted
                      ? "Materiais já usados"
                      : `Materiais desta peça ${etaText(eta.days)}`}
                  </span>
                  <GearReadyToggle
                    name={gearSet[key].name}
                    checked={state.crafted}
                    onChange={(crafted) =>
                      setGear(carrack.branch, key, { crafted })
                    }
                  />
                </div>
                <GearStatus state={state} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel gear-overview">
        <div className="panel-title">
          <div>
            <span className="eyebrow">
              DEPOIS DA {carrack.shortName.toUpperCase()}
            </span>
            <h3>Equipamento azul de Shiro</h3>
          </div>
          <div className="panel-title-badges">
            <Badge kind="shiro">{carrackGearCompletion(profile)}%</Badge>
            <Badge kind={etaKind(shiroSet.days)}>
              CONJUNTO {etaText(shiroSet.days)}
            </Badge>
          </div>
        </div>
        <div className="gear-mini-grid">
          {(Object.keys(carrackGearSet) as GearKey[]).map((key) => {
            const state = profile.carrackGear[key];
            const eta = carrackGearEstimate(profile, key, context);
            return (
              <div className={`gear-mini ${state.crafted ? "done" : ""}`} key={key}>
                <div>
                  <div className="item-heading">
                    <CarrackGearLabel
                      target={profile.target}
                      gearKey={key}
                      size={34}
                    />
                  </div>
                  <span>
                    {state.crafted
                      ? `Shiro +${state.blueEnhancement}`
                      : `Toro +${state.baseEnhancement} · não fabricada`}
                  </span>
                  <span className="gear-mini-eta">
                    {state.crafted
                      ? "Materiais já usados"
                      : `Materiais desta peça ${etaText(eta.days)}`}
                  </span>
                  <GearReadyToggle
                    name={carrackGearSet[key].name}
                    checked={state.crafted}
                    onChange={(crafted) => setCarrackGear(key, { crafted })}
                  />
                </div>
                <GearStatus state={state} />
              </div>
            );
          })}
        </div>
      </section>

      {profile.yellowGear.included && <YellowGearOverview />}
    </>
  );
}

/** Resumo do conjunto de Falasi na Visão geral, só quando o jogador o colocou na conta. */
function YellowGearOverview() {
  const profile = useActivePreset().profile;
  const setYellowGear = usePlannerStore((state) => state.setYellowGear);
  const context = estimateContext(profile);
  const yellowSet = YELLOW_GEAR_SETS[profile.target];
  const keys = Object.keys(yellowSet) as GearKey[];
  const ready = keys.filter((key) => profile.yellowGear.crafted[key]).length;
  const setEta = yellowGearSetEstimate(profile, context);
  return (
    <section className="panel gear-overview">
      <div className="panel-title">
        <div>
          <span className="eyebrow">DEPOIS DO SHIRO +10</span>
          <h3>Equipamento amarelo de Falasi</h3>
        </div>
        <div className="panel-title-badges">
          <Badge kind="yellow">
            {ready}/{keys.length} PRONTAS
          </Badge>
          <Badge kind={etaKind(setEta.days)}>
            CONJUNTO {etaText(setEta.days)}
          </Badge>
        </div>
      </div>
      <div className="gear-mini-grid">
        {keys.map((key) => {
          const crafted = profile.yellowGear.crafted[key];
          const eta = yellowGearEstimate(profile, key, context);
          return (
            <div className={`gear-mini ${crafted ? "done" : ""}`} key={key}>
              <div>
                <div className="item-heading">
                  <YellowGearLabel
                    target={profile.target}
                    gearKey={key}
                    size={34}
                  />
                </div>
                <span>
                  {profile.carrackGear[key].crafted
                    ? "Base de Shiro pronta · leve a +10"
                    : "Base de Shiro ainda não fabricada"}
                </span>
                <span className="gear-mini-eta">
                  {crafted
                    ? "Materiais já usados"
                    : `Materiais desta peça ${etaText(eta.days)}`}
                </span>
                <GearReadyToggle
                  name={yellowSet[key].name}
                  checked={crafted}
                  onChange={(value) =>
                    setYellowGear({ crafted: { [key]: value } })
                  }
                />
              </div>
              <em>{crafted ? "✓ PRONTA" : "PENDENTE"}</em>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const collator = new Intl.Collator("pt-BR");
// O primeiro clique já ordena do jeito mais útil da coluna: material de A a Z e, nas colunas
// numéricas, o maior valor primeiro — é o estoque mais alto, a maior falta e o prazo mais longo.
const sortDefaults: Record<InventorySort["key"], InventorySort["dir"]> = {
  name: "asc",
  stock: "desc",
  missing: "desc",
  days: "desc",
};
// O rótulo da coluna é curto demais para virar frase: cada uma descreve a própria ordenação.
const sortHints: Record<InventorySort["key"], string> = {
  name: "Ordenar por material",
  stock: "Ordenar pelo estoque",
  missing: "Ordenar pelo que falta",
  days: "Ordenar pelo prazo",
};

/**
 * Valor de um material na coluna ordenada. `null` marca o que a coluna não sabe medir: material
 * sem meta neste plano não tem falta nem prazo, e a própria tabela mostra "—" nas duas colunas.
 */
function sortValue(
  key: InventorySort["key"],
  id: MaterialId,
  profile: PlannerProfile,
  context: EstimateContext,
) {
  if (key === "stock") return profile.materials[id] || 0;
  if (getGoal(profile, id) <= 0) return null;
  return key === "missing"
    ? getMissing(profile, id)
    : materialEstimate(profile, id, context).days;
}

/**
 * Ordena apenas a lista visível. Sem ordenação escolhida vale a ordem do catálogo, que agrupa
 * os materiais por uso. O que a coluna não mede cai para o fim da lista em qualquer direção, em
 * vez de disputar as primeiras posições com um valor que não existe.
 */
function sortedInventory(
  rows: MaterialDefinition[],
  sort: InventorySort | null,
  profile: PlannerProfile,
  context: EstimateContext,
) {
  if (!sort) return rows;
  const direction = sort.dir === "asc" ? 1 : -1;
  if (sort.key === "name")
    return [...rows].sort(
      (a, b) => collator.compare(a.name, b.name) * direction,
    );
  return [...rows].sort((a, b) => {
    const left = sortValue(sort.key, a.id, profile, context);
    const right = sortValue(sort.key, b.id, profile, context);
    if (left === null || right === null)
      return left === right ? 0 : left === null ? 1 : -1;
    // Valores iguais — inclusive dois prazos "sem estimativa" — mantêm a ordem do catálogo.
    return left === right ? 0 : (left - right) * direction;
  });
}

function SortHeader({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: InventorySort["key"];
  sort: InventorySort | null;
  onSort: (sort: InventorySort) => void;
}) {
  const active = sort?.key === column ? sort : null;
  const current = active
    ? ` — atualmente em ordem ${active.dir === "asc" ? "crescente" : "decrescente"}`
    : "";
  const hint = `${sortHints[column]}${current}`;
  return (
    <button
      type="button"
      className={`inventory-sort ${active ? "active" : ""}`.trim()}
      aria-label={hint}
      title={hint}
      onClick={() =>
        onSort({
          key: column,
          dir: active
            ? active.dir === "asc"
              ? "desc"
              : "asc"
            : sortDefaults[column],
        })
      }
    >
      {label}
      <i aria-hidden="true">
        {active ? (active.dir === "asc" ? "▲" : "▼") : "⇅"}
      </i>
    </button>
  );
}

const HIDE_COMPLETED_KEY = "bdo-carrack-ledger:hide-completed";

/**
 * Preferência de exibição deste navegador. A aba do inventário desmonta a cada troca de aba,
 * então um estado só do componente voltava desligado toda vez. Não entra no preset: é como o
 * jogador prefere ver a lista, e não parte do plano.
 */
function readHideCompleted() {
  try {
    return window.localStorage.getItem(HIDE_COMPLETED_KEY) === "1";
  } catch {
    return false;
  }
}

function saveHideCompleted(value: boolean) {
  try {
    window.localStorage.setItem(HIDE_COMPLETED_KEY, value ? "1" : "0");
  } catch {
    // Sem armazenamento a opção continua valendo até a aba ser trocada.
  }
}

function Inventory() {
  const profile = useActivePreset().profile;
  const setMaterial = usePlannerStore((state) => state.setMaterial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | MaterialCategory>("all");
  const [sort, setSort] = useState<InventorySort | null>(null);
  // O inventário só monta no cliente, depois de o planner carregar, então ler aqui é seguro.
  const [hideCompleted, setHideCompleted] = useState(readHideCompleted);
  const context = estimateContext(profile);
  const relevantCount = MATERIALS.filter(
    (m) => getGoal(profile, m.id) > 0,
  ).length;
  const isMaterialDone = (m: MaterialDefinition) =>
    getGoal(profile, m.id) > 0 && getMissing(profile, m.id) === 0;
  const completed = MATERIALS.filter(isMaterialDone).length;
  const matches = MATERIALS.filter(
    (m) =>
      (filter === "all" || m.category === filter) &&
      (!hideCompleted || !isMaterialDone(m)) &&
      m.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  // Com um filtro ativo, o prazo mostrado é o da categoria escolhida; sem filtro, o da rota inteira.
  const eta =
    filter === "all"
      ? shipEstimate(profile, context)
      : categoryEstimate(profile, filter, context);
  // Categoria sem nenhuma meta neste plano não tem prazo: "pronto" faria parecer que já foi concluída.
  const hasGoal =
    filter === "all" ||
    MATERIALS.some(
      (m) => m.category === filter && getGoal(profile, m.id) > 0,
    );
  const rows = sortedInventory(matches, sort, profile, context);
  const yellowExcluded =
    filter === "yellow-gear" && !profile.yellowGear.included;

  return (
    <>
      <Header
        title="Inventário de materiais"
        subtitle="Informe tudo que já possui neste preset. O estoque alimenta todas as recomendações deste plano."
      />
      <div className="inventory-summary">
        <div>
          <span>Plano atual</span>
          <strong>{CARRACKS[profile.target].shortName}</strong>
        </div>
        <div>
          <span>Materiais do plano</span>
          <strong>{relevantCount}</strong>
        </div>
        <div>
          <span>Concluídos</span>
          <strong>{completed}</strong>
        </div>
        <div>
          <span>Moedas Corvo</span>
          <strong>
            <CrowCoinAmount value={profile.crowCoins} size={20} />
          </strong>
        </div>
        <div>
          <span>
            {filter === "all"
              ? "Tempo até a Carraca"
              : `Tempo · ${CATEGORY_LABELS[filter]}`}
          </span>
          <strong>{hasGoal ? etaText(eta.days) : "—"}</strong>
        </div>
      </div>
      <div className="toolbar inventory-toolbar">
        <div className="segmented">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            Todos
          </button>
          <button
            className={filter === "blue-gear" ? "active" : ""}
            onClick={() => setFilter("blue-gear")}
          >
            Equip. azul
          </button>
          <button
            className={filter === "carrack" ? "active" : ""}
            onClick={() => setFilter("carrack")}
          >
            Carraca
          </button>
          <button
            className={filter === "carrack-gear" ? "active" : ""}
            onClick={() => setFilter("carrack-gear")}
          >
            Equip. Carraca
          </button>
          <button
            className={filter === "yellow-gear" ? "active" : ""}
            onClick={() => setFilter("yellow-gear")}
          >
            Equip. amarelo
          </button>
          <button
            className={filter === "enhancement" ? "active" : ""}
            onClick={() => setFilter("enhancement")}
          >
            Aprimoramento
          </button>
        </div>
        <YellowGearInclusionToggle compact />
        <label className="hide-completed-toggle">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => {
              setHideCompleted(e.target.checked);
              saveHideCompleted(e.target.checked);
            }}
          />
          <span>Ocultar concluídos</span>
        </label>
        <input
          aria-label="Buscar material"
          className="inventory-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar material..."
        />
      </div>
      {yellowExcluded && (
        <p className="yellow-excluded-note" role="status">
          O equipamento amarelo está fora do cálculo deste preset: o estoque
          fica guardado, mas sem meta, falta ou prazo. Marque “Contar equip.
          amarelo” para acompanhar a meta do conjunto de Falasi.
        </p>
      )}
      <section className="inventory-table">
        <div className="inventory-head">
          <SortHeader label="Item" column="name" sort={sort} onSort={setSort} />
          <span>Uso</span>
          <span>Meta atual</span>
          <SortHeader
            label="Tenho"
            column="stock"
            sort={sort}
            onSort={setSort}
          />
          <SortHeader
            label="Falta"
            column="missing"
            sort={sort}
            onSort={setSort}
          />
          <span title="Sua média por dia fora das missões. Vazio usa a estimativa do planner.">
            Drop/dia
          </span>
          <SortHeader
            label="Tempo"
            column="days"
            sort={sort}
            onSort={setSort}
          />
        </div>
        {rows.map((m) => {
          // `inPlan` é a meta que o preset acompanha; `required`, o que sobra depois das peças prontas.
          const inPlan = getGoal(profile, m.id);
          const required = getPlanRequired(profile, m.id);
          const missing = getMissing(profile, m.id);
          const pct = inPlan ? materialCompletion(profile, m.id) * 100 : 0;
          const estimate = materialEstimate(profile, m.id, context);
          return (
            <article
              className={`inventory-material-row ${isMaterialDone(m) ? "complete" : ""}`}
              key={m.id}
            >
              <div className="inventory-item">
                <MaterialLabel id={m.id} size={38} />
                <Progress value={pct} />
              </div>
              <span className="inventory-use">
                <Badge
                  kind={
                    m.category === "carrack"
                      ? "gold"
                      : m.category === "blue-gear"
                        ? "blue"
                        : m.category === "carrack-gear"
                          ? "shiro"
                          : m.category === "yellow-gear"
                            ? "yellow"
                            : "default"
                  }
                >
                  {CATEGORY_LABELS[m.category]}
                </Badge>
              </span>
              <strong
                title={
                  inPlan > required
                    ? `${number(inPlan - required)} já usados nas peças prontas`
                    : undefined
                }
              >
                {inPlan ? number(required) : "—"}
              </strong>
              <input
                aria-label={`Estoque de ${m.name}`}
                className="qty-input"
                type="number"
                min={0}
                value={profile.materials[m.id]}
                onChange={(e) => setMaterial(m.id, Number(e.target.value))}
              />
              <strong
                className={
                  isMaterialDone(m) ? "inventory-done" : "inventory-missing"
                }
              >
                {inPlan ? number(missing) : "—"}
              </strong>
              <label className="inventory-rate">
                <span>Drop/dia</span>
                <FarmRateInput id={m.id} />
              </label>
              <span
                className="inventory-eta"
                title={
                  inPlan
                    ? materialEtaTitle(
                        estimate,
                        profile.farmRates[m.id] !== undefined,
                      )
                    : undefined
                }
              >
                {inPlan ? materialEtaText(estimate) : "—"}
              </span>
            </article>
          );
        })}
      </section>
    </>
  );
}

function sourceMatches(source: Acquisition, filter: SourceFilter) {
  if (filter === "all") return true;
  if (filter === "missions") return isQuestAcquisition(source);
  return source.type === filter;
}

/**
 * Uma fonte do material. Missão fora da rotina escolhida continua listada, com o ritmo que
 * ela devolveria, para o jogador decidir se vale trazê-la de volta ao cálculo.
 */
function SourceCard({
  source,
  materialId,
  context,
  farmPerDay,
  customFarm,
  covered,
  routine,
}: {
  source: Acquisition;
  materialId: MaterialId;
  context: EstimateContext;
  farmPerDay: number;
  /** O jogador informou a própria média de drop: ela vale mesmo com a atividade fora da rotina. */
  customFarm: boolean;
  covered: number;
  routine: PlannerProfile["farmRoutine"];
}) {
  const quest = isQuestAcquisition(source) ? QUEST_BY_ID[source.questId] : null;
  const farmOff =
    !quest && !customFarm && source.type !== "crow" && source.type in FARM_ACTIVITY_LABEL
      ? !isRoutineFarmSource(source, routine)
      : false;
  const inactive = (quest !== null && !context.quests.active.has(quest.id)) || farmOff;
  const perDay = questRatePerDay(source, context.quests, materialId);
  const potential =
    quest && inactive
      ? questRatePerDay(
          source,
          {
            ...context.quests,
            active: new Set([...context.quests.active, quest.id]),
          },
          materialId,
        )
      : 0;
  // Escolha do jogador apontada para outro item desta mesma missão.
  const chosenElsewhere =
    quest && !inactive && context.quests.choices[quest.id] !== undefined
      ? questChoiceOf(quest.id)?.options.find(
          (option) =>
            option.id === context.quests.choices[quest.id] &&
            option.material !== materialId,
        ) ?? null
      : null;
  return (
    <div
      className={`source-card source-${source.type} ${inactive ? "source-inactive" : ""}`.trim()}
    >
      <Badge kind={source.type}>{SOURCE_TYPE_LABELS[source.type]}</Badge>
      {inactive && <Badge kind="red">FORA DO CÁLCULO</Badge>}
      <strong>
        <TextWithItemIcons text={source.label} />
      </strong>
      {source.detail && (
        <p>
          <TextWithItemIcons text={source.detail} />
        </p>
      )}
      {perDay > 0 && (
        <small className="source-rate">
          Rende ≈ {formatRate(perDay)} para este material
        </small>
      )}
      {inactive && quest && (
        <small className="source-rate">
          {quest.npc} · marque esta missão na aba Missões para somar ≈{" "}
          {formatRate(potential)} ao ritmo
        </small>
      )}
      {chosenElsewhere && (
        <small className="source-rate">
          A escolha desta missão está em {chosenElsewhere.label}; troque na aba
          Missões para esta recompensa voltar a render
        </small>
      )}
      {farmOff && (
        <small className="source-rate">
          Fora da sua rotina · ligue {FARM_ACTIVITY_LABEL[source.type]} na aba
          Estratégia para esta fonte entrar no ritmo
        </small>
      )}
      {!quest && !farmOff && source.type !== "crow" && farmPerDay > 0 && (
        <small className="source-rate">
          {customFarm
            ? `Entra no ritmo pela sua média de drop: ${formatRate(farmPerDay)}, contada uma vez entre as rotas livres deste material`
            : `Entra no ritmo como ≈ ${formatRate(farmPerDay)}, contados uma vez entre as rotas livres deste material`}
        </small>
      )}
      {source.type === "crow" && covered > 0 && (
        <small className="source-rate">
          Seu saldo cobre {number(covered)} un. agora e encurta o prazo
        </small>
      )}
    </div>
  );
}

function AcquisitionCatalog() {
  const profile = useActivePreset().profile;
  const [filter, setFilter] = useState<SourceFilter>("all");
  const context = estimateContext(profile);
  const carrack = CARRACKS[profile.target];
  const gearSet = GEAR_SETS[carrack.branch];
  const materials = MATERIALS.filter(
    (m) =>
      m.category === "enhancement" || getGoal(profile, m.id) > 0,
  ).filter(
    (m) => filter === "all" || m.sources.some((s) => sourceMatches(s, filter)),
  );

  const carrackGearSet = CARRACK_GEAR_SETS[profile.target];
  const yellowGearSet = YELLOW_GEAR_SETS[profile.target];
  const usedIn = (id: MaterialId) => {
    const labels: string[] = [];
    if (MATERIAL_BY_ID[id].category === "carrack") labels.push(carrack.name);
    if (MATERIAL_BY_ID[id].category === "enhancement")
      labels.push("Aprimoramento dos equipamentos de navio");
    (Object.keys(gearSet) as GearKey[]).forEach((key) => {
      if (gearSet[key].materials[id]) labels.push(gearSet[key].name);
    });
    (Object.keys(carrackGearSet) as GearKey[]).forEach((key) => {
      if (carrackGearSet[key].materials[id])
        labels.push(carrackGearSet[key].name);
    });
    (Object.keys(yellowGearSet) as GearKey[]).forEach((key) => {
      if (yellowGearSet[key].materials[id])
        labels.push(yellowGearSet[key].name);
    });
    return labels;
  };

  return (
    <>
      <Header
        title="Materiais e onde conseguir"
        subtitle="Missões, compra com Moeda Corvo, processamento, drops e permuta em uma única lista, com o ritmo diário que cada fonte rende."
      />
      <div className="source-filter-bar">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Todos
        </button>
        <button
          className={filter === "missions" ? "active" : ""}
          onClick={() => setFilter("missions")}
        >
          Missões
        </button>
        <button
          className={filter === "crow" ? "active" : ""}
          onClick={() => setFilter("crow")}
        >
          Comprar
        </button>
        <button
          className={filter === "processing" ? "active" : ""}
          onClick={() => setFilter("processing")}
        >
          Processar
        </button>
        <button
          className={filter === "hunt" ? "active" : ""}
          onClick={() => setFilter("hunt")}
        >
          Drop / caça
        </button>
        <button
          className={filter === "barter" ? "active" : ""}
          onClick={() => setFilter("barter")}
        >
          Permuta
        </button>
      </div>
      <div className="acquisition-list">
        {materials.map((m) => {
          const required = getGoal(profile, m.id);
          const missing = getMissing(profile, m.id);
          const sources = m.sources.filter((s) => sourceMatches(s, filter));
          const rate = materialRate(profile, m.id, context.quests);
          const estimate = materialEstimate(profile, m.id, context);
          return (
            <article className="acquisition-card" key={m.id}>
              <div className="acquisition-item">
                <MaterialLabel id={m.id} size={42} />
                <div className="acquisition-numbers">
                  <span>
                    Meta{" "}
                    <strong>
                      {required
                        ? number(getPlanRequired(profile, m.id))
                        : "Aprimoramento"}
                    </strong>
                  </span>
                  <span>
                    Tenho <strong>{number(profile.materials[m.id])}</strong>
                  </span>
                  <span>
                    Falta{" "}
                    <strong className={missing === 0 ? "ok-text" : "warn-text"}>
                      {required ? number(missing) : "—"}
                    </strong>
                  </span>
                  <span>
                    Ritmo <strong>{formatRate(rate.perDay)}</strong>
                  </span>
                  <label className="acquisition-rate">
                    Drop/dia
                    <FarmRateInput id={m.id} />
                  </label>
                  {estimate.covered > 0 && (
                    <span>
                      Com moedas <strong>{number(estimate.covered)}</strong>
                    </span>
                  )}
                  <span>
                    Tempo{" "}
                    <strong>
                      {required ? materialEtaText(estimate) : "—"}
                    </strong>
                  </span>
                </div>
              </div>
              <div className="used-in">
                <span>USADO EM</span>
                {usedIn(m.id).map((label) => (
                  <small key={label}>{label}</small>
                ))}
              </div>
              <div className="acquisition-sources">
                {sources.map((source, index) => (
                  <SourceCard
                    key={`${source.type}-${index}`}
                    source={source}
                    materialId={m.id}
                    context={context}
                    farmPerDay={rate.farmPerDay}
                    customFarm={rate.customFarm}
                    covered={estimate.covered}
                    routine={profile.farmRoutine}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

const twoDecimals = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
function percent(value: number) {
  return `${twoDecimals.format(value)}%`;
}
function silver(value: number) {
  return `${twoDecimals.format(value / 1e9)} bi de prata`;
}

// Atributos na ordem da tabela do anúncio. Percentuais comparam em pontos, o resto em unidades.
const SET_STAT_ROWS: {
  key: keyof ShipSetStats;
  label: string;
  format: (value: number) => string;
  unit?: string;
}[] = [
  { key: "speed", label: "Velocidade", format: percent, unit: "p.p." },
  { key: "acceleration", label: "Aceleração", format: percent, unit: "p.p." },
  { key: "turn", label: "Rotação", format: percent, unit: "p.p." },
  { key: "brake", label: "Freio", format: percent, unit: "p.p." },
  { key: "damage", label: "Dano adicional", format: number },
  { key: "weight", label: "Peso (carga)", format: (v) => `${number(v)} LT`, unit: "LT" },
  { key: "damageReduction", label: "Redução de dano", format: percent, unit: "p.p." },
  { key: "defense", label: "PD", format: number },
  { key: "durability", label: "Durabilidade", format: number },
  { key: "provisions", label: "Provisões", format: number },
  { key: "equipmentDurability", label: "Durabilidade do equipamento", format: number },
];

function statDelta(value: number, unit?: string) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${twoDecimals.format(Math.abs(value))}${unit ? ` ${unit}` : ""}`;
}

/**
 * Tudo sobre o equipamento amarelo da Carraca do preset: se entra na conta, o que cada peça
 * pede, como conseguir cada material, o ganho sobre o Shiro, o aprimoramento e o mercado.
 * Fabricar e aprimorar dependem de tentativas, então a tabela de chances é referência e não
 * entra no prazo — a mesma regra do resto do planner.
 */
function YellowGear() {
  const profile = useActivePreset().profile;
  const setYellowGear = usePlannerStore((state) => state.setYellowGear);
  const carrack = CARRACKS[profile.target];
  const yellowSet = YELLOW_GEAR_SETS[profile.target];
  const keys = Object.keys(yellowSet) as GearKey[];
  const included = profile.yellowGear.included;
  const context = estimateContext(profile);
  const setEta = yellowGearSetEstimate(profile, context);
  const ready = keys.filter((key) => profile.yellowGear.crafted[key]).length;
  const pendingKeys = keys.filter((key) => !profile.yellowGear.crafted[key]);
  const stats = SET_STATS[profile.target];
  // O que as peças que faltam ainda pedem, somado: é a conta do conjunto, não de uma peça.
  const totals = new Map<MaterialId, number>();
  for (const key of pendingKeys)
    for (const [id, qty] of Object.entries(yellowSet[key].materials) as [MaterialId, number][])
      totals.set(id, (totals.get(id) || 0) + qty);
  const blueprintTotal = pendingKeys.length * 10;
  const hornsForSet = pendingKeys.length * Object.keys(LYNGBAKR_HORN_EXCHANGE).length;
  const averageTries = YELLOW_ENHANCEMENT.reduce((sum, step) => sum + 100 / step.withStacks, 0);
  const sourceHref = SOURCES.find((source) => source.href.includes("groupContentNo=8511"))?.href;

  return (
    <>
      <Header
        title="Equipamento amarelo de Falasi"
        subtitle={`O grau mais alto da ${carrack.shortName}: o que cada peça pede, como conseguir cada item e se ele entra na conta deste preset.`}
      />

      <section className="panel yellow-hero">
        <div className="yellow-hero-icons" aria-hidden="true">
          {keys.map((key) => (
            <ItemIcon key={key} src={yellowSet[key].icon} alt="" size={56} />
          ))}
        </div>
        <div className="yellow-hero-copy">
          <Badge kind="yellow">NÍVEL AMARELO</Badge>
          <h2>Falasi da {carrack.shortName}</h2>
          <p>
            Quatro peças exclusivas de cada Carraca, feitas a partir do conjunto
            de Shiro em +10 com materiais do Lyngbakr, a nova criatura da Terra
            do Amanhecer. Cada peça também pede uma permissão de{" "}
            {silver(FALASI_PERMIT_SILVER)}.
          </p>
          <YellowGearInclusionToggle />
          <div className="yellow-hero-stats">
            <div>
              <span>Peças prontas</span>
              <strong>
                {ready}/{keys.length}
              </strong>
            </div>
            <div>
              <span>Tempo dos materiais</span>
              <strong>{included ? etaText(setEta.days) : "fora do cálculo"}</strong>
            </div>
            <div>
              <span>Permissões pendentes</span>
              <strong>{silver(pendingKeys.length * FALASI_PERMIT_SILVER)}</strong>
            </div>
          </div>
          {included && setEta.slowest && (
            <p className="hero-eta-note">
              O prazo é ditado por <MaterialLabel id={setEta.slowest} size={18} />,
              no ritmo da caça no oceano marcada na aba Estratégia, ou na sua
              média de drop por dia, se você informou no inventário. A permissão
              é comprada com prata e fica fora do prazo.
            </p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{carrack.name.toUpperCase()}</span>
            <h3>As quatro peças de Falasi</h3>
          </div>
        </div>
        <div className="yellow-piece-grid">
          {keys.map((key) => {
            const piece = yellowSet[key];
            const crafted = profile.yellowGear.crafted[key];
            const shiroReady = profile.carrackGear[key].crafted;
            const eta = yellowGearEstimate(profile, key, context);
            return (
              <article
                className={`yellow-piece ${crafted ? "done" : ""}`}
                key={key}
              >
                <div className="yellow-piece-head">
                  <YellowGearLabel target={profile.target} gearKey={key} size={44} />
                  <em>{crafted ? "✓ PRONTA" : "PENDENTE"}</em>
                </div>
                <ul className="yellow-recipe">
                  <li>
                    <span className="item-label">
                      <ItemIcon src={piece.baseIcon} alt={piece.base} size={26} />
                      <span className="item-label-text">{piece.base}</span>
                    </span>
                    <strong className={shiroReady ? "ok-text" : "warn-text"}>
                      {shiroReady ? "Shiro pronta" : "Shiro pendente"}
                    </strong>
                  </li>
                  {(Object.entries(piece.materials) as [MaterialId, number][]).map(
                    ([id, qty]) => {
                      const have = profile.materials[id] || 0;
                      return (
                        <li key={id}>
                          <MaterialLabel id={id} size={26} />
                          <strong className={have >= qty ? "ok-text" : undefined}>
                            {number(Math.min(have, qty))} / {number(qty)}
                          </strong>
                        </li>
                      );
                    },
                  )}
                  <li>
                    <span className="item-label">
                      <ItemIcon src={piece.permitIcon} alt={piece.permit} size={26} />
                      <span className="item-label-text">{piece.permit}</span>
                    </span>
                    <strong>{silver(FALASI_PERMIT_SILVER)}</strong>
                  </li>
                </ul>
                <p className="yellow-piece-eta">
                  {crafted
                    ? "Materiais já usados na fabricação"
                    : included
                      ? `Materiais desta peça ${etaText(eta.days)}`
                      : "Fora do cálculo · sem prazo"}
                </p>
                <GearReadyToggle
                  name={piece.name}
                  checked={crafted}
                  onChange={(value) => setYellowGear({ crafted: { [key]: value } })}
                />
              </article>
            );
          })}
        </div>
        <p className="panel-note yellow-note">
          Fabricação na {yellowSet.figurehead.workshop}. O estoque é
          compartilhado entre as peças: cada linha compara o inventário com a
          receita de uma peça só.
        </p>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">PASSO A PASSO</span>
            <h3>Como conseguir</h3>
          </div>
        </div>
        <ol className="yellow-steps">
          <li>
            <strong>Leve a peça de Shiro da mesma posição a +10.</strong>
            <p>
              Ela é consumida na receita: a Proa de Falasi pede a Proa de Shiro
              +10, e assim por diante. O conjunto de Shiro está na Visão geral.
            </p>
          </li>
          <li>
            <strong>Cace na Colônia de Lyngbakr, na Terra do Amanhecer.</strong>
            <p>
              O Lyngbakr ocupou a antiga área do Crocodilo do Mar e vem
              escoltado por Lyngburks — é conteúdo difícil, pensado para
              capitães veteranos. Os espólios que importam para Falasi:
            </p>
            <div className="yellow-drops">
              <RouteItemLabel item="horn" />
              <RouteItemLabel item="bone" />
              <RouteItemLabel item="scale" />
              <RouteItemLabel item="essence" />
              <MaterialLabel id="twilightCoralEssence" size={26} />
            </div>
          </li>
          <li>
            <strong>Processe os espólios, um para um.</strong>
            <p>
              Cada receita leva também{" "}
              <RouteItemLabel item="hardener" suffix=" x1" size={20} /> e{" "}
              <RouteItemLabel item="emulsifier" suffix=" x1" size={20} />. Com
              Pó de Pedra Negra x1, o processamento em massa faz 10 de uma vez.
            </p>
            <div className="yellow-process">
              {YELLOW_PROCESSING.map((step) => (
                <div key={step.output}>
                  <RouteItemLabel item={step.input} suffix=" x1" />
                  <i aria-hidden="true">→</i>
                  <small>{step.method}</small>
                  <i aria-hidden="true">→</i>
                  <MaterialLabel id={step.output} size={26} />
                </div>
              ))}
            </div>
          </li>
          <li>
            <strong>Troque o Chifre de Lyngbakr pelo material mais atrasado.</strong>
            <p>
              Cada chifre vira a quantidade de uma peça inteira de um dos três
              materiais, à escolha:{" "}
              {(Object.entries(LYNGBAKR_HORN_EXCHANGE) as [MaterialId, number][])
                .map(([id, qty]) => `${MATERIAL_BY_ID[id].name} x${qty}`)
                .join(", ")}
              .{" "}
              {pendingKeys.length > 0 &&
                `Com ${hornsForSet} chifres, os materiais das ${pendingKeys.length} peças pendentes estão fechados.`}
            </p>
          </li>
          <li>
            <strong>Troque as essências pelas plantas.</strong>
            <p>
              Com {FALASI_PERMIT_SELLER}:{" "}
              <MaterialLabel id="twilightCoralEssence" size={20} /> x2 por
              planta. Cada peça pede 10 plantas da própria posição
              {pendingKeys.length > 0 &&
                ` — faltam ${blueprintTotal} plantas, ou ${blueprintTotal * 2} essências, para as peças pendentes`}
              .
            </p>
          </li>
          <li>
            <strong>Compre a permissão e fabrique.</strong>
            <p>
              A permissão da {carrack.shortName} custa{" "}
              {silver(FALASI_PERMIT_SILVER)} com {FALASI_PERMIT_SELLER}. Com
              tudo em mãos, fabrique na {yellowSet.figurehead.workshop}.
            </p>
          </li>
        </ol>
        <p className="panel-note yellow-note">
          Espólio de Lyngbakr que sobrar vira{" "}
          <MaterialLabel id="waveStone" size={18} /> no Comerciante de Moeda
          Corvo: Osso x1 → 8, Escama x1 → 12, Essência x1 → 20. A semanal
          “Investigar a ecologia da área de Lyngbakr”, do Kangman, não entrega
          material amarelo, mas rende Moeda Corvo x500.
        </p>
      </section>

      <div className="strategy-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">
                {pendingKeys.length === keys.length
                  ? "CONJUNTO COMPLETO"
                  : `${pendingKeys.length} PEÇAS PENDENTES`}
              </span>
              <h3>O que falta juntar</h3>
            </div>
          </div>
          {pendingKeys.length ? (
            <ul className="yellow-totals">
              {[...totals].map(([id, qty]) => {
                const have = profile.materials[id] || 0;
                return (
                  <li key={id}>
                    <MaterialLabel id={id} size={26} />
                    <strong className={have >= qty ? "ok-text" : "warn-text"}>
                      {number(have)} / {number(qty)}
                    </strong>
                  </li>
                );
              })}
              <li>
                <span className="item-label">
                  <ItemIcon src={yellowSet.figurehead.permitIcon} alt="" size={26} />
                  <span className="item-label-text">
                    {pendingKeys.length === 1
                      ? "1 permissão de Falasi"
                      : `${pendingKeys.length} permissões de Falasi`}
                  </span>
                </span>
                <strong>{silver(pendingKeys.length * FALASI_PERMIT_SILVER)}</strong>
              </li>
            </ul>
          ) : (
            <p className="empty-state">As quatro peças de Falasi estão prontas.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">QUATRO PEÇAS EM +10</span>
              <h3>Shiro × Falasi</h3>
            </div>
          </div>
          <div className="yellow-table-scroll">
            <table className="yellow-table">
              <thead>
                <tr>
                  <th scope="col">Atributo</th>
                  <th scope="col">Shiro +10</th>
                  <th scope="col">Falasi +10</th>
                  <th scope="col">Ganho</th>
                </tr>
              </thead>
              <tbody>
                {SET_STAT_ROWS.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    <td>{row.format(stats.shiro[row.key])}</td>
                    <td>{row.format(stats.falasi[row.key])}</td>
                    <td className="ok-text">
                      {statDelta(stats.falasi[row.key] - stats.shiro[row.key], row.unit)}
                    </td>
                  </tr>
                ))}
                {stats.cannonReload && (
                  <tr>
                    <th scope="row">Recarga do canhão</th>
                    <td>—</td>
                    <td>{stats.cannonReload}</td>
                    <td className="ok-text">{stats.cannonReload}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">DEPOIS DE FABRICAR</span>
            <h3>Aprimoramento de +1 a +10</h3>
          </div>
          <Badge kind="default">FORA DO PRAZO</Badge>
        </div>
        <p className="yellow-enhance-recipe">
          Cada tentativa gasta{" "}
          <MaterialLabel id="twilightWaveStone" size={22} /> x1, feita em
          Aquecimento com <MaterialLabel id="twilightCoralEssence" size={20} />{" "}
          x1 e <MaterialLabel id="waveStone" size={20} /> x100. Na falha, a peça
          perde durabilidade e cai um nível, a menos que você use Pedras Cron.
        </p>
        <div className="yellow-table-scroll">
          <table className="yellow-table">
            <thead>
              <tr>
                <th scope="col">Nível</th>
                <th scope="col">Chance base</th>
                <th scope="col">Acúmulos base</th>
                <th scope="col">Chance com acúmulos</th>
                <th scope="col">Tentativas em média</th>
                <th scope="col">Essência de Agris</th>
                <th scope="col">Pedras Cron</th>
              </tr>
            </thead>
            <tbody>
              {YELLOW_ENHANCEMENT.map((step) => (
                <tr key={step.level}>
                  <th scope="row">+{step.level}</th>
                  <td>{percent(step.base)}</td>
                  <td>{step.stacks}</td>
                  <td>{percent(step.withStacks)}</td>
                  <td>≈ {twoDecimals.format(Math.round(1000 / step.withStacks) / 10)}</td>
                  <td>{step.agris}</td>
                  <td>{step.cron ? number(step.cron) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel-note yellow-note">
          “Tentativas em média” é 100 ÷ a chance com os acúmulos base: uma
          referência, não uma promessa. Somando os dez níveis, são ≈{" "}
          {Math.round(averageTries)} Pedras Negras da Onda Crepuscular por peça,
          com Pedras Cron segurando o nível a cada falha. Você tem{" "}
          {number(profile.materials.twilightWaveStone)} no inventário.
        </p>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">MERCADO MUNDIAL</span>
            <h3>Preço de uma peça de Falasi</h3>
          </div>
        </div>
        <div className="yellow-table-scroll">
          <table className="yellow-table">
            <thead>
              <tr>
                <th scope="col">Nível</th>
                <th scope="col">Preço mínimo</th>
                <th scope="col">Preço máximo</th>
              </tr>
            </thead>
            <tbody>
              {YELLOW_MARKET_PRICES.map((price) => (
                <tr key={price.level}>
                  <th scope="row">+{price.level}</th>
                  <td>{silver(price.min)}</td>
                  <td>{silver(price.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel-note yellow-note">
          Comprar pronta pula a fabricação inteira: a +0 sai a partir de{" "}
          {silver(YELLOW_MARKET_PRICES[0].min)}, contra{" "}
          {silver(FALASI_PERMIT_SILVER)} da permissão mais os materiais.
          {sourceHref && (
            <>
              {" "}
              <a
                className="text-gold-bright"
                href={sourceHref}
                target="_blank"
                rel="noreferrer"
              >
                Fonte: Notas da Atualização de 27/08/2026
              </a>
            </>
          )}
        </p>
      </section>
    </>
  );
}

/**
 * Recompensa de escolha da missão. O jogo entrega um item por conclusão, então o planner
 * precisa saber qual: sem escolha ele divide a missão entre as metas pendentes, que é uma
 * média, e não a rotina de ninguém. A sugestão aponta a meta mais demorada entre as opções.
 */
function QuestChoicePicker({
  quest,
  choice,
  chosen,
  recommended,
  shared,
}: {
  quest: QuestDefinition;
  choice: QuestChoice;
  chosen: string | null;
  recommended: string | null;
  shared: boolean;
}) {
  const setQuestChoice = usePlannerStore((state) => state.setQuestChoice);
  const chosenOption =
    choice.options.find((option) => option.id === chosen) ?? null;
  return (
    <fieldset className="quest-choice">
      <legend>Recompensa de escolha · escolha o item que você vai pegar</legend>
      <div className="quest-choice-options">
        <label
          className={`quest-choice-option ${chosen ? "" : "picked"}`.trim()}
        >
          <input
            type="radio"
            name={`quest-choice-${quest.id}`}
            checked={chosen === null}
            onChange={() => setQuestChoice(quest.id, null)}
          />
          <span className="quest-choice-text">
            <strong>Automático</strong>
            <small>Divide a missão entre as metas que ainda faltam</small>
          </span>
        </label>
        {choice.options.map((option) => (
          <label
            key={option.id}
            className={`quest-choice-option ${chosen === option.id ? "picked" : ""}`.trim()}
          >
            <input
              type="radio"
              name={`quest-choice-${quest.id}`}
              checked={chosen === option.id}
              onChange={() => setQuestChoice(quest.id, option.id)}
            />
            {option.material && (
              <ItemIcon
                src={MATERIAL_BY_ID[option.material].icon}
                alt=""
                size={22}
              />
            )}
            <span className="quest-choice-text">
              <strong>
                {option.label} <em>x{number(option.quantity)}</em>
                {option.id === recommended && (
                  <span className="quest-choice-tip"> (Recomendado)</span>
                )}
              </strong>
              {!option.material && (
                <small>Fora do plano: não entra no cálculo</small>
              )}
            </span>
          </label>
        ))}
      </div>
      {shared && chosenOption && (
        <p className="quest-choice-note" role="status">
          {chosenOption.label} já está concluído neste preset, então a missão
          voltou a dividir a recompensa entre as metas que faltam.
        </p>
      )}
    </fieldset>
  );
}

function QuestCard({
  quest,
  group,
  done,
  active,
  resetKey,
  relevant,
  showTrack,
  choice,
  chosen,
  recommended,
  shared,
}: {
  quest: QuestDefinition;
  group: QuestGroupDefinition;
  done: boolean;
  active: boolean;
  resetKey: string;
  relevant: boolean;
  showTrack: boolean;
  choice: QuestChoice | null;
  chosen: string | null;
  recommended: string | null;
  shared: boolean;
}) {
  const toggleQuest = usePlannerStore((state) => state.toggleQuest);
  const setQuestActive = usePlannerStore((state) => state.setQuestActive);
  const trackLabel = group.trackLabels?.[quest.track];
  return (
    <article
      className={`quest-card ${done ? "done" : ""} ${relevant ? "relevant" : ""} ${active ? "" : "quest-inactive"}`}
    >
      <button
        className="quest-check"
        aria-label={`${done ? "Desmarcar" : "Concluir"} missão: ${quest.title}`}
        aria-pressed={done}
        onClick={() => toggleQuest(quest.id, resetKey)}
      >
        {done ? "✓" : ""}
      </button>
      <div className="quest-body">
        <div className="quest-top">
          <div>
            <Badge kind={quest.cadence}>
              {CADENCE_BY_ID[quest.cadence].label.toUpperCase()}
            </Badge>
            {relevant && <Badge kind="gold">FOCO ATUAL</Badge>}
            {showTrack && trackLabel && (
              <Badge kind={active ? "blue" : "default"}>
                TRILHA · {trackLabel.toUpperCase()}
              </Badge>
            )}
            <h3>{quest.title}</h3>
          </div>
          <label className="quest-active">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setQuestActive(quest.id, e.target.checked)}
            />
            <span>Entra no cálculo</span>
          </label>
        </div>
        <p className="objective">{quest.objective}</p>
        {quest.note && <p className="quest-note">{quest.note}</p>}
        <div className="rewards">
          {quest.rewards.map((r) => (
            <span key={r}>
              <TextWithItemIcons text={r} />
            </span>
          ))}
        </div>
        {choice && (
          <QuestChoicePicker
            quest={quest}
            choice={choice}
            chosen={chosen}
            recommended={recommended}
            shared={shared}
          />
        )}
        <small className="quest-source">
          Fonte:{" "}
          <a href={quest.sourceUrl} target="_blank" rel="noreferrer">
            {quest.source}
            <span aria-hidden="true"> ↗</span>
          </a>
        </small>
      </div>
    </article>
  );
}

function Quests() {
  const activePreset = useActivePreset();
  const profile = activePreset.profile;
  const completedQuests = activePreset.completedQuests;
  const [cadence, setCadence] = useState<QuestCadence>("daily");
  const hardIds = new Set(
    bottlenecks(profile)
      .slice(0, 7)
      .map((m) => m.id),
  );
  const resetKey = questResetKey(cadence);
  const counts = questCounts(profile, cadence);
  const quests = questContext(profile);
  // Os NPCs com missões ligadas aos gargalos do preset sobem na lista.
  const groups = groupsOfCadence(cadence)
    .map((group) => ({
      group,
      quests: questsOfGroup(group),
      tracks: tracksOfGroup(group),
    }))
    .sort((a, b) => {
      const focus = (entry: typeof a) =>
        entry.quests.some((quest) =>
          quest.recommendedFor.some((id) => hardIds.has(id)),
        )
          ? 1
          : 0;
      const priority = (entry: typeof a) =>
        Math.max(...entry.quests.map((quest) => quest.priority));
      return focus(b) - focus(a) || priority(b) - priority(a);
    });

  return (
    <>
      <Header
        title="Missões do Oceano"
        subtitle="Um bloco por NPC, com a regra de aceite do jogo. Marque as missões que você realmente faz: só elas entram no ritmo e nos prazos estimados."
      />
      <div className="toolbar">
        <div className="segmented">
          {QUEST_CADENCES.map((item) => (
            <button
              key={item.id}
              className={cadence === item.id ? "active" : ""}
              onClick={() => setCadence(item.id)}
            >
              {item.plural} (
              {QUESTS.filter((quest) => quest.cadence === item.id).length})
            </button>
          ))}
        </div>
        <div className="legend">
          <i className="priority-mark" /> Compatível com seus gargalos
        </div>
      </div>
      <p className="quest-summary" role="status">
        <strong>{counts.active}</strong> de {counts.total}{" "}
        {CADENCE_BY_ID[cadence].plural.toLowerCase()} entram no cálculo deste
        preset. As demais continuam na lista, mas não geram ritmo.
      </p>
      <div className="quest-groups">
        {groups.map(({ group, quests: groupQuests, tracks }) => {
          const exclusive = group.selection === "one-track";
          const activeCount = groupQuests.filter((quest) =>
            isQuestActive(profile, quest.id),
          ).length;
          return (
            <section className="quest-group" key={group.id}>
              <header className="quest-group-head">
                <div>
                  <span className="eyebrow">{group.location}</span>
                  <h3>{group.npc}</h3>
                </div>
                <div className="quest-group-badges">
                  <Badge kind={group.cadence}>
                    {CADENCE_BY_ID[group.cadence].plural.toUpperCase()}
                  </Badge>
                  <Badge kind={exclusive ? "red" : "default"}>
                    {exclusive ? "TRILHA ÚNICA" : "ACUMULÁVEIS"}
                  </Badge>
                  <Badge kind={activeCount ? "done" : "default"}>
                    {activeCount}/{groupQuests.length} NO CÁLCULO
                  </Badge>
                </div>
              </header>
              {group.note && <p className="quest-group-note">{group.note}</p>}
              <div className="quest-list">
                {groupQuests.map((quest) => {
                  const choice = questChoiceOf(quest.id);
                  const chosen = profile.questChoices[quest.id] ?? null;
                  return (
                    <QuestCard
                      key={quest.id}
                      quest={quest}
                      group={group}
                      done={completedQuests[quest.id] === resetKey}
                      active={isQuestActive(profile, quest.id)}
                      resetKey={resetKey}
                      relevant={quest.recommendedFor.some((id) =>
                        hardIds.has(id),
                      )}
                      showTrack={exclusive && tracks.length > 1}
                      choice={choice}
                      chosen={chosen}
                      recommended={
                        choice
                          ? recommendedChoiceOption(profile, quest.id, quests)
                          : null
                      }
                      shared={
                        chosen !== null && quests.choices[quest.id] === undefined
                      }
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

/**
 * Onde o saldo de Moeda Corvo pode ser gasto. A peça verde é comprada pronta e reserva o
 * saldo antes de tudo; acelerar material é opcional e separado por categoria, porque o
 * jogador que está guardando moeda para as peças não quer o plano torrando o saldo em
 * material que ele mesmo farma.
 */
function CrowSpendChoices({ profile, plan }: { profile: PlannerProfile; plan: CoinPlan }) {
  const setCrowSpend = usePlannerStore((state) => state.setCrowSpend);
  const spend = profile.crowSpend;
  const parts = plan.parts;
  return (
    <div className="crow-spend">
      <span className="crow-spend-title">Onde este saldo pode ser gasto</span>
      <label className="crow-spend-option">
        <input
          aria-label="Comprar as peças verdes da Carraca"
          type="checkbox"
          checked={spend.carrackParts}
          onChange={(e) => setCrowSpend({ carrackParts: e.target.checked })}
        />
        <div>
          <strong>Comprar as peças verdes da Carraca</strong>
          <small>
            Peça de Toro, com Lavinia no Ninho do Corvo ·{" "}
            {number(parts.unit)} moedas cada
          </small>
        </div>
        <select
          aria-label="Peças verdes compradas com moedas"
          value={spend.carrackPartCount}
          disabled={!spend.carrackParts}
          onChange={(e) =>
            setCrowSpend({ carrackPartCount: Number(e.target.value) })
          }
        >
          {Array.from({ length: CARRACK_PART_COUNT + 1 }, (_, count) => (
            <option key={count} value={count}>
              {count === 1 ? "1 peça" : `${count} peças`}
            </option>
          ))}
        </select>
      </label>
      {spend.carrackParts && parts.affordable < parts.count && (
        <p className="crow-spend-warning">
          O saldo paga <b>{number(parts.affordable)}</b> das{" "}
          {number(parts.count)} peças. Faltam{" "}
          <b>{number(parts.count * parts.unit - profile.crowCoins)}</b> moedas
          para as demais.
        </p>
      )}
      <label className="crow-spend-option">
        <input
          aria-label="Acelerar os materiais do equipamento azul"
          type="checkbox"
          checked={spend.blueGear}
          onChange={(e) => setCrowSpend({ blueGear: e.target.checked })}
        />
        <div>
          <strong>Acelerar os materiais do equipamento azul</strong>
          <small>
            Peças azuis do Navio Mercante e do Contratorpedeiro, exigidas para
            chegar à Carraca
          </small>
        </div>
      </label>
      <label className="crow-spend-option">
        <input
          aria-label="Acelerar os materiais de construção da Carraca"
          type="checkbox"
          checked={spend.carrackMaterials}
          onChange={(e) => setCrowSpend({ carrackMaterials: e.target.checked })}
        />
        <div>
          <strong>Acelerar os materiais de construção da Carraca</strong>
          <small>
            Os itens verdes da própria melhoria, como o Sal de Rocha e o Olho
            Abissal
          </small>
        </div>
      </label>
    </div>
  );
}

/**
 * O que o jogador faz além das missões. Atividade desligada deixa de render no prazo, e o
 * material que só sai dela passa a depender da loja — é isso que redireciona a compra sugerida.
 */
function FarmRoutineChoices({ profile }: { profile: PlannerProfile }) {
  const setFarmRoutine = usePlannerStore((state) => state.setFarmRoutine);
  return (
    <div className="crow-spend">
      <span className="crow-spend-title">Além das missões, eu faço</span>
      {FARM_ROUTINE_OPTIONS.map((option) => (
        <label className="crow-spend-option" key={option.id}>
          <input
            aria-label={option.title}
            type="checkbox"
            checked={profile.farmRoutine[option.id]}
            onChange={(e) => setFarmRoutine({ [option.id]: e.target.checked })}
          />
          <div>
            <strong>{option.title}</strong>
            <small>{option.detail}</small>
          </div>
        </label>
      ))}
    </div>
  );
}

function Strategy() {
  const profile = useActivePreset().profile;
  const carrackGearSet = CARRACK_GEAR_SETS[profile.target];
  const hard = bottlenecks(profile);
  const context = estimateContext(profile);
  const plan = context.plan;
  const ship = shipEstimate(profile, context);
  const shiroSet = carrackGearSetEstimate(profile, context);
  const stalled = stalledRoute(profile, context);
  const planCost =
    plan.parts.count * plan.parts.unit +
    plan.items.reduce((sum, item) => sum + item.cost, 0);
  const stalledNames = stalled.map((material) => MATERIAL_BY_ID[material.id].shortName);
  return (
    <>
      <Header
        title="Estratégia de aquisição"
        subtitle="Use Moedas Corvo apenas depois de comparar missões, processamento, drop e permuta."
      />
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">ROTINA</span>
            <h3>O que entra no prazo</h3>
          </div>
        </div>
        <p className="panel-note">
          As missões marcadas na aba Missões sempre contam. Desmarque aqui o
          que você não faz: a atividade deixa de render no prazo, e o material
          que só sai dela passa para a compra sugerida. Drop que cai por acaso
          durante as missões não entra no ritmo; registre-o no inventário.
        </p>
        <FarmRoutineChoices profile={profile} />
      </section>
      <div className="strategy-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">MOEDA CORVO</span>
              <h3>Compra sugerida</h3>
            </div>
            <Badge kind="gold">
              <CrowCoinAmount
                value={profile.crowCoins}
                suffix="DISPONÍVEIS"
                size={14}
              />
            </Badge>
          </div>
          <p className="panel-note">
            O plano soma o saldo de hoje à Moeda Corvo das missões marcadas
            {plan.income > 0 ? (
              <>
                {" "}
                (<b>≈ {number(Math.round(plan.income))}/dia</b>)
              </>
            ) : null}{" "}
            e compra primeiro o que só sai da loja. O que as missões trazem
            entra só com a diferença que elas não cobrem a tempo.
          </p>
          <CrowSpendChoices profile={profile} plan={plan} />
          <div className="purchase-list">
            {plan.parts.count > 0 && (
              <div className="purchase">
                <span>01</span>
                <div>
                  <div className="item-heading">
                    <div className="part-icons">
                      {(Object.keys(carrackGearSet) as GearKey[]).map((key) => (
                        <ItemIcon
                          key={key}
                          src={carrackGearSet[key].baseIcon}
                          alt={carrackGearSet[key].base}
                          size={18}
                        />
                      ))}
                    </div>
                    <strong>Peças verdes da Carraca</strong>
                  </div>
                  <small>
                    {number(plan.parts.count)} un. × {number(plan.parts.unit)}{" "}
                    moedas · {purchaseWhen(plan.parts.readyIn)}
                  </small>
                </div>
                <em>
                  <CrowCoinAmount
                    value={plan.parts.count * plan.parts.unit}
                    size={16}
                  />
                </em>
              </div>
            )}
            {plan.items.length
              ? plan.items.map((x, i) => (
                  <div className="purchase" key={x.id}>
                    <span>
                      {String(i + 1 + (plan.parts.count > 0 ? 1 : 0)).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="item-heading">
                        <MaterialLabel id={x.id} size={18} />
                      </div>
                      <small>
                        {number(x.suggested)} un. × {number(x.unit)} moedas ·{" "}
                        {purchaseWhen(x.readyIn)}
                      </small>
                    </div>
                    <em>
                      <CrowCoinAmount value={x.cost} size={16} />
                    </em>
                  </div>
                ))
              : plan.parts.count === 0 && (
                  <div className="empty-state">
                    {!profile.crowSpend.blueGear &&
                    !profile.crowSpend.carrackMaterials &&
                    !profile.crowSpend.carrackParts
                      ? "Nenhum destino liberado: marque acima onde as moedas podem ser gastas."
                      : "Nada a comprar: as fontes da sua rotina já cobrem o que falta."}
                  </div>
                )}
          </div>
          <div className="purchase-total">
            <span>Saldo após o plano</span>
            <strong>
              <CrowCoinAmount
                value={profile.crowCoins - planCost}
                size={18}
              />
            </strong>
          </div>
          {stalled.length > 0 ? (
            <p className="purchase-gain">
              {stalledNames.slice(0, 3).join(", ")}
              {stalledNames.length > 3
                ? ` e mais ${number(stalledNames.length - 3)}`
                : ""}{" "}
              {stalled.length === 1 ? "não tem" : "não têm"} como fechar:{" "}
              {plan.income > 0
                ? "nenhuma fonte na sua rotina, e a compra deles não está liberada acima."
                : "nenhuma missão marcada rende Moeda Corvo, e o saldo de hoje não paga."}{" "}
              Até lá, a rota até a Carraca fica sem prazo.
            </p>
          ) : (
            (plan.items.length > 0 || plan.parts.count > 0) && (
              <p className="purchase-gain">
                {plan.shortfall > 0 ? (
                  <>
                    Faltam juntar{" "}
                    <b>
                      <CrowCoinAmount value={plan.shortfall} suffix="moedas" />
                    </b>{" "}
                    nas missões. A rota até a Carraca fica em{" "}
                    <b>{etaText(ship.days)}</b>.
                  </>
                ) : (
                  <>
                    O saldo de hoje paga tudo. A rota até a Carraca fica em{" "}
                    <b>{etaText(ship.days)}</b>.
                  </>
                )}
              </p>
            )
          )}
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">GARGALOS</span>
              <h3>Por que focar neles</h3>
            </div>
          </div>
          <div className="why-list">
            {hard.slice(0, 6).map((m) => (
              <div key={m.id}>
                <div className="why-title">
                  <div className="item-heading">
                    <MaterialLabel id={m.id} size={18} />
                  </div>
                  <Badge kind={m.difficulty >= 5 ? "red" : "gold"}>
                    DIFICULDADE {m.difficulty}/5
                  </Badge>
                </div>
                <p>
                  Faltam <b>{number(m.missing)}</b> de {number(m.required)}:{" "}
                  <b>{materialEtaLine(profile, m.id, context)}</b>.{" "}
                  {m.crowPrice ? (
                    <>
                      Comprar tudo custaria{" "}
                      <CrowCoinAmount
                        value={m.missing * m.crowPrice}
                        suffix="Moedas Corvo"
                      />
                      .
                    </>
                  ) : (
                    "Priorize fontes recorrentes."
                  )}
                </p>
                <div className="source-chips">
                  {m.sources.slice(0, 4).map((s, i) => (
                    <Badge key={i} kind={s.type}>
                      {SOURCE_TYPE_LABELS[s.type]}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">PRAZOS</span>
            <h3>Como o tempo é estimado</h3>
          </div>
          <Badge kind={etaKind(ship.days)}>CARRACA {etaText(ship.days)}</Badge>
        </div>
        <p className="panel-note">
          Os prazos partem do que falta no seu inventário e do ritmo de cada
          fonte. Não são promessa de data: aprimoramento, sorte e tempo de jogo
          mudam o resultado.
        </p>
        <ul className="estimate-rules">
          <li>
            Só as missões marcadas na aba Missões entram na conta, com a
            quantidade que a própria recompensa entrega e supondo que você as
            conclui em dia. Onde o jogo obriga a escolher — as duas Pequenas
            Retribuições, ou o Rei do Mar Jovem contra as três caçadas do
            Ravikel — apenas a trilha escolhida rende.
          </li>
          <li>
            Recompensa de escolha rende um item por conclusão. Escolha o item na
            aba Missões e ele leva a conclusão inteira; no automático, o ritmo é
            dividido entre as metas que ainda faltam e acelera quando uma delas
            fecha.
          </li>
          <li>
            Permuta, caça, processamento e escavação não têm frequência fixa:
            valem uma estimativa única por dificuldade do material, para um dia
            dedicado ao oceano, e só quando a atividade está marcada na sua
            rotina, no topo desta aba. Se você informar a sua média de drop por
            dia de um material, no inventário ou em “Como obter”, ela substitui
            essa estimativa — mesmo com a atividade desmarcada.
          </li>
          <li>
            A Moeda Corvo soma o saldo de hoje à que as missões marcadas rendem
            por dia. A compra sugerida é paga em fila: cada item fica pronto no
            dia em que a moeda acumulada cobre ele e tudo que vem antes.
          </li>
          <li>
            A fila começa pelas peças verdes, segue pelo que nenhuma fonte da
            sua rotina entrega, do mais barato ao mais caro, e termina nos
            materiais que também vêm de missão — destes, só a diferença que as
            missões não cobrem até a Carraca ficar pronta.
          </li>
          <li>
            Os materiais são obtidos em paralelo, então o prazo da rota é o do
            material mais demorado; fabricar e aprimorar as peças fica fora da
            conta.
          </li>
        </ul>
        <div className="estimate-totals">
          <div>
            <span>Materiais da rota até a Carraca</span>
            <strong>{etaText(ship.days)}</strong>
          </div>
          <div>
            <span>Conjunto de Shiro completo</span>
            <strong>{etaText(shiroSet.days)}</strong>
          </div>
        </div>
      </section>
      <section className="panel sources-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">REFERÊNCIAS</span>
            <h3>Dados usados pelo planner</h3>
          </div>
        </div>
        <div className="source-links">
          {SOURCES.map((s) => (
            <a key={s.href} href={s.href} target="_blank" rel="noreferrer">
              {s.label}
              <span>↗</span>
            </a>
          ))}
        </div>
        <p className="source-disclaimer">
          Dificuldade, ordem de foco e tempo estimado são heurísticas do
          planner. Nomes, receitas, quantidades e métodos de obtenção são
          baseados nas fontes listadas.
        </p>
      </section>
    </>
  );
}

function AccountPanel({ account, accountEnabled, notice }: AccountShellProps) {
  const status = usePlannerStore((state) => state.syncStatus);
  const pending = usePlannerStore(
    (state) => state.pendingPresetIds.length + state.pendingRemovals.length,
  );

  return (
    <div className="account-shell">
      <AccountBar account={account} enabled={accountEnabled} notice={notice} />
      {status === "off" ? null : (
        <p className={`account-status account-status-${status}`} role="status">
          {status === "loading" && "Carregando o progresso da conta…"}
          {status === "saving" && "Salvando na conta…"}
          {status === "saved" && "Progresso salvo na conta."}
          {status === "pending" &&
            `${pending} ${pending === 1 ? "alteração pendente" : "alterações pendentes"} de envio.`}
          {status === "error" &&
            "Não foi possível salvar na conta agora. O progresso está guardado neste navegador e será enviado na próxima tentativa."}
          {status === "outdated" &&
            "Este plano foi salvo por uma versão mais nova do site. Atualize a página para voltar a salvar."}
        </p>
      )}
    </div>
  );
}

function ImportOffer({
  presets,
  accountId,
  onClose,
}: {
  presets: PlannerPreset[];
  accountId: string;
  onClose: () => void;
}) {
  const { addImportedPresets, markImported } = usePlannerStore();

  function importThem() {
    const existing = usePlannerStore.getState().presets;
    addImportedPresets(planImport(presets, existing, createPresetId));
    markImported(accountId);
    onClose();
  }

  function keepLocal() {
    markImported(accountId);
    onClose();
  }

  return (
    <section className="panel import-offer">
      <div className="panel-title">
        <div>
          <span className="eyebrow">IMPORTAR</span>
          <h3>Presets guardados neste navegador</h3>
        </div>
      </div>
      <p className="panel-note">
        Encontramos {presets.length}{" "}
        {presets.length === 1 ? "plano salvo" : "planos salvos"} aqui, fora da
        conta. A importação cria cópias novas e não substitui nada do que já
        está na sua conta.
      </p>
      <div className="import-actions">
        <button className="button primary" onClick={importThem}>
          Importar para a conta
        </button>
        <button className="button ghost" onClick={keepLocal}>
          Não importar
        </button>
      </div>
    </section>
  );
}

interface AccountShellProps {
  account: Account | null;
  accountEnabled: boolean;
  notice: string | null;
}

/** Atalhos para o guia de cada página, na tela de escolha da primeira Carraca. */
function GuideLinks() {
  return (
    <nav
      aria-label="Guia de Carracas"
      className="mx-auto mt-6 flex max-w-6xl flex-wrap gap-4 text-gold-bright"
    >
      <span className="text-muted">Consultar o guia:</span>
      {PLANNER_PAGES.filter((page) => page.tab !== "overview").map((page) => (
        <Link key={page.path} href={page.path}>
          {page.label}
        </Link>
      ))}
      {CARRACK_ORDER.map((id) => (
        <Link key={CARRACK_SLUGS[id]} href={carrackPath(id)}>
          {CARRACKS[id].shortName}
        </Link>
      ))}
    </nav>
  );
}

/**
 * A aba vem da URL: cada seção é uma página com endereço, título e guia próprios. O
 * componente fica no layout, então trocar de página não refaz a carga do progresso nem a
 * sincronização com a conta — só troca a aba.
 */
function App({
  children,
  account,
  accountEnabled,
}: { children: React.ReactNode } & Omit<AccountShellProps, "notice">) {
  const pathname = usePathname();
  const tab = tabOfPath(pathname);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [creatingPreset, setCreatingPreset] = useState(false);
  const [importable, setImportable] = useState<PlannerPreset[]>([]);
  const { presets, activePresetId, removePreset, resetAll } = usePlannerStore();
  const pendingPresetIds = usePlannerStore((state) => state.pendingPresetIds);
  const pendingRemovals = usePlannerStore((state) => state.pendingRemovals);
  const mainRef = useRef<HTMLElement>(null);
  const accountId = account?.id ?? null;

  useEffect(() => {
    let active = true;
    async function boot() {
      // O escopo anônimo é lido primeiro mesmo com sessão: é dele que sai a oferta de
      // importação, e depois da troca de escopo esses presets não estariam mais em memória.
      await usePlannerStore.persist.rehydrate();
      const local = usePlannerStore.getState().presets;
      if (!active) return;
      // O aviso de conta chega na URL depois do login ou da saída. É lido do endereço, e não
      // com `useSearchParams`, que obrigaria a página a esperar o JavaScript; o painel da
      // conta só aparece depois da montagem, então nada se perde.
      const params = new URLSearchParams(window.location.search);
      setNotice(
        accountNotice({ conta: params.get("conta"), error: params.get("error") }),
      );

      if (!accountId) {
        usePlannerStore.getState().setAccount(null);
        usePlannerStore.getState().setSyncStatus("off");
        setMounted(true);
        return;
      }

      switchStorageScope(accountId);
      if (!active) return;
      usePlannerStore.getState().setAccount(accountId);
      setMounted(true);

      await loadFromCloud();
      if (!active) return;
      const { importedFor } = usePlannerStore.getState();
      if (shouldOfferImport(local, accountId, importedFor))
        setImportable(local);
    }
    void boot();
    return () => {
      active = false;
    };
  }, [accountId]);

  // A fila muda de identidade a cada edição, então o efeito reinicia a espera: é a pausa na
  // edição que dispara o envio, e não um relógio fixo.
  useEffect(() => {
    if (!mounted || !accountId) return;
    if (!pendingPresetIds.length && !pendingRemovals.length) return;
    const timer = setTimeout(() => {
      void flushPending();
    }, 1200);
    return () => clearTimeout(timer);
  }, [mounted, accountId, pendingPresetIds, pendingRemovals]);

  useEffect(() => {
    if (!accountId) return;
    const retry = () => {
      void flushPending();
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [accountId]);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);


  // Antes da hidratação vale o guia da página, que é o mesmo HTML entregue sem JavaScript.
  if (!mounted)
    return (
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    );
  const accountPanel = (
    <AccountPanel
      account={account}
      accountEnabled={accountEnabled}
      notice={notice}
    />
  );
  const offer =
    importable.length && accountId ? (
      <ImportOffer
        presets={importable}
        accountId={accountId}
        onClose={() => setImportable([])}
      />
    ) : null;
  const activePreset = presets.find((preset) => preset.id === activePresetId);
  // Sem preset, as páginas de assunto continuam mostrando o guia delas — é o conteúdo que o
  // visitante veio buscar —, com o convite para montar o plano. A escolha da Carraca fica na
  // página inicial.
  if (!activePreset && tab !== "overview")
    return (
      <main id="main-content" tabIndex={-1} ref={mainRef}>
        {offer}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-4 sm:px-8 sm:pt-8">
          <p>
            Monte o seu plano: escolha a Carraca e acompanhe estoque, prazos e
            missões.
          </p>
          <Link className="button primary no-underline" href="/">
            Escolher minha Carraca
          </Link>
        </div>
        {children}
      </main>
    );
  if (!activePreset)
    return (
      <main
        id="main-content"
        tabIndex={-1}
        ref={mainRef}
        className="preset-start-shell"
      >
        <div className="preset-start-brand">
          <div className="brand-mark">☸</div>
          <div>
            <span>CARRACK</span>
            <strong>LEDGER</strong>
          </div>
        </div>
        {accountPanel}
        {offer}
        <PresetSetup
          canCancel={false}
          onClose={() => setCreatingPreset(false)}
        />
        <GuideLinks />
      </main>
    );

  function showPresetCreator() {
    router.push("/");
    setNotice(null);
    setCreatingPreset(true);
  }

  function deleteActivePreset() {
    if (confirmPresetRemoval(activePreset?.name)) removePreset(activePresetId!);
  }

  return (
    <div className="app-shell">
      <Sidebar
        tab={tab}
        onNavigate={() => {
          setNotice(null);
          setCreatingPreset(false);
        }}
        onAddPreset={showPresetCreator}
      />
      <main id="main-content" tabIndex={-1} ref={mainRef} className="content">
        <div className="content-inner">
          {accountPanel}
          {offer}
          {creatingPreset ? (
            <PresetSetup canCancel onClose={() => setCreatingPreset(false)} />
          ) : (
            <>
              {tab === "overview" && <Overview />}
              {tab === "inventory" && <Inventory />}
              {tab === "materials" && <AcquisitionCatalog />}
              {tab === "yellow" && <YellowGear />}
              {tab === "quests" && <Quests />}
              {tab === "strategy" && <Strategy />}
            </>
          )}
        </div>
        <footer>
          <span>
            Carrack Ledger &middot; {presets.length}{" "}
            {presets.length === 1 ? "preset" : "presets"}{" "}
            {accountId ? "na sua conta" : "neste navegador"}
          </span>
          <div>
            <button onClick={deleteActivePreset}>Excluir preset atual</button>
            <button
              onClick={() => {
                if (
                  confirm(
                    accountId
                      ? "Apagar os planos guardados neste navegador? O que está na conta continua salvo."
                      : "Apagar todos os presets e progressos salvos?",
                  )
                )
                  resetAll();
              }}
            >
              {accountId ? "Limpar este navegador" : "Redefinir tudo"}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
