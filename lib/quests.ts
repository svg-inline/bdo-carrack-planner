import { CADENCE_BY_ID, QUESTS, QUEST_BY_ID, QUEST_GROUPS, QUEST_GROUP_BY_ID } from "@/lib/data";
import type { Acquisition, PlannerProfile, QuestAcquisition, QuestCadence, QuestDefinition, QuestGroupDefinition } from "@/types";

/** Toda fonte de missão carrega a missão de origem, então o vínculo é seguro de assumir. */
export function isQuestAcquisition(source: Acquisition): source is QuestAcquisition {
  return source.type in CADENCE_BY_ID;
}

/** Missões do grupo na ordem declarada. */
export function questsOfGroup(group: QuestGroupDefinition): QuestDefinition[] {
  return group.quests.map((quest) => QUEST_BY_ID[quest.id]);
}

/** Trilhas do grupo, na ordem em que aparecem no catálogo. */
export function tracksOfGroup(group: QuestGroupDefinition): string[] {
  const tracks: string[] = [];
  for (const quest of questsOfGroup(group)) if (!tracks.includes(quest.track)) tracks.push(quest.track);
  return tracks;
}

/** Trilha que um grupo `one-track` assume enquanto o jogador não escolhe outra. */
export function defaultTrackOf(group: QuestGroupDefinition): string {
  const tracks = tracksOfGroup(group);
  return group.defaultTrack && tracks.includes(group.defaultTrack) ? group.defaultTrack : tracks[0];
}

/**
 * Seleção inicial de um preset: tudo que o catálogo marca como padrão. Em grupos de trilha
 * única só a trilha padrão entra, porque o jogo não deixa aceitar as duas no mesmo dia.
 */
export function defaultActiveQuests(): Record<string, boolean> {
  const active: Record<string, boolean> = {};
  for (const group of QUEST_GROUPS) {
    const track = group.selection === "one-track" ? defaultTrackOf(group) : null;
    for (const quest of questsOfGroup(group)) {
      active[quest.id] = quest.defaultActive && (track === null || quest.track === track);
    }
  }
  return active;
}

/** Trilha ativa de um grupo `one-track`, ou `null` quando o jogador desligou o NPC inteiro. */
export function activeTrackOf(group: QuestGroupDefinition, active: Record<string, boolean>): string | null {
  for (const quest of questsOfGroup(group)) if (active[quest.id]) return quest.track;
  return null;
}

/**
 * Aplica as regras de aceite a um mapa de escolhas qualquer — inclusive um vindo do
 * armazenamento, de uma versão antiga ou de uma missão que ainda não existia. Missões
 * desconhecidas somem, missões novas entram com o padrão do catálogo e um grupo de trilha
 * única nunca fica com duas trilhas ligadas ao mesmo tempo.
 */
export function normalizeActiveQuests(value: unknown): Record<string, boolean> {
  const raw = value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const defaults = defaultActiveQuests();
  const active: Record<string, boolean> = {};

  for (const group of QUEST_GROUPS) {
    const quests = questsOfGroup(group);
    const chosen = (quest: QuestDefinition) => typeof raw[quest.id] === "boolean" ? raw[quest.id] as boolean : defaults[quest.id];
    if (group.selection !== "one-track") {
      for (const quest of quests) active[quest.id] = chosen(quest);
      continue;
    }
    // A primeira trilha com missão ligada vence; as demais ficam desligadas.
    const track = quests.find((quest) => chosen(quest))?.track ?? null;
    for (const quest of quests) active[quest.id] = quest.track === track && chosen(quest);
  }
  return active;
}

/**
 * Escolha do jogador sobre uma missão. Em grupos de trilha única, ligar uma missão troca a
 * trilha ativa inteira: as missões da trilha escolhida voltam ao padrão e as demais saem.
 */
export function setQuestActive(active: Record<string, boolean>, questId: string, wanted: boolean): Record<string, boolean> {
  const quest = QUEST_BY_ID[questId];
  if (!quest) return active;
  const group = QUEST_GROUP_BY_ID[quest.group];
  const next = { ...active, [questId]: wanted };

  if (wanted && group.selection === "one-track") {
    // Trocar de trilha desliga a anterior inteira e liga a nova, que no jogo é aceita junto.
    // Dentro da trilha que já estava ativa, a escolha missão a missão do jogador é mantida.
    const switching = activeTrackOf(group, active) !== quest.track;
    for (const sibling of questsOfGroup(group)) {
      if (sibling.id === questId) continue;
      if (sibling.track !== quest.track) next[sibling.id] = false;
      else next[sibling.id] = switching ? sibling.defaultActive : active[sibling.id] ?? sibling.defaultActive;
    }
  }
  return normalizeActiveQuests(next);
}

/** Missões que entram no cálculo do preset. */
export function activeQuestIds(profile: PlannerProfile): Set<string> {
  return new Set(QUESTS.filter((quest) => profile.activeQuests[quest.id]).map((quest) => quest.id));
}

export function isQuestActive(profile: PlannerProfile, questId: string) {
  return profile.activeQuests[questId] === true;
}

/** Quantas missões de cada frequência o preset mantém na rotina. */
export function questCounts(profile: PlannerProfile, cadence: QuestCadence) {
  const quests = QUESTS.filter((quest) => quest.cadence === cadence);
  return { total: quests.length, active: quests.filter((quest) => profile.activeQuests[quest.id]).length };
}

/** Grupos de uma frequência, prontos para a aba Missões e para o guia sem JavaScript. */
export function groupsOfCadence(cadence: QuestCadence): QuestGroupDefinition[] {
  return QUEST_GROUPS.filter((group) => group.cadence === cadence);
}
