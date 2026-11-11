import { create } from "zustand";
import type {
  Combatant,
  GameState,
  LogEntry,
} from "../domain/types";

import { ENEMIES } from "./enemies";
import {
  createMemory,
  findValue,
  MEMORY_FIELDS,
  syncMemory,
} from "./memory";

const INITIAL_PLAYER: Combatant = {
  buffer: 24,
  maxBuffer: 24,
  core: 50,
  maxCore: 50,
  atk: 9,
  def: 2,
  regen: 5,
};

function applyDamage(
  target: Combatant,
  damage: number,
): Combatant {
  const remaining = Math.max(0, damage);

  const absorbed = Math.min(target.buffer, remaining);
  const coreDamage = remaining - absorbed;

  return {
    ...target,
    buffer: target.buffer - absorbed,
    core: Math.max(0, target.core - coreDamage),
  };
}

function regenerate(target: Combatant): Combatant {
  return {
    ...target,
    buffer: Math.min(
      target.maxBuffer,
      target.buffer + target.regen,
    ),
  };
}

function createLog(
  text: string,
  type: LogEntry["type"] = "info",
): LogEntry {
  return {
    id: Date.now() + Math.random(),
    text,
    type,
  };
}

function initialMemory() {
  const player = { ...INITIAL_PLAYER };
  const enemy = { ...ENEMIES[0].stats };

  return {
    player,
    enemy,
    memory: createMemory(player, enemy),
  };
}

