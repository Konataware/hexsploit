/* HEXploit — tutorial.js
 * Roteiro do CheatWizard. Reage a eventos do combate (state.listeners); não mexe no DOM.
 * É a ÚNICA parte do jogo que explica conceitos: endereço, Scan, Edit, consequências.
 */
(function (G) {
  'use strict';
  const HEX = (G.HEX = G.HEX || {});
  const C = HEX.CONFIG;

  const STEPS = [
    {
      title: 'Psiu, herói!',
      button: 'Continuar',
      text: () =>
        'Sou o CheatWizard 🧙. Tudo neste mundo é feito de bytes guardados no <b>Grid</b>: uma grade de 256 posições. ' +
        'Cada posição tem um <b>endereço</b> (0x00 a 0xFF) e guarda um <b>valor</b> (0 a 255). ' +
        'A vida, o ataque e a defesa de todo mundo moram aí embaixo. Quem muda o Grid, muda as regras.',
    },
    {
      title: '1) Procure um valor',
      text: () =>
        'O Boneco de Treino ali tem <b>DEF 3</b>. Vamos descobrir onde isso mora: digite <b>3</b> no campo de Scan e clique em <b>Scan</b>. ' +
        'Cada ação custa AP (aqui você tem 4 por turno).',
      test(ev, state, tut) {
        if (ev.type !== 'scan' || ev.actor !== 'player') return false;
        if (ev.value === 3) return true;
        tut.note = 'Pesquise exatamente o valor 3 (a DEF do boneco).';
        return false;
      },
    },
    {
      title: '2) Edite um endereço',
      text: () =>
        'Vários endereços guardam o número 3, mas só <b>um</b> é a DEF do boneco. ' +
        'Dica de mentor: ela mora em <b>0x56</b>, dentro da struct do inimigo (que começa em 0x50). ' +
        'Clique num byte da grade para selecioná-lo, digite <b>0</b> como novo valor e clique em <b>Edit</b>.',
      test(ev, state, tut) {
        if (ev.type !== 'edit' || ev.actor !== 'player') return false;
        if (state.enemy.tmpDef === 0) return true;
        tut.note = 'A DEF do boneco continua 3. Olhe o log: o que mudou? Esse endereço era outra coisa (um decoy). Tente outro candidato!';
        return false;
      },
    },
    {
      title: '3) Observe a consequência',
      text: (state) =>
        `A DEF do boneco agora é <b>${state.enemy.tmpDef}</b>. Dano = ATK − DEF, então seus ataques passam inteiros. ` +
        'Clique em <b>Attack</b> e veja o Buffer (escudo) absorver o dano antes do Core (vida de verdade).',
      test: (ev) => ev.type === 'attack' && ev.actor === 'player',
    },
    {
      title: '4) Proteja-se',
      text: () =>
        'Inimigos também sabem hackear. Escolha um atributo no menu e clique em <b>Protect</b>: ele fica imune a edições adversárias ' +
        'até o fim do próximo turno do inimigo (ou até bloquear uma edição).',
      test: (ev) => ev.type === 'protect' && ev.actor === 'player',
    },
    {
      title: '5) Passe a vez',
      text: () => 'Seus 4 AP acabaram. Clique em <b>Encerrar turno</b>: o inimigo age e o seu AP volta ao máximo.',
      test: (ev) => ev.type === 'endTurn' && ev.actor === 'player',
    },
    {
      title: '6) A regra de ouro',
      text: () =>
        'O <b>Core</b> nunca pode ser editado, senão qualquer um venceria com um Edit. Tente do seu jeito: o Core do herói mora em <b>0x41</b>. ' +
        'Edite para 255 e leia o log.',
      test(ev, state, tut) {
        if (ev.type !== 'edit' || ev.actor !== 'player') return false;
        if (ev.core || ev.addr === 0x41 || ev.addr === 0x51) return true;
        tut.note = 'Tente o endereço 0x41 (o Core do herói).';
        return false;
      },
    },
    {
      title: '7) Agora é com você',
      text: () =>
        'Derrote o Boneco de Treino. Lembre: se um valor aparece em vários endereços, edite um, observe o que mudou e <i>deduza</i> o que cada endereço faz. ' +
        'Você pode refazer o Scan quantas vezes quiser. Boa sorte, hacker de taverna!',
      test: (ev) => ev.type === 'won',
    },
  ];

  const Tutorial = {
    SEED: 1337,
    total: STEPS.length,
    create(state) {
      const tut = { index: 0, note: '', done: false };
      state.listeners.push((ev, st) => {
        if (tut.done) return;
        const step = STEPS[tut.index];
        if (!step || !step.test) return;
        tut.note = '';
        if (step.test(ev, st, tut)) {
          tut.index++;
          tut.note = '';
          if (ev.type === 'won') tut.done = true;
        }
      });
      return tut;
    },
    /** Passo atual para exibição. */
    view(tut, state) {
      if (tut.done) return { title: 'Tutorial completo!', text: 'Você dominou o básico do Grid. O resto da masmorra espera.', button: 'Começar a aventura', index: STEPS.length, total: STEPS.length, note: '' };
      const step = STEPS[Math.min(tut.index, STEPS.length - 1)];
      return { title: step.title, text: step.text(state), button: step.button || null, index: tut.index, total: STEPS.length, note: tut.note };
    },
    /** Botão "Continuar" dos passos sem teste. */
    advance(tut) {
      const step = STEPS[tut.index];
      if (step && step.button && !step.test) { tut.index++; tut.note = ''; }
    },
  };

  HEX.Tutorial = Tutorial;
})(typeof globalThis !== 'undefined' ? globalThis : window);
