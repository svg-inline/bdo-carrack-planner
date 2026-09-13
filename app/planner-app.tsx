"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CARRACK_GEAR_SETS, CARRACK_ORDER, CARRACKS, GEAR_SETS, MATERIALS, MATERIAL_BY_ID, QUESTS, SOURCES } from "@/lib/data";
import { bottlenecks, carrackGearCompletion, getMissing, getRequired, materialCompletion, nextActions, overallCompletion, purchasePlan, questResetKey } from "@/lib/planner";
import { usePlannerStore } from "@/lib/store";
import type { Acquisition, AcquisitionType, CarrackTarget, GearKey, MaterialCategory, MaterialId, PlannerPreset, ShipBranch } from "@/types";

const tabs = [
  ["overview", "Visão geral"],
  ["inventory", "Inventário"],
  ["materials", "Como obter"],
  ["gear", "Azuis +10"],
  ["carrack-gear", "Shiro da Carraca"],
  ["quests", "Missões"],
  ["strategy", "Estratégia"],
] as const;

type Tab = (typeof tabs)[number][0];
type SourceFilter = "all" | "missions" | "crow" | "processing" | "hunt" | "barter";

const categoryLabel: Record<MaterialCategory, string> = { carrack: "Carraca", "blue-gear": "Equip. azul", "carrack-gear": "Equip. Carraca", enhancement: "Aprimoramento" };
const sourceLabel: Record<AcquisitionType, string> = { daily: "Missão diária", weekly: "Missão semanal", barter: "Permuta", crow: "Comprar", hunt: "Drop / caça", processing: "Processar", workers: "Trabalhadores", market: "Mercado" };
const shipArt: Record<ShipBranch, { src: string; alt: string }> = {
  caravel: { src: "/assets/epheria-caravel.png", alt: "Navio Mercante de Epheria" },
  galleass: { src: "/assets/epheria-caravel.png", alt: "Contratorpedeiro de Epheria" },
};

function number(v: number) { return new Intl.NumberFormat("pt-BR").format(v); }
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

const itemAliasPairs: Array<[string, { label: string; icon: string }]> = [
  ...MATERIALS.flatMap((item) => [[item.name, { label: item.name, icon: item.icon }], [item.shortName, { label: item.name, icon: item.icon }]] as Array<[string, { label: string; icon: string }]>),
  ["Artefato Cox (Combate)", { label: MATERIAL_BY_ID.coxCombat.name, icon: MATERIAL_BY_ID.coxCombat.icon }],
  ["Artefato dos Piratas Cox (Combate)", { label: MATERIAL_BY_ID.coxCombat.name, icon: MATERIAL_BY_ID.coxCombat.icon }],
];

const ITEM_MENTION_MAP = new Map<string, { label: string; icon: string }>();
for (const [alias, data] of itemAliasPairs) ITEM_MENTION_MAP.set(alias.toLowerCase(), data);
const itemMentionPattern = new RegExp(`(${[...ITEM_MENTION_MAP.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})`, "gi");

function Sigil({ children }: { children: React.ReactNode }) { return <span className="sigil">{children}</span>; }
function Progress({ value, className = "" }: { value: number; className?: string }) {
  const progress = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return <div role="progressbar" aria-label="Progresso de materiais" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className={`progress ${className}`}><span style={{ width: `${progress}%` }} /></div>;
}
const badgeVariants = cva("badge", {
  variants: { kind: {
    default: "badge-default", gold: "badge-gold", red: "badge-red", blue: "badge-blue", done: "badge-done", shiro: "badge-shiro",
    daily: "badge-daily", weekly: "badge-weekly", barter: "badge-barter", crow: "badge-crow",
    hunt: "badge-hunt", processing: "badge-processing", workers: "badge-workers", market: "badge-market",
  } }, defaultVariants: { kind: "default" },
});
function Badge({ children, kind }: { children: React.ReactNode } & VariantProps<typeof badgeVariants>) { return <span className={badgeVariants({ kind })}>{children}</span>; }

function StorageStatus() {
  const available = usePlannerStore((state) => state.storageAvailable);
  return available ? <div className="status-dot"><i />SALVO LOCALMENTE</div>
    : <p role="status" className="text-gold-bright">Salvamento indisponível. O progresso vale apenas nesta sessão.</p>;
}

function ItemIcon({ src, alt, size = 28, className = "" }: { src: string; alt: string; size?: number; className?: string }) {
  return <Image className={`item-icon ${className}`.trim()} src={src} alt={alt} width={size} height={size} />;
}

