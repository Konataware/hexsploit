# HEXploit — starter 0.1.0

## Rodar localmente
Requer Node.js 20.19+ ou 22.12+.

```bash
npm install
npm run dev
```

Build de produção: `npm run build`.

## Stack inicial
- Node.js + npm
- React 19 + TypeScript
- Vite
- Zustand para estado global
- Vitest reservado para testes

## Escopo implementado
- Combate PvE contra um Slime.
- Buffer absorve dano antes do Core.
- Core não pode ser editado; só sofre dano de combate.
- Scan procura um valor de byte e custa 1 AP.
- Edit altera atributos mapeados e custa 1 AP.
- Refine não existe.
- Encerrar turno regenera Buffer e executa o ataque inimigo.
- Grade exibe uma janela de 32 bytes do espaço de 256 bytes.

## Próximos passos
1. Testes unitários de combate, scan e edição.
2. Implementar Protect.
3. Adicionar Skeleton e Zombie e abstrair dados dos inimigos.
4. Implementar efeitos coerentes para dados desconhecidos/estruturais.
5. Criar tutorial integrado.
6. Separar balanceamento em configuração.
