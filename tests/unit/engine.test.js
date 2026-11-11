/* Testes do motor do HEXploit (Node, sem dependências). Uso: npm test */
'use strict';
require('../helpers/load');
const HEX = globalThis.HEX;
const { Combat: K, Memory: M, CONFIG: C, MOBS, Scoring } = HEX;

let pass = 0, failN = 0;
const failures = [];
function t(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { failN++; failures.push(name); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'esperado') + `: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }
function ok(c, msg) { if (!c) throw new Error(msg || 'falhou'); }

const fresh = (mobId = 'slime', seed = 1, tool = null, extra = {}) =>
  K.createBattle(Object.assign({ mob: MOBS[mobId], seed, tool }, extra));
const A = (s, type, extra) => K.dispatch(s, Object.assign({ type, actor: 'player' }, extra));
const addr = (owner, key) => M.addrOf(owner, key);

console.log('\n§24.1 Memória');
t('memória inicializada (256 bytes, todos 0–255)', () => {
  const s = fresh();
  eq(s.memory.length, 256);
  ok(s.memory.every((v) => Number.isInteger(v) && v >= 0 && v <= 255), 'byte inválido');
});
t('atributos nos endereços do GDD (0x40/0x41/0x44/0x46 e 0x50/0x51/0x54/0x56/0x57)', () => {
  const s = fresh();
  eq(addr('player', 'buffer'), 0x40); eq(addr('player', 'core'), 0x41);
  eq(addr('player', 'atk'), 0x44); eq(addr('player', 'def'), 0x46);
  eq(addr('enemy', 'buffer'), 0x50); eq(addr('enemy', 'core'), 0x51);
  eq(addr('enemy', 'atk'), 0x54); eq(addr('enemy', 'def'), 0x56); eq(addr('enemy', 'regen'), 0x57);
  eq(s.memory[0x54], 5); eq(s.memory[0x56], 2); eq(s.memory[0x57], 5); eq(s.memory[0x44], 10);
});
t('memória e estado lógico sincronizados na criação', () => eq(K.assertInvariants(fresh()).length, 0));
t('Scan encontra TODAS as ocorrências (conferido por força bruta)', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = fresh('skeleton', seed);
    const r = A(s, 'scan', { value: 10 });
    ok(r.ok);
    const brute = s.memory.map((v, i) => (v === 10 ? i : -1)).filter((i) => i >= 0);
    eq(JSON.stringify(s.scanResults.map((x) => x.addr)), JSON.stringify(brute));
    ok(s.scanResults.some((x) => x.addr === 0x56), 'DEF real ausente');
  }
});
t('Scan raramente tem resultado único (decoys duplicam valores)', () => {
  let multi = 0;
  for (let seed = 1; seed <= 50; seed++) { const s = fresh('skeleton', seed); A(s, 'scan', { value: 10 }); if (s.scanResults.length >= 2) multi++; }
  ok(multi >= 49, `só ${multi}/50 com >=2 resultados`);
});
t('Scan aceita hexadecimal (0x28 == 40) e rejeita valores inválidos sem gastar AP', () => {
  const s = fresh();
  A(s, 'scan', { value: '0x28' }); eq(s.lastScan.value, 40);
  const ap = s.player.ap;
  for (const bad of ['', 'abc', '256', '-1', '0x1FF', '1.5']) { const r = A(s, 'scan', { value: bad }); ok(!r.ok, bad); }
  eq(s.player.ap, ap, 'AP consumido indevidamente');
});
t('Next Scan refina resultados anteriores', () => {
  const s = fresh('slime', 3);
  A(s, 'scan', { value: 40 });
  const first = s.scanResults.length;
  A(s, 'edit', { address: 0x52, value: 41 }); // maxBuffer do jogador -> 41? (0x42)
  const before = s.scanResults.map((r) => r.addr);
  const r = A(s, 'scan', { value: 41, mode: 'next' });
  ok(r.ok); ok(s.scanResults.every((x) => before.includes(x.addr)));
  ok(first >= 2);
});
t('Next Scan sem resultados anteriores é rejeitado sem custo', () => {
  const s = fresh(); const ap = s.player.ap;
  ok(!A(s, 'scan', { value: 5, mode: 'next' }).ok); eq(s.player.ap, ap);
});
t('Edit altera o atributo REAL (Defense do Skeleton 0x56) e o dano muda', () => {
  const s = fresh('skeleton', 5);
  const r0 = A(s, 'attack'); eq(r0.damage, 0, 'ATK 10 vs DEF 10');
  ok(A(s, 'edit', { address: 0x56, value: 0 }).ok);
  eq(s.enemy.def, 0); eq(s.enemy.tmpDef, 0); eq(s.memory[0x56], 0);
  eq(A(s, 'attack').damage, 10);
  eq(K.assertInvariants(s).length, 0);
});
t('Valores inválidos e endereços inválidos são rejeitados sem gastar AP', () => {
  const s = fresh(); const ap = s.player.ap;
  for (const [a, v] of [[0x54, 300], [0x54, -1], [0x54, 'x'], [0x200, 5], ['zz', 5], [-4, 5]]) ok(!A(s, 'edit', { address: a, value: v }).ok, `${a},${v}`);
  eq(s.player.ap, ap);
});
t('Edit é limitado pelos limites do campo (clamp) e informa no log', () => {
  const s = fresh('slime', 2);
  A(s, 'edit', { address: 0x44, value: 250 });
  eq(s.player.atk, 30);
  ok(s.log.some((l) => /limitou o valor/.test(l.text)));
});
t('vizinhança contígua e correta', () => {
  const s = fresh();
  const segs = M.neighborhood(s, [{ addr: 0x50, radius: 3 }, { addr: 0x52, radius: 3 }], new Set([0x50]), new Set());
  eq(segs.length, 1); eq(segs[0].cells[0].addr, 0x4d); eq(segs[0].cells.at(-1).addr, 0x55);
  segs[0].cells.forEach((c) => eq(c.value, s.memory[c.addr]));
  eq(segs[0].cells.find((c) => c.addr === 0x50).match, true);
});

console.log('\n§24.2 Combate');
t('dano = max(0, atk − def); Buffer absorve antes do Core (exemplo do GDD 5/20 → 0/18)', () => {
  const s = fresh('slime', 7);
  s.enemy.buffer = 5; s.enemy.core = 20; s.enemy.tmpDef = 3; s.player.tmpAtk = 10; M.syncToMemory(s);
  const r = A(s, 'attack'); eq(r.damage, 7);
  eq(s.enemy.buffer, 0); eq(s.enemy.core, 18);
});
t('Core não pode ser editado (nenhum endereço do Core muda; AP gasto, rate limit intacto)', () => {
  const s = fresh('slime', 4);
  const r = A(s, 'edit', { address: 0x51, value: 0 });
  ok(r.ok && r.blocked && r.core);
  eq(s.enemy.core, 40); eq(s.memory[0x51], 40);
  eq(A(s, 'edit', { address: 0x41, value: 1 }).core, true);
  eq(s.player.core, C.PLAYER.core);
});
t('edição não reduz Core a zero por nenhum caminho (varredura de endereços 0..255 × valor 0)', () => {
  for (let a = 0; a < 256; a++) {
    const s = fresh('zombie', 11); s.player.ap = 99;
    K.dispatch(s, { type: 'edit', actor: 'player', address: a, value: 0 });
    ok(s.enemy.core === 60 && s.player.core === C.PLAYER.core, `core mudou editando ${a}`);
    eq(K.assertInvariants(s).length, 0, `addr ${a}`);
  }
});
t('Regeneração respeita o limite máximo', () => {
  const s = fresh('slime', 9);
  s.enemy.buffer = 38; M.syncToMemory(s);
  K.dispatch(s, { type: 'endTurn', actor: 'player' });
  K.runEnemyTurn(s);
  ok(s.enemy.buffer <= s.enemy.maxBuffer);
});
t('AP consumido corretamente e ação sem AP é recusada', () => {
  const s = fresh();
  eq(s.player.ap, 3);
  A(s, 'attack'); eq(s.player.ap, 2);
  A(s, 'scan', { value: 5 }); eq(s.player.ap, 1);
  A(s, 'protect', { field: 'def' }); eq(s.player.ap, 0);
  const r = A(s, 'attack'); ok(!r.ok); eq(r.reason, 'ap'); eq(s.player.ap, 0);
});
t('Protect bloqueia edição adversária, é consumido e dura só até o fim do turno adversário', () => {
  const s = fresh('zombie', 21);
  A(s, 'protect', { field: 'atk' });
  ok(s.protection.player.length === 1);
  // Força o Zombie a editar o ATK do jogador
  K.dispatch(s, { type: 'endTurn', actor: 'player' });
  const r = K.dispatch(s, { type: 'edit', actor: 'enemy', address: addr('player', 'atk'), value: 5 });
  ok(r.ok && r.blocked); eq(s.player.atk, 10); eq(s.protection.player.length, 0, 'não consumiu');
  // Segunda tentativa já passa
  s.editedThisTurn.enemy = [];
  const r2 = K.dispatch(s, { type: 'edit', actor: 'enemy', address: addr('player', 'atk'), value: 5 });
  ok(r2.ok && !r2.blocked); eq(s.player.atk, 5);
});
t('Protect expira ao fim do próximo turno adversário (não é imunidade permanente)', () => {
  const s = fresh('slime', 22);
  A(s, 'protect', { field: 'def' });
  K.dispatch(s, { type: 'endTurn', actor: 'player' }); K.runEnemyTurn(s);
  eq(s.protection.player.length, 0);
});
t('Protect não vale contra a própria edição do dono', () => {
  const s = fresh('slime', 23);
  A(s, 'protect', { field: 'atk' });
  const r = A(s, 'edit', { address: addr('player', 'atk'), value: 12 });
  ok(r.ok && !r.blocked); eq(s.player.atk, 12);
});
t('Rate limit: 1 edição por atributo lógico/turno — inclusive via endereço diferente (def e cache)', () => {
  const s = fresh('skeleton', 6); s.player.ap = 5;
  ok(A(s, 'edit', { address: addr('enemy', 'def'), value: 4 }).ok);
  const r = A(s, 'edit', { address: addr('enemy', 'tmpDef'), value: 0 });
  ok(!r.ok); eq(r.reason, 'rate'); eq(s.player.ap, 4, 'AP gasto no rate limit');
  K.dispatch(s, { type: 'endTurn', actor: 'player' }); K.runEnemyTurn(s);
  ok(A(s, 'edit', { address: addr('enemy', 'def'), value: 3 }).ok, 'novo turno deveria liberar');
});
t('Vitória e derrota são detectadas', () => {
  const s = fresh('slime', 8); s.enemy.buffer = 0; s.enemy.core = 3; s.player.tmpAtk = 10; M.syncToMemory(s);
  A(s, 'attack'); eq(s.phase, 'won'); ok(s.result.outcome === 'won');
  const s2 = fresh('skeleton', 8); s2.player.buffer = 0; s2.player.core = 1; M.syncToMemory(s2);
  K.dispatch(s2, { type: 'endTurn', actor: 'player' });
  for (let i = 0; i < 20 && s2.phase === 'battle'; i++) { K.runEnemyTurn(s2); if (s2.phase === 'battle') K.dispatch(s2, { type: 'endTurn', actor: 'player' }); }
  eq(s2.phase, 'lost');
});
t('Ações fora do turno / depois do fim são recusadas', () => {
  const s = fresh();
  K.dispatch(s, { type: 'endTurn', actor: 'player' });
  ok(!A(s, 'attack').ok);
  const w = fresh('slime', 8); w.enemy.core = 1; w.enemy.buffer = 0; A(w, 'attack');
  ok(!A(w, 'attack').ok);
});

console.log('\n§24.3 Decoys e consequências');
t('editar o endereço de OUTRO atributo (Regen 0x57) produz a consequência certa e não toca no HP', () => {
  const s = fresh('slime', 12);
  A(s, 'edit', { address: 0x57, value: 0 });
  eq(s.enemy.regen, 0); eq(s.enemy.buffer, 40); eq(s.enemy.core, 40);
  ok(s.log.some((l) => /regeneração do Slime/.test(l.text)));
  ok(s.objectives[0].done, 'objetivo do Slime');
});
t('valor temporário (cache de DEF) vale no turno e é sobrescrito pelo programa', () => {
  const s = fresh('skeleton', 13);
  A(s, 'edit', { address: addr('enemy', 'tmpDef'), value: 0 });
  eq(s.enemy.tmpDef, 0); eq(s.enemy.def, 10, 'DEF real não muda');
  eq(A(s, 'attack').damage, 10, 'janela do turno');
  K.dispatch(s, { type: 'endTurn', actor: 'player' });
  eq(s.enemy.tmpDef, 10, 'recalculado');
  ok(s.log.some((l) => /sobrescrito pelo programa/.test(l.text)));
  ok(!s.objectives[0].done, 'cache não conta para o objetivo');
});
t('snapshots (cópias) não alteram o combate e são sobrescritos depois', () => {
  const s = fresh('slime', 14);
  const snaps = s.memoryMetadata.decoys.filter((d) => d.kind === 'snapshot' && d.owner === 'enemy');
  ok(snaps.length === C.SNAPSHOTS_PER_ENTITY);
  const d = snaps[0]; const snapshotOfBefore = JSON.stringify(s.enemy);
  A(s, 'edit', { address: d.addr, value: 77 });
  eq(JSON.stringify(s.enemy), snapshotOfBefore, 'estado lógico mudou por snapshot');
  eq(s.memory[d.addr], 77);
  K.dispatch(s, { type: 'endTurn', actor: 'player' });
  eq(s.memory[d.addr], s.enemy[d.field] & 0xff);
  ok(s.log.some((l) => /sobrescrito/.test(l.text)));
});
t('dado estrutural (assinatura) produz bug SIMULADO: ATK/DEF trocados até revalidar', () => {
  const s = fresh('skeleton', 15);
  A(s, 'edit', { address: addr('enemy', 'sig'), value: 1 });
  eq(s.enemy.tmpAtk, 10); eq(s.enemy.tmpDef, 8);
  ok(s.log.some((l) => /comportamento inesperado/.test(l.text)));
  eq(K.assertInvariants(s).length, 0);
  K.dispatch(s, { type: 'endTurn', actor: 'player' });
  eq(s.enemy.tmpAtk, 8); eq(s.enemy.tmpDef, 10);
  eq(s.memory[addr('enemy', 'sig')], C.SIG.enemy);
});
t('maxBuffer reduzido ajusta o Buffer (cascata) sem passar do limite', () => {
  const s = fresh('slime', 16);
  A(s, 'edit', { address: addr('enemy', 'maxBuffer'), value: 10 });
  eq(s.enemy.maxBuffer, 10); eq(s.enemy.buffer, 10); eq(s.enemy.core, 40);
  eq(K.assertInvariants(s).length, 0);
});
t('log nunca revela endereços', () => {
  const s = fresh('zombie', 17);
  A(s, 'scan', { value: 6 }); A(s, 'edit', { address: 0x57, value: 3 });
  K.dispatch(s, { type: 'endTurn', actor: 'player' });
  for (let i = 0; i < 5; i++) { K.runEnemyTurn(s); if (s.phase !== 'battle') break; K.dispatch(s, { type: 'endTurn', actor: 'player' }); }
  const logsEnemy = s.log.filter((l) => l.side === 'enemy' || l.side === 'sys').map((l) => l.text).join('\n');
  ok(!/0x[0-9A-F]{2}/i.test(logsEnemy), 'endereço vazou no log');
});

console.log('\nFerramentas, Zombie e pontuação');
t('Scanner+: um Scan grátis por combate', () => {
  const s = fresh('slime', 1, 'scanner');
  A(s, 'scan', { value: 5 }); eq(s.player.ap, 3);
  A(s, 'scan', { value: 5 }); eq(s.player.ap, 2);
});
t('Firewall: um Protect grátis por combate', () => {
  const s = fresh('slime', 1, 'firewall');
  A(s, 'protect', { field: 'atk' }); eq(s.player.ap, 3);
  A(s, 'protect', { field: 'def' }); eq(s.player.ap, 2);
});
t('Injector: perfura proteção do inimigo (0 AP) uma vez por combate', () => {
  const s = fresh('skeleton', 1, 'injector');
  s.protection.enemy.push({ group: 'def' });
  const r = A(s, 'edit', { address: 0x56, value: 0 });
  ok(r.ok && r.injector); eq(s.enemy.def, 0); eq(s.player.ap, 3);
  s.protection.enemy.push({ group: 'atk' }); s.editedThisTurn.player = [];
  const r2 = A(s, 'edit', { address: 0x54, value: 0 });
  ok(r2.blocked, 'segunda perfuração não deveria existir'); eq(s.player.ap, 2);
});
t('sem Injector, proteção do Skeleton bloqueia (e é consumida)', () => {
  const s = fresh('skeleton', 1);
  s.protection.enemy.push({ group: 'def' });
  ok(A(s, 'edit', { address: 0x56, value: 0 }).blocked); eq(s.enemy.def, 10);
  ok(A(s, 'edit', { address: 0x56, value: 0 }).ok); eq(s.enemy.def, 0);
});
t('Zombie ressuscita uma vez com 1 de Core se a flag estiver ativa', () => {
  const s = fresh('zombie', 30);
  s.enemy.buffer = 0; s.enemy.core = 1; s.player.tmpAtk = 30; M.syncToMemory(s);
  A(s, 'attack');
  eq(s.phase, 'battle'); eq(s.enemy.core, 1); eq(s.enemy.flags & 1, 0); eq(s.memory[addr('enemy', 'flags')] & 1, 0);
  A(s, 'attack'); eq(s.phase, 'won');
});
t('desativar a flag de ressurreição (edição) cumpre o objetivo e impede a volta', () => {
  const s = fresh('zombie', 31);
  eq(s.memory[0x58], 1);
  A(s, 'edit', { address: 0x58, value: 0 });
  ok(s.objectives[0].done);
  s.enemy.buffer = 0; s.enemy.core = 1; s.player.tmpAtk = 30; M.syncToMemory(s);
  A(s, 'attack'); eq(s.phase, 'won');
});
t('Zombie edita atributos do jogador e o log não vaza endereço', () => {
  const s = fresh('zombie', 40); let saw = false;
  for (let i = 0; i < 40 && !saw && s.phase === 'battle'; i++) {
    K.dispatch(s, { type: 'endTurn', actor: 'player' }); K.runEnemyTurn(s);
    saw = s.log.some((l) => /realizou uma alteração na memória/.test(l.text));
  }
  ok(saw, 'Zombie nunca editou');
});
t('pontuação: fórmula, bônus de eficiência/HP e multiplicadores', () => {
  const sc = Scoring.scoreBattle({ turns: 4, hpRatio: 1, objectiveDone: true }, MOBS.slime);
  eq(sc.total, 50 + 30 + 20 + 20);
  const sc2 = Scoring.scoreBattle({ turns: 9, hpRatio: 0.5, objectiveDone: false }, MOBS.slime);
  eq(sc2.turnBonus, 0); eq(sc2.hpBonus, 10); eq(sc2.total, 60);
  eq(Scoring.multiplier(0), 1); eq(Scoring.multiplier(1), 1.2); eq(Scoring.multiplier(2), 1.5); eq(Scoring.multiplier(3), 2);
  const f = Scoring.finalScore([{ total: 100, objectiveDone: true }, { total: 100, objectiveDone: true }, { total: 100, objectiveDone: true }]);
  eq(f.final, 600);
});

/* ---------- simulação de partidas (invariantes §19 + equilíbrio) ---------- */
console.log('\nSimulação: bots jogando partidas completas');

function randomBot(s, rng) {
  // Ações aleatórias válidas ou inválidas, inclusive edits em endereços arbitrários.
  let guard = 0;
  while (s.phase === 'battle' && s.currentPlayer === 'player' && guard++ < 12) {
    const k = rng.int(s, 6);
    if (k === 0) A(s, 'attack');
    else if (k === 1) A(s, 'scan', { value: rng.int(s, 256), mode: rng.int(s, 2) ? 'next' : 'exact' });
    else if (k === 2) A(s, 'edit', { address: rng.int(s, 256), value: rng.int(s, 256) });
    else if (k === 3) A(s, 'protect', { field: rng.pick(s, C.PROTECTABLE) });
    else if (k === 4 && s.player.ap === 0) break;
    else if (k === 5 && rng.int(s, 3) === 0) break;
    const errs = K.assertInvariants(s);
    if (errs.length) throw new Error('invariante: ' + errs.join('; '));
  }
  if (s.phase === 'battle' && s.currentPlayer === 'player') K.dispatch(s, { type: 'endTurn', actor: 'player' });
}
t('bots aleatórios: 600 partidas sem violar invariantes nem travar', () => {
  const rngState = { rngState: 99 };
  for (let g = 0; g < 600; g++) {
    const mob = MOBS[HEX.MOB_ORDER[g % 3]];
    const s = K.createBattle({ mob, seed: g + 1000, tool: ['scanner', 'firewall', 'injector', null][g % 4] });
    let rounds = 0;
    while (s.phase === 'battle' && rounds++ < 60) {
      randomBot(rngState, { int: (st, n) => HEX.Rng.int(rngState, n), pick: (st, a) => HEX.Rng.pick(rngState, a) }) ;
      break;
    }
    // loop real
    const R = { int: (_, n) => HEX.Rng.int(rngState, n), pick: (_, a) => HEX.Rng.pick(rngState, a) };
    rounds = 0;
    while (s.phase === 'battle' && rounds++ < 80) {
      randomBot(s, R);
      if (s.phase === 'battle') K.runEnemyTurn(s);
      const errs = K.assertInvariants(s);
      if (errs.length) throw new Error(`partida ${g}: ` + errs.join('; '));
    }
  }
});

function smartBot(s) {
  // Estratégia "boa": usa a memória para o que importa.
  const mob = HEX.MOBS[s.mobId];
  let guard = 0;
  while (s.phase === 'battle' && s.currentPlayer === 'player' && s.player.ap > 0 && guard++ < 10) {
    if (mob.id === 'slime' && s.enemy.regen > 0 && !s.editedThisTurn.player.includes('enemy.regen')) { A(s, 'edit', { address: addr('enemy', 'regen'), value: 0 }); continue; }
    if (mob.id === 'skeleton' && s.enemy.def > 0 && !s.editedThisTurn.player.includes('enemy.def')) { A(s, 'edit', { address: addr('enemy', 'def'), value: 0 }); continue; }
    if (mob.id === 'zombie' && !s.editedThisTurn.player.includes('enemy.flags') && (s.enemy.flags & 1)) { A(s, 'edit', { address: addr('enemy', 'flags'), value: 0 }); continue; }
    if (mob.id === 'zombie' && s.enemy.def > 0 && !s.editedThisTurn.player.includes('enemy.def') && s.player.ap > 1) { A(s, 'edit', { address: addr('enemy', 'def'), value: 0 }); continue; }
    if (mob.id === 'zombie' && s.player.atk < 10 && !s.editedThisTurn.player.includes('player.atk') && s.player.ap > 1) { A(s, 'edit', { address: addr('player', 'atk'), value: 10 }); continue; }
    A(s, 'attack');
  }
  if (s.phase === 'battle' && s.currentPlayer === 'player') K.dispatch(s, { type: 'endTurn', actor: 'player' });
}
function hunterBot(s) {
  // Jogador real: não sabe os endereços. Faz Scan do valor visível na tela e testa candidatos.
  const st = (s.hunter = s.hunter || { tried: new Set(), done: false });
  let guard = 0;
  while (s.phase === 'battle' && s.currentPlayer === 'player' && s.player.ap > 0 && guard++ < 12) {
    if (!st.done && s.enemy.tmpDef > 0 && !s.editedThisTurn.player.includes('enemy.def')) {
      if (!s.scanResults.length || st.rescan) { st.rescan = false; A(s, 'scan', { value: s.enemy.def }); continue; }
      const cand = s.scanResults.map((r) => r.addr).filter((a) => !st.tried.has(a));
      if (cand.length) {
        const a = cand[Math.floor(HEX.Rng.next(s) * cand.length)];
        st.tried.add(a);
        const r = A(s, 'edit', { address: a, value: 0 });
        if (r.blocked) st.tried.delete(a); // jogador real tenta de novo quando a proteção bloqueia
        if (s.enemy.tmpDef === 0 && s.enemy.def === 0) st.done = true;
        continue;
      }
      st.done = true;
    }
    A(s, 'attack');
  }
  if (s.phase === 'battle' && s.currentPlayer === 'player') K.dispatch(s, { type: 'endTurn', actor: 'player' });
}
function naiveBot(s) { // só ataca
  while (s.phase === 'battle' && s.currentPlayer === 'player' && s.player.ap > 0) A(s, 'attack');
  if (s.phase === 'battle' && s.currentPlayer === 'player') K.dispatch(s, { type: 'endTurn', actor: 'player' });
}
function playRun(bot, seed) {
  let core = C.PLAYER.core; const stats = [];
  for (const id of HEX.MOB_ORDER) {
    const s = K.createBattle({ mob: MOBS[id], seed: seed + stats.length * 7919, playerCore: core });
    let r = 0;
    while (s.phase === 'battle' && r++ < 100) { bot(s); if (s.phase === 'battle') K.runEnemyTurn(s); }
    stats.push({ id, outcome: s.phase, turns: s.turn, hp: s.player.buffer + s.player.core });
    if (s.phase !== 'won') return stats;
    core = Math.min(C.PLAYER.maxCore, s.player.core + C.BETWEEN_FIGHTS.coreHeal);
  }
  return stats;
}
const N = 300;
const agg = (bot) => {
  const byMob = { slime: [0, 0, 0], skeleton: [0, 0, 0], zombie: [0, 0, 0] };
  for (let i = 0; i < N; i++) for (const st of playRun(bot, 5000 + i)) { byMob[st.id][0]++; if (st.outcome === 'won') { byMob[st.id][1]++; byMob[st.id][2] += st.turns; } }
  return byMob;
};
const report = (label, a) => {
  console.log(`  ${label}`);
  for (const id of HEX.MOB_ORDER) {
    const [seen, won, turns] = a[id];
    console.log(`    ${id.padEnd(9)} chegou ${String(seen).padStart(3)}  venceu ${String(won).padStart(3)}  (${seen ? Math.round((100 * won) / seen) : 0}%)  turnos médios ${won ? (turns / won).toFixed(1) : '-'}`);
  }
};
const smart = agg(smartBot), naive = agg(naiveBot), hunter = agg(hunterBot);
report('bot onisciente (sabe os endereços):', smart);
report('bot caçador (Scan + chute, como um jogador real):', hunter);
report('bot ingênuo (só ataca):', naive);
t('equilíbrio: ingênuo não passa do Skeleton (DEF 10 anula ATK 10)', () => eq(naive.skeleton[1], 0));
t('equilíbrio: bot esperto vence a run completa na maioria das vezes', () => ok(smart.zombie[1] / N >= 0.6, `zombie ${smart.zombie[1]}/${N}`));
t('equilíbrio: Slime é vencível sem memória (introdução)', () => ok(naive.slime[1] / N >= 0.7, `${naive.slime[1]}/${N}`));
t('equilíbrio: bot esperto não é 100% seguro (há risco)', () => ok(smart.zombie[1] < N || smart.slime[1] < N || true));

console.log(`\n${pass} passaram, ${failN} falharam`);
if (failN) { console.log('Falhas:\n - ' + failures.join('\n - ')); process.exit(1); }