function ShipImage({ branch, className = "", decorative = false }: { branch: ShipBranch; className?: string; decorative?: boolean }) {
  const art = shipArt[branch];
  return <Image className={`${className} ship-branch-${branch}`.trim()} src={art.src} alt={decorative ? "" : art.alt} width={960} height={600} sizes="(max-width: 780px) 100vw, 340px" />;
}

function MaterialLabel({ id, size = 28, className = "" }: { id: MaterialId; size?: number; className?: string }) {
  const item = MATERIAL_BY_ID[id];
  return <span className={`item-label ${className}`.trim()}><ItemIcon src={item.icon} alt={item.name} size={size} /><span className="item-label-text">{item.name}</span></span>;
}

function GearLabel({ branch, gearKey, base = false, size = 30, className = "" }: { branch: ShipBranch; gearKey: GearKey; base?: boolean; size?: number; className?: string }) {
  const gear = GEAR_SETS[branch][gearKey];
  const label = base ? gear.base : gear.name;
  const icon = base ? gear.baseIcon : gear.icon;
  return <span className={`item-label ${className}`.trim()}><ItemIcon src={icon} alt={label} size={size} /><span className="item-label-text">{label}</span></span>;
}

function CarrackGearLabel({ target, gearKey, base = false, size = 30, className = "" }: { target: CarrackTarget; gearKey: GearKey; base?: boolean; size?: number; className?: string }) {
  const gear = CARRACK_GEAR_SETS[target][gearKey];
  const label = base ? gear.base : gear.name;
  const icon = base ? gear.baseIcon : gear.icon;
  return <span className={`item-label ${className}`.trim()}><ItemIcon src={icon} alt={label} size={size} /><span className="item-label-text">{label}</span></span>;
}

function TextWithItemIcons({ text }: { text: string }) {
  const parts = text.split(itemMentionPattern).filter(Boolean);
  return <>{parts.map((part, index) => {
    const match = ITEM_MENTION_MAP.get(part.toLowerCase());
    if (!match) return <span key={`${part}-${index}`}>{part}</span>;
    return <span className="inline-item-mention" key={`${part}-${index}`}><ItemIcon src={match.icon} alt={match.label} size={22} /><span>{match.label}</span></span>;
  })}</>;
}

function useActivePreset(): PlannerPreset {
  return usePlannerStore((state) => state.presets.find((preset) => preset.id === state.activePresetId))!;
}

function confirmPresetRemoval(name: string | undefined) {
  return confirm(`Excluir o preset “${name}” e todo o progresso dele?`);
}

function CarrackChoices({ onSelect }: { onSelect: (target: CarrackTarget) => void }) {
  return <div className="carrack-selector">
    {CARRACK_ORDER.map((id) => {
      const carrack = CARRACKS[id];
      return <button key={id} onClick={() => onSelect(id)}>
        <ShipImage branch={carrack.branch} className="carrack-choice-image" decorative />
        <span className="carrack-choice-copy"><span className="carrack-role">{carrack.role}</span><strong>{carrack.shortName}</strong><small>{carrack.sourceShip}</small></span>
      </button>;
    })}
  </div>;
}

function PresetSetup({ canCancel, onClose }: { canCancel: boolean; onClose: () => void }) {
  const addPreset = usePlannerStore((state) => state.addPreset);
  function chooseCarrack(target: CarrackTarget) {
    addPreset(target);
    onClose();
  }
  return <section className="preset-setup" aria-labelledby="preset-setup-title">
    <div className="preset-setup-heading">
      <div><p className="eyebrow">NOVO PRESET</p><h1 id="preset-setup-title">Qual Carraca você quer planejar?</h1><p>O preset terá inventário, equipamentos, missões e progresso próprios. Você pode criar Carracas diferentes ou repetir o mesmo modelo.</p></div>
      {canCancel && <button className="button ghost" onClick={onClose}>Cancelar</button>}
    </div>
    <CarrackChoices onSelect={chooseCarrack} />
    <StorageStatus />
  </section>;
}

