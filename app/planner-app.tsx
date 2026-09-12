"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CARRACK_ORDER, CARRACKS, GEAR_SETS, MATERIALS, MATERIAL_BY_ID, PASS_REWARDS, QUESTS, SOURCES } from "@/lib/data";
import { bestExtravagantChoices, bestNormalChestChoices, bottlenecks, getMissing, getRequired, materialCompletion, nextActions, overallCompletion, purchasePlan, questResetKey } from "@/lib/planner";
import { usePlannerStore } from "@/lib/store";
import type { Acquisition, AcquisitionType, GearKey, MaterialCategory, MaterialId, ShipBranch } from "@/types";

const tabs = [
  ["overview", "Visão geral"],
  ["inventory", "Inventário"],
  ["materials", "Como obter"],
  ["gear", "Azuis +10"],
  ["quests", "Missões"],
  ["pass", "Passe"],
  ["strategy", "Estratégia"],
] as const;

type Tab = (typeof tabs)[number][0];
type SourceFilter = "all" | "missions" | "crow" | "processing" | "hunt" | "barter" | "event";

const categoryLabel: Record<MaterialCategory, string> = { carrack: "Carraca", "blue-gear": "Equip. azul", enhancement: "Aprimoramento" };
const sourceLabel: Record<AcquisitionType, string> = { daily: "Missão diária", weekly: "Missão semanal", barter: "Permuta", crow: "Comprar", hunt: "Drop / caça", processing: "Processar", event: "Evento", market: "Mercado" };

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
    default: "badge-default", gold: "badge-gold", red: "badge-red", blue: "badge-blue", done: "badge-done",
    daily: "badge-daily", weekly: "badge-weekly", barter: "badge-barter", crow: "badge-crow",
    hunt: "badge-hunt", processing: "badge-processing", event: "badge-event", market: "badge-market",
  } }, defaultVariants: { kind: "default" },
});
function Badge({ children, kind }: { children: React.ReactNode } & VariantProps<typeof badgeVariants>) { return <span className={badgeVariants({ kind })}>{children}</span>; }

function StorageStatus() {
  const available = usePlannerStore((state) => state.storageAvailable);
  return available ? <div className="status-dot"><i />SALVO LOCALMENTE</div>
    : <p role="status" className="text-gold-bright">Salvamento indisponível. O progresso vale apenas nesta sessão.</p>;
}

function ItemIcon({ src, alt, size = 20, className = "" }: { src: string; alt: string; size?: number; className?: string }) {
  return <Image className={`item-icon ${className}`.trim()} src={src} alt={alt} width={size} height={size} style={{ width: size, height: size }} />;
}

function MaterialLabel({ id, size = 20, className = "" }: { id: MaterialId; size?: number; className?: string }) {
  const item = MATERIAL_BY_ID[id];
  return <span className={`item-label ${className}`.trim()}><ItemIcon src={item.icon} alt={item.name} size={size} /><span className="item-label-text">{item.name}</span></span>;
}

function GearLabel({ branch, gearKey, base = false, size = 24, className = "" }: { branch: ShipBranch; gearKey: GearKey; base?: boolean; size?: number; className?: string }) {
  const gear = GEAR_SETS[branch][gearKey];
  const label = base ? gear.base : gear.name;
  const icon = base ? gear.baseIcon : gear.icon;
  return <span className={`item-label ${className}`.trim()}><ItemIcon src={icon} alt={label} size={size} /><span className="item-label-text">{label}</span></span>;
}

function TextWithItemIcons({ text }: { text: string }) {
  const parts = text.split(itemMentionPattern).filter(Boolean);
  return <>{parts.map((part, index) => {
    const match = ITEM_MENTION_MAP.get(part.toLowerCase());
    if (!match) return <span key={`${part}-${index}`}>{part}</span>;
    return <span className="inline-item-mention" key={`${part}-${index}`}><ItemIcon src={match.icon} alt={match.label} size={16} /><span>{match.label}</span></span>;
  })}</>;
}

