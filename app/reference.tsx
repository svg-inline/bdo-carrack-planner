import Image from "next/image";
import Link from "next/link";
import AccountBar, { type AccountBarProps } from "./account-bar";
import { CADENCE_BY_ID, CARRACK_GEAR_SETS, CARRACK_ORDER, CARRACKS, CATEGORY_LABELS, FALASI_PERMIT_SELLER, FALASI_PERMIT_SILVER, FALASI_WORKSHOP, GEAR_SETS, LYNGBAKR_HORN_EXCHANGE, MATERIALS, MATERIAL_BY_ID, QUESTS, QUEST_CADENCES, QUEST_GROUPS, SOURCES, YELLOW_ENHANCEMENT, YELLOW_GEAR_SETS, YELLOW_PROCESSING, YELLOW_ROUTE_ITEMS } from "@/lib/data";
import { carrackGearSetEstimate, formatDuration, materialEstimate, shipEstimate } from "@/lib/estimate";
import { getGoal } from "@/lib/planner";
import { questsOfGroup } from "@/lib/quests";
import { createInitialProfile } from "@/lib/profile";
import { carrackPath, PLANNER_PAGES, type PlannerPage } from "@/lib/routes";
import type { CarrackTarget, GearKey, MaterialId } from "@/types";

/**
 * Guia entregue no HTML de cada página, sem JavaScript, sem `localStorage` e sem banco. É o
 * conteúdo que o buscador indexa e o que o jogador vê antes da hidratação; cada página do
 * site monta a moldura com o bloco do próprio assunto.
 */

// O guia sem JavaScript não conhece o estoque do jogador, então mostra o prazo partindo do zero.
const EMPTY_PROFILES = Object.fromEntries(CARRACK_ORDER.map((id) => [id, createInitialProfile(id)])) as Record<CarrackTarget, ReturnType<typeof createInitialProfile>>;

function eta(days: number) {
  return days > 0 ? `≈ ${formatDuration(days)}` : formatDuration(days);
}

function Item({ id }: { id: MaterialId }) {
  const material = MATERIAL_BY_ID[id];
  return <span className="item-label"><Image className="item-icon" src={material.icon} alt="" width={28} height={28} /><span>{material.name}</span></span>;
}

function GuideNav() {
  return <nav aria-label="Guia de Carracas" className="flex flex-wrap gap-4 text-gold-bright">
    {PLANNER_PAGES.map((page) => <Link key={page.path} href={page.path}>{page.label}</Link>)}
    {CARRACK_ORDER.map((id) => <Link key={id} href={carrackPath(id)}>{CARRACKS[id].shortName}</Link>)}
  </nav>;
}

