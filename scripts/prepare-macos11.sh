# Carregado por demo-mac.sh. Ferramentas ficam apenas na pasta ignorada .demo-mac.
if [[ "$(uname -m)" != x86_64 ]]; then
  echo 'A adaptação para macOS 11 foi preparada para Mac Intel.' >&2
  exit 1
fi
if ! command -v node >/dev/null || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) === 22 ? 0 : 1)'; then
  echo 'Instale Node.js 22 com npm antes de iniciar a demo no macOS 11.' >&2
  exit 1
fi
if ! xcrun --find clang >/dev/null 2>&1; then
  echo 'Instale as ferramentas da Apple com xcode-select --install e execute novamente.' >&2
  exit 1
fi
node_prefix="$(node -p 'require("node:path").dirname(require("node:path").dirname(process.execPath))')"
pg_prefix="$state/tools/postgres-17"
mkdir -p "$state/tools" "$state/downloads"
export LC_ALL=C
export ESBUILD_BINARY_PATH="$state/tools/esbuild-wasm/bin/esbuild"
if [[ ! -f "$ESBUILD_BINARY_PATH" ]]; then
  echo 'Preparando esbuild 0.28.2 em WebAssembly para macOS 11...'
  npm pack esbuild-wasm@0.28.2 --pack-destination "$state/downloads" --ignore-scripts
  mkdir -p "$state/tools/esbuild-wasm"
  tar -xzf "$state/downloads/esbuild-wasm-0.28.2.tgz" -C "$state/tools/esbuild-wasm" --strip-components=1
fi

if [[ ! -x "$pg_prefix/bin/postgres" ]]; then
  echo 'Compilando PostgreSQL 17.11 para este Mac. A primeira preparação pode demorar.'
  archive="$state/downloads/postgresql-17.11.tar.bz2"
  expected=dd27f2b3c59e73ed14aa3324901242bf69a032a6347805f274e6260322d42979
  if [[ ! -f "$archive" ]]; then
    curl -fL --retry 2 https://ftp.postgresql.org/pub/source/v17.11/postgresql-17.11.tar.bz2 -o "$archive.part"
    mv "$archive.part" "$archive"
  fi
  actual="$(shasum -a 256 "$archive" | awk '{print $1}')"
  if [[ "$actual" != "$expected" ]]; then
    echo "Checksum inválido em $archive. Preparação interrompida." >&2
    exit 1
  fi
  if [[ ! -d "$state/tools/postgresql-17.11" ]]; then
    tar -xjf "$archive" -C "$state/tools"
  fi
  (
    cd "$state/tools/postgresql-17.11"
    ./configure --prefix="$pg_prefix" --without-icu --without-readline > "$state/postgres-configure.log" 2>&1
    make -j3 > "$state/postgres-build.log" 2>&1
    make install >> "$state/postgres-build.log" 2>&1
  )
fi