function TargetSelector({ compact = false }: { compact?: boolean }) {
  const { profile, setProfile } = usePlannerStore();
  return <div className={`carrack-selector ${compact ? "compact" : ""}`}>
    {CARRACK_ORDER.map((id) => {
      const carrack = CARRACKS[id];
      const selected = profile.target === id;
      return <button key={id} aria-pressed={selected} className={selected ? "selected" : ""} onClick={() => setProfile({ target: id })}>
        <span className="carrack-role">{carrack.role}</span>
        <strong>{carrack.shortName}</strong>
        <small>{carrack.sourceShip}</small>
        {selected && <em>ATIVA</em>}
      </button>;
    })}
  </div>;
}

function Onboarding() {
  const { profile, setProfile, setMaterial, completeOnboarding } = usePlannerStore();
  const [step, setStep] = useState(1);
  const focusMaterials: MaterialId[] = ["coxCombat", "luminousCobalt", "moonVeinFlax", "blueMarineTimber", "saltRock", "brilliantPearl", "abyssalEye"];

  return <main id="main-content" tabIndex={-1} className="onboarding-shell">
    <div className="onboarding-backdrop" />
    <section className="onboarding-panel wide-onboarding">
      <div className="crest">☸</div>
      <p className="eyebrow">REGISTRO DE EXPEDIÇÃO · EPHERIA</p>
      <h1>Prepare sua Carraca</h1>
      <p className="lead">Escolha a rota, informe seu estoque e o planner calcula materiais, equipamentos +10 e prioridades.</p>
      <div className="stepper"><span className={step >= 1 ? "active" : ""}>01</span><i /><span className={step >= 2 ? "active" : ""}>02</span><i /><span className={step >= 3 ? "active" : ""}>03</span></div>

      {step === 1 && <div className="form-block">
        <p className="field-label">Escolha uma das 4 Carracas</p>
        <TargetSelector />
        <label className="field-label" htmlFor="crow">Moedas Corvo atuais</label>
        <input id="crow" className="large-input" type="number" min={0} value={profile.crowCoins || ""} placeholder="Ex.: 12450" onChange={(e) => setProfile({ crowCoins: Number(e.target.value) })} />
      </div>}

      {step === 2 && <div className="form-block">
        <div className="form-heading"><div><span className="eyebrow">ESTOQUE INICIAL</span><h2>Principais gargalos</h2></div><small>O inventário completo fica disponível depois.</small></div>
        <div className="inventory-grid">{focusMaterials.map((id) => {
          const m = MATERIAL_BY_ID[id];
          return <label className="inventory-row" key={id}><span><MaterialLabel id={id} size={18} /><small>Meta para {CARRACKS[profile.target].shortName}: {number(m.required[profile.target])}</small></span><input type="number" min={0} value={profile.materials[id] || ""} placeholder="0" onChange={(e) => setMaterial(id, Number(e.target.value))} /></label>;
        })}</div>
      </div>}

      {step === 3 && <div className="form-block">
        <div className="form-heading"><div><span className="eyebrow">PASSE DE NAVEGAÇÃO</span><h2>Recompensas extras</h2></div></div>
        <label className="toggle-line"><input type="checkbox" checked={profile.passOwned} onChange={(e) => setProfile({ passOwned: e.target.checked })} /><span><strong>Tenho o Passe Especial</strong><small>Inclui os baús e os marcos no cálculo.</small></span></label>
        <div className="two-cols">
          <label><span>Pontos atuais</span><input type="number" min={0} max={400} value={profile.passPoints || ""} placeholder="0" onChange={(e) => setProfile({ passPoints: Number(e.target.value) })} /></label>
          <label><span>Baús normais fechados</span><input type="number" min={0} value={profile.normalChests || ""} placeholder="0" onChange={(e) => setProfile({ normalChests: Number(e.target.value) })} /></label>
          <label><span>Baús extravagantes fechados</span><input type="number" min={0} value={profile.extravagantChests || ""} placeholder="0" onChange={(e) => setProfile({ extravagantChests: Number(e.target.value) })} /></label>
        </div>
      </div>}

      <div className="wizard-actions">
        <button className="button ghost" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>Voltar</button>
        {step < 3 ? <button className="button primary" onClick={() => setStep((s) => Math.min(3, s + 1))}>Continuar</button> : <button className="button primary" onClick={completeOnboarding}>Montar meu plano</button>}
      </div>
      <StorageStatus />
    </section>
  </main>;
}

