/* HEXploit — render.js
 * Recebe o estado e o desenha. Não decide regras de jogo.
 * Duas áreas: BATALHA (em cima) e GRID HEXADECIMAL (embaixo), ambas em ASCII + emojis.
 */
(function (G) {
  'use strict';
  const HEX = (G.HEX = G.HEX || {});
  const C = HEX.CONFIG;
  const { hex, hex2 } = HEX.util;
  const M = HEX.Memory;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bar = (cur, max, len) => {
    const n = max > 0 ? Math.round((len * Math.max(0, cur)) / max) : 0;
    return '█'.repeat(n) + '░'.repeat(len - n);
  };

  const HERO_ART = ['    O     ', '  --|\\==> ', '   / \\    '];

  const PROTECT_LABELS = { buffer: 'Buffer', atk: 'Attack', def: 'Defense', regen: 'Regen', maxBuffer: 'Buffer máx' };

  /* ---------------- esqueleto da tela de batalha ---------------- */

  function buildBattleScreen(root) {
    root.innerHTML = `
    <div class="game">
      <div class="topbar">
        <span class="brand">HEX<b>ploit</b></span>
        <span class="hud" id="hud-stage"></span>
        <span class="hud" id="hud-turn"></span>
        <span class="hud" id="hud-tool"></span>
        <span class="spacer"></span>
        <button class="ghost" id="btn-quit" title="Voltar ao menu">✕ Sair</button>
      </div>
      <aside id="tutor" class="tutor hidden"></aside>
      <section class="battle" id="battle">
        <div class="arena">
          <div class="card hero" id="hero-card"><div class="card-body"></div><div class="floats"></div></div>
          <div class="middle">
            <div class="vs">⚔ VS ⚔</div>
            <div class="ap" id="ap"></div>
            <div class="actions">
              <button class="act" id="btn-attack">⚔ Attack <small>1 AP</small></button>
              <span class="protect-group">
                <select id="protect-field" aria-label="Atributo a proteger">${C.PROTECTABLE.map((k) => `<option value="${k}">${PROTECT_LABELS[k]}</option>`).join('')}</select>
                <button class="act" id="btn-protect">🛡 Protect <small>1 AP</small></button>
              </span>
              <button class="act end" id="btn-end">⏭ Encerrar turno</button>
            </div>
            <div class="status" id="status" role="status"></div>
          </div>
          <div class="card foe" id="foe-card"><div class="card-body"></div><div class="floats"></div></div>
        </div>
        <div class="log" id="log" aria-live="polite"></div>
      </section>
      <section class="memory" id="memory">
        <div class="memtools">
          <form class="memtool scanform" id="scan-form" autocomplete="off">
            <div class="tool-title">🔍 Scan</div>
            <input id="scan-value" inputmode="numeric" placeholder="valor (ex: 40 ou 0x28)" aria-label="Valor a pesquisar">
            <select id="scan-mode" aria-label="Tipo de pesquisa">
              <option value="exact">Memória inteira</option>
              <option value="next">Refinar resultados</option>
            </select>
            <button class="act" id="btn-scan" type="submit">Scan <small>1 AP</small></button>
          </form>
          <form class="memtool editform" id="edit-form" autocomplete="off">
            <div class="tool-title">✏️ Edit</div>
            <input id="edit-addr" placeholder="endereço (ex: 0x54)" aria-label="Endereço">
            <input id="edit-value" inputmode="numeric" placeholder="novo valor" aria-label="Novo valor">
            <button class="act" id="btn-edit" type="submit">Edit <small>1 AP</small></button>
            <span class="edit-hint" id="edit-hint"></span>
          </form>
        </div>
        <div class="memmsg" id="memmsg" role="status"></div>
        <div class="memview" id="memview"></div>
      </section>
    </div>`;
  }

  /* ---------------- batalha ---------------- */

  function cardHTML(state, side, mobDef) {
    const e = state[side];
    const isHero = side === 'player';
    const art = isHero ? HERO_ART : mobDef.art;
    const emoji = isHero ? '🤺' : mobDef.emoji;
    const prot = state.protection[side];
    let chips = '';
    if (isHero) chips = prot.map((p) => `<span class="chip prot">🛡 ${esc(PROTECT_LABELS[p.group])}</span>`).join('');
    else if (prot.length) chips = '<span class="chip prot">🛡 proteção ativa</span>';
    const tmp = (eff, real) => (eff !== real ? ` <i class="tmp" title="valor temporário">(${eff})</i>` : '');
    const atk = e.tmpAtk, def = e.tmpDef;
    return `
      <div class="nameplate">${emoji} ${esc(e.name)}</div>
      <div class="sprite"><div class="emoji">${emoji}</div><pre class="ascii">${esc(art.join('\n'))}</pre></div>
      <div class="barrow"><span class="lbl">🛡 Buffer</span><span class="bar buf">${bar(e.buffer, e.maxBuffer, 16)}</span><span class="num">${e.buffer}/${e.maxBuffer}</span></div>
      <div class="barrow"><span class="lbl">❤ Core</span><span class="bar core">${bar(e.core, e.maxCore, 16)}</span><span class="num">${e.core}/${e.maxCore}</span></div>
      <div class="stats"><span>⚔ ATK <b>${atk}</b></span><span>🧱 DEF <b>${def}</b></span><span>✚ REGEN <b>${e.regen}</b></span></div>
      <div class="chips">${chips}</div>`;
  }

  function renderBattle(state, ctx) {
    const mob = HEX.MOBS[state.mobId];
    $('#hero-card .card-body').innerHTML = cardHTML(state, 'player', mob);
    $('#foe-card .card-body').innerHTML = cardHTML(state, 'enemy', mob);

    const p = state.player;
    $('#hud-turn').textContent = `Turno ${state.turn} · ${state.currentPlayer === 'player' ? 'sua vez' : `vez de ${state.enemy.name}`}`;
    $('#ap').innerHTML = `<span class="aplabel">AP</span> <span class="pips">${'●'.repeat(p.ap)}${'○'.repeat(Math.max(0, p.maxAP - p.ap))}</span> <span class="num">${p.ap}/${p.maxAP}</span>`;

    const tool = state.tool && HEX.TOOLS[state.tool];
    $('#hud-tool').innerHTML = tool ? `${tool.emoji} ${esc(tool.name)}${state.usedTools.length ? ' <i>(usada)</i>' : ' <b>pronta</b>'}` : '';

    const mine = state.phase === 'battle' && state.currentPlayer === 'player' && !ctx.busy;
    const T = HEX.Tools;
    const freeScan = T.available(state, 'scan'), freeProt = T.available(state, 'protect');
    $('#btn-attack').disabled = !mine || p.ap < 1;
    $('#btn-protect').disabled = !mine || (p.ap < 1 && !freeProt);
    $('#protect-field').disabled = !mine;
    $('#btn-end').disabled = !mine;
    $('#btn-scan').disabled = !mine || (p.ap < 1 && !freeScan);
    $('#btn-edit').disabled = !mine;
    $('#btn-protect small').textContent = freeProt ? 'grátis' : '1 AP';
    $('#btn-scan small').textContent = freeScan ? 'grátis' : '1 AP';
    const inj = T.available(state, 'edit');
    $('#edit-hint').textContent = inj ? '💉 Injector pronto: perfura uma proteção sem gastar AP.' : '';

    renderLog(state);
  }

  function renderLog(state) {
    const box = $('#log');
    const stick = box.scrollTop + box.clientHeight >= box.scrollHeight - 24;
    box.innerHTML = state.log.slice(-60).map((l) => `<div class="ln ${esc(l.tone)} ${esc(l.side)}">${esc(l.text)}</div>`).join('');
    if (stick) box.scrollTop = box.scrollHeight;
  }

  /* ---------------- memória ---------------- */

  function cellHTML(c, ctx, changed) {
    const cls = ['byte'];
    if (c.match) cls.push('match');
    if (c.touched) cls.push('touched');
    if (ctx.selected === c.addr) cls.push('selected');
    if (changed.has(c.addr)) cls.push('flash');
    return `<button type="button" class="${cls.join(' ')}" data-addr="${c.addr}" title="${hex(c.addr)} = ${c.value}">${hex2(c.value)}</button>`;
  }

  function fullGridHTML(state, ctx, changed) {
    const matches = new Set(state.scanResults.map((r) => r.addr));
    let h = '<div class="fullgrid"><div class="hexrow head"><span class="addr"></span>';
    for (let c = 0; c < 16; c++) h += `<span class="colh">${c.toString(16).toUpperCase()}</span>`;
    h += '</div>';
    for (let r = 0; r < C.MEM_SIZE / 16; r++) {
      h += `<div class="hexrow"><span class="addr">${hex(r * 16)}</span>`;
      for (let c = 0; c < 16; c++) {
        const a = r * 16 + c;
        h += cellHTML({ addr: a, value: state.memory[a], match: matches.has(a), touched: state.touchedAddrs.includes(a) }, ctx, changed);
      }
      h += '</div>';
    }
    return h + '</div>';
  }

  function neighborhoodHTML(state, ctx, changed) {
    const results = state.scanResults;
    const matchSet = new Set(results.map((r) => r.addr));
    const touchedSet = new Set(state.touchedAddrs);
    const shown = results.slice(0, C.MAX_RESULT_ROWS);
    const seeds = shown.map((r) => ({ addr: r.addr, radius: C.NEIGHBOR_RADIUS }));
    for (const a of state.touchedAddrs) seeds.push({ addr: a, radius: C.NEIGHBOR_RADIUS });
    let h = '';
    if (state.lastScan) {
      const ls = state.lastScan;
      h += `<div class="memhead">Resultados para <b>${ls.value}</b> (${hex(ls.value)}): <b>${results.length}</b> endereço(s)` +
        (results.length > shown.length ? ` — mostrando ${shown.length}; refine com “Refinar resultados”.` : '') + '</div>';
      h += '<div class="chiprow">' + shown.map((r) => `<button type="button" class="rchip${ctx.selected === r.addr ? ' selected' : ''}" data-addr="${r.addr}">${hex(r.addr)} = ${state.memory[r.addr]}</button>`).join('') + '</div>';
    } else {
      h += '<div class="memhead dim">Nenhuma pesquisa ainda. Procure um valor que você vê na tela (ex.: a DEF ou o Buffer de alguém) para localizar candidatos no Grid.</div>';
    }
    const segs = M.neighborhood(state, seeds, matchSet, touchedSet);
    if (segs.length) {
      h += '<div class="memhead">Vizinhança <span class="dim">(bytes ao redor dos candidatos e dos endereços já editados)</span></div><div class="segs">';
      for (const seg of segs) {
        // linhas alinhadas em blocos de 8
        let line = [];
        const flush = () => {
          if (!line.length) return;
          h += `<div class="hexrow"><span class="addr">${hex(line[0].addr)}</span>${line.map((c) => cellHTML(c, ctx, changed)).join('')}</div>`;
          line = [];
        };
        for (const c of seg.cells) {
          if (line.length && c.addr % 8 === 0) flush();
          line.push(c);
        }
        flush();
        h += '<div class="segsep">⋯</div>';
      }
      h += '</div>';
    }
    return h;
  }

  function renderMemory(state, ctx) {
    const changed = new Set();
    if (ctx.prevMem) for (let a = 0; a < state.memory.length; a++) if (ctx.prevMem[a] !== state.memory[a]) changed.add(a);
    ctx.prevMem = state.memory.slice();
    $('#memview').innerHTML = state.tutorial
      ? (neighborhoodHTML(state, ctx, changed).replace(/<div class="segs">[\s\S]*$/, '') + fullGridHTML(state, ctx, changed))
      : neighborhoodHTML(state, ctx, changed);
    const sel = ctx.selected;
    $('#edit-hint').dataset.sel = sel == null ? '' : String(sel);
  }

  /* ---------------- tutorial ---------------- */

  function renderTutor(tut, state) {
    const box = $('#tutor');
    if (!tut) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const v = HEX.Tutorial.view(tut, state);
    box.innerHTML = `
      <div class="wiz">🧙</div>
      <div class="tbody">
        <div class="ttitle">${esc(v.title)} <span class="tstep">${Math.min(v.index + 1, v.total)}/${v.total}</span></div>
        <div class="ttext">${v.text}</div>
        ${v.note ? `<div class="tnote">💬 ${esc(v.note)}</div>` : ''}
      </div>
      <div class="tbtns">${v.button ? `<button class="act primary" id="tut-next">${esc(v.button)}</button>` : ''}<button class="ghost" id="tut-skip">Pular tutorial</button></div>`;
  }

  /* ---------------- efeitos ---------------- */

  function renderFx(state) {
    for (const f of state.fx) {
      const card = $(f.target === 'player' ? '#hero-card' : '#foe-card');
      if (!card) continue;
      const floats = $('.floats', card);
      const el = document.createElement('span');
      el.className = 'float ' + f.type;
      el.textContent = { damage: `−${f.amount}`, heal: `+${f.amount}`, blocked: '🛡 bloqueado', protect: '🛡', edit: '✏️', resurrect: '💀↑' }[f.type] || '';
      floats.appendChild(el);
      setTimeout(() => el.remove(), 1400);
      const cls = { damage: 'hit', blocked: 'blk', edit: 'edited', resurrect: 'hit', heal: 'healed', protect: 'prot' }[f.type];
      if (cls) { card.classList.remove(cls); void card.offsetWidth; card.classList.add(cls); setTimeout(() => card.classList.remove(cls), 600); }
    }
    state.fx.length = 0;
  }

  HEX.Render = { $, esc, bar, buildBattleScreen, renderBattle, renderMemory, renderTutor, renderFx, renderLog };
})(typeof globalThis !== 'undefined' ? globalThis : window);