/** Moldura comum: marca, conta e o menu com todas as páginas do guia. */
export function GuideShell({ account, accountEnabled, children }: { account: AccountBarProps["account"]; accountEnabled: boolean; children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <header className="panel">
      <p className="eyebrow">CARRACK LEDGER · EPHERIA</p>
      <p>Consulte os materiais, receitas e missões das quatro Carracas. Com JavaScript, você também pode registrar seu estoque e acompanhar seu progresso, neste navegador ou na sua conta.</p>
      <AccountBar account={account} enabled={accountEnabled} />
      <GuideNav />
    </header>
    {children}
  </div>;
}

/** Título da página. Cada página tem o seu `h1`, igual ao título que o buscador mostra. */
export function GuideIntro({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel"><h1 className="mb-2 text-3xl">{title}</h1>{children}</section>;
}

/** Aviso de conta devolvido pelo login ou pela saída, visível mesmo sem JavaScript. */
export function GuideNotice({ notice }: { notice: string | null }) {
  return notice ? <p className="account-notice panel" role="status">{notice}</p> : null;
}

export function CarrackSummaries() {
  return <>{CARRACK_ORDER.map((id) => {
    const carrack = CARRACKS[id];
    const profile = EMPTY_PROFILES[id];
    return <section className="panel" key={id}>
      <h2>{carrack.name}</h2><p>{carrack.sourceShip} → {carrack.shortName} · {carrack.role}</p><p>{carrack.description}</p>
      <p>Partindo do zero, os materiais da rota levam <strong>{eta(shipEstimate(profile).days)}</strong> e o conjunto de Shiro, mais <strong>{eta(carrackGearSetEstimate(profile).days)}</strong>.</p>
      <p><Link className="text-gold-bright" href={carrackPath(id)}>Materiais, receitas e equipamento da {carrack.shortName}</Link></p>
    </section>;
  })}</>;
}

export function CarrackGuide({ id }: { id: CarrackTarget }) {
  const carrack = CARRACKS[id];
  const gearSet = GEAR_SETS[carrack.branch];
  const carrackGearSet = CARRACK_GEAR_SETS[id];
  const profile = EMPTY_PROFILES[id];
  const ship = shipEstimate(profile);
  const shiroSet = carrackGearSetEstimate(profile);
  return <section className="panel">
    <h2>Rota e prazo</h2><p>{carrack.sourceShip} → {carrack.shortName} · {carrack.role}</p><p>{carrack.description}</p>
    <p>Partindo do zero, os materiais da rota levam <strong>{eta(ship.days)}</strong> e o conjunto de Shiro, mais <strong>{eta(shiroSet.days)}</strong>. Veja <Link className="text-gold-bright" href="/estrategia">como o tempo é estimado</Link>.</p>
    <details><summary className="cursor-pointer text-gold-bright">Materiais e quantidades para {carrack.shortName}</summary>
      <ul className="my-4 space-y-2">{MATERIALS.filter((m) => getGoal(profile, m.id) > 0).map((m) => <li className="flex flex-wrap items-center justify-between gap-2" key={m.id}><Item id={m.id} /><strong>{m.required[id]} · {eta(materialEstimate(profile, m.id).days)}</strong></li>)}</ul>
    </details>
    <details><summary className="cursor-pointer text-gold-bright">Receitas dos quatro equipamentos azuis +10</summary>
      <div className="my-4 space-y-4">{(Object.keys(gearSet) as GearKey[]).map((key) => <article key={key}>
        <h3>{gearSet[key].name}</h3><p>Base: {gearSet[key].base}</p>
        <ul className="space-y-2">{(Object.entries(gearSet[key].materials) as [MaterialId, number][]).map(([material, qty]) => <li key={material}><Item id={material} /> · {qty}</li>)}</ul>
      </article>)}</div>
    </details>
    <details><summary className="cursor-pointer text-gold-bright">Equipamento azul de Shiro da {carrack.shortName}</summary>
      <p>Conjunto fabricado depois que a Carraca existe. Cada peça parte da peça verde de Toro em +10, comprada com Lavinia no Ninho do Corvo.</p>
      <div className="my-4 space-y-4">{(Object.keys(carrackGearSet) as GearKey[]).map((key) => <article key={key}>
        <h3>{carrackGearSet[key].name}</h3><p>Base: {carrackGearSet[key].base}</p>
        <p>Oficina: {carrackGearSet[key].workshop}</p>
        <p>Planta de construção: {carrackGearSet[key].blueprintSource}</p>
        <p>Permissão: {carrackGearSet[key].permit}</p>
        <ul className="space-y-2">{(Object.entries(carrackGearSet[key].materials) as [MaterialId, number][]).map(([material, qty]) => <li key={material}><Item id={material} /> · {qty}</li>)}</ul>
      </article>)}</div>
    </details>
    <p>O equipamento amarelo de Falasi da {carrack.shortName} está no <Link className="text-gold-bright" href="/equipamento-amarelo">guia do equipamento amarelo</Link>.</p>
  </section>;
}

/** Quantidade que cada Carraca pede de cada material, agrupada pelo uso. */
export function MaterialsTable() {
  return <section className="panel">
    <h2>Quantidade por Carraca</h2>
    <p>Com JavaScript, o inventário compara o seu estoque com a meta da Carraca do preset e mostra o que falta e o prazo de cada material.</p>
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left">
        <thead><tr><th scope="col">Material</th><th scope="col">Uso</th>{CARRACK_ORDER.map((id) => <th scope="col" key={id}>{CARRACKS[id].shortName}</th>)}</tr></thead>
        <tbody>{MATERIALS.filter((m) => CARRACK_ORDER.some((id) => m.required[id] > 0)).map((m) => <tr key={m.id}>
          <th scope="row"><Item id={m.id} /></th><td>{CATEGORY_LABELS[m.category]}</td>
          {CARRACK_ORDER.map((id) => <td key={id}>{m.required[id] || "—"}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

export function YellowGuide() {
  return <section className="panel"><h2>Rota de obtenção</h2>
    <p>O grau mais alto das Carracas. Cada Carraca tem as suas quatro peças de Falasi, feitas a partir da peça de Shiro da mesma posição em +10. No planner, o equipamento amarelo começa fora do cálculo e você decide, por preset, se ele entra na meta e no prazo.</p>
    <ol className="my-4 list-decimal space-y-2 pl-6">
      <li>Leve a peça de Shiro da mesma posição a +10: ela é consumida na receita.</li>
      <li>Cace na Colônia de Lyngbakr, na Terra do Amanhecer, por {Object.values(YELLOW_ROUTE_ITEMS).slice(0, 4).map((item) => item.name).join(", ")} e Essência de Coral Crepuscular.</li>
      <li>Processe cada espólio com {YELLOW_ROUTE_ITEMS.hardener.name} x1 e {YELLOW_ROUTE_ITEMS.emulsifier.name} x1: {YELLOW_PROCESSING.map((step) => `${YELLOW_ROUTE_ITEMS[step.input].name} → ${MATERIAL_BY_ID[step.output].name} (${step.method})`).join("; ")}.</li>
      <li>Troque o Chifre de Lyngbakr por um destes, à escolha: {(Object.entries(LYNGBAKR_HORN_EXCHANGE) as [MaterialId, number][]).map(([material, qty]) => `${MATERIAL_BY_ID[material].name} x${qty}`).join(", ")} — a receita de uma peça inteira.</li>
      <li>Troque Essência de Coral Crepuscular x2 por uma planta com {FALASI_PERMIT_SELLER}; cada peça pede 10.</li>
      <li>Compre a permissão por {new Intl.NumberFormat("pt-BR").format(FALASI_PERMIT_SILVER)} de prata com {FALASI_PERMIT_SELLER} e fabrique na {FALASI_WORKSHOP}.</li>
    </ol>
    {CARRACK_ORDER.map((id) => {
      const yellowSet = YELLOW_GEAR_SETS[id];
      return <details key={id}><summary className="cursor-pointer text-gold-bright">Peças de Falasi da {CARRACKS[id].shortName}</summary>
        <div className="my-4 space-y-4">{(Object.keys(yellowSet) as GearKey[]).map((key) => <article key={key}>
          <h3 className="item-label"><Image className="item-icon" src={yellowSet[key].icon} alt="" width={28} height={28} /><span>{yellowSet[key].name}</span></h3>
          <p>Base: {yellowSet[key].base}</p>
          <p>Permissão: {yellowSet[key].permit}</p>
          <ul className="space-y-2">{(Object.entries(yellowSet[key].materials) as [MaterialId, number][]).map(([material, qty]) => <li key={material}><Item id={material} /> · {qty}</li>)}</ul>
        </article>)}</div>
      </details>;
    })}
    <details><summary className="cursor-pointer text-gold-bright">Aprimoramento com Pedra Negra da Onda Crepuscular</summary>
      <p>Cada tentativa gasta uma Pedra Negra da Onda Crepuscular (Essência de Coral Crepuscular x1 + Pedra Negra da Onda x100, em Aquecimento). Na falha, a peça perde durabilidade e cai de nível, a menos que se use Pedras Cron.</p>
      <ul className="my-4 space-y-2">{YELLOW_ENHANCEMENT.map((step) => <li key={step.level}>+{step.level}: {step.withStacks}% com {step.stacks} acúmulos ({step.base}% sem) · {step.cron ? `${step.cron} Pedras Cron` : "sem Pedra Cron"}</li>)}</ul>
    </details>
  </section>;
}

export function SourcesGuide() {
  return <section className="panel"><h2>Materiais e onde conseguir</h2>
    <div className="mt-4 space-y-4">{MATERIALS.map((m) => <details key={m.id}>
      <summary className="cursor-pointer"><Item id={m.id} /></summary>
      <ul className="my-3 space-y-2">{m.sources.map((source, index) => <li key={index}><strong>{source.label}</strong>{source.detail && <p>{source.detail}</p>}</li>)}</ul>
    </details>)}</div>
  </section>;
}

export function QuestsGuide() {
  return <section className="panel"><h2>Missões por NPC</h2>
    <p>{QUEST_CADENCES.map((cadence) => `${QUESTS.filter((quest) => quest.cadence === cadence.id).length} missões ${cadence.plural.toLowerCase()}`).join(" e ")} em {[...new Set(QUEST_GROUPS.map((group) => group.location))].join(", ")}, organizadas por NPC.</p>
    <p>Com JavaScript, você escolhe quais delas entram no cálculo do seu preset. Este guia mostra o catálogo completo.</p>
    <div className="mt-4 space-y-6">{QUEST_GROUPS.map((group) => <article key={group.id}>
      <h3>{group.npc} · {group.location} · {CADENCE_BY_ID[group.cadence].plural}</h3>
      <p>{group.selection === "one-track"
        ? "Trilha única: o jogo não deixa aceitar as alternativas ao mesmo tempo."
        : "As missões deste NPC podem ficar ativas ao mesmo tempo."}</p>
      {group.note && <p><strong>Atenção:</strong> {group.note}</p>}
      <div className="space-y-4">{questsOfGroup(group).map((q) => <details key={q.id}>
        <summary className="cursor-pointer">{CADENCE_BY_ID[q.cadence].label} · {q.title}</summary>
        <p>{q.npc} · {q.location}</p>
        {group.trackLabels?.[q.track] && <p>Trilha: {group.trackLabels[q.track]}</p>}
        <p>{q.objective}</p>{q.note && <p><strong>Atenção:</strong> {q.note}</p>}<ul>{q.rewards.map((r) => <li key={r}>{r}</li>)}</ul>
        <p><a className="text-gold-bright" href={q.sourceUrl} target="_blank" rel="noreferrer">Fonte: {q.source}</a></p>
      </details>)}</div>
    </article>)}</div>
  </section>;
}

export function EstimateGuide() {
  return <section className="panel"><h2>Como o tempo é estimado</h2>
    <p>Os prazos partem da quantidade que ainda falta e do ritmo de cada fonte. São estimativas do planner, não uma promessa de data.</p>
    <ul className="my-4 space-y-2">
      <li>Missões entram com a quantidade que a recompensa entrega, supondo que você as conclui em dia. No planner, só as missões que você marca contam, e onde o jogo obriga a escolher entre alternativas do mesmo NPC apenas a trilha escolhida rende.</li>
      <li>Recompensa de escolha rende um item por conclusão. No planner você escolhe qual item leva, e a conclusão inteira vai para ele; sem escolha, o ritmo é dividido entre as metas que ainda faltam.</li>
      <li>Permuta, caça, processamento e escavação não têm frequência fixa: valem uma estimativa por dificuldade do material, para um dia dedicado ao oceano, e só quando a atividade está marcada na rotina do preset. Material sem nenhuma fonte na rotina fica sem prazo até ser comprado na loja.</li>
      <li>A Moeda Corvo conta o saldo de hoje e a que as missões marcadas rendem por dia. A compra é paga em fila: primeiro o que nenhuma outra fonte entrega, do mais barato ao mais caro, e dos materiais que também vêm de missão só a diferença que elas não cobrem a tempo. No planner você decide onde o saldo pode ser gasto: comprar as peças verdes de Toro da Carraca, a 10.000 moedas cada, e acelerar os materiais do equipamento azul e os da construção da Carraca. Este guia parte de um saldo zerado, contando só a moeda das missões padrão.</li>
      <li>Os materiais são obtidos em paralelo, então o prazo é o do material mais demorado; fabricar e aprimorar as peças fica fora da conta.</li>
    </ul>
  </section>;
}

export function DataSources() {
  return <section className="panel"><h2>Fontes de dados</h2>
    <ul className="mt-4 space-y-2 text-gold-bright">{SOURCES.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul>
    <p>Dificuldade, ordem de foco e tempo estimado são heurísticas do planner. Confira as fontes do jogo para alterações de quantidades e eventos.</p>
  </section>;
}

/** Topo comum das páginas do planner: aviso de conta e o título com a descrição da página. */
export function GuidePage({ page, notice, children }: { page: PlannerPage; notice: string | null; children: React.ReactNode }) {
  return <>
    <GuideNotice notice={notice} />
    <GuideIntro title={page.title}><p>{page.description}</p></GuideIntro>
    {children}
  </>;
}