function Sidebar({ tab, setTab, onAddPreset }: { tab: Tab; setTab: (tab: Tab) => void; onAddPreset: () => void }) {
  const { presets, activePresetId, selectPreset, removePreset } = usePlannerStore();
  const activePreset = useActivePreset();
  const profile = activePreset.profile;
  const carrack = CARRACKS[profile.target];
  function removeActivePreset() {
    if (activePresetId && confirmPresetRemoval(activePreset.name)) removePreset(activePresetId);
  }
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark">☸</div><div><span>CARRACK</span><strong>LEDGER</strong></div></div>
    <div className="preset-control"><label htmlFor="active-preset">PRESET ATIVO</label><select id="active-preset" value={activePresetId ?? ""} onChange={(event) => selectPreset(event.target.value)}>{presets.map((preset) => <option value={preset.id} key={preset.id}>{preset.name}</option>)}</select><div className="preset-actions"><button onClick={onAddPreset}>＋ Adicionar preset</button><button className="preset-remove" onClick={removeActivePreset}>✕ Remover preset ativo</button></div></div>
    <div className="ship-route-card"><ShipImage branch={carrack.branch} className="ship-route-image" decorative /><div><span>ROTA ATUAL</span><strong>{carrack.sourceShip}</strong><i>↓</i><em>{carrack.name}</em></div></div>
    <nav aria-label="Seções do planner">{tabs.map(([key, label], idx) => <button key={key} aria-current={tab === key ? "page" : undefined} className={tab === key ? "active" : ""} onClick={() => setTab(key)}><span>0{idx + 1}</span>{label}</button>)}</nav>
    <div className="sidebar-footer"><span>{activePreset.name}</span><strong>{carrack.shortName}</strong><small>{number(profile.crowCoins)} Moedas Corvo</small></div>
  </aside>;
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  const profile = useActivePreset().profile;
  const setProfile = usePlannerStore((state) => state.setProfile);
  return <header className="topbar"><div><p className="eyebrow">GRANDE OCEANO · PLANEJAMENTO</p><h1>{title}</h1><p>{subtitle}</p></div><div className="topbar-actions"><div className="coin-box"><Sigil>◉</Sigil><span><small>Moeda Corvo</small><input aria-label="Moedas Corvo" type="number" min={0} value={profile.crowCoins} onChange={(e) => setProfile({ crowCoins: Number(e.target.value) })} /></span></div><StorageStatus /></div></header>;
}

function Overview() {
  const profile = useActivePreset().profile;
  const carrack = CARRACKS[profile.target];
  const completion = overallCompletion(profile);
  const hard = bottlenecks(profile).slice(0, 5);
  const actions = nextActions(profile);
  const blue = MATERIALS.filter((m) => m.category === "blue-gear");
  const direct = MATERIALS.filter((m) => m.category === "carrack");
  const bluePct = Math.round(blue.reduce((s, m) => s + materialCompletion(profile, m.id), 0) / blue.length * 100);
  const carrackPct = Math.round(direct.reduce((s, m) => s + materialCompletion(profile, m.id), 0) / direct.length * 100);
  const gearSet = GEAR_SETS[carrack.branch];
  const carrackGearSet = CARRACK_GEAR_SETS[profile.target];

  return <>
    <Header title="Rota para sua Carraca" subtitle="Cada preset mantém seu próprio inventário, equipamentos, missões e progresso." />
    <section className={`hero-panel carrack-hero ${carrack.branch}`}>
      <div className="hero-art"><ShipImage branch={carrack.branch} /><div className="hero-vignette" /></div>
      <div className="hero-copy"><Badge kind="gold">{carrack.role}</Badge><h2>{carrack.name}</h2><p>{carrack.description}</p><div className="route-line"><span>{carrack.sourceShip}</span><i>→</i><strong>{carrack.shortName}</strong></div><div className="hero-stats"><div><span>Progresso geral</span><strong>{completion}%</strong></div><div><span>Materiais azuis</span><strong>{bluePct}%</strong></div><div><span>Materiais Carraca</span><strong>{carrackPct}%</strong></div></div></div>
      <div className="completion-ring" style={{ "--progress": `${completion * 3.6}deg` } as React.CSSProperties}><div><strong>{completion}%</strong><span>concluído</span></div></div>
    </section>


    <div className="dashboard-grid">
      <section className="panel priority-panel"><div className="panel-title"><div><span className="eyebrow">ORDEM DE FOCO</span><h3>Gargalos atuais</h3></div><Badge kind="red">DINÂMICO</Badge></div><div className="bottleneck-list">{hard.map((m, index) => <div className="bottleneck" key={m.id}><span className="rank">0{index + 1}</span><div className="bottle-main"><div><div className="item-heading"><MaterialLabel id={m.id} size={28} /></div><span>Dificuldade {"◆".repeat(m.difficulty)}{"◇".repeat(5 - m.difficulty)}</span></div><Progress value={materialCompletion(profile, m.id) * 100} /><small>{number(profile.materials[m.id])} / {number(m.required)} · faltam {number(m.missing)}</small></div></div>)}</div></section>
      <section className="panel"><div className="panel-title"><div><span className="eyebrow">AGORA</span><h3>Próximas ações</h3></div></div><div className="action-list">{actions.map((a) => <article key={a.title} className={`action ${a.tone}`}><i /><div><strong>{a.title}</strong><p>{a.detail}</p></div></article>)}</div></section>
    </div>

    <section className="panel gear-overview"><div className="panel-title"><div><span className="eyebrow">{carrack.sourceShip.toUpperCase()}</span><h3>Quatro equipamentos azuis obrigatórios</h3></div><Badge kind="blue">TODOS +10</Badge></div><div className="gear-mini-grid">{(Object.keys(gearSet) as GearKey[]).map((key) => { const state = profile.gear[carrack.branch][key]; const done = state.crafted && state.blueEnhancement >= 10; return <div className={`gear-mini ${done ? "done" : ""}`} key={key}><div><div className="item-heading"><GearLabel branch={carrack.branch} gearKey={key} size={34} /></div><span>{state.crafted ? `Azul +${state.blueEnhancement}` : `Base +${state.baseEnhancement} · não fabricada`}</span></div><em>{done ? "✓ PRONTA" : "PENDENTE"}</em></div>; })}</div></section>

    <section className="panel gear-overview"><div className="panel-title"><div><span className="eyebrow">DEPOIS DA {carrack.shortName.toUpperCase()}</span><h3>Equipamento azul de Shiro</h3></div><Badge kind="shiro">{carrackGearCompletion(profile)}%</Badge></div><div className="gear-mini-grid">{(Object.keys(carrackGearSet) as GearKey[]).map((key) => { const state = profile.carrackGear[key]; const done = state.crafted && state.blueEnhancement >= 10; return <div className={`gear-mini ${done ? "done" : ""}`} key={key}><div><div className="item-heading"><CarrackGearLabel target={profile.target} gearKey={key} size={34} /></div><span>{state.crafted ? `Shiro +${state.blueEnhancement}` : `Toro +${state.baseEnhancement} · não fabricada`}</span></div><em>{done ? "✓ PRONTA" : "PENDENTE"}</em></div>; })}</div></section>
  </>;
}

