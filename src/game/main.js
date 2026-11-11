/* HEXploit — main.js
 * Fluxo de telas e ligação entre interface e motor. Só aqui UI e regras se encontram:
 * a UI manda comandos (Combat.dispatch) e redesenha a partir do estado.
 */
(function (G) {
  'use strict';
  const HEX = G.HEX;
  const C = HEX.CONFIG, K = HEX.Combat, R = HEX.Render, Sc = HEX.Scoring;
  const { $, esc } = R;
  const root = document.getElementById('app');

  const ctx = { busy: false, selected: null, prevMem: null };
  let run = null;      // { stage, tool, entries[], core }
  let state = null;    // combate atual
  let tut = null;      // tutorial (ou null)
  let timers = [];

  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* ------------------------------ telas simples ------------------------------ */

  function screen(html, cls) {
    clearTimers();
    state = null; tut = null; ctx.busy = false; ctx.selected = null; ctx.prevMem = null;
    root.innerHTML = `<div class="screen ${cls || ''}">${html}</div>`;
  }

  function showTitle() {
    let best = 0;
    try { best = +localStorage.getItem('hexploit.best') || 0; } catch (e) { /* sem storage */ }
    screen(`
      <pre class="logo" aria-label="HEXploit">╦ ╦╔═╗═╗ ╦╔═╗╦  ╔═╗╦╔╦╗
╠═╣║╣ ╔╩╦╝╠═╝║  ║ ║║ ║
╩ ╩╚═╝╩ ╚═╩  ╩═╝╚═╝╩ ╩</pre>
      <p class="tag">Um RPG medieval em que o Grid é a arma.</p>
      <div class="menu">
        <button class="act primary big" id="m-play">⚔ Boss Rush</button>
        <button class="act big" id="m-tut">🧙 Tutorial</button>
        <button class="ghost" id="m-how">Como jogar</button>
      </div>
      ${best ? `<p class="dim">Melhor pontuação: <b>${best}</b></p>` : ''}
      <p class="dim small">v0.1 — MVP · client-side</p>`, 'title');
    $('#m-play').onclick = () => showIntro();
    $('#m-tut').onclick = startTutorial;
    $('#m-how').onclick = showHow;
  }

  function showHow() {
    screen(`
      <h2>Como jogar</h2>
      <div class="panel prose">
        <p>🎯 <b>Objetivo:</b> derrote Slime, Skeleton e Zombie em sequência. Cada vitória dá pontos.</p>
        <p>⏱ <b>Turnos:</b> você tem <b>3 AP</b> por turno. Attack, Scan, Edit e Protect custam 1 AP cada.</p>
        <p>🛡 <b>Buffer e Core:</b> o dano gasta primeiro o Buffer (escudo, editável) e depois o Core (vida real, <b>não</b> editável).</p>
        <p>🔍 <b>Scan:</b> pesquise um valor que você vê na tela (ex.: a DEF do inimigo). O Grid devolve todos os endereços que guardam esse número.</p>
        <p>✏️ <b>Edit:</b> escolha um endereço e escreva um valor. Se for o atributo certo, o combate muda de verdade. Se não for, algo <i>outro</i> muda, e isso também é informação.</p>
        <p>🧩 <b>Dica:</b> os atributos de cada criatura moram juntos. Olhe os bytes vizinhos.</p>
        <p>🔒 <b>Protect:</b> impede uma edição adversária num atributo escolhido, até o fim do próximo turno do inimigo.</p>
        <p>🏆 <b>Objetivos opcionais</b> dão bônus e multiplicam a pontuação final.</p>
        <p class="dim">Valores: decimal (<code>40</code>) ou hexadecimal (<code>0x28</code>). Endereços: <code>0x54</code> ou <code>54</code>.</p>
      </div>
      <button class="act primary" id="back">Voltar</button>`);
    $('#back').onclick = showTitle;
  }

  function showIntro() {
    screen(`
      <h2>🏰 Prólogo</h2>
      <div class="panel prose story">
        <p>Você é um herói de <b>nível 1</b>. Só tem um probleminha: <i>preguiça de farmar</i>.</p>
        <p>Com a missão de derrotar o Demon Lord nas costas, você procura o misterioso <b>🧙 CheatWizard</b>, que revela o segredo do mundo: o <b>Grid</b>, a memória onde moram todos os números.</p>
        <p>Com esse conhecimento você derrotou o Demon Lord. Mas ele voltou ao castelo, estudou o Grid, e agora ensina hacking aos seus subordinados.</p>
        <p>Slime, Skeleton e Zombie já estão no caminho. Escolha sua ferramenta e boa sorte.</p>
      </div>
      <div class="row"><button class="ghost" id="back">Voltar</button><button class="act primary" id="go">Escolher ferramenta →</button></div>`);
    $('#back').onclick = showTitle;
    $('#go').onclick = showToolPick;
  }

  function showToolPick() {
    screen(`
      <h2>🧰 Escolha sua ferramenta</h2>
      <p class="dim">Cada ferramenta dá um uso gratuito por combate.</p>
      <div class="tools">${HEX.TOOL_ORDER.map((id) => {
        const t = HEX.TOOLS[id];
        return `<button class="toolcard" data-tool="${id}"><div class="ticon">${t.emoji}</div><div class="tname">${esc(t.name)}</div><div class="tprof">${esc(t.profile)}</div><div class="tdesc">${esc(t.desc)}</div></button>`;
      }).join('')}</div>
      <button class="ghost" id="back">Voltar</button>`);
    $('#back').onclick = showIntro;
    root.querySelectorAll('.toolcard').forEach((b) => (b.onclick = () => startRun(b.dataset.tool)));
  }

  /* ------------------------------ run ------------------------------ */

  function startRun(tool) {
    run = { stage: 0, tool, entries: [], core: C.PLAYER.core, tutorial: false };
    showStageIntro();
  }

  function showStageIntro() {
    const mob = HEX.MOBS[HEX.MOB_ORDER[run.stage]];
    screen(`
      <div class="stagehead">Batalha ${run.stage + 1} de ${HEX.MOB_ORDER.length}</div>
      <div class="bigsprite">${mob.emoji}</div>
      <h2>${esc(mob.name)}</h2>
      <p class="story">${esc(mob.intro)}</p>
      <div class="panel small"><b>Objetivo opcional (+${C.SCORE.objective} pts e multiplicador):</b> ${esc(mob.objective.text)}</div>
      <button class="act primary big" id="fight">Lutar!</button>`);
    $('#fight').onclick = () => startBattle(mob, false);
  }

  function startTutorial() {
    run = { stage: 0, tool: null, entries: [], core: C.PLAYER.core, tutorial: true };
    startBattle(HEX.MOBS.dummy, true);
  }

  function startBattle(mob, isTutorial) {
    clearTimers();
    R.buildBattleScreen(root);
    ctx.busy = false; ctx.selected = null; ctx.prevMem = null;
    state = K.createBattle({
      mob, tutorial: isTutorial, tool: run.tool, playerCore: run.core,
      seed: isTutorial ? HEX.Tutorial.SEED : undefined,
    });
    tut = isTutorial ? HEX.Tutorial.create(state) : null;
    state.listeners.push(onEvent);
    $('#hud-stage').textContent = isTutorial ? '🧙 Tutorial' : `Batalha ${run.stage + 1}/${HEX.MOB_ORDER.length} · ${mob.name}`;
    bindBattle();
    refresh();
  }

  function onEvent(ev) {
    if (ev.type === 'won' || ev.type === 'lost') later(finishBattle, 900);
  }

  /* ------------------------------ interação ------------------------------ */

  function say(msg, bad) {
    const el = $('#status');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'status' + (bad ? ' bad' : '');
    const m = $('#memmsg');
    if (m) { m.textContent = msg ? (bad ? '⚠ ' : '') + msg : ''; m.className = 'memmsg' + (bad ? ' bad' : ''); }
  }

  function refresh() {
    if (!state) return;
    R.renderBattle(state, ctx);
    R.renderMemory(state, ctx);
    R.renderTutor(tut, state);
    R.renderFx(state);
    bindDynamic();
  }

  function act(action) {
    if (!state || ctx.busy || state.currentPlayer !== 'player') return null;
    const r = K.dispatch(state, action);
    say(r.ok ? '' : r.message, !r.ok);
    refresh();
    return r;
  }

  function selectAddr(a) {
    ctx.selected = a;
    $('#edit-addr').value = HEX.util.hex(a);
    R.renderMemory(state, ctx);
    bindDynamic();
    $('#edit-value').focus();
  }

  function bindDynamic() {
    root.querySelectorAll('#memview [data-addr]').forEach((b) => (b.onclick = () => selectAddr(+b.dataset.addr)));
    const next = $('#tut-next'); if (next) next.onclick = () => { HEX.Tutorial.advance(tut); refresh(); };
    const skip = $('#tut-skip'); if (skip) skip.onclick = () => { if (confirm('Pular o tutorial e voltar ao menu?')) showTitle(); };
    // fim do tutorial: botão final
    if (tut && tut.done && next) next.onclick = () => showTitle();
  }

  function bindBattle() {
    $('#btn-attack').onclick = () => act({ type: 'attack' });
    $('#btn-protect').onclick = () => act({ type: 'protect', field: $('#protect-field').value });
    $('#btn-end').onclick = endPlayerTurn;
    $('#btn-quit').onclick = () => { if (confirm('Abandonar a partida e voltar ao menu?')) showTitle(); };
    $('#scan-form').onsubmit = (e) => {
      e.preventDefault();
      const r = act({ type: 'scan', value: $('#scan-value').value, mode: $('#scan-mode').value });
      if (r && r.ok) { const m = $('#memmsg'); if (m) { m.textContent = `✔ ${r.count} endereço(s) com o valor ${r.value}. Veja os resultados abaixo.`; m.className = 'memmsg ok'; } }
    };
    $('#edit-form').onsubmit = (e) => {
      e.preventDefault();
      const r = act({ type: 'edit', address: $('#edit-addr').value, value: $('#edit-value').value });
      if (r && r.ok) $('#edit-value').value = '';
    };
    document.onkeydown = (e) => {
      if (!state || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
      if (e.key === 'a') $('#btn-attack').click();
      else if (e.key === 'e') $('#btn-end').click();
    };
  }

  function endPlayerTurn() {
    if (!state || ctx.busy) return;
    const r = K.dispatch(state, { type: 'endTurn', actor: 'player' });
    if (!r.ok) return;
    refresh();
    if (state.phase !== 'battle') return;
    ctx.busy = true;
    refresh();
    stepEnemy();
  }

  /** Executa o turno do inimigo uma ação por vez, para o jogador acompanhar. */
  function stepEnemy() {
    if (!state) return;
    if (state.phase !== 'battle' || state.currentPlayer !== 'enemy') { ctx.busy = false; refresh(); return; }
    const r = K.enemyStep(state);
    refresh();
    if (state.phase !== 'battle') { ctx.busy = false; return; }
    if (r.done) { ctx.busy = false; refresh(); return; }
    later(stepEnemy, 750);
  }

  /* ------------------------------ fim de batalha ------------------------------ */

  function finishBattle() {
    if (!state) return;
    const res = state.result;
    const mob = HEX.MOBS[state.mobId];
    if (run.tutorial) {
      if (res.outcome === 'won') { tut && (tut.done = true); refresh(); } else { showTitle(); }
      if (res.outcome === 'won') { later(() => { /* aguarda o jogador ler o card final */ }, 0); }
      return;
    }
    if (res.outcome === 'lost') return showResult(false);
    const entry = Sc.scoreBattle(res, mob);
    run.entries.push(entry);
    run.core = Math.min(C.PLAYER.maxCore, state.player.core + C.BETWEEN_FIGHTS.coreHeal);
    if (run.stage + 1 >= HEX.MOB_ORDER.length) return showResult(true);
    showBetween(entry);
  }

  function breakdownRows(entries) {
    return entries.map((e) => `<tr><td>${esc(e.name)}</td><td>${e.base}</td><td>${e.objectiveBonus || '–'}${e.objectiveDone ? ' 🏆' : ''}</td><td>${e.turnBonus} <small class="dim">(${e.turns}t/par ${e.par})</small></td><td>${e.hpBonus}</td><td><b>${e.total}</b></td></tr>`).join('');
  }
  const TABLE_HEAD = '<thead><tr><th>Inimigo</th><th>Base</th><th>Objetivo</th><th>Eficiência</th><th>HP</th><th>Total</th></tr></thead>';

  function showBetween(entry) {
    const mob = HEX.MOBS[HEX.MOB_ORDER[run.stage]];
    screen(`
      <h2>🏆 ${esc(mob.name)} derrotado!</h2>
      <table class="score">${TABLE_HEAD}<tbody>${breakdownRows([entry])}</tbody></table>
      <p class="dim">Você recupera ${C.BETWEEN_FIGHTS.coreHeal} de Core entre batalhas. Core atual: <b>${run.core}/${C.PLAYER.maxCore}</b>. Suas ferramentas se recarregam.</p>
      <button class="act primary big" id="next">Próximo inimigo →</button>`);
    $('#next').onclick = () => { run.stage++; showStageIntro(); };
  }

  function showResult(victory) {
    const entries = run.entries;
    const f = Sc.finalScore(entries);
    let best = 0;
    try { best = +localStorage.getItem('hexploit.best') || 0; if (f.final > best) { localStorage.setItem('hexploit.best', String(f.final)); best = f.final; } } catch (e) { /* sem storage */ }
    const fell = victory ? null : HEX.MOBS[HEX.MOB_ORDER[run.stage]];
    screen(`
      <h2>${victory ? '👑 Vitória! O caminho até o Demon Lord está aberto' : '☠️ Você caiu'}</h2>
      ${victory ? '' : `<p class="story">${esc(fell.name)} foi mais esperto desta vez. O Grid não perdoa quem edita sem observar.</p>`}
      ${entries.length ? `<table class="score">${TABLE_HEAD}<tbody>${breakdownRows(entries)}</tbody></table>` : '<p class="dim">Nenhuma batalha vencida.</p>'}
      <div class="panel final">
        <div>Soma: <b>${f.sum}</b></div>
        <div>Objetivos concluídos: <b>${f.objectivesDone}/${HEX.MOB_ORDER.length}</b> → multiplicador <b>×${f.multiplier.toFixed(1)}</b></div>
        <div class="big">Pontuação final: <b>${f.final}</b></div>
        <div class="dim">Melhor: ${best}</div>
      </div>
      <div class="row"><button class="ghost" id="menu">Menu</button><button class="act primary" id="again">Jogar de novo</button></div>`);
    $('#menu').onclick = showTitle;
    $('#again').onclick = showToolPick;
  }

  /* ------------------------------ início ------------------------------ */
  showTitle();
})(window);
