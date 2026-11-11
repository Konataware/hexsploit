export type EnemyId = "slime" | "skeleton" | "zombie";

export type StatKey =
  | "buffer"
  | "core"
  | "atk"
  | "def"
  | "regen";

export type GamePhase = "battle" | "victory" | "defeat";

export interface Combatant {
  buffer: number;
  maxBuffer: number;
  core: number;
  maxCore: number;
  atk: number;
  def: number;
  regen: number;
}

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  symbol: string;
  description: string;
  stats: Combatant;
}

export interface LogEntry {
  id: number;
  text: string;
  type: "info" | "damage" | "success" | "warning";
}

export interface GameState {
  player: Combatant;
  enemy: EnemyDefinition;
  enemyIndex: number;
  turn: number;
  ap: number;
  phase: GamePhase;
  score: number;
  editedStatsThisTurn: string[];

  memory: number[];
  scanResults: number[];
  selectedAddress: number | null;

  log: LogEntry[];

  scan: (value: number) => void;
  selectAddress: (address: number) => void;
  edit: (value: number) => void;
  attack: () => void;
  endTurn: () => void;
  restart: () => void;
}
