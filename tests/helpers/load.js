/* Carrega o motor no Node na ordem do manifesto e devolve globalThis.HEX. */
const path = require('path');
const manifest = require('../../scripts/manifest');
const root = path.join(__dirname, '..', '..');
for (const f of manifest.engine) require(path.join(root, f));
module.exports = globalThis.HEX;
