/* HEXploit — combat.js
 * Estado do combate, turnos, AP, ataque, Buffer/Core, Protect, aplicação das
 * consequências de edição, IA dos inimigos e fim de batalha.
 * Sem DOM. Toda ação entra por dispatch(state, comando) -> resultado.
 *
 * Ordem padronizada de um turno (decisão do GDD §5.3):
 *   início do turno : AP renovado -> contagem de edições zerada -> recálculo de derivados
 *   ações           : validar -> custo -> aplicar -> sincronizar memória -> consequências -> fim?
 *   fim do turno    : regeneração passiva do dono -> expiram proteções do ADVERSÁRIO -> fim?
 *                     -> troca de turno
 */
(function (G) {
  'use strict';
  const HEX = (G.HEX = G.HEX || {});
  const C = HEX.CONFIG;
  const M = HEX.Memory;
  const T = HEX.Tools;
  const R = HEX.Rng;
  const U = HEX.util;

  const other = (s) => (s === 'player' ? 'enemy' : 'player');
  const fail = (reason, message) => ({ ok: false, reason, message });

  /* ---------------- helpers de estado ---------------- */

  function log(state, side, text, tone) {
    state.log.push({ n: ++state.logSeq, turn: state.turn, side, text, tone: tone || 'info' });
    if (state.log.length > 300) state.log.shift();
  }
  function fx(state, o) { state.fx.push(o); }
  function emit(state, ev) { for (const fn of state.listeners) fn(ev, state); }

  function makeEntity(base, maxAP) {
    return {
      name: base.name,
      buffer: base.maxBuffer, maxBuffer: base.maxBuffer,
      core: base.core, maxCore: base.maxCore,
      atk: base.atk, tmpAtk: base.atk,
      def: base.def, tmpDef: base.def,
      regen: base.regen, flags: base.flags,
      ap: maxAP, maxAP,
    };
  }

  function createBattle(opts) {
    const mob = opts.mob;
    const tutorial = !!opts.tutorial;
    const pBase = Object.assign({}, C.PLAYER);
    if (opts.playerCore != null) pBase.core = Math.max(1, Math.min(pBase.maxCore, opts.playerCore));
    const eBase = { name: mob.name, maxBuffer: mob.hp, core: mob.hp, maxCore: mob.hp, atk: mob.atk, def: mob.def, regen: mob.regen || 0, flags: mob.flags || 0 };
    const seed = opts.seed != null ? opts.seed >>> 0 : (Math.random() * 4294967296) >>> 0;

    const state = {
      seed, rngState: seed,
      turn: 1, currentPlayer: 'player', phase: 'battle',
      tutorial, mobId: mob.id,
      memory: [], memoryMetadata: null,
      player: makeEntity(pBase, tutorial ? C.AP.tutorial : C.AP.player),
      enemy: makeEntity(eBase, mob.ap || C.AP.enemyDefault),
      scanResults: [], lastScan: null, touchedAddrs: [],
      protection: { player: [], enemy: [] },
      editedThisTurn: { player: [], enemy: [] },
      tool: opts.tool || null, usedTools: [],
      resurrectUsed: { player: false, enemy: false },
      objectives: mob.objective ? [Object.assign({ done: false }, mob.objective)] : [],
      log: [], logSeq: 0, fx: [], listeners: [],
      result: null, score: 0,
    };
    state.player.name = pBase.name;
    M.init(state);
    log(state, 'sys', mob.intro, 'story');
    log(state, 'sys', `— Turno 1 —`, 'turn');
    return state;
  }

  /* ---------------- turnos ---------------- */

  function startTurn(state, actor) {
    const e = state[actor];
    e.ap = e.maxAP;
    state.editedThisTurn[actor] = [];
    const r = M.refreshOwner(state, actor);
    if (r.revalidated) log(state, 'sys', `A estrutura de ${e.name} foi revalidada pelo programa.`, 'warn');
    if (r.overwritten) log(state, 'sys', 'O valor modificado foi sobrescrito pelo programa.', 'warn');
    emit(state, { type: 'startTurn', actor });
  }

  function passiveRegen(state, actor) {
    const e = state[actor];
    if (e.regen > 0 && e.buffer < e.maxBuffer && e.core > 0) {
      const gain = Math.min(e.regen, e.maxBuffer - e.buffer);
      e.buffer += gain;
      M.syncToMemory(state, { owner: actor, field: 'buffer' });
      fx(state, { type: 'heal', target: actor, amount: gain });
      log(state, actor, actor === 'player' ? `Seu Buffer regenerou +${gain}.` : `${e.name} regenerou +${gain} de Buffer.`, 'heal');
    }
  }

  function endTurn(state, actor) {
    if (state.phase !== 'battle') return;
    passiveRegen(state, actor);
    state.protection[other(actor)] = []; // a proteção do adversário cobriu este turno inteiro
    if (checkEnd(state)) return;
    const next = other(actor);
    state.currentPlayer = next;
    if (next === 'player') {
      state.turn++;
      log(state, 'sys', `— Turno ${state.turn} —`, 'turn');
    }
    startTurn(state, next);
  }

  /* ---------------- dano e fim de batalha ---------------- */

  function applyDamage(state, side, dmg) {
    const t = state[side];
    const absorbed = Math.min(t.buffer, dmg);
    t.buffer -= absorbed;
    const toCore = dmg - absorbed;
    t.core = Math.max(0, t.core - toCore);
    M.syncToMemory(state, { owner: side, field: 'buffer' });
    M.syncToMemory(state, { owner: side, field: 'core' });
    let resurrected = false;
    if (t.core <= 0 && (t.flags & C.FLAG_RESURRECT) && !state.resurrectUsed[side]) {
      t.core = 1;
      t.flags &= ~C.FLAG_RESURRECT;
      state.resurrectUsed[side] = true;
      resurrected = true;
      M.syncToMemory(state, { owner: side, field: 'core' });
      M.syncToMemory(state, { owner: side, field: 'flags' });
      fx(state, { type: 'resurrect', target: side });
      log(state, 'sys', `💀 ${t.name} se levanta novamente com 1 de Core!`, 'danger');
    }
    return { absorbed, toCore, resurrected };
  }

  function playerHpRatio(state) {
    const p = state.player;
    return U.clamp((p.buffer + p.core) / (C.PLAYER.maxBuffer + C.PLAYER.maxCore), 0, 1);
  }

  function checkEnd(state) {
    if (state.phase !== 'battle') return true;
    if (state.enemy.core <= 0) {
      state.phase = 'won';
      state.result = { outcome: 'won', turns: state.turn, hpRatio: playerHpRatio(state), objectiveDone: state.objectives.some((o) => o.done), mobId: state.mobId };
      log(state, 'sys', `🏆 ${state.enemy.name} foi derrotado!`, 'good');
      emit(state, { type: 'won' });
      return true;
    }
    if (state.player.core <= 0) {
      state.phase = 'lost';
      state.result = { outcome: 'lost', turns: state.turn, hpRatio: 0, objectiveDone: state.objectives.some((o) => o.done), mobId: state.mobId };
      log(state, 'sys', '☠️ Você foi derrotado...', 'danger');
      emit(state, { type: 'lost' });
      return true;
    }
    return false;
  }

  /* ---------------- ações ---------------- */

  function spend(state, actor, cost) { state[actor].ap -= cost; }

  function doAttack(state, actor) {
    const e = state[actor];
    if (e.ap < C.COST.attack) return fail('ap', 'AP insuficiente.');
    spend(state, actor, C.COST.attack);
    const side = other(actor);
    const t = state[side];
    const dmg = Math.max(0, e.tmpAtk - t.tmpDef);
    const mine = actor === 'player';
    if (dmg === 0) {
      fx(state, { type: 'blocked', target: side });
      log(state, actor, mine ? `Você atacou ${t.name}, mas o golpe foi bloqueado (ATK ${e.tmpAtk} vs DEF ${t.tmpDef}).` : `${e.name} atacou, mas o golpe foi bloqueado.`, 'info');
      return { ok: true, type: 'attack', damage: 0 };
    }
    const r = applyDamage(state, side, dmg);
    fx(state, { type: 'damage', target: side, amount: dmg });
    const detail = `Buffer −${r.absorbed}${r.toCore ? `, Core −${r.toCore}` : ''}`;
    log(state, actor, mine ? `Você atacou ${t.name}: ${dmg} de dano (${detail}).` : `${e.name} atacou você: ${dmg} de dano (${detail}).`, mine ? 'hit' : 'hurt');
    checkEnd(state);
    return { ok: true, type: 'attack', damage: dmg, ...r };
  }

  function doScan(state, action) {
    const actor = action.actor;
    const e = state[actor];
    if (actor === 'enemy') { // varredura "de ambiente": custa AP, não afeta o Grid do jogador
      if (e.ap < C.COST.scan) return fail('ap', 'AP insuficiente.');
      spend(state, actor, C.COST.scan);
      log(state, 'enemy', `${e.name} vasculha o Grid em busca de valores... e não encontra nada de útil.`, 'info');
      return { ok: true, type: 'scan' };
    }
    const value = U.parseValue(action.value);
    if (value === null) return fail('invalid', 'Valor inválido. Use 0–255 (decimal) ou 0x00–0xFF.');
    const mode = action.mode === 'next' ? 'next' : 'exact';
    if (mode === 'next' && state.scanResults.length === 0) return fail('invalid', 'Não há resultados anteriores para refinar. Faça um Scan na memória inteira.');
    const free = T.available(state, 'scan');
    const cost = free ? 0 : C.COST.scan;
    if (e.ap < cost) return fail('ap', 'AP insuficiente.');
    spend(state, actor, cost);
    if (free) { T.consume(state, 'scan'); log(state, 'player', '🔍 Scanner+ usado (grátis).', 'tool'); }
    state.scanResults = M.scan(state, value, mode);
    state.lastScan = { value, mode, count: state.scanResults.length };
    log(state, 'player', `Scan ${mode === 'next' ? '(refinando) ' : ''}por ${value} (${U.hex(value)}): ${state.scanResults.length} endereço(s).`, 'scan');
    return { ok: true, type: 'scan', value, count: state.scanResults.length, free };
  }

  function doProtect(state, action) {
    const actor = action.actor;
    const e = state[actor];
    const group = action.field;
    if (!C.PROTECTABLE.includes(group)) return fail('invalid', 'Atributo não protegível.');
    if (state.protection[actor].some((p) => p.group === group)) return fail('invalid', 'Esse atributo já está protegido.');
    const free = actor === 'player' && T.available(state, 'protect');
    const cost = free ? 0 : C.COST.protect;
    if (e.ap < cost) return fail('ap', 'AP insuficiente.');
    spend(state, actor, cost);
    if (free) { T.consume(state, 'protect'); log(state, 'player', '🛡️ Firewall usado (grátis).', 'tool'); }
    state.protection[actor].push({ group });
    fx(state, { type: 'protect', target: actor });
    log(state, actor,
      actor === 'player'
        ? `🛡️ Você protegeu ${C.NAMES[group].bare} até o fim do próximo turno de ${state.enemy.name}.`
        : `🛡️ ${e.name} ergueu uma proteção sobre a própria memória.`, 'protect');
    return { ok: true, type: 'protect', field: group, free };
  }

  function doRegenerate(state, actor) {
    const e = state[actor];
    if (e.ap < 1) return fail('ap', 'AP insuficiente.');
    if (e.regen <= 0 || e.buffer >= e.maxBuffer) return fail('invalid', 'Nada para regenerar.');
    spend(state, actor, 1);
    const gain = Math.min(e.regen * 2, e.maxBuffer - e.buffer);
    e.buffer += gain;
    M.syncToMemory(state, { owner: actor, field: 'buffer' });
    fx(state, { type: 'heal', target: actor, amount: gain });
    log(state, actor, `${e.name} se regenera: +${gain} de Buffer.`, 'heal');
    return { ok: true, type: 'regenerate', amount: gain };
  }

  /* ----- Edit ----- */

  function phrase(state, owner, field) {
    const n = C.NAMES[M.groupOf(field)]; // caches (tmpDef/tmpAtk) usam o nome do atributo lógico
    if (owner === 'player') return n.own;
    return `${n.art} ${n.bare} do ${state[owner].name}`;
  }

  function describeEdit(state, actor, c) {
    const owner = c.owner;
    const ch = c.changes[0];
    const parts = [];
    switch (c.kind) {
      case 'field':
      case 'temp': {
        const verb = ch.to > ch.from ? 'aumentou' : ch.to < ch.from ? 'diminuiu' : 'não mudou';
        if (actor === 'enemy') {
          const dir = ch.to < ch.from ? 'reduzido' : ch.to > ch.from ? 'aumentado' : 'mantido';
          parts.push(`${state[actor].name} realizou uma alteração na memória. ${phrase(state, owner, ch.field)} foi ${dir} de ${ch.from} para ${ch.to}.`);
        } else if (ch.field === 'flags') {
          parts.push(`${phrase(state, owner, 'flags')} foi alterada (${ch.from} → ${ch.to}).`);
        } else {
          parts.push(`${phrase(state, owner, ch.field)} ${verb} (${ch.from} → ${ch.to}).`);
        }
        if (c.cascade) parts.push('O Buffer foi ajustado ao novo limite.');
        if (c.clamped) parts.push(`O programa limitou o valor aplicado a ${c.after}.`);
        break;
      }
      case 'struct':
        parts.push(c.effective
          ? `A estrutura de ${state[owner].name} apresentou comportamento inesperado.`
          : 'A edição não teve efeito observável.');
        break;
      case 'snapshot':
        parts.push(actor === 'enemy' ? `${state[actor].name} alterou uma variável secundária.` : 'Uma variável secundária parece ter sido afetada.');
        break;
      default:
        parts.push('A edição não teve efeito observável.');
    }
    return parts.join(' ');
  }

  function evalObjectives(state, changes) {
    for (const o of state.objectives) {
      if (o.done) continue;
      for (const ch of changes) {
        if (ch.owner !== o.owner || ch.temp || ch.field !== o.field) continue;
        const hit =
          (o.type === 'fieldAtMost' && ch.from > o.value && ch.to <= o.value) ||
          (o.type === 'flagCleared' && (ch.from & o.bit) && !(ch.to & o.bit));
        if (hit) {
          o.done = true;
          log(state, 'sys', `🏆 Objetivo concluído: ${o.text}`, 'good');
          emit(state, { type: 'objective', id: o.id });
        }
      }
    }
  }

  function doEdit(state, action) {
    const actor = action.actor;
    const e = state[actor];
    const addr = U.parseAddress(action.address, C.MEM_SIZE);
    if (addr === null) return fail('invalid', `Endereço inválido. Use 0x00–0x${U.hex2(C.MEM_SIZE - 1)}.`);
    const value = U.parseValue(action.value);
    if (value === null) return fail('invalid', 'Valor inválido. Use 0–255 (decimal) ou 0x00–0xFF.');
    const reg = M.regionAt(state, addr);
    const key = reg.group ? `${reg.owner}.${reg.group}` : null;

    if (key && state.editedThisTurn[actor].includes(key)) {
      return fail('rate', 'Esse atributo já recebeu uma edição neste turno.');
    }

    // Proteção: só vale contra edição ADVERSÁRIA em atributo do dono.
    let prot = null;
    if (reg.owner && reg.owner !== actor && reg.group) {
      prot = state.protection[reg.owner].find((p) => p.group === reg.group) || null;
    }
    const injector = prot && actor === 'player' && T.available(state, 'edit');
    const cost = injector ? 0 : C.COST.edit;
    if (e.ap < cost) return fail('ap', 'AP insuficiente.');
    spend(state, actor, cost);
    state.stats = state.stats || {};

    // Core: a escrita é revertida por verificação de integridade (consome AP, não conta no rate limit).
    if (reg.kind === 'field' && reg.field === 'core') {
      log(state, actor, actor === 'player' ? 'A escrita foi revertida por uma verificação de integridade.' : `${e.name} tentou uma escrita que foi revertida.`, 'warn');
      fx(state, { type: 'blocked', target: reg.owner });
      if (actor === 'player' && !state.touchedAddrs.includes(addr)) state.touchedAddrs.push(addr);
      emit(state, { type: 'edit', actor, addr, blocked: true, core: true });
      return { ok: true, type: 'edit', blocked: true, core: true };
    }

    if (prot && !injector) {
      state.protection[reg.owner] = state.protection[reg.owner].filter((p) => p !== prot);
      fx(state, { type: 'blocked', target: reg.owner });
      log(state, actor, actor === 'player'
        ? `A edição foi bloqueada por uma proteção ativa em ${state[reg.owner].name}.`
        : `${e.name} tentou alterar sua memória, mas a proteção bloqueou a edição.`, 'protect');
      if (actor === 'player' && !state.touchedAddrs.includes(addr)) state.touchedAddrs.push(addr);
      emit(state, { type: 'edit', actor, addr, blocked: true });
      return { ok: true, type: 'edit', blocked: true };
    }
    if (injector) {
      T.consume(state, 'edit');
      state.protection[reg.owner] = state.protection[reg.owner].filter((p) => p !== prot);
      log(state, 'player', '💉 Injector perfurou a proteção (grátis).', 'tool');
    }

    const c = M.applyEdit(state, addr, value);
    if (key) state.editedThisTurn[actor].push(key);
    if (actor === 'player' && !state.touchedAddrs.includes(addr)) state.touchedAddrs.push(addr);
    for (const ch of c.changes) {
      if (ch.field === 'buffer' || ch.field === 'atk' || ch.field === 'def' || ch.field === 'regen' || ch.field === 'maxBuffer' || ch.field === 'flags') {
        fx(state, { type: 'edit', target: c.owner });
      }
    }
    if (c.kind === 'snapshot' || c.kind === 'noise') fx(state, { type: 'edit', target: actor });
    log(state, actor, describeEdit(state, actor, c), actor === 'player' ? 'edit' : 'hurt');
    if (actor === 'player') evalObjectives(state, c.changes);
    emit(state, { type: 'edit', actor, addr, consequence: c });
    checkEnd(state);
    return { ok: true, type: 'edit', consequence: c, injector: !!injector };
  }

  /* ---------------- comando único ---------------- */

  function dispatch(state, action) {
    if (state.phase !== 'battle') return fail('phase', 'A batalha terminou.');
    const actor = action.actor || 'player';
    action = Object.assign({}, action, { actor });
    if (actor !== state.currentPlayer) return fail('turn', 'Não é o seu turno.');
    let res;
    switch (action.type) {
      case 'attack': res = doAttack(state, actor); break;
      case 'scan': res = doScan(state, action); break;
      case 'edit': res = doEdit(state, action); break;
      case 'protect': res = doProtect(state, action); break;
      case 'regenerate': res = doRegenerate(state, actor); break;
      case 'endTurn':
        emit(state, { type: 'endTurn', actor });
        endTurn(state, actor);
        return { ok: true, type: 'endTurn' };
      default: return fail('invalid', 'Ação desconhecida.');
    }
    if (res.ok && action.type !== 'edit') emit(state, Object.assign({ actor }, res));
    return res;
  }

  /* ---------------- IA dos inimigos ---------------- */

  function aiEditOptions(state, mob) {
    const opts = [];
    for (const ed of mob.aiEdits || []) {
      if (state.editedThisTurn.enemy.includes(`player.${M.groupOf(ed.field)}`)) continue;
      const cur = state.player[ed.field];
      const v = Math.max(ed.floor == null ? 0 : ed.floor, cur + ed.delta);
      if (v === cur) continue; // sem efeito => ação inválida para a IA
      opts.push({ type: 'edit', actor: 'enemy', address: M.addrOf('player', ed.field), value: v });
    }
    return opts;
  }

  function aiValid(state, mob, act) {
    const e = state.enemy;
    switch (act) {
      case 'attack': return e.ap >= C.COST.attack;
      case 'scan': return e.ap >= C.COST.scan;
      case 'protect': return e.ap >= C.COST.protect && (mob.protectFields || []).some((f) => !state.protection.enemy.some((p) => p.group === f));
      case 'regenerate': return e.ap >= 1 && e.regen > 0 && e.buffer < e.maxBuffer;
      case 'edit': return e.ap >= C.COST.edit && aiEditOptions(state, mob).length > 0;
      default: return false;
    }
  }

  function enemyChoose(state) {
    const mob = HEX.MOBS[state.mobId];
    const weights = Object.entries(mob.aiWeights || {}).filter(([act, w]) => w > 0 && aiValid(state, mob, act));
    if (Object.keys(mob.aiWeights || {}).length === 0) return { type: 'pass', actor: 'enemy' };
    let act = 'attack';
    if (weights.length) {
      const total = weights.reduce((s, [, w]) => s + w, 0);
      let roll = R.next(state) * total;
      for (const [a, w] of weights) { roll -= w; if (roll <= 0) { act = a; break; } }
    }
    switch (act) {
      case 'protect': {
        const f = (mob.protectFields || []).filter((x) => !state.protection.enemy.some((p) => p.group === x));
        return { type: 'protect', actor: 'enemy', field: R.pick(state, f) };
      }
      case 'edit': return R.pick(state, aiEditOptions(state, mob));
      case 'scan': return { type: 'scan', actor: 'enemy' };
      case 'regenerate': return { type: 'regenerate', actor: 'enemy' };
      default: return { type: 'attack', actor: 'enemy' };
    }
  }

  /** Uma ação da IA (para a UI animar passo a passo). done=true quando o turno inimigo acabou. */
  function enemyStep(state) {
    if (state.phase !== 'battle' || state.currentPlayer !== 'enemy') return { done: true };
    const e = state.enemy;
    if (e.ap <= 0) { endTurn(state, 'enemy'); return { done: true }; }
    const action = enemyChoose(state);
    if (action.type === 'pass') {
      log(state, 'enemy', `${e.name} fica parado, sem saber o que fazer.`, 'info');
      e.ap = 0;
      return { done: false, action };
    }
    const res = dispatch(state, action);
    if (!res.ok) e.ap = 0; // nunca trava a partida
    return { done: false, action, res };
  }

  function runEnemyTurn(state) {
    let guard = 0;
    while (state.phase === 'battle' && state.currentPlayer === 'enemy' && guard++ < 50) {
      if (enemyStep(state).done) break;
    }
  }

  /* ---------------- integridade (§19) ---------------- */

  function assertInvariants(state) {
    const errs = [];
    for (const side of ['player', 'enemy']) {
      const e = state[side];
      if (e.buffer < 0 || e.buffer > e.maxBuffer) errs.push(`${side}.buffer fora do limite (${e.buffer}/${e.maxBuffer})`);
      if (e.core < 0 || e.core > e.maxCore) errs.push(`${side}.core fora do limite (${e.core}/${e.maxCore})`);
      for (const k of ['atk', 'def', 'regen', 'maxBuffer']) {
        const [lo, hi] = C.FIELDS[k].limits;
        if (e[k] < lo || e[k] > hi) errs.push(`${side}.${k}=${e[k]} fora de [${lo},${hi}]`);
      }
      if (e.ap < 0) errs.push(`${side}.ap negativo`);
      for (const k of ['buffer', 'core', 'atk', 'def', 'regen', 'maxBuffer', 'flags', 'tmpAtk', 'tmpDef']) {
        if (!Number.isInteger(e[k]) || e[k] < 0 || e[k] > 255) errs.push(`${side}.${k} não é um byte válido (${e[k]})`);
      }
    }
    for (const b of M.checkSync(state)) errs.push(`memória x lógico divergem: ${b.owner}.${b.key} mem=${b.mem} lógico=${b.logic}`);
    return errs;
  }

  HEX.Combat = { createBattle, dispatch, enemyStep, runEnemyTurn, endTurn, startTurn, assertInvariants, playerHpRatio, log };
})(typeof globalThis !== 'undefined' ? globalThis : window);
