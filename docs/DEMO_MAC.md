# Demo local no macOS 11 Intel

Adaptação de 31/10/2026, na branch `demo-lavanderia`.

```sh
cd ~/sistema-estoque
bash scripts/demo-mac.sh
```

O projeto mantém as versões de seu lockfile. A versão nativa de esbuild
0.28.2 distribuída no npm exige macOS 12. O inicializador usa o CLI oficial
`esbuild-wasm@0.28.2` por `ESBUILD_BINARY_PATH`, herdado pelo Vite e tsx. A
compilação fica mais lenta nesse modo. Argon2 0.45.1 não inclui binário para
Mac Intel; o inicializador compila o módulo com node-gyp fornecido pelo npm.
Sharp e o plugin do Tailwind carregaram nesta máquina sem adaptação adicional.

PostgreSQL 17.11 é compilado com Clang da Apple, sem ICU/readline, dentro de
`.demo-mac/tools/postgres-17`. O tarball vem de `ftp.postgresql.org` e seu
checksum SHA-256 está fixado no script. O banco usa a porta 55439 em loopback,
diretório `.demo-mac/pgdata` e senha aleatória local. Nenhum banco externo é
usado e nenhuma instalação global de PostgreSQL é iniciada ou encerrada.

Os arquivos de configuração, segredos, ferramentas e dados de `.demo-mac/`
são ignorados pelo Git e pelo build Docker. Não compartilhe essa pasta.
Para copiar a demo para outro computador, compartilhe o código versionado.

Pré-requisitos desta adaptação: Node 22 com npm/Corepack e Command Line Tools
(`xcode-select --install`). A máquina usada possui macOS 11.7.11, Intel,
Node 22.23.4 e Apple Clang 13. O script recusa `.env` existente para preservar
configurações de outras instalações; use uma clonagem dedicada à demo.

Validação local concluída: carregamento de Sharp/Tailwind, hash/verificação
Argon2, compilação completa API/web/shared, lint, tipos e suíte `pnpm test`
passaram. Os testes opt-in de banco/backup continuaram SKIP, sem confundir com
a execução real da demo.

`bash scripts/demo-mac.sh` instalou PostgreSQL 17.11, criou somente o banco
local `lavanderia_demo`, aplicou as sete migrations e preparou os dados uma vez.
Health HTTP respondeu `status: ok`, `database: up`. Consulta somente leitura
confirmou 19 produtos ativos, 6 clientes, 2 fornecedores, 713 movimentos e o
marcador de inicialização. Em Chrome 138, o login pelo formulário, a sessão e
o catálogo foram verificados sem erros JavaScript. Evidências locais ficam
em `.demo-mac/qa/`, fora do Git.
