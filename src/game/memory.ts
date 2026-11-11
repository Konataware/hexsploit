import type { Combatant, StatKey } from "../domain/types";

export const MEMORY_SIZE = 256;

export const ADDRESSES = {
  player: {
    buffer: 0x40,
    core: 0x41,
    atk: 0x44,
    def: 0x46,
    regen: 0x47,
  },
  enemy: {
    buffer: 0x50,
    core: 0x51,
    atk: 0x54,
    def: 0x56,
    regen: 0x57,
  },
};

export type MemoryTarget = "player" | "enemy";

export interface MemoryField {
  target: MemoryTarget;
  stat: StatKey;
}

export const MEMORY_FIELDS: Record<number, MemoryField> = {
  [ADDRESSES.player.buffer]: {
    target: "player",
    stat: "buffer",
  },
  [ADDRESSES.player.core]: {
    target: "player",
    stat: "core",
  },
  [ADDRESSES.player.atk]: {
    target: "player",
    stat: "atk",
  },
  [ADDRESSES.player.def]: {
    target: "player",
    stat: "def",
  },
  [ADDRESSES.player.regen]: {
    target: "player",
    stat: "regen",
  },

  [ADDRESSES.enemy.buffer]: {
    target: "enemy",
    stat: "buffer",
  },
  [ADDRESSES.enemy.core]: {
    target: "enemy",
    stat: "core",
  },
  [ADDRESSES.enemy.atk]: {
    target: "enemy",
    stat: "atk",
  },
  [ADDRESSES.enemy.def]: {
    target: "enemy",
    stat: "def",
  },
  [ADDRESSES.enemy.regen]: {
    target: "enemy",
    stat: "regen",
  },
};

export function createMemory(
  player: Combatant,
  enemy: Combatant,
): number[] {
  const memory = Array.from(
    { length: MEMORY_SIZE },
    (_, index) => (index * 37 + 19) % 256,
  );

  // Valores duplicados criam candidatos falsos para Scan.
  memory[0x10] = enemy.core;
  memory[0x22] = player.buffer;
  memory[0x30] = enemy.atk;
  memory[0x87] = enemy.core;
  memory[0xa2] = player.atk;

  syncMemory(memory, player, enemy);

  return memory;
}

export function syncMemory(
  memory: number[],
  player: Combatant,
  enemy: Combatant,
): number[] {
  const result = [...memory];

  for (const [stat, address] of Object.entries(
    ADDRESSES.player,
  ) as [StatKey, number][]) {
    result[address] = player[stat];
  }

  for (const [stat, address] of Object.entries(
    ADDRESSES.enemy,
  ) as [StatKey, number][]) {
    result[address] = enemy[stat];
  }

  // Valor derivado: será recalculado pelo jogo.
  result[0x42] = Math.min(
    255,
    player.buffer + player.core,
  );

  // Valor temporário usado para demonstrar dados derivados.
  result[0x58] = Math.min(
    255,
    enemy.def + enemy.regen,
  );

  return result;
}

export function findValue(
  memory: number[],
  value: number,
): number[] {
  return memory.reduce<number[]>((results, byte, address) => {
    if (byte === value) results.push(address);
    return results;
  }, []);
}

export function formatAddress(address: number): string {
  return `0x${address.toString(16).toUpperCase().padStart(2, "0")}`;
}

export function formatByte(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, "0");
}
