import type { EnemyDefinition } from "../domain/types";

export const ENEMIES: EnemyDefinition[] = [
  {
    id: "slime",
    name: "Slime",
    symbol: "( oo )",
    description: "Uma criatura gelatinosa que recupera Buffer.",
    stats: {
      buffer: 12,
      maxBuffer: 12,
      core: 40,
      maxCore: 40,
      atk: 5,
      def: 2,
      regen: 5,
    },
  },
  {
    id: "skeleton",
    name: "Skeleton",
    symbol: " [X]",
    description: "Um guerreiro ósseo com defesa elevada.",
    stats: {
      buffer: 8,
      maxBuffer: 8,
      core: 25,
      maxCore: 25,
      atk: 8,
      def: 10,
      regen: 0,
    },
  },
  {
    id: "zombie",
    name: "Zombie",
    symbol: "( o_o)",
    description: "Uma criatura resistente com regeneração limitada.",
    stats: {
      buffer: 15,
      maxBuffer: 15,
      core: 60,
      maxCore: 60,
      atk: 6,
      def: 3,
      regen: 2,
    },
  },
];
