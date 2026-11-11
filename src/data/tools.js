/* HEXploit — tools.js
 * Ferramentas iniciais: um uso gratuito (0 AP) por combate, controlado por estado.
 */
(function (G) {
  'use strict';
  const HEX = (G.HEX = G.HEX || {});

  const TOOLS = {
    scanner: {
      id: 'scanner', name: 'Scanner+', emoji: '🔍', free: 'scan', profile: 'Investigação',
      desc: 'Um Scan gratuito por combate (0 AP).',
    },
    firewall: {
      id: 'firewall', name: 'Firewall', emoji: '🛡️', free: 'protect', profile: 'Defesa',
      desc: 'Um Protect gratuito por combate (0 AP).',
    },
    injector: {
      id: 'injector', name: 'Injector', emoji: '💉', free: 'edit', profile: 'Manipulação',
      desc: 'Uma edição por combate que atravessa uma proteção (0 AP). Dispara sozinha quando uma proteção bloquearia a edição.',
    },
  };

  const Tools = {
    /** A ferramenta do jogador cobre esta ação e ainda não foi usada neste combate? */
    available(state, kind) {
      const t = state.tool && TOOLS[state.tool];
      return !!t && t.free === kind && !state.usedTools.includes(kind);
    },
    consume(state, kind) {
      if (!state.usedTools.includes(kind)) state.usedTools.push(kind);
    },
  };

  HEX.TOOLS = TOOLS;
  HEX.TOOL_ORDER = ['scanner', 'firewall', 'injector'];
  HEX.Tools = Tools;
})(typeof globalThis !== 'undefined' ? globalThis : window);