function Sidebar({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const { profile } = usePlannerStore();
  const carrack = CARRACKS[profile.target];
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark">☸</div><div><span>CARRACK</span><strong>LEDGER</strong></div></div>
    <div className="ship-route-card"><span>ROTA ATUAL</span><strong>{carrack.sourceShip}</strong><i>↓</i><em>{carrack.name}</em></div>
    <nav aria-label="Seções do planner">{tabs.map(([key, label], idx) => <button key={key} aria-current={tab === key ? "page" : undefined} className={tab === key ? "active" : ""} onClick={() => setTab(key)}><span>0{idx + 1}</span>{label}</button>)}</nav>
    <div className="sidebar-footer"><span>Objetivo</span><strong>{carrack.shortName}</strong><small>{number(profile.crowCoins)} Moedas Corvo</small></div>
  </aside>;
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  const { profile, setProfile } = usePlannerStore();
  return <header className="topbar"><div><p className="eyebrow">GRANDE OCEANO · PLANEJAMENTO</p><h1>{title}</h1><p>{subtitle}</p></div><div className="topbar-actions"><div className="coin-box"><Sigil>◉</Sigil><span><small>Moeda Corvo</small><input aria-label="Moedas Corvo" type="number" min={0} value={profile.crowCoins} onChange={(e) => setProfile({ crowCoins: Number(e.target.value) })} /></span></div><StorageStatus /></div></header>;
}

function Overview() {
  const { profile } = usePlannerStore();
  const carrack = CARRACKS[profile.target];
  const completion = overallCompletion(profile);
  const hard = bottlenecks(profile).slice(0, 5);
  const actions = nextActions(profile);
  const blue = MATERIALS.filter((m) => m.category === "blue-gear");
  const direct = MATERIALS.filter((m) => m.category === "carrack");
  const bluePct = Math.round(blue.reduce((s, m) => s + materialCompletion(profile, m.id), 0) / blue.length * 100);
  const carrackPct = Math.round(direct.reduce((s, m) => s + materialCompletion(profile, m.id), 0) / direct.length * 100);
  const gearSet = GEAR_SETS[carrack.branch];

  return <>
    <Header title="Rota para sua Carraca" subtitle="Troque entre as quatro Carracas sem perder seu inventário ou o progresso das duas linhas de navio." />
    <TargetSelector compact />
    <section className={`hero-panel carrack-hero ${carrack.branch}`}>
      <div className="hero-art">{carrack.branch === "galleass" ? <Image src="/assets/epheria-galleass.png" alt="Contratorpedeiro de Epheria" fill sizes="(max-width: 780px) 100vw, 300px" /> : <div className="ship-symbol">⚓</div>}<div className="hero-vignette" /></div>
      <div className="hero-copy"><Badge kind="gold">{carrack.role}</Badge><h2>{carrack.name}</h2><p>{carrack.description}</p><div className="route-line"><span>{carrack.sourceShip}</span><i>→</i><strong>{carrack.shortName}</strong></div><div className="hero-stats"><div><span>Progresso geral</span><strong>{completion}%</strong></div><div><span>Materiais azuis</span><strong>{bluePct}%</strong></div><div><span>Materiais Carraca</span><strong>{carrackPct}%</strong></div></div></div>
      <div className="completion-ring" style={{ "--progress": `${completion * 3.6}deg` } as React.CSSProperties}><div><strong>{completion}%</strong><span>concluído</span></div></div>
    </section>


    <div className="dashboard-grid">
      <section className="panel priority-panel"><div className="panel-title"><div><span className="eyebrow">ORDEM DE FOCO</span><h3>Gargalos atuais</h3></div><Badge kind="red">DINÂMICO</Badge></div><div className="bottleneck-list">{hard.map((m, index) => <div className="bottleneck" key={m.id}><span className="rank">0{index + 1}</span><div className="bottle-main"><div><div className="item-heading"><MaterialLabel id={m.id} size={18} /></div><span>Dificuldade {"◆".repeat(m.difficulty)}{"◇".repeat(5 - m.difficulty)}</span></div><Progress value={materialCompletion(profile, m.id) * 100} /><small>{number(profile.materials[m.id])} / {number(m.required)} · faltam {number(m.missing)}</small></div></div>)}</div></section>
      <section className="panel"><div className="panel-title"><div><span className="eyebrow">AGORA</span><h3>Próximas ações</h3></div></div><div className="action-list">{actions.map((a) => <article key={a.title} className={`action ${a.tone}`}><i /><div><strong>{a.title}</strong><p>{a.detail}</p></div></article>)}</div></section>
    </div>

    <section className="panel gear-overview"><div className="panel-title"><div><span className="eyebrow">{carrack.sourceShip.toUpperCase()}</span><h3>Quatro equipamentos azuis obrigatórios</h3></div><Badge kind="blue">TODOS +10</Badge></div><div className="gear-mini-grid">{(Object.keys(gearSet) as GearKey[]).map((key) => { const state = profile.gear[carrack.branch][key]; const done = state.crafted && state.blueEnhancement >= 10; return <div className={`gear-mini ${done ? "done" : ""}`} key={key}><Sigil>{done ? "✓" : "✦"}</Sigil><div><div className="item-heading"><GearLabel branch={carrack.branch} gearKey={key} size={20} /></div><span>{state.crafted ? `Azul +${state.blueEnhancement}` : `Base +${state.baseEnhancement} · não fabricada`}</span></div><em>{done ? "PRONTA" : "PENDENTE"}</em></div>; })}</div></section>
  </>;
}

function Inventory() {
  const { profile, setMaterial } = usePlannerStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | MaterialCategory>("all");
  const relevantCount = MATERIALS.filter((m) => getRequired(m.id, profile.target) > 0).length;
  const completed = MATERIALS.filter((m) => getRequired(m.id, profile.target) > 0 && getMissing(profile, m.id) === 0).length;
  const rows = MATERIALS.filter((m) => (filter === "all" || m.category === filter) && m.name.toLowerCase().includes(query.trim().toLowerCase()));

  return <><Header title="Inventário de materiais" subtitle="Informe tudo que já possui. O mesmo estoque alimenta as quatro Carracas e todas as recomendações." />
    <div className="inventory-summary"><div><span>Plano atual</span><strong>{CARRACKS[profile.target].shortName}</strong></div><div><span>Materiais do plano</span><strong>{relevantCount}</strong></div><div><span>Concluídos</span><strong>{completed}</strong></div><div><span>Moedas Corvo</span><strong>{number(profile.crowCoins)}</strong></div></div>
    <div className="toolbar inventory-toolbar"><div className="segmented"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos</button><button className={filter === "blue-gear" ? "active" : ""} onClick={() => setFilter("blue-gear")}>Equip. azul</button><button className={filter === "carrack" ? "active" : ""} onClick={() => setFilter("carrack")}>Carraca</button><button className={filter === "enhancement" ? "active" : ""} onClick={() => setFilter("enhancement")}>Aprimoramento</button></div><input aria-label="Buscar material" className="inventory-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar material..." /></div>
    <section className="inventory-table"><div className="inventory-head"><span>Item</span><span>Uso</span><span>Meta atual</span><span>Tenho</span><span>Falta</span></div>{rows.map((m) => { const required = getRequired(m.id, profile.target); const missing = getMissing(profile, m.id); const pct = required ? materialCompletion(profile, m.id) * 100 : 0; return <article className={`inventory-material-row ${required > 0 && missing === 0 ? "complete" : ""}`} key={m.id}><div className="inventory-item"><MaterialLabel id={m.id} size={38} /><Progress value={pct} /></div><span className="inventory-use"><Badge kind={m.category === "carrack" ? "gold" : m.category === "blue-gear" ? "blue" : "default"}>{categoryLabel[m.category]}</Badge></span><strong>{required ? number(required) : "—"}</strong><input aria-label={`Estoque de ${m.name}`} className="qty-input" type="number" min={0} value={profile.materials[m.id]} onChange={(e) => setMaterial(m.id, Number(e.target.value))} /><strong className={missing === 0 && required > 0 ? "inventory-done" : "inventory-missing"}>{required ? number(missing) : "—"}</strong></article>; })}</section>
  </>;
}

function sourceMatches(source: Acquisition, filter: SourceFilter) {
  if (filter === "all") return true;
  if (filter === "missions") return source.type === "daily" || source.type === "weekly";
  return source.type === filter;
}

function AcquisitionCatalog() {
  const { profile } = usePlannerStore();
  const [filter, setFilter] = useState<SourceFilter>("all");
  const carrack = CARRACKS[profile.target];
  const gearSet = GEAR_SETS[carrack.branch];
  const materials = MATERIALS.filter((m) => m.category === "enhancement" || getRequired(m.id, profile.target) > 0).filter((m) => filter === "all" || m.sources.some((s) => sourceMatches(s, filter)));

  const usedIn = (id: MaterialId) => {
    const labels: string[] = [];
    if (MATERIAL_BY_ID[id].category === "carrack") labels.push(carrack.name);
    if (MATERIAL_BY_ID[id].category === "enhancement") labels.push("Aprimoramento dos equipamentos de navio");
    (Object.keys(gearSet) as GearKey[]).forEach((key) => { if (gearSet[key].materials[id]) labels.push(gearSet[key].name); });
    return labels;
  };

  return <><Header title="Materiais e onde conseguir" subtitle="Missões, compra com Moeda Corvo, processamento, drops, permuta e evento em uma única lista." />
    <div className="source-filter-bar"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos</button><button className={filter === "missions" ? "active" : ""} onClick={() => setFilter("missions")}>Missões</button><button className={filter === "crow" ? "active" : ""} onClick={() => setFilter("crow")}>Comprar</button><button className={filter === "processing" ? "active" : ""} onClick={() => setFilter("processing")}>Processar</button><button className={filter === "hunt" ? "active" : ""} onClick={() => setFilter("hunt")}>Drop / caça</button><button className={filter === "barter" ? "active" : ""} onClick={() => setFilter("barter")}>Permuta</button><button className={filter === "event" ? "active" : ""} onClick={() => setFilter("event")}>Evento</button></div>
    <div className="acquisition-list">{materials.map((m) => { const required = getRequired(m.id, profile.target); const missing = getMissing(profile, m.id); const sources = m.sources.filter((s) => sourceMatches(s, filter)); return <article className="acquisition-card" key={m.id}><div className="acquisition-item"><MaterialLabel id={m.id} size={42} /><div className="acquisition-numbers"><span>Meta <strong>{required ? number(required) : "Aprimoramento"}</strong></span><span>Tenho <strong>{number(profile.materials[m.id])}</strong></span><span>Falta <strong className={missing === 0 ? "ok-text" : "warn-text"}>{required ? number(missing) : "—"}</strong></span></div></div><div className="used-in"><span>USADO EM</span>{usedIn(m.id).map((label) => <small key={label}>{label}</small>)}</div><div className="acquisition-sources">{sources.map((source, index) => <div className={`source-card source-${source.type}`} key={`${source.type}-${index}`}><Badge kind={source.type}>{sourceLabel[source.type]}</Badge><strong>{source.label}</strong>{source.detail && <p>{source.detail}</p>}</div>)}</div></article>; })}</div>
  </>;
}

function Gear() {
  const { profile, setGear } = usePlannerStore();
  const carrack = CARRACKS[profile.target];
  const branch = carrack.branch;
  const gearSet = GEAR_SETS[branch];
  return <><Header title="Equipamentos azuis +10" subtitle={`${carrack.sourceShip} precisa das quatro peças azuis fabricadas e em +10 para chegar à ${carrack.shortName}.`} />
    <div className="branch-banner"><span>LINHA DE EXPANSÃO</span><strong>{carrack.sourceShip}</strong><i>→</i><em>{carrack.name}</em></div>
    <div className="gear-grid">{(Object.entries(gearSet) as [GearKey, typeof gearSet[GearKey]][]).map(([key, gear], idx) => { const state = profile.gear[branch][key]; const mats = Object.entries(gear.materials) as [MaterialId, number][]; const matsReady = mats.every(([id, qty]) => profile.materials[id] >= qty); return <section className="gear-card" key={key}><div className="gear-card-head"><div className="gear-ordinal">0{idx + 1}</div><div><span className="eyebrow">EQUIPAMENTO AZUL</span><h3><GearLabel branch={branch} gearKey={key} size={24} /></h3><p><GearLabel branch={branch} gearKey={key} base size={18} /></p></div><Badge kind={state.crafted && state.blueEnhancement >= 10 ? "done" : "default"}>{state.crafted && state.blueEnhancement >= 10 ? "PRONTA" : "EM PROGRESSO"}</Badge></div><div className="gear-controls"><label><span>Peça base</span><select value={state.baseEnhancement} onChange={(e) => setGear(branch, key, { baseEnhancement: Number(e.target.value) })}>{Array.from({ length: 11 }, (_, n) => <option value={n} key={n}>+{n}</option>)}</select></label><label className="crafted-check"><input type="checkbox" checked={state.crafted} onChange={(e) => setGear(branch, key, { crafted: e.target.checked })} /><span>Peça azul fabricada</span></label><label><span>Aprimoramento azul</span><select disabled={!state.crafted} value={state.blueEnhancement} onChange={(e) => setGear(branch, key, { blueEnhancement: Number(e.target.value) })}>{Array.from({ length: 11 }, (_, n) => <option value={n} key={n}>+{n}</option>)}</select></label></div><div className="gear-prep"><span><b>Peça base:</b> comprar com Philaberto Falasi no Porto de Epheria.</span><span><b>Aprimoramento:</b> <MaterialLabel id="waveStone" size={16} /> · níveis 0–5 usam 1 por tentativa; níveis 6–10 usam 2 por tentativa.</span></div><div className="recipe-list"><div className="recipe-title"><strong>Receita de fabricação</strong><Badge kind={matsReady ? "done" : "red"}>{matsReady ? "MATERIAIS OK" : "FALTAM MATERIAIS"}</Badge></div>{mats.map(([id, qty]) => { const have = profile.materials[id]; const ok = have >= qty; return <div className="recipe-row" key={id}><span className={ok ? "ok" : ""}>{ok ? "✓" : "·"}</span><div className="recipe-item"><MaterialLabel id={id} size={18} /></div><small>{number(have)} / {number(qty)}</small></div>; })}</div></section>; })}</div>
  </>;
}

function Quests() {
  const { completedQuests, toggleQuest, profile } = usePlannerStore();
  const [cadence, setCadence] = useState<"daily" | "weekly">("daily");
  const hardIds = new Set(bottlenecks(profile).slice(0, 7).map((m) => m.id));
  const quests = QUESTS.filter((q) => q.cadence === cadence).sort((a, b) => { const ar = a.recommendedFor.some((id) => hardIds.has(id)) ? 1 : 0; const br = b.recommendedFor.some((id) => hardIds.has(id)) ? 1 : 0; return br - ar || b.priority - a.priority; });
  const resetKey = questResetKey(cadence);
  return <><Header title="Missões do Oceano" subtitle="As missões ligadas aos materiais que mais faltam aparecem primeiro." /><div className="toolbar"><div className="segmented"><button className={cadence === "daily" ? "active" : ""} onClick={() => setCadence("daily")}>Diárias</button><button className={cadence === "weekly" ? "active" : ""} onClick={() => setCadence("weekly")}>Semanais</button></div><div className="legend"><i className="priority-mark" /> Compatível com seus gargalos</div></div><div className="quest-list">{quests.map((q) => { const done = completedQuests[q.id] === resetKey; const relevant = q.recommendedFor.some((id) => hardIds.has(id)); return <article className={`quest-card ${done ? "done" : ""} ${relevant ? "relevant" : ""}`} key={q.id}><button className="quest-check" aria-label={`${done ? "Desmarcar" : "Concluir"} missão: ${q.title}`} aria-pressed={done} onClick={() => toggleQuest(q.id, resetKey)}>{done ? "✓" : ""}</button><div className="quest-body"><div className="quest-top"><div><Badge kind={q.cadence}>{q.cadence === "daily" ? "DIÁRIA" : "SEMANAL"}</Badge>{relevant && <Badge kind="gold">FOCO ATUAL</Badge>}<h3>{q.title}</h3></div><div className="quest-location"><span>{q.npc}</span><strong>{q.location}</strong></div></div><p className="objective">{q.objective}</p><div className="rewards">{q.rewards.map((r) => <span key={r}><TextWithItemIcons text={r} /></span>)}</div><small className="quest-source">Fonte: {q.source}</small></div></article>; })}</div></>;
}

function Pass() {
  const { profile, setProfile } = usePlannerStore();
  const normal = bestNormalChestChoices(profile);
  const extravagant = bestExtravagantChoices(profile);
  const nextReward = PASS_REWARDS.find((r) => r.points > profile.passPoints);
  return <><Header title="Passe Especial de Navegação" subtitle={`As escolhas dos baús são calculadas para ${CARRACKS[profile.target].name}.`} />
    <section className="pass-hero"><div className="pass-image"><Image src="/assets/navigation-pass.png" alt="Baús do Passe Especial de Navegação" fill sizes="(max-width: 780px) 100vw, 360px" /></div><div className="pass-copy"><Badge kind="gold">EVENTO 2026</Badge><h2>Passe Especial de Navegação</h2><p>Registre seus pontos e os baús fechados para priorizar os materiais que ainda faltam.</p><div className="pass-controls"><label><span>Pontos</span><input type="number" min={0} max={400} value={profile.passPoints} onChange={(e) => setProfile({ passPoints: Number(e.target.value) })} /></label><label className="toggle-compact"><input type="checkbox" checked={profile.passOwned} onChange={(e) => setProfile({ passOwned: e.target.checked })} /><span>Passe Especial comprado</span></label></div><Progress value={Math.min(100, profile.passPoints / 4)} /><small>{nextReward ? `Próximo marco: ${nextReward.points} pontos · faltam ${nextReward.points - profile.passPoints} permutas` : "400 pontos concluídos"}</small></div></section>
    <div className="chest-grid"><section className="panel chest-card"><div className="panel-title"><div><span className="eyebrow">BAÚ NORMAL</span><h3>Melhor escolha em cada etapa</h3></div><label className="mini-number">Fechados<input type="number" min={0} value={profile.normalChests} onChange={(e) => setProfile({ normalChests: Number(e.target.value) })} /></label></div><div className="selection-block"><span>PRIMEIRA SELEÇÃO</span>{!normal.stage1.length && <p className="empty-state">Materiais desta etapa concluídos.</p>}{normal.stage1.slice(0, 3).map((x, i) => <div className={`choice ${i === 0 ? "best" : ""}`} key={x.id}><em>{i === 0 ? "MELHOR" : `#${i + 1}`}</em><div className="choice-item"><MaterialLabel id={x.id} size={18} /></div><small>×{x.qty} · faltam {number(getMissing(profile, x.id))}</small></div>)}</div><div className="selection-block"><span>SEGUNDA SELEÇÃO</span>{!normal.stage2.length && <p className="empty-state">Materiais desta etapa concluídos.</p>}{normal.stage2.slice(0, 3).map((x, i) => <div className={`choice ${i === 0 ? "best" : ""}`} key={x.id}><em>{i === 0 ? "MELHOR" : `#${i + 1}`}</em><div className="choice-item"><MaterialLabel id={x.id} size={18} /></div><small>×{x.qty} · faltam {number(getMissing(profile, x.id))}</small></div>)}</div></section>
      <section className="panel chest-card extravagant"><div className="panel-title"><div><span className="eyebrow">BAÚ EXTRAVAGANTE</span><h3>Prioridade atual</h3></div><label className="mini-number">Fechados<input type="number" min={0} value={profile.extravagantChests} onChange={(e) => setProfile({ extravagantChests: Number(e.target.value) })} /></label></div><div className="selection-block single">{!extravagant.length && <p className="empty-state">Materiais deste baú concluídos.</p>}{extravagant.map((x, i) => <div className={`choice ${i === 0 ? "best" : ""}`} key={x.id}><em>{i === 0 ? "PEGUE AGORA" : `#${i + 1}`}</em><div className="choice-item"><MaterialLabel id={x.id} size={18} /></div><small>×{x.qty} · faltam {number(getMissing(profile, x.id))} · Corvo {number((x.material.crowPrice || 0) * x.qty)}</small></div>)}</div></section></div>
    <section className="panel reward-track"><div className="panel-title"><div><span className="eyebrow">MARCOS</span><h3>Trilha de recompensas</h3></div></div><div className="track">{PASS_REWARDS.map((r) => { const reached = profile.passPoints >= r.points; return <div className={`track-node ${reached ? "reached" : ""}`} key={r.points}><span>{r.points}</span><strong><TextWithItemIcons text={r.basic} /></strong><small>{profile.passOwned ? <TextWithItemIcons text={r.premium} /> : "Passe Especial não ativo"}</small></div>; })}</div></section>
  </>;
}

function Strategy() {
  const { profile } = usePlannerStore();
  const plan = purchasePlan(profile);
  const hard = bottlenecks(profile);
  return <><Header title="Estratégia de aquisição" subtitle="Use Moedas Corvo apenas depois de comparar missões, processamento, drop e permuta." /><div className="strategy-grid"><section className="panel"><div className="panel-title"><div><span className="eyebrow">MOEDA CORVO</span><h3>Compra sugerida</h3></div><Badge kind="gold">{number(profile.crowCoins)} DISPONÍVEIS</Badge></div><p className="panel-note">O cálculo prioriza gargalo, quantidade faltante e custo. Confira sempre a aba Como obter antes de gastar.</p><div className="purchase-list">{plan.items.length ? plan.items.slice(0, 8).map((x, i) => <div className="purchase" key={x.id}><span>0{i + 1}</span><div><div className="item-heading"><MaterialLabel id={x.id} size={18} /></div><small>{number(x.suggested)} un. × {number(x.unit)} moedas</small></div><em>{number(x.cost)}</em></div>) : <div className="empty-state">Sem compra possível com o saldo atual ou sem materiais pendentes.</div>}</div><div className="purchase-total"><span>Saldo estimado após plano</span><strong>{number(plan.remainingCoins)}</strong></div></section><section className="panel"><div className="panel-title"><div><span className="eyebrow">GARGALOS</span><h3>Por que focar neles</h3></div></div><div className="why-list">{hard.slice(0, 6).map((m) => <div key={m.id}><div className="why-title"><div className="item-heading"><MaterialLabel id={m.id} size={18} /></div><Badge kind={m.difficulty >= 5 ? "red" : "gold"}>DIFICULDADE {m.difficulty}/5</Badge></div><p>Faltam <b>{number(m.missing)}</b> de {number(m.required)}. {m.crowPrice ? `Comprar tudo custaria ${number(m.missing * m.crowPrice)} Moedas Corvo.` : "Priorize fontes recorrentes."}</p><div className="source-chips">{m.sources.slice(0, 4).map((s, i) => <Badge key={i} kind={s.type}>{sourceLabel[s.type]}</Badge>)}</div></div>)}</div></section></div><section className="panel sources-panel"><div className="panel-title"><div><span className="eyebrow">REFERÊNCIAS</span><h3>Dados usados pelo planner</h3></div></div><div className="source-links">{SOURCES.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noreferrer">{s.label}<span>↗</span></a>)}</div><p className="source-disclaimer">Dificuldade e ordem de foco são heurísticas do planner. Nomes, receitas, quantidades e métodos de obtenção são baseados nas fontes listadas.</p></section></>;
}

function App({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [mounted, setMounted] = useState(false);
  const { profile, resetAll } = usePlannerStore();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let active = true;
    Promise.resolve(usePlannerStore.persist.rehydrate()).finally(() => { if (active) setMounted(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => { mainRef.current?.focus(); }, [tab]);
  if (!mounted) return children;
  if (!profile.initialized) return <Onboarding />;
  return <div className="app-shell"><Sidebar tab={tab} setTab={setTab} /><main id="main-content" tabIndex={-1} ref={mainRef} className="content"><div className="content-inner">{tab === "overview" && <Overview />}{tab === "inventory" && <Inventory />}{tab === "materials" && <AcquisitionCatalog />}{tab === "gear" && <Gear />}{tab === "quests" && <Quests />}{tab === "pass" && <Pass />}{tab === "strategy" && <Strategy />}</div><footer><span>Carrack Ledger · dados salvos apenas neste navegador</span><button onClick={() => { if (confirm("Apagar todo o progresso salvo?")) resetAll(); }}>Redefinir progresso</button></footer></main></div>;
}

export default App;

