# HEXploit (MVP 0.1)

Boss Rush PvE medieval em que a memória (Grid de 256 bytes) é o estado real do combate.

## Rodar
Abra `index.html` no navegador (sem servidor nem build) ou `dist/HEXploit-standalone.html` (arquivo único).

```
npm start          # servidor estático local em http://localhost:8080
npm test           # regras do GDD §19/§24 + simulação de partidas com bots (só Node)
npm run test:e2e   # interface no Chromium (requer playwright)
npm run build      # regenera dist/HEXploit-standalone.html
```

## Estrutura
```
HEXploit/
├── index.html
├── package.json
├── src/
│   ├── core/      config.js        constantes, layout da struct, limites, RNG semeado, parsing
│   ├── data/      mobs.js tools.js conteúdo declarativo (inimigos, ferramentas)
│   ├── engine/    memory.js combat.js scoring.js    regras puras, SEM DOM (rodam em Node)
│   ├── game/      tutorial.js main.js   roteiro do tutorial e fluxo de telas
│   ├── ui/        render.js        único módulo que desenha batalha e Grid
│   └── styles/    base.css battle.css memory.css
├── assets/        characters/ enemies/ icons/ effects/
├── scripts/       manifest.js build.js serve.js
├── tests/         unit/  e2e/  helpers/
└── dist/          HEXploit-standalone.html (gerado)
```

**Regra de dependência:** `core` ← `data` ← `engine` ← `game`/`ui`. O `engine` nunca importa `ui`/`game`, então o mesmo código roda no navegador, nos testes e (futuro PvP) num servidor.
**Ordem de carga:** definida uma vez em `scripts/manifest.js`; o build recusa gerar se o `index.html` divergir dela.
**Adicionar conteúdo:** novo inimigo = uma entrada em `src/data/mobs.js` (e em `MOB_ORDER`); nova ferramenta = `src/data/tools.js`. O motor não muda.
Ações são comandos: `Combat.dispatch(state, { type:'edit', actor:'player', address:'0x54', value:0 })`.

## Decisões que o GDD deixava em aberto
- **Ordem do turno:** início = AP renovado, contagem de edições zerada, derivados recalculados. Fim = regen passiva do dono, expira a proteção do adversário, checa vitória, troca de vez.
- **Protect:** o jogador escolhe o atributo (Buffer/Attack/Defense/Regen/Buffer máx); o inimigo escolhe entre os de `protectFields`. É consumido ao bloquear e expira no fim do próximo turno adversário. Não vale contra edição do próprio dono.
- **Core:** editar o Core gasta 1 AP e é revertido por "verificação de integridade" (nunca muda).
- **Layout da struct (offsets):** Buffer +0, Core +1, Buffer máx +2, cache DEF +3, Attack +4, cache ATK +5, Defense +6, Regen +7, Flags +8 (bit0 = ressurreição), Assinatura +9. Jogador em 0x40, inimigo em 0x50. Endereços do GDD preservados.
- **Decoys:** (A) outro atributo real, (B) caches/snapshots recalculados no início do turno do dono, (C) assinatura da struct: corromper troca ATK↔DEF efetivos até revalidar. Tudo simulado, sem crash.
- **Rate limit:** por atributo lógico (a DEF e o cache da DEF contam como o mesmo).
- **Regen:** passiva no fim do turno do dono; a ação "Regenerate" do Slime cura 2× Regen.
- **HP:** Buffer e Core iguais ao HP do GDD (herói 30/30; inimigos 40/25/60). Entre batalhas o herói recupera 10 de Core.
- **Injector:** dispara sozinho quando uma proteção bloquearia a edição (0 AP, uma vez por combate).
- **Zombie:** edita ATK/DEF/Buffer do jogador (não revelando endereços no log).
