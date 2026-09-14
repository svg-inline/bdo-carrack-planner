import Image from "next/image";
import AccountBar, { type AccountBarProps } from "./account-bar";
import { CADENCE_BY_ID, CARRACK_GEAR_SETS, CARRACK_ORDER, CARRACKS, GEAR_SETS, MATERIALS, MATERIAL_BY_ID, QUESTS, QUEST_CADENCES, QUEST_GROUPS, SOURCES } from "@/lib/data";
import { carrackGearSetEstimate, formatDuration, materialEstimate, shipEstimate } from "@/lib/estimate";
import { questsOfGroup } from "@/lib/quests";
import { createInitialProfile } from "@/lib/profile";
import type { CarrackTarget, GearKey, MaterialId } from "@/types";

// O guia sem JavaScript não conhece o estoque do jogador, então mostra o prazo partindo do zero.
const EMPTY_PROFILES = Object.fromEntries(CARRACK_ORDER.map((id) => [id, createInitialProfile(id)])) as Record<CarrackTarget, ReturnType<typeof createInitialProfile>>;

function eta(days: number) {
  return days > 0 ? `≈ ${formatDuration(days)}` : formatDuration(days);
}

function Item({ id }: { id: MaterialId }) {
  const material = MATERIAL_BY_ID[id];
  return <span className="item-label"><Image className="item-icon" src={material.icon} alt="" width={28} height={28} /><span>{material.name}</span></span>;
}

export default function Reference({ account, accountEnabled, notice }: { account: AccountBarProps["account"]; accountEnabled: boolean; notice: string | null }) {
  return <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <header className="panel">
      <p className="eyebrow">CARRACK LEDGER · EPHERIA</p>
      <h1>Planejador das Carracas de Epheria</h1>
      <p>Consulte os materiais, receitas e missões das quatro Carracas. Com JavaScript, você também pode registrar seu estoque e acompanhar seu progresso neste navegador.</p>
      <AccountBar account={account} enabled={accountEnabled} notice={notice} />
      <nav aria-label="Guia de Carracas" className="flex flex-wrap gap-4 text-gold-bright">
        {CARRACK_ORDER.map((id) => <a key={id} href={`#guia-${id}`}>{CARRACKS[id].shortName}</a>)}
        <a href="#guia-materiais">Como obter</a><a href="#guia-missoes">Missões</a><a href="#guia-tempo">Tempo estimado</a><a href="#guia-fontes">Fontes</a>
      </nav>
    </header>
    {CARRACK_ORDER.map((id) => {
      const carrack = CARRACKS[id];
      const gearSet = GEAR_SETS[carrack.branch];
      const carrackGearSet = CARRACK_GEAR_SETS[id];
      const profile = EMPTY_PROFILES[id];
      const ship = shipEstimate(profile);
      const shiroSet = carrackGearSetEstimate(profile);
      return <section id={`guia-${id}`} className="panel scroll-mt-4" key={id}>
        <h2>{carrack.name}</h2><p>{carrack.sourceShip} → {carrack.shortName} · {carrack.role}</p><p>{carrack.description}</p>
        <p>Partindo do zero, os materiais da rota levam <strong>{eta(ship.days)}</strong> e o conjunto de Shiro, mais <strong>{eta(shiroSet.days)}</strong>. Veja <a className="text-gold-bright" href="#guia-tempo">como o tempo é estimado</a>.</p>
        <details><summary className="cursor-pointer text-gold-bright">Materiais e quantidades para {carrack.shortName}</summary>
          <ul className="my-4 space-y-2">{MATERIALS.filter((m) => m.required[id] > 0).map((m) => <li className="flex flex-wrap items-center justify-between gap-2" key={m.id}><Item id={m.id} /><strong>{m.required[id]} · {eta(materialEstimate(profile, m.id).days)}</strong></li>)}</ul>
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
      </section>;
    })}
    <section id="guia-materiais" className="panel scroll-mt-4"><h2>Materiais e onde conseguir</h2>
      <div className="mt-4 space-y-4">{MATERIALS.map((m) => <details key={m.id}>
        <summary className="cursor-pointer"><Item id={m.id} /></summary>
        <ul className="my-3 space-y-2">{m.sources.map((source, index) => <li key={index}><strong>{source.label}</strong>{source.detail && <p>{source.detail}</p>}</li>)}</ul>
      </details>)}</div>
    </section>
    <section id="guia-missoes" className="panel scroll-mt-4"><h2>Missões do Oceano</h2>
      <p>{QUEST_CADENCES.map((cadence) => `${QUESTS.filter((quest) => quest.cadence === cadence.id).length} missões ${cadence.plural.toLowerCase()}`).join(" e ")} em Iliya, Velia, Olho da Okilua e Terra do Amanhecer, organizadas por NPC.</p>
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
    </section>
    <section id="guia-tempo" className="panel scroll-mt-4"><h2>Como o tempo é estimado</h2>
      <p>Os prazos partem da quantidade que ainda falta e do ritmo de cada fonte. São estimativas do planner, não uma promessa de data.</p>
      <ul className="my-4 space-y-2">
        <li>Missões entram com a quantidade que a recompensa entrega, supondo que você as conclui em dia. No planner, só as missões que você marca contam, e onde o jogo obriga a escolher entre alternativas do mesmo NPC apenas a trilha escolhida rende.</li>
        <li>Recompensa de escolha rende um item por conclusão. No planner você escolhe qual item leva, e a conclusão inteira vai para ele; sem escolha, o ritmo é dividido entre as metas que ainda faltam.</li>
        <li>Permuta, caça, processamento e escavação não têm frequência fixa: valem uma estimativa por dificuldade do material, para um dia dedicado ao oceano.</li>
        <li>O saldo de Moeda Corvo encurta o prazo pelo que a compra sugerida resolve na hora, mas não vira ritmo diário. A compra vai primeiro para o material que segura o prazo, até ele empatar com o próximo da fila. No planner você decide onde o saldo pode ser gasto: comprar as peças verdes de Toro da Carraca, a 10.000 moedas cada, e acelerar os materiais do equipamento azul e os da construção da Carraca. Este guia mostra o prazo sem moedas.</li>
        <li>Os materiais são obtidos em paralelo, então o prazo é o do material mais demorado; fabricar e aprimorar as peças fica fora da conta.</li>
      </ul>
    </section>
    <section id="guia-fontes" className="panel scroll-mt-4"><h2>Fontes de dados</h2>
      <ul className="mt-4 space-y-2 text-gold-bright">{SOURCES.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul>
      <p>Dificuldade, ordem de foco e tempo estimado são heurísticas do planner. Confira as fontes do jogo para alterações de quantidades e eventos.</p>
    </section>
  </main>;
}
