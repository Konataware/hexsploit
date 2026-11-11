#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1 ||
	! command -v npm >/dev/null 2>&1; then
	echo "Node.js e npm não encontrados."
	echo "Entre no ambiente Nix usando: nix-shell"
	exit 1
fi

echo "Node: $(node --version)"
echo "npm:  $(npm --version)"

if [[ ! -d node_modules ]]; then
	echo "Instalando dependências..."
	npm install
fi

echo "Iniciando HEXploit..."
exec npm run dev -- --host 0.0.0.0