export const useGameStore = create<GameState>((set, get) => {
  const initial = initialMemory();

  return {
    player: initial.player,
    enemy: {
      ...ENEMIES[0],
      stats: initial.enemy,
    },
    enemyIndex: 0,
    turn: 1,
    ap: 3,
    phase: "battle",
    score: 0,

    memory: initial.memory,
    scanResults: [],
    selectedAddress: null,
    editedStatsThisTurn: [],

    log: [
      createLog("Uma criatura apareceu!", "warning"),
      createLog("Investigue o Grid para encontrar uma vantagem."),
    ],

    scan(value) {
      const state = get();

      if (state.phase !== "battle") return;
      if (state.ap < 1) return;
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        return;
      }

      const results = findValue(state.memory, value);

      set({
        ap: state.ap - 1,
        scanResults: results,
        selectedAddress: null,
        log: [
          createLog(
            `Scan: ${results.length} ocorrência(s) para ${value} (0x${value.toString(16).toUpperCase()}).`,
            "success",
          ),
          ...state.log,
        ],
      });
    },

    selectAddress(address) {
      if (address < 0 || address >= 256) return;

      set({ selectedAddress: address });
    },

    edit(value) {
      const state = get();
      const address = state.selectedAddress;

      if (state.phase !== "battle") return;
      if (state.ap < 1 || address === null) return;
      if (!Number.isInteger(value) || value < 0 || value > 255) return;

      const field = MEMORY_FIELDS[address];

      if (field?.stat === "core") {
        set({
          log: [
            createLog(
              "Core protegido: não é possível editá-lo diretamente.",
              "warning",
            ),
            ...state.log,
          ],
        });
        return;
      }

      if (field) {
        const key = `${field.target}.${field.stat}`;

        if (state.editedStatsThisTurn.includes(key)) {
          set({
            log: [
              createLog(
                "Esse atributo já foi editado neste turno.",
                "warning",
              ),
              ...state.log,
            ],
          });
          return;
        }

        const target =
          field.target === "player" ? state.player : state.enemy.stats;

        const limit =
          field.stat === "buffer" ? target.maxBuffer : 255;

        const nextValue = Math.min(value, limit);

        const updatedTarget = {
          ...target,
          [field.stat]: nextValue,
        };

        const player =
          field.target === "player"
            ? updatedTarget
            : state.player;

        const enemyStats =
          field.target === "enemy"
            ? updatedTarget
            : state.enemy.stats;

        const memory = syncMemory(
          state.memory,
          player,
          enemyStats,
        );

        set({
          player,
          enemy: {
            ...state.enemy,
            stats: enemyStats,
          },
          memory,
          ap: state.ap - 1,
          editedStatsThisTurn: [
            ...state.editedStatsThisTurn,
            key,
          ],
          log: [
            createLog(
              `${field.target === "player" ? "Herói" : state.enemy.name}: ${field.stat} alterado para ${nextValue}.`,
              "success",
            ),
            ...state.log,
          ],
        });

        return;
      }

      // Decoys comuns podem ser modificados, mas não alteram
      // atributos que o jogador ainda não identificou.
      const memory = [...state.memory];
      memory[address] = value;

      set({
        memory,
        ap: state.ap - 1,
        log: [
          createLog(
            "O byte foi alterado, mas nenhum atributo visível mudou.",
            "warning",
          ),
          ...state.log,
        ],
      });
    },

    attack() {
      const state = get();

      if (state.phase !== "battle" || state.ap < 1) return;

      const damage = Math.max(
        0,
        state.player.atk - state.enemy.stats.def,
      );

      const enemyStats = applyDamage(
        state.enemy.stats,
        damage,
      );

      const memory = syncMemory(
        state.memory,
        state.player,
        enemyStats,
      );

      const defeated = enemyStats.core <= 0;
      const isLastEnemy = state.enemyIndex === ENEMIES.length - 1;

      const log = [
        createLog(
          `O herói causou ${damage} de dano.`,
          "damage",
        ),
        ...state.log,
      ];

      if (defeated) {
        log.unshift(
          createLog(`${state.enemy.name} foi derrotado!`, "success"),
        );

        if (isLastEnemy) {
          set({
            enemy: {
              ...state.enemy,
              stats: enemyStats,
            },
            memory,
            ap: state.ap - 1,
            phase: "victory",
            score: state.score + 50,
            log,
          });
          return;
        }

        const nextIndex = state.enemyIndex + 1;
        const nextEnemy = ENEMIES[nextIndex];
        const nextStats = { ...nextEnemy.stats };

        set({
          enemy: {
            ...nextEnemy,
            stats: nextStats,
          },
          enemyIndex: nextIndex,
          player: state.player,
          memory: createMemory(state.player, nextStats),
          ap: 3,
          turn: 1,
          score: state.score + 50,
          scanResults: [],
          selectedAddress: null,
          editedStatsThisTurn: [],
          log: [
            createLog(`Próximo adversário: ${nextEnemy.name}.`, "warning"),
            ...log,
          ],
        });

        return;
      }

      set({
        enemy: {
          ...state.enemy,
          stats: enemyStats,
        },
        memory,
        ap: state.ap - 1,
        log,
      });
    },

    endTurn() {
      const state = get();

      if (state.phase !== "battle") return;

      // O inimigo recupera Buffer antes de atacar.
      const enemyStats = regenerate(state.enemy.stats);

      const damage = Math.max(
        0,
        enemyStats.atk - state.player.def,
      );

      const damagedPlayer = applyDamage(
        state.player,
        damage,
      );

      // O herói recupera Buffer depois da ação inimiga.
      const player = regenerate(damagedPlayer);

      const memory = syncMemory(
        state.memory,
        player,
        enemyStats,
      );

      const defeated = player.core <= 0;

      set({
        player,
        enemy: {
          ...state.enemy,
          stats: enemyStats,
        },
        memory,
        turn: state.turn + 1,
        ap: 3,
        phase: defeated ? "defeat" : "battle",
        scanResults: [],
        selectedAddress: null,
        editedStatsThisTurn: [],
        log: [
          createLog(
            `O inimigo causou ${damage} de dano ao herói.`,
            "damage",
          ),
          createLog(
            `O herói recuperou ${player.buffer - damagedPlayer.buffer} de Buffer.`,
            "success",
          ),
          ...state.log,
        ],
      });
    },

    restart() {
      const fresh = initialMemory();

      set({
        player: fresh.player,
        enemy: {
          ...ENEMIES[0],
          stats: fresh.enemy,
        },
        enemyIndex: 0,
        turn: 1,
        ap: 3,
        phase: "battle",
        score: 0,
        memory: fresh.memory,
        scanResults: [],
        selectedAddress: null,
        editedStatsThisTurn: [],
        log: [
          createLog("Nova run iniciada.", "success"),
        ],
      });
    },
  };
});