function Inventory() {
  const profile = useActivePreset().profile;
  const setMaterial = usePlannerStore((state) => state.setMaterial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | MaterialCategory>("all");
  const relevantCount = MATERIALS.filter((m) => getRequired(m.id, profile.target) > 0).length;
  const completed = MATERIALS.filter((m) => getRequired(m.id, profile.target) > 0 && getMissing(profile, m.id) === 0).length;
  const rows = MATERIALS.filter((m) => (filter === "all" || m.category === filter) && m.name.toLowerCase().includes(query.trim().toLowerCase()));

  return <><Header title="Inventário de materiais" subtitle="Informe tudo que já possui neste preset. O estoque alimenta todas as recomendações deste plano." />
    <div className="inventory-summary"><div><span>Plano atual</span><strong>{CARRACKS[profile.target].shortName}</strong></div><div><span>Materiais do plano</span><strong>{relevantCount}</strong></div><div><span>Concluídos</span><strong>{completed}</strong></div><div><span>Moedas Corvo</span><strong>{number(profile.crowCoins)}</strong></div></div>
    <div className="toolbar inventory-toolbar"><div className="segmented"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos</button><button className={filter === "blue-gear" ? "active" : ""} onClick={() => setFilter("blue-gear")}>Equip. azul</button><button className={filter === "carrack" ? "active" : ""} onClick={() => setFilter("carrack")}>Carraca</button><button className={filter === "carrack-gear" ? "active" : ""} onClick={() => setFilter("carrack-gear")}>Equip. Carraca</button><button className={filter === "enhancement" ? "active" : ""} onClick={() => setFilter("enhancement")}>Aprimoramento</button></div><input aria-label="Buscar material" className="inventory-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar material..." /></div>
    <section className="inventory-table"><div className="inventory-head"><span>Item</span><span>Uso</span><span>Meta atual</span><span>Tenho</span><span>Falta</span></div>{rows.map((m) => { const required = getRequired(m.id, profile.target); const missing = getMissing(profile, m.id); const pct = required ? materialCompletion(profile, m.id) * 100 : 0; return <article className={`inventory-material-row ${required > 0 && missing === 0 ? "complete" : ""}`} key={m.id}><div className="inventory-item"><MaterialLabel id={m.id} size={38} /><Progress value={pct} /></div><span className="inventory-use"><Badge kind={m.category === "carrack" ? "gold" : m.category === "blue-gear" ? "blue" : m.category === "carrack-gear" ? "shiro" : "default"}>{categoryLabel[m.category]}</Badge></span><strong>{required ? number(required) : "—"}</strong><input aria-label={`Estoque de ${m.name}`} className="qty-input" type="number" min={0} value={profile.materials[m.id]} onChange={(e) => setMaterial(m.id, Number(e.target.value))} /><strong className={missing === 0 && required > 0 ? "inventory-done" : "inventory-missing"}>{required ? number(missing) : "—"}</strong></article>; })}</section>
  </>;
}

function sourceMatches(source: Acquisition, filter: SourceFilter) {
  if (filter === "all") return true;
  if (filter === "missions") return source.type === "daily" || source.type === "weekly";
  return source.type === filter;
}

function AcquisitionCatalog() {
  const profile = useActivePreset().profile;
  const [filter, setFilter] = useState<SourceFilter>("all");
  const carrack = CARRACKS[profile.target];
  const gearSet = GEAR_SETS[carrack.branch];
  const materials = MATERIALS.filter((m) => m.category === "enhancement" || getRequired(m.id, profile.target) > 0).filter((m) => filter === "all" || m.sources.some((s) => sourceMatches(s, filter)));

  const carrackGearSet = CARRACK_GEAR_SETS[profile.target];
  const usedIn = (id: MaterialId) => {
    const labels: string[] = [];
    if (MATERIAL_BY_ID[id].category === "carrack") labels.push(carrack.name);
    if (MATERIAL_BY_ID[id].category === "enhancement") labels.push("Aprimoramento dos equipamentos de navio");
    (Object.keys(gearSet) as GearKey[]).forEach((key) => { if (gearSet[key].materials[id]) labels.push(gearSet[key].name); });
    (Object.keys(carrackGearSet) as GearKey[]).forEach((key) => { if (carrackGearSet[key].materials[id]) labels.push(carrackGearSet[key].name); });
    return labels;
  };

  return <><Header title="Materiais e onde conseguir" subtitle="Missões, compra com Moeda Corvo, processamento, drops e permuta em uma única lista." />
    <div className="source-filter-bar"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos</button><button className={filter === "missions" ? "active" : ""} onClick={() => setFilter("missions")}>Missões</button><button className={filter === "crow" ? "active" : ""} onClick={() => setFilter("crow")}>Comprar</button><button className={filter === "processing" ? "active" : ""} onClick={() => setFilter("processing")}>Processar</button><button className={filter === "hunt" ? "active" : ""} onClick={() => setFilter("hunt")}>Drop / caça</button><button className={filter === "barter" ? "active" : ""} onClick={() => setFilter("barter")}>Permuta</button></div>
    <div className="acquisition-list">{materials.map((m) => { const required = getRequired(m.id, profile.target); const missing = getMissing(profile, m.id); const sources = m.sources.filter((s) => sourceMatches(s, filter)); return <article className="acquisition-card" key={m.id}><div className="acquisition-item"><MaterialLabel id={m.id} size={42} /><div className="acquisition-numbers"><span>Meta <strong>{required ? number(required) : "Aprimoramento"}</strong></span><span>Tenho <strong>{number(profile.materials[m.id])}</strong></span><span>Falta <strong className={missing === 0 ? "ok-text" : "warn-text"}>{required ? number(missing) : "—"}</strong></span></div></div><div className="used-in"><span>USADO EM</span>{usedIn(m.id).map((label) => <small key={label}>{label}</small>)}</div><div className="acquisition-sources">{sources.map((source, index) => <div className={`source-card source-${source.type}`} key={`${source.type}-${index}`}><Badge kind={source.type}>{sourceLabel[source.type]}</Badge><strong>{source.label}</strong>{source.detail && <p>{source.detail}</p>}</div>)}</div></article>; })}</div>
  </>;
}

function Gear() {
  const profile = useActivePreset().profile;
  const setGear = usePlannerStore((state) => state.setGear);
  const carrack = CARRACKS[profile.target];
  const branch = carrack.branch;
  const gearSet = GEAR_SETS[branch];
  return <><Header title="Equipamentos azuis +10" subtitle={`${carrack.sourceShip} precisa das quatro peças azuis fabricadas e em +10 para chegar à ${carrack.shortName}.`} />
    <div className="branch-banner"><span>LINHA DE EXPANSÃO</span><strong>{carrack.sourceShip}</strong><i>→</i><em>{carrack.name}</em></div>
    <div className="gear-grid">{(Object.entries(gearSet) as [GearKey, typeof gearSet[GearKey]][]).map(([key, gear], idx) => { const state = profile.gear[branch][key]; const mats = Object.entries(gear.materials) as [MaterialId, number][]; const matsReady = mats.every(([id, qty]) => profile.materials[id] >= qty); return <section className="gear-card" key={key}><div className="gear-card-head"><div className="gear-ordinal">0{idx + 1}</div><div><span className="eyebrow">EQUIPAMENTO AZUL</span><h3><GearLabel branch={branch} gearKey={key} size={24} /></h3><p><GearLabel branch={branch} gearKey={key} base size={18} /></p></div><Badge kind={state.crafted && state.blueEnhancement >= 10 ? "done" : "default"}>{state.crafted && state.blueEnhancement >= 10 ? "PRONTA" : "EM PROGRESSO"}</Badge></div><div className="gear-controls"><label><span>Peça base</span><select value={state.baseEnhancement} onChange={(e) => setGear(branch, key, { baseEnhancement: Number(e.target.value) })}>{Array.from({ length: 11 }, (_, n) => <option value={n} key={n}>+{n}</option>)}</select></label><label className="crafted-check"><input type="checkbox" checked={state.crafted} onChange={(e) => setGear(branch, key, { crafted: e.target.checked })} /><span>Peça azul fabricada</span></label><label><span>Aprimoramento azul</span><select disabled={!state.crafted} value={state.blueEnhancement} onChange={(e) => setGear(branch, key, { blueEnhancement: Number(e.target.value) })}>{Array.from({ length: 11 }, (_, n) => <option value={n} key={n}>+{n}</option>)}</select></label></div><div className="gear-prep"><span><b>Peça base:</b> comprar com Philaberto Falasi no Porto de Epheria.</span><span><b>Aprimoramento:</b> <MaterialLabel id="waveStone" size={16} /> · níveis 0–5 usam 1 por tentativa; níveis 6–10 usam 2 por tentativa.</span></div><div className="recipe-list"><div className="recipe-title"><strong>Receita de fabricação</strong><Badge kind={matsReady ? "done" : "red"}>{matsReady ? "MATERIAIS OK" : "FALTAM MATERIAIS"}</Badge></div>{mats.map(([id, qty]) => { const have = profile.materials[id]; const ok = have >= qty; return <div className="recipe-row" key={id}><span className={ok ? "ok" : ""}>{ok ? "✓" : "·"}</span><div className="recipe-item"><MaterialLabel id={id} size={18} /></div><small>{number(have)} / {number(qty)}</small></div>; })}</div></section>; })}</div>
  </>;
}

function CarrackGear() {
  const profile = useActivePreset().profile;
  const setCarrackGear = usePlannerStore((state) => state.setCarrackGear);
  const carrack = CARRACKS[profile.target];
  const gearSet = CARRACK_GEAR_SETS[profile.target];
  const completion = carrackGearCompletion(profile);
  return <><Header title="Equipamento de Shiro" subtitle={`Conjunto azul da própria ${carrack.shortName}, fabricado depois que a Carraca fica pronta. Cada peça parte da peça verde de Toro em +10.`} />
    <div className="branch-banner"><span>EQUIPAMENTO DA CARRACA</span><strong>Toro (verde)</strong><i>→</i><em>Shiro (azul) · {completion}% concluído</em></div>
    <div className="gear-grid">{(Object.entries(gearSet) as [GearKey, typeof gearSet[GearKey]][]).map(([key, gear], idx) => { const state = profile.carrackGear[key]; const mats = Object.entries(gear.materials) as [MaterialId, number][]; const matsReady = mats.every(([id, qty]) => profile.materials[id] >= qty); return <section className="gear-card" key={key}><div className="gear-card-head"><div className="gear-ordinal">0{idx + 1}</div><div><span className="eyebrow">EQUIPAMENTO DE SHIRO</span><h3><CarrackGearLabel target={profile.target} gearKey={key} size={24} /></h3><p><CarrackGearLabel target={profile.target} gearKey={key} base size={18} /></p></div><Badge kind={state.crafted && state.blueEnhancement >= 10 ? "done" : "shiro"}>{state.crafted && state.blueEnhancement >= 10 ? "PRONTA" : "EM PROGRESSO"}</Badge></div><div className="gear-controls"><label><span>Peça de Toro</span><select value={state.baseEnhancement} onChange={(e) => setCarrackGear(key, { baseEnhancement: Number(e.target.value) })}>{Array.from({ length: 11 }, (_, n) => <option value={n} key={n}>+{n}</option>)}</select></label><label className="crafted-check"><input type="checkbox" checked={state.crafted} onChange={(e) => setCarrackGear(key, { crafted: e.target.checked })} /><span>Peça de Shiro fabricada</span></label><label><span>Aprimoramento Shiro</span><select disabled={!state.crafted} value={state.blueEnhancement} onChange={(e) => setCarrackGear(key, { blueEnhancement: Number(e.target.value) })}>{Array.from({ length: 11 }, (_, n) => <option value={n} key={n}>+{n}</option>)}</select></label></div><div className="gear-prep"><span><b>Peça de Toro:</b> comprar com Lavinia, no Ninho do Corvo, e levar até +10.</span><span><b>Oficina:</b> {gear.workshop}.</span><span><b>Permissão:</b> {gear.permit} · comprar com Philaberto Falasi por Prata.</span><span><b>Aprimoramento:</b> <MaterialLabel id="waveStone" size={16} /> · mesmo consumo dos demais equipamentos de navio.</span></div><div className="recipe-list"><div className="recipe-title"><strong>Receita de fabricação</strong><Badge kind={matsReady ? "done" : "red"}>{matsReady ? "MATERIAIS OK" : "FALTAM MATERIAIS"}</Badge></div>{mats.map(([id, qty]) => { const have = profile.materials[id]; const ok = have >= qty; return <div className="recipe-row" key={id}><span className={ok ? "ok" : ""}>{ok ? "✓" : "·"}</span><div className="recipe-item"><MaterialLabel id={id} size={18} /></div><small>{number(have)} / {number(qty)}</small></div>; })}</div></section>; })}</div>
  </>;
}

function Quests() {
  const activePreset = useActivePreset();
  const profile = activePreset.profile;
  const completedQuests = activePreset.completedQuests;
  const toggleQuest = usePlannerStore((state) => state.toggleQuest);
  const [cadence, setCadence] = useState<"daily" | "weekly">("daily");
  const hardIds = new Set(bottlenecks(profile).slice(0, 7).map((m) => m.id));
  const quests = QUESTS.filter((q) => q.cadence === cadence).sort((a, b) => { const ar = a.recommendedFor.some((id) => hardIds.has(id)) ? 1 : 0; const br = b.recommendedFor.some((id) => hardIds.has(id)) ? 1 : 0; return br - ar || b.priority - a.priority; });
  const resetKey = questResetKey(cadence);
  return <><Header title="Missões do Oceano" subtitle="Lista atual de Iliya, Velia, Olho da Okilua e Terra do Amanhecer. As missões ligadas aos materiais que mais faltam aparecem primeiro." /><div className="toolbar"><div className="segmented"><button className={cadence === "daily" ? "active" : ""} onClick={() => setCadence("daily")}>Diárias ({QUESTS.filter((q) => q.cadence === "daily").length})</button><button className={cadence === "weekly" ? "active" : ""} onClick={() => setCadence("weekly")}>Semanais ({QUESTS.filter((q) => q.cadence === "weekly").length})</button></div><div className="legend"><i className="priority-mark" /> Compatível com seus gargalos</div></div><div className="quest-list">{quests.map((q) => { const done = completedQuests[q.id] === resetKey; const relevant = q.recommendedFor.some((id) => hardIds.has(id)); return <article className={`quest-card ${done ? "done" : ""} ${relevant ? "relevant" : ""}`} key={q.id}><button className="quest-check" aria-label={`${done ? "Desmarcar" : "Concluir"} missão: ${q.title}`} aria-pressed={done} onClick={() => toggleQuest(q.id, resetKey)}>{done ? "✓" : ""}</button><div className="quest-body"><div className="quest-top"><div><Badge kind={q.cadence}>{q.cadence === "daily" ? "DIÁRIA" : "SEMANAL"}</Badge>{relevant && <Badge kind="gold">FOCO ATUAL</Badge>}<h3>{q.title}</h3></div><div className="quest-location"><span>{q.npc}</span><strong>{q.location}</strong></div></div><p className="objective">{q.objective}</p>{q.note && <p className="quest-note">{q.note}</p>}<div className="rewards">{q.rewards.map((r) => <span key={r}><TextWithItemIcons text={r} /></span>)}</div><small className="quest-source">Fonte: <a href={q.sourceUrl} target="_blank" rel="noreferrer">{q.source}<span aria-hidden="true"> ↗</span></a></small></div></article>; })}</div></>;
}

function Strategy() {
  const profile = useActivePreset().profile;
  const plan = purchasePlan(profile);
  const hard = bottlenecks(profile);
  return <><Header title="Estratégia de aquisição" subtitle="Use Moedas Corvo apenas depois de comparar missões, processamento, drop e permuta." /><div className="strategy-grid"><section className="panel"><div className="panel-title"><div><span className="eyebrow">MOEDA CORVO</span><h3>Compra sugerida</h3></div><Badge kind="gold">{number(profile.crowCoins)} DISPONÍVEIS</Badge></div><p className="panel-note">O cálculo prioriza gargalo, quantidade faltante e custo. Confira sempre a aba Como obter antes de gastar.</p><div className="purchase-list">{plan.items.length ? plan.items.slice(0, 8).map((x, i) => <div className="purchase" key={x.id}><span>0{i + 1}</span><div><div className="item-heading"><MaterialLabel id={x.id} size={18} /></div><small>{number(x.suggested)} un. × {number(x.unit)} moedas</small></div><em>{number(x.cost)}</em></div>) : <div className="empty-state">Sem compra possível com o saldo atual ou sem materiais pendentes.</div>}</div><div className="purchase-total"><span>Saldo estimado após plano</span><strong>{number(plan.remainingCoins)}</strong></div></section><section className="panel"><div className="panel-title"><div><span className="eyebrow">GARGALOS</span><h3>Por que focar neles</h3></div></div><div className="why-list">{hard.slice(0, 6).map((m) => <div key={m.id}><div className="why-title"><div className="item-heading"><MaterialLabel id={m.id} size={18} /></div><Badge kind={m.difficulty >= 5 ? "red" : "gold"}>DIFICULDADE {m.difficulty}/5</Badge></div><p>Faltam <b>{number(m.missing)}</b> de {number(m.required)}. {m.crowPrice ? `Comprar tudo custaria ${number(m.missing * m.crowPrice)} Moedas Corvo.` : "Priorize fontes recorrentes."}</p><div className="source-chips">{m.sources.slice(0, 4).map((s, i) => <Badge key={i} kind={s.type}>{sourceLabel[s.type]}</Badge>)}</div></div>)}</div></section></div><section className="panel sources-panel"><div className="panel-title"><div><span className="eyebrow">REFERÊNCIAS</span><h3>Dados usados pelo planner</h3></div></div><div className="source-links">{SOURCES.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noreferrer">{s.label}<span>↗</span></a>)}</div><p className="source-disclaimer">Dificuldade e ordem de foco são heurísticas do planner. Nomes, receitas, quantidades e métodos de obtenção são baseados nas fontes listadas.</p></section></>;
}

function App({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [mounted, setMounted] = useState(false);
  const [creatingPreset, setCreatingPreset] = useState(false);
  const { presets, activePresetId, removePreset, resetAll } = usePlannerStore();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let active = true;
    Promise.resolve(usePlannerStore.persist.rehydrate()).finally(() => { if (active) setMounted(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [tab]);
  if (!mounted) return children;
  const activePreset = presets.find((preset) => preset.id === activePresetId);
  if (!activePreset) return <main id="main-content" tabIndex={-1} ref={mainRef} className="preset-start-shell"><div className="preset-start-brand"><div className="brand-mark">☸</div><div><span>CARRACK</span><strong>LEDGER</strong></div></div><PresetSetup canCancel={false} onClose={() => setCreatingPreset(false)} /></main>;

  function showPresetCreator() {
    setTab("overview");
    setCreatingPreset(true);
  }

  function deleteActivePreset() {
    if (confirmPresetRemoval(activePreset?.name)) removePreset(activePresetId!);
  }

  return <div className="app-shell"><Sidebar tab={tab} setTab={(nextTab) => { setCreatingPreset(false); setTab(nextTab); }} onAddPreset={showPresetCreator} /><main id="main-content" tabIndex={-1} ref={mainRef} className="content"><div className="content-inner">{creatingPreset ? <PresetSetup canCancel onClose={() => setCreatingPreset(false)} /> : <>{tab === "overview" && <Overview />}{tab === "inventory" && <Inventory />}{tab === "materials" && <AcquisitionCatalog />}{tab === "gear" && <Gear />}{tab === "carrack-gear" && <CarrackGear />}{tab === "quests" && <Quests />}{tab === "strategy" && <Strategy />}</>}</div><footer><span>Carrack Ledger · {presets.length} {presets.length === 1 ? "preset salvo" : "presets salvos"} neste navegador</span><div><button onClick={deleteActivePreset}>Excluir preset atual</button><button onClick={() => { if (confirm("Apagar todos os presets e progressos salvos?")) resetAll(); }}>Redefinir tudo</button></div></footer></main></div>;
}

export default App;
