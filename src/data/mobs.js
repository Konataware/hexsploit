/* HEXploit — mobs.js
 * Inimigos definidos por DADOS. O motor de combate não tem lógica específica de criatura:
 * tudo vem de pesos de IA, listas de edições e do objetivo opcional declarativo.
 */
(function (G) {
  'use strict';
  const HEX = (G.HEX = G.HEX || {});

  const MOBS = {
    slime: {
      id: 'slime', name: 'Slime', emoji: '🟢',
      art: ['   ,--.   ', '  ( oo )  ', "  '~~~~'  "],
      hp: 40, atk: 5, def: 2, regen: 5, flags: 0, ap: 2, par: 4,
      gimmick: 'regeneration',
      intro: 'Um Slime gelatinoso bloqueia o caminho. Ele se regenera sozinho... será que dá para desligar isso?',
      aiWeights: { attack: 0.7, regenerate: 0.3 },
      objective: { id: 'slime-regen', text: 'Reduza a Regen do Slime a 0', type: 'fieldAtMost', owner: 'enemy', field: 'regen', value: 0 },
    },
    skeleton: {
      id: 'skeleton', name: 'Skeleton', emoji: '💀',
      art: ['   .-.    ', '  (o.o)   ', '  |=|=|   '],
      hp: 25, atk: 8, def: 10, regen: 0, flags: 0, ap: 2, par: 5,
      gimmick: 'armor',
      intro: 'Um Skeleton de armadura reforçada. Sua espada não faz nem cócegas... a não ser que a defesa dele mude.',
      aiWeights: { attack: 0.5, protect: 0.3, scan: 0.2 },
      protectFields: ['def'],
      objective: { id: 'skeleton-def', text: 'Reduza a Defense do Skeleton para 5 ou menos', type: 'fieldAtMost', owner: 'enemy', field: 'def', value: 5 },
    },
    zombie: {
      id: 'zombie', name: 'Zombie', emoji: '🧟',
      art: ['   _∩_    ', '  (x_x)   ', ' /|   |\\  '],
      hp: 60, atk: 6, def: 3, regen: 2, flags: 1 /* bit0 = ressurreição */, ap: 2, par: 7,
      gimmick: 'resurrection',
      intro: 'O Zombie aprendeu a mexer no Grid... e ainda volta da morte. Algo na memória dele diz que ele pode se levantar.',
      aiWeights: { attack: 0.5, edit: 0.5 },
      /* Edições que o Zombie faz nos atributos do JOGADOR. */
      aiEdits: [
        { field: 'atk', delta: -2, floor: 3 },
        { field: 'def', delta: -1, floor: 0 },
        { field: 'buffer', delta: -8, floor: 0 },
      ],
      objective: { id: 'zombie-flag', text: 'Desative a flag de ressurreição do Zombie', type: 'flagCleared', owner: 'enemy', field: 'flags', bit: 1 },
    },
    /* Apenas tutorial: não ataca, não regenera. */
    dummy: {
      id: 'dummy', name: 'Boneco de Treino', emoji: '🪵',
      art: ['   ___    ', '  (. .)   ', '   /|\\    '],
      hp: 30, atk: 0, def: 3, regen: 0, flags: 0, ap: 1, par: 99,
      gimmick: 'none', tutorialOnly: true,
      intro: 'Um boneco de treino. Perfeito para quebrar as regras sem ninguém reclamar.',
      aiWeights: {},
    },
  };

  HEX.MOBS = MOBS;
  HEX.MOB_ORDER = ['slime', 'skeleton', 'zombie'];
})(typeof globalThis !== 'undefined' ? globalThis : window);
