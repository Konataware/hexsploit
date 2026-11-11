/* Teste de fumaça da interface no Chromium. Uso: npm run test:e2e -- [saida-screenshots] */
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || '.';
const url = 'file://' + path.join(__dirname, '..', '..', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1180, height: 860 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', (d) => d.accept());
  const ok = (c, m) => { if (!c) { errors.push('ASSERT: ' + m); } };
  const log = async () => (await page.$$eval('#log .ln', (n) => n.map((x) => x.textContent))).join('\n');

  await page.goto(url);
  await page.screenshot({ path: path.join(out, '1-title.png') });

  /* ---------- tutorial ---------- */
  await page.click('#m-tut');
  ok(await page.isVisible('#tutor'), 'tutor visível');
  ok((await page.$$('.fullgrid .byte')).length === 256, 'tutorial mostra grid completo (256)');
  await page.click('#tut-next');                                   // passo 0 -> 1
  await page.fill('#scan-value', '3'); await page.click('#btn-scan');
  ok(/2\/7/.test(await page.textContent('.tstep')) === false, 'avançou do passo Scan');
  await page.screenshot({ path: path.join(out, '2-tutorial.png') });
  // passo 2: edit errado primeiro (decoy), depois certo
  const matches = await page.$$eval('#memview .byte.match', (n) => n.map((x) => +x.dataset.addr));
  ok(matches.includes(0x56), 'DEF do boneco achada no scan');
  await page.fill('#edit-addr', '0x56'); await page.fill('#edit-value', '0'); await page.click('#btn-edit');
  await page.click('#btn-attack');
  await page.selectOption('#protect-field', 'atk'); await page.click('#btn-protect');
  ok(/Attack|protegeu/.test(await log()), 'log de protect');
  await page.click('#btn-end'); await page.waitForTimeout(2200);
  await page.fill('#edit-addr', '0x41'); await page.fill('#edit-value', '255'); await page.click('#btn-edit');
  ok(/verificação de integridade/.test(await log()), 'core revertido');
  ok(/8\/8/.test(await page.textContent('.tstep')), 'chegou ao último passo: ' + (await page.textContent('.tstep')));
  for (let i = 0; i < 12 && (await page.isVisible('#tutor #tut-next')) === false; i++) {
    const ap = await page.textContent('#ap .num');
    if (/^0/.test(ap)) { await page.click('#btn-end'); await page.waitForTimeout(1700); } else { await page.click('#btn-attack'); }
    if (await page.isVisible('#tut-next')) break;
  }
  await page.waitForTimeout(1200);
  ok(/Tutorial completo/.test(await page.textContent('#tutor')), 'tutorial concluído');
  await page.click('#tut-next');

  /* ---------- run completa via UI ---------- */
  await page.click('#m-play'); await page.click('#go');
  await page.screenshot({ path: path.join(out, '3-tools.png') });
  await page.click('[data-tool="scanner"]');
  const fought = [];
  for (let stage = 0; stage < 3; stage++) {
    await page.click('#fight');
    ok(!(await page.isVisible('#tutor')), 'sem tutor na run');
    ok((await page.$$('.fullgrid')).length === 0, 'sem grid completo fora do tutorial');
    if (stage === 0) {
      await page.fill('#scan-value', '5'); await page.click('#btn-scan');
      const chips = await page.$$('.rchip');
      ok(chips.length >= 2, 'resultados do scan >= 2');
      ok((await page.$$('#memview .hexrow .byte')).length > 0, 'vizinhança renderizada');
      await page.screenshot({ path: path.join(out, '4-battle-scan.png') });
    }
    const target = { 0: ['0x57', '0'], 1: ['0x56', '0'], 2: ['0x58', '0'] }[stage];
    await page.fill('#edit-addr', target[0]); await page.fill('#edit-value', target[1]); await page.click('#btn-edit');
    if (stage === 2) await page.screenshot({ path: path.join(out, '5-battle-zombie.png') });
    for (let i = 0; i < 400; i++) {
      if (await page.isVisible('#next') || await page.isVisible('#menu')) break;
      if (await page.isEnabled('#btn-attack').catch(() => false)) await page.click('#btn-attack');
      else if (await page.isEnabled('#btn-end').catch(() => false)) await page.click('#btn-end');
      await page.waitForTimeout(stage === 0 ? 250 : 200);
    }
    await page.waitForSelector('#next, #menu', { timeout: 60000 });
    fought.push(await page.textContent('h2'));
    if (await page.isVisible('#next')) { await page.screenshot({ path: path.join(out, `6-between-${stage}.png`) }); await page.click('#next'); } else break;
  }
  await page.screenshot({ path: path.join(out, '7-result.png') });
  console.log('Telas de fim:', fought.join(' | '));
  console.log('Resultado final:', (await page.textContent('.final').catch(() => '(sem painel)')).replace(/\s+/g, ' '));

  // mobile
  await page.setViewportSize({ width: 390, height: 800 });
  await page.click('#menu, #again').catch(() => {});
  await browser.close();
  if (errors.length) { console.log('PROBLEMAS:\n' + errors.join('\n')); process.exit(1); }
  console.log('UI OK: sem erros de JS e asserts passaram');
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
