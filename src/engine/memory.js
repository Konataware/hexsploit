/* HEXploit — memory.js
 * O Grid: 256 bytes que SÃO o estado de combate (atributos vivem aqui).
 * Responsável por: inicializar, gerar decoys, Scan, Edit (aplicação + consequências),
 * sincronização memória <-> estado lógico, recálculo de dados derivados.
 * Não toca no DOM e não conhece AP, turnos nem proteção (isso é do combat.js).
 */
(function (G) {
  'use strict';
  const HEX = (G.HEX = G.HEX || {});
  const C = HEX.CONFIG;
  const { clamp } = HEX.util;
  const R = HEX.Rng;

  const OWNERS = ['player', 'enemy'];
  const isMapped = (key) => key !== 'sig'; // 'sig' é estrutural: escrito à parte

  function addrOf(owner, key) { return C.STRUCT_BASE[owner] + C.FIELDS[key].off; }
  function groupOf(key) { return C.FIELDS[key].group || key; }

  /** [min, max] válido para o campo (Buffer depende do Buffer máximo atual). */
  function limitsFor(state, owner, key) {
    if (key === 'buffer') return [0, state[owner].maxBuffer];
    return C.FIELDS[key].limits || [0, 255];
  }

  /* ---------------- sincronização ---------------- */

  /** Lógico -> memória. Chamado quando o COMBATE altera um atributo. `only` = {owner, field}. */
  function syncToMemory(state, only) {
    const owners = only ? [only.owner] : OWNERS;
    for (const owner of owners) {
      const keys = only ? [only.field] : C.FIELD_ORDER;
      for (const key of keys) {
        const a = addrOf(owner, key);
        if (key === 'sig') { if (!only) state.memory[a] = C.SIG[owner]; continue; }
        state.memory[a] = clamp(state[owner][key], 0, 255);
      }
    }
  }

  /** Memória -> lógico. Chamado após uma edição válida. O Core nunca é lido daqui. */
  function syncFromMemory(state) {
    for (const owner of OWNERS) {
      for (const key of C.FIELD_ORDER) {
        if (!isMapped(key) || key === 'core') continue;
        state[owner][key] = state.memory[addrOf(owner, key)];
      }
    }
  }

  /** Divergências memória x estado lógico (usado nos testes de integridade). */
  function checkSync(state) {
    const bad = [];
    for (const owner of OWNERS) {
      for (const key of C.FIELD_ORDER) {
        if (!isMapped(key)) continue;
        const a = addrOf(owner, key);
        if (state.memory[a] !== state[owner][key]) bad.push({ owner, key, addr: a, mem: state.memory[a], logic: state[owner][key] });
      }
    }
    return bad;
  }

  /* ---------------- inicialização ---------------- */

  function init(state) {
    const size = C.MEM_SIZE;
    state.memory = new Array(size).fill(0);
    const regions = new Array(size).fill(null);
    const meta = { playerAddresses: {}, enemyAddresses: {}, decoys: [], regions };
    state.memoryMetadata = meta;

    const structAddrs = new Set();
    for (const owner of OWNERS) {
      for (const key of C.FIELD_ORDER) {
        const a = addrOf(owner, key);
        const f = C.FIELDS[key];
        regions[a] = { kind: f.kind, owner, field: key, group: groupOf(key) };
        meta[owner + 'Addresses'][key] = a;
        structAddrs.add(a);
      }
    }
    syncToMemory(state);

    // Endereços livres, em ordem aleatória (decoys mudam entre runs; structs são fixas).
    const free = R.shuffle(state, [...Array(size).keys()].filter((a) => !structAddrs.has(a)));

    // Snapshots: cópias de atributos reais que o programa só atualiza no turno do dono.
    for (const owner of OWNERS) {
      const fields = R.shuffle(state, C.SNAPSHOT_FIELDS).slice(0, C.SNAPSHOTS_PER_ENTITY);
      for (const field of fields) {
        const a = free.pop();
        regions[a] = { kind: 'snapshot', owner, field, group: null, dirty: false };
        state.memory[a] = clamp(state[owner][field], 0, 255);
        meta.decoys.push({ addr: a, kind: 'snapshot', owner, field });
      }
    }

    // Ruído: valores que imitam os atributos legítimos (para o Scan nunca ter resultado único).
    const interesting = [];
    for (const owner of OWNERS) {
      for (const key of C.FIELD_ORDER) {
        if (!isMapped(key)) continue;
        const v = state.memory[addrOf(owner, key)];
        if (v > 0 && !interesting.includes(v)) interesting.push(v);
      }
    }
    for (const a of free) {
      regions[a] = { kind: 'noise', owner: null, field: null, group: null };
      state.memory[a] = R.next(state) < 0.3 ? R.pick(state, interesting) : 1 + R.int(state, 255);
      meta.decoys.push({ addr: a, kind: 'noise' });
    }
    // Garante 1–2 cópias de cada valor "interessante" e alguns zeros no ruído.
    const noiseAddrs = R.shuffle(state, free);
    let slot = 0;
    const plant = (v) => { state.memory[noiseAddrs[slot++ % noiseAddrs.length]] = v; };
    for (const v of interesting) { plant(v); if (R.next(state) < 0.5) plant(v); }
    for (let i = 0; i < 3; i++) plant(0);
    return state;
  }

  /* ---------------- consultas ---------------- */

  function regionAt(state, addr) { return state.memoryMetadata.regions[addr]; }

  /** Exact Value Scan (mode 'exact') ou Next Scan sobre os resultados anteriores (mode 'next'). */
  function scan(state, value, mode) {
    const base = mode === 'next' ? state.scanResults.map((r) => r.addr) : [...Array(C.MEM_SIZE).keys()];
    return base.filter((a) => state.memory[a] === value).map((a) => ({ addr: a, value }));
  }

  /**
   * Vizinhança: bytes ao redor de cada semente. Retorna segmentos contíguos.
   * seeds = [{addr, radius}] ; matchSet = endereços destacados como resultado.
   */
  function neighborhood(state, seeds, matchSet, touchedSet) {
    const want = new Set();
    for (const s of seeds) {
      for (let d = -s.radius; d <= s.radius; d++) {
        const a = s.addr + d;
        if (a >= 0 && a < C.MEM_SIZE) want.add(a);
      }
    }
    const list = [...want].sort((a, b) => a - b);
    const segments = [];
    for (const a of list) {
      const cell = { addr: a, value: state.memory[a], match: matchSet.has(a), touched: touchedSet.has(a) };
      const last = segments[segments.length - 1];
      if (last && last.cells[last.cells.length - 1].addr === a - 1) last.cells.push(cell);
      else segments.push({ cells: [cell] });
    }
    return segments;
  }

  /* ---------------- Edit ---------------- */

  /**
   * Aplica uma escrita JÁ validada pelo combat.js (AP, proteção, rate limit, Core).
   * Devolve o descritor de consequências observáveis.
   */
  function applyEdit(state, addr, raw) {
    const reg = state.memoryMetadata.regions[addr];
    const out = { kind: reg.kind, owner: reg.owner, field: reg.field, addr, before: state.memory[addr], after: raw, clamped: false, changes: [], swapped: false, effective: true, cascade: false };

    switch (reg.kind) {
      case 'field':
      case 'temp': {
        const { owner, field } = reg;
        const e = state[owner];
        const [lo, hi] = limitsFor(state, owner, field);
        const v = clamp(raw, lo, hi);
        out.clamped = v !== raw;
        out.after = v;
        const prev = e[field];
        e[field] = v;
        state.memory[addr] = v;
        out.changes.push({ owner, field, from: prev, to: v, temp: reg.kind === 'temp' });
        if (reg.kind === 'field') {
          const cache = C.FIELDS[field].cache;
          if (cache) { e[cache] = v; state.memory[addrOf(owner, cache)] = v; } // o programa recalcula o cache
          if (field === 'maxBuffer' && e.buffer > v) {
            const pb = e.buffer;
            e.buffer = v;
            state.memory[addrOf(owner, 'buffer')] = v;
            out.changes.push({ owner, field: 'buffer', from: pb, to: v, temp: false, cascade: true });
            out.cascade = true;
          }
        }
        break;
      }
      case 'struct': {
        const { owner } = reg;
        const e = state[owner];
        state.memory[addr] = raw;
        out.after = raw;
        if (raw !== C.SIG[owner]) {
          // Estrutura corrompida: o motor lê ATK e DEF trocados até revalidar (próximo turno do dono).
          const a0 = e.tmpAtk, d0 = e.tmpDef;
          e.tmpAtk = d0; e.tmpDef = a0;
          state.memory[addrOf(owner, 'tmpAtk')] = e.tmpAtk;
          state.memory[addrOf(owner, 'tmpDef')] = e.tmpDef;
          out.swapped = true;
          out.changes.push({ owner, field: 'tmpAtk', from: a0, to: e.tmpAtk, temp: true });
          out.changes.push({ owner, field: 'tmpDef', from: d0, to: e.tmpDef, temp: true });
        } else out.effective = false;
        break;
      }
      case 'snapshot':
        state.memory[addr] = raw;
        reg.dirty = true;
        break;
      default: // noise
        state.memory[addr] = raw;
        out.effective = false;
    }
    return out;
  }

  /**
   * Recalcula dados derivados no começo do turno do dono (caches, snapshots, assinatura).
   * É aqui — e só aqui — que uma edição "temporária" é sobrescrita pelo programa.
   */
  function refreshOwner(state, owner) {
    const e = state[owner];
    let overwritten = false, revalidated = false;
    if (e.tmpAtk !== e.atk) { e.tmpAtk = e.atk; overwritten = true; }
    if (e.tmpDef !== e.def) { e.tmpDef = e.def; overwritten = true; }
    state.memory[addrOf(owner, 'tmpAtk')] = e.tmpAtk;
    state.memory[addrOf(owner, 'tmpDef')] = e.tmpDef;
    const regions = state.memoryMetadata.regions;
    for (let a = 0; a < regions.length; a++) {
      const reg = regions[a];
      if (reg && reg.kind === 'snapshot' && reg.owner === owner) {
        if (reg.dirty) { overwritten = true; reg.dirty = false; }
        state.memory[a] = clamp(e[reg.field], 0, 255);
      }
    }
    const sa = addrOf(owner, 'sig');
    if (state.memory[sa] !== C.SIG[owner]) { revalidated = true; state.memory[sa] = C.SIG[owner]; }
    return { overwritten, revalidated };
  }

  HEX.Memory = { OWNERS, addrOf, groupOf, limitsFor, syncToMemory, syncFromMemory, checkSync, init, regionAt, scan, neighborhood, applyEdit, refreshOwner };
})(typeof globalThis !== 'undefined' ? globalThis : window);
