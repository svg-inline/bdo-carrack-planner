import type { PlannerPreset } from "@/types";

/** Chave do armazenamento local. Anônimo e cada conta têm o seu próprio espaço. */
export const LOCAL_STORAGE_KEY = "bdo-carrack-ledger-v1";

/**
 * Sair da conta num computador compartilhado não pode deixar o progresso no cache para o
 * próximo, e entrar com outra conta não pode misturar dois jogadores no mesmo estado local.
 */
export function storageKeyFor(userId: string | null): string {
  return userId ? `${LOCAL_STORAGE_KEY}:${userId}` : LOCAL_STORAGE_KEY;
}

/** Acrescenta ids à fila de pendentes sem repetir e sem perder a ordem de chegada. */
export function mergePending(current: readonly string[], incoming: readonly string[]): string[] {
  const merged = [...current];
  for (const id of incoming) if (!merged.includes(id)) merged.push(id);
  return merged;
}

/** Mesmo limite que o preset já aplica no armazenamento local e na coluna `name`. */
const MAX_NAME = 48;

/**
 * Encaixa a marca dentro do limite cortando o nome, e não a marca. Cortar o resultado inteiro
 * devolveria o mesmo nome para todos os sufixos quando ele já ocupa os 48 caracteres, e a
 * busca por um nome livre nunca terminaria.
 */
function withSuffix(name: string, suffix: string): string {
  return `${name.slice(0, Math.max(1, MAX_NAME - suffix.length))}${suffix}`;
}

function uniqueName(wanted: string, taken: Set<string>): string {
  if (!taken.has(wanted)) return wanted;
  const marked = withSuffix(wanted, " (importado)");
  if (!taken.has(marked)) return marked;
  for (let attempt = 2; attempt <= 99; attempt += 1) {
    const candidate = withSuffix(wanted, ` (importado ${attempt})`);
    if (!taken.has(candidate)) return candidate;
  }
  return withSuffix(wanted, ` (${Date.now()})`);
}

/**
 * Importa os presets deste navegador para a conta sem tocar no que já está lá.
 *
 * Os identificadores são novos de propósito. Reaproveitar o identificador local faria a
 * importação sobrescrever um preset que já tivesse sido importado antes e editado depois em
 * outro aparelho — a cópia velha do navegador venceria a versão atual da conta.
 */
export function planImport(local: readonly PlannerPreset[], remote: readonly PlannerPreset[], newId: () => string): PlannerPreset[] {
  const taken = new Set(remote.map((preset) => preset.name));
  return local.map((preset) => {
    const name = uniqueName(preset.name, taken);
    taken.add(name);
    return { ...preset, id: newId(), name };
  });
}

/** Só vale oferecer a importação quando há o que importar e o jogador ainda não recusou. */
export function shouldOfferImport(local: readonly PlannerPreset[], userId: string | null, importedFor: readonly string[]): boolean {
  return userId !== null && local.length > 0 && !importedFor.includes(userId);
}
