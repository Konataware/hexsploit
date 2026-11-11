/* Fonte única da ordem de carga. Usada pelo build, pelos testes e pelo check do index.html. */
module.exports = {
  // Motor (sem DOM): roda no navegador e em Node.
  engine: [
    'src/core/config.js',
    'src/data/mobs.js',
    'src/data/tools.js',
    'src/engine/memory.js',
    'src/engine/combat.js',
    'src/engine/scoring.js',
    'src/game/tutorial.js',
  ],
  // Camada de interface (precisa de DOM).
  ui: ['src/ui/render.js', 'src/game/main.js'],
  styles: ['src/styles/base.css', 'src/styles/battle.css', 'src/styles/memory.css'],
};
