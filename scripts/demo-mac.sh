#!/bin/bash
set -euo pipefail

if [[ "$(uname -s)" != Darwin ]]; then
  echo 'Este comando é para macOS. Em outros sistemas, use o Compose da demo.' >&2
  exit 1
fi
version="$(sw_vers -productVersion)"
if (( ${version%%.*} < 11 )); then
  echo "macOS $version: este inicializador exige macOS 11 ou posterior." >&2
  exit 1
fi

cd "$(dirname "$0")/.."
project_dir="$PWD"
state="$project_dir/.demo-mac"
legacy=false
if [[ -e .env ]]; then
  echo 'Use uma clonagem exclusiva para esta demo, sem .env existente.' >&2
  echo 'Nenhuma configuração existente foi alterada.' >&2
  exit 1
fi

echo "Preparando lavanderia demo no macOS $version."
if (( ${version%%.*} == 11 )); then
  legacy=true
  source scripts/prepare-macos11.sh
else
if ! command -v brew >/dev/null; then
  for candidate in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    if [[ -x "$candidate" ]]; then
      export PATH="$(dirname "$candidate"):$PATH"
      break
    fi
  done
fi
if ! command -v brew >/dev/null; then
  echo 'O Homebrew será instalado pelo instalador oficial; ele pode pedir a senha do Mac.'
  installer="$(mktemp -t lavanderia-homebrew)"
  curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh -o "$installer"
  /bin/bash "$installer"
  rm -f "$installer"
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fi

export HOMEBREW_NO_AUTO_UPDATE=1
for formula in node@22 postgresql@17; do
  if ! brew list --versions "$formula" >/dev/null 2>&1; then
    brew install "$formula"
  fi
done
node_prefix="$(brew --prefix node@22)"
pg_prefix="$(brew --prefix postgresql@17)"
fi
export PATH="$node_prefix/bin:$pg_prefix/bin:$PATH"
node -e 'if (Number(process.versions.node.split(".")[0]) !== 22) process.exit(1)'

mkdir -p "$state/bin"
chmod 700 "$state"
corepack enable --install-directory "$state/bin"
export PATH="$state/bin:$PATH"
if [[ "$legacy" == true ]]; then
  pnpm install --frozen-lockfile --ignore-scripts
  # O pacote atual não inclui binário de Argon2 para Mac Intel.
  if ! node -e "require(require('node:module').createRequire(process.cwd()+'/apps/api/package.json').resolve('argon2'))" >/dev/null 2>&1; then
    argon_dir="$(node -e "console.log(require('node:path').dirname(require('node:module').createRequire(process.cwd()+'/apps/api/package.json').resolve('argon2')))")"
    node_gyp="$(npm root -g)/npm/node_modules/node-gyp/bin/node-gyp.js"
    if [[ ! -f "$node_gyp" ]]; then
      echo 'Não foi encontrado o node-gyp distribuído com o npm. Reinstale o Node 22 com npm.' >&2
      exit 1
    fi
    node "$node_gyp" rebuild --directory "$argon_dir"
  fi
else
  pnpm install --frozen-lockfile
fi

for secret in pg-password jwt-secret; do
  if [[ ! -f "$state/$secret" ]]; then
    (umask 077; openssl rand -hex 32 > "$state/$secret")
  fi
done
export PGPASSWORD="$(cat "$state/pg-password")"
export JWT_SECRET="$(cat "$state/jwt-secret")"
export DATABASE_URL="postgresql://demo:$PGPASSWORD@127.0.0.1:55439/lavanderia_demo"
export LAUNDRY_DEMO_MAC=1
export VITE_API_URL=/api
export API_PROXY_TARGET=http://127.0.0.1:3000
export BACKUP_PG_DUMP_PATH="$pg_prefix/bin/pg_dump"
export BACKUP_PG_RESTORE_PATH="$pg_prefix/bin/pg_restore"

if [[ ! -f "$state/pgdata/PG_VERSION" ]]; then
  initdb -D "$state/pgdata" -U demo --encoding=UTF8 --locale=C \
    --auth-local=trust --auth-host=scram-sha-256 --pwfile="$state/pg-password" > "$state/initdb.log"
fi

started=false
cleanup() {
  if [[ "$started" == true ]]; then
    pg_ctl -D "$state/pgdata" -m fast -w stop
  fi
}
trap cleanup EXIT
if ! pg_ctl -D "$state/pgdata" status >/dev/null 2>&1; then
  pg_ctl -D "$state/pgdata" -l "$state/postgres.log" \
    -o "-h 127.0.0.1 -p 55439 -c unix_socket_directories=''" -w start
  started=true
fi
if [[ "$(psql -h 127.0.0.1 -p 55439 -U demo -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='lavanderia_demo'")" != 1 ]]; then
  createdb -h 127.0.0.1 -p 55439 -U demo lavanderia_demo
fi

pnpm build
node scripts/start-demo.mjs
