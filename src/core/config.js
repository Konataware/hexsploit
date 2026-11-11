
/*
 * HEXploit — config.js
 *
 * Central configuration, utility functions, and deterministic RNG.
 *
 * All memory addresses, limits, and game constants are defined here.
 * Other modules should reference this configuration instead of
 * introducing hardcoded values.
 */

(function (G) {
  'use strict';

  const HEX = (G.HEX = G.HEX || {});


  // ============================================================
  // UTILITIES
  // ============================================================

  const util = {

    // Restricts a value to a given range.
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },

    // Formats a number as two uppercase hexadecimal digits.
    hex2(value) {
      return (value & 0xff)
        .toString(16)
        .toUpperCase()
        .padStart(2, '0');
    },

    // Formats a number as a hexadecimal byte with a 0x prefix.
    hex(value) {
      return '0x' + util.hex2(value);
    },

    /*
     * Parses a player-entered value.
     *
     * Accepted formats:
     *   Decimal:     "40"
     *   Hexadecimal: "0x28"
     *
     * Returns null when the input is invalid or outside byte range.
     */
    parseValue(raw) {

      if (typeof raw === 'number') {
        return Number.isInteger(raw) && raw >= 0 && raw <= 255
          ? raw
          : null;
      }

      if (typeof raw !== 'string') {
        return null;
      }

      const input = raw.trim();
      let value = null;

      if (/^0x[0-9a-f]{1,2}$/i.test(input)) {
        value = parseInt(input.slice(2), 16);

      } else if (/^\d{1,3}$/.test(input)) {
        value = parseInt(input, 10);
      }

      return value !== null && value >= 0 && value <= 255
        ? value
        : null;
    },

    /*
     * Parses a memory address.
     *
     * Accepted formats:
     *   "54"
     *   "0x54"
     *
     * The resulting address must be inside the available memory.
     */
    parseAddress(raw, size) {

      if (typeof raw === 'number') {
        return Number.isInteger(raw) && raw >= 0 && raw < size
          ? raw
          : null;
      }

      if (typeof raw !== 'string') {
        return null;
      }

      const input = raw.trim().replace(/^0x/i, '');

      if (!/^[0-9a-f]{1,3}$/i.test(input)) {
        return null;
      }

      const address = parseInt(input, 16);

      return address >= 0 && address < size
        ? address
        : null;
    },
  };


  // ============================================================
  // DETERMINISTIC RANDOM NUMBER GENERATOR
  // ============================================================
  //
  // Algorithm: Mulberry32
  //
  // The RNG state is stored in state.rngState.
  // This makes random sequences serializable and reproducible.
  //
  // Calling the same sequence of operations with the same initial
  // state always produces the same results.
  // ============================================================

  const Rng = {

    // Generates a deterministic floating-point number in [0, 1).
    next(state) {

      let value = (
        state.rngState + 0x6d2b79f5
      ) >>> 0;

      state.rngState = value;

      value = Math.imul(
        value ^ (value >>> 15),
        value | 1
      );

      value ^= value + Math.imul(
        value ^ (value >>> 7),
        value | 61
      );

      return (
        (value ^ (value >>> 14)) >>> 0
      ) / 4294967296;
    },

    // Generates an integer between 0 and n - 1.
    int(state, n) {
      return Math.floor(Rng.next(state) * n);
    },

    // Returns a random element from an array.
    pick(state, array) {
      return array[Rng.int(state, array.length)];
    },

    // Returns a shuffled copy without modifying the original array.
    shuffle(state, array) {

      const result = array.slice();

      // Fisher-Yates shuffle.
      for (let i = result.length - 1; i > 0; i--) {

        const j = Rng.int(state, i + 1);

        [result[i], result[j]] = [
          result[j],
          result[i],
        ];
      }

      return result;
    },
  };


  // ============================================================
  // GAME CONFIGURATION
  // ============================================================

  const CONFIG = {

    // ----------------------------------------------------------
    // MEMORY
    // ----------------------------------------------------------

    MEM_SIZE: 256,

    STRUCT_BASE: {
      player: 0x40,
      enemy: 0x50,
    },


    // ----------------------------------------------------------
    // ENTITY STRUCTURE
    // ----------------------------------------------------------
    //
    // Each entity occupies 10 bytes.
    //
    // Offsets are relative to the entity's base address.
    //
    // Field kinds:
    //   field  = Actual entity attribute.
    //   temp   = Derived value/cache.
    //   struct = Structural data.
    //
    // Additional properties:
    //   editable = Whether the value can be modified.
    //   group    = Logical group used by protection/rate limits.
    //   mirrors  = Attribute represented by a cache.
    //   cache    = Associated cache field.
    //   limits   = Allowed numeric range.
    // ----------------------------------------------------------

    FIELDS: {

      buffer: {
        off: 0,
        kind: 'field',
        editable: true,
        label: 'Buffer',
      },

      core: {
        off: 1,
        kind: 'field',
        editable: false,
        label: 'Core',
      },

      maxBuffer: {
        off: 2,
        kind: 'field',
        editable: true,
        label: 'Buffer máx',
        limits: [1, 120],
      },

      tmpDef: {
        off: 3,
        kind: 'temp',
        editable: true,
        label: 'Defense (cache)',
        group: 'def',
        mirrors: 'def',
        limits: [0, 20],
      },

      atk: {
        off: 4,
        kind: 'field',
        editable: true,
        label: 'Attack',
        limits: [0, 30],
        cache: 'tmpAtk',
      },

      tmpAtk: {
        off: 5,
        kind: 'temp',
        editable: true,
        label: 'Attack (cache)',
        group: 'atk',
        mirrors: 'atk',
        limits: [0, 30],
      },

      def: {
        off: 6,
        kind: 'field',
        editable: true,
        label: 'Defense',
        limits: [0, 20],
        cache: 'tmpDef',
      },

      regen: {
        off: 7,
        kind: 'field',
        editable: true,
        label: 'Regen',
        limits: [0, 15],
      },

      flags: {
        off: 8,
        kind: 'field',
        editable: true,
        label: 'Flags',
        limits: [0, 255],
      },

      sig: {
        off: 9,
        kind: 'struct',
        editable: true,
        label: 'Assinatura',
      },
    },

    FIELD_ORDER: [
      'buffer',
      'core',
      'maxBuffer',
      'tmpDef',
      'atk',
      'tmpAtk',
      'def',
      'regen',
      'flags',
      'sig',
    ],

    STRUCT_SIZE: 10,

    SIG: {
      player: 0xa5,
      enemy: 0x5a,
    },

    FLAG_RESURRECT: 0x01,


    // ----------------------------------------------------------
    // DISPLAY NAMES
    // ----------------------------------------------------------
    //
    // Used by combat log messages.
    // Memory addresses are intentionally hidden from these names.
    // ----------------------------------------------------------

    NAMES: {

      buffer: {
        art: 'O',
        bare: 'Buffer',
        own: 'Seu Buffer',
      },

      atk: {
        art: 'O',
        bare: 'Attack',
        own: 'Seu Attack',
      },

      def: {
        art: 'A',
        bare: 'Defense',
        own: 'Sua Defense',
      },

      regen: {
        art: 'A',
        bare: 'regeneração',
        own: 'Sua regeneração',
      },

      maxBuffer: {
        art: 'O',
        bare: 'Buffer máximo',
        own: 'Seu Buffer máximo',
      },

      flags: {
        art: 'Uma',
        bare: 'flag interna',
        own: 'Uma flag interna sua',
      },
    },

    PROTECTABLE: [
      'buffer',
      'atk',
      'def',
      'regen',
      'maxBuffer',
    ],


    // ----------------------------------------------------------
    // ACTION POINTS AND COSTS
    // ----------------------------------------------------------

    AP: {
      player: 3,
      tutorial: 4,
      enemyDefault: 2,
    },

    COST: {
      attack: 1,
      scan: 1,
      edit: 1,
      protect: 1,
    },


    // ----------------------------------------------------------
    // PLAYER DEFAULTS
    // ----------------------------------------------------------

    PLAYER: {
      name: 'Herói',
      buffer: 30,
      maxBuffer: 30,
      core: 30,
      maxCore: 30,
      atk: 10,
      def: 2,
      regen: 3,
      flags: 0,
    },

    BETWEEN_FIGHTS: {
      coreHeal: 10,
    },


    // ----------------------------------------------------------
    // DECOYS AND SCANNING
    // ----------------------------------------------------------

    SNAPSHOTS_PER_ENTITY: 3,

    SNAPSHOT_FIELDS: [
      'buffer',
      'core',
      'atk',
      'def',
      'maxBuffer',
    ],

    NEIGHBOR_RADIUS: 3,
    MAX_RESULT_ROWS: 24,


    // ----------------------------------------------------------
    // SCORING
    // ----------------------------------------------------------

    SCORE: {
      base: 50,
      objective: 30,
      turnMax: 20,
      turnPenalty: 4,
      hpMax: 20,
      multipliers: [
        1.0,
        1.2,
        1.5,
        2.0,
      ],
    },
  };


  // ============================================================
  // PUBLIC API
  // ============================================================

  HEX.util = util;
  HEX.Rng = Rng;
  HEX.CONFIG = CONFIG;

})(typeof globalThis !== 'undefined' ? globalThis : window);
