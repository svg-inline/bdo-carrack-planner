import Image from "next/image";
import { CARRACK_ORDER, CARRACKS, GEAR_SETS, MATERIALS, MATERIAL_BY_ID, QUESTS, SOURCES } from "@/lib/data";
import type { GearKey, MaterialId } from "@/types";

function Item({ id }: { id: MaterialId }) {
  const material = MATERIAL_BY_ID[id];
  return <span className="item-label"><Image src={material.icon} alt="" width={20} height={20} /><span>{material.name}</span></span>;
}

export default function Reference() {
  return <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <header className="panel">
      <p className="eyebrow">CARRACK LEDGER · EPHERIA</p>
      <h1>Planejador das Carracas de Epheria</h1>
      <p>Consulte os materiais, receitas e missões das quatro Carracas. Com JavaScript, você também pode registrar seu estoque e acompanhar seu progresso neste navegador.</p>
      <nav aria-label="Guia de Carracas" className="flex flex-wrap gap-4 text-gold-bright">
        {CARRACK_ORDER.map((id) => <a key={id} href={`#guia-${id}`}>{CARRACKS[id].shortName}</a>)}
        <a href="#guia-materiais">Como obter</a><a href="#guia-missoes">Missões</a><a href="#guia-fontes">Fontes</a>
      </nav>
    </header>
    {CARRACK_ORDER.map((id) => {
      const carrack = CARRACKS[id];
      const gearSet = GEAR_SETS[carrack.branch];
      return <section id={`guia-${id}`} className="panel scroll-mt-4" key={id}>
        <h2>{carrack.name}</h2><p>{carrack.sourceShip} → {carrack.shortName} · {carrack.role}</p><p>{carrack.description}</p>
        <details><summary className="cursor-pointer text-gold-bright">Materiais e quantidades para {carrack.shortName}</summary>
          <ul className="my-4 space-y-2">{MATERIALS.filter((m) => m.required[id] > 0).map((m) => <li className="flex flex-wrap items-center justify-between gap-2" key={m.id}><Item id={m.id} /><strong>{m.required[id]}</strong></li>)}</ul>
        </details>
        <details><summary className="cursor-pointer text-gold-bright">Receitas dos quatro equipamentos azuis +10</summary>
          <div className="my-4 space-y-4">{(Object.keys(gearSet) as GearKey[]).map((key) => <article key={key}>
            <h3>{gearSet[key].name}</h3><p>Base: {gearSet[key].base}</p>
            <ul className="space-y-2">{(Object.entries(gearSet[key].materials) as [MaterialId, number][]).map(([material, qty]) => <li key={material}><Item id={material} /> · {qty}</li>)}</ul>
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
      <div className="mt-4 space-y-4">{QUESTS.map((q) => <details key={q.id}>
        <summary className="cursor-pointer">{q.cadence === "daily" ? "Diária" : "Semanal"} · {q.title}</summary>
        <p>{q.npc} · {q.location}</p><p>{q.objective}</p><ul>{q.rewards.map((r) => <li key={r}>{r}</li>)}</ul>
      </details>)}</div>
    </section>
    <section id="guia-fontes" className="panel scroll-mt-4"><h2>Fontes de dados</h2>
      <ul className="mt-4 space-y-2 text-gold-bright">{SOURCES.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul>
      <p>Dificuldade e ordem de foco são heurísticas do planner. Confira as fontes do jogo para alterações de quantidades e eventos.</p>
    </section>
  </main>;
}
