# Lavanderia — demonstração local

## Mac sem Docker

Clone e inicie:

```sh
git clone -b demo-lavanderia --single-branch https://github.com/GAVVYO/sistema-estoque.git
cd sistema-estoque
bash scripts/demo-mac.sh
```

O comando identifica a versão do macOS, instala Homebrew se necessário (pode
pedir a senha do Mac), instala Node 22 e PostgreSQL 17 quando ausentes, prepara
as dependências e inicia a demo. Não inicia serviço de banco no login do Mac.
Requer internet na primeira preparação. No macOS 12 ou posterior, o Homebrew
pode não oferecer suporte ao sistema/hardware antigo:
[requisitos oficiais](https://docs.brew.sh/Installation).

No **macOS 11 Intel**, o comando usa uma adaptação local: esbuild 0.28.2 em
WebAssembly, PostgreSQL 17.11 compilado a partir do código oficial (checksum
SHA-256 conferido) e Argon2 compilado para o Mac. Esse caminho requer **Node 22
com npm e Corepack** e **Command Line Tools da Apple** já instalados. As
ferramentas ficam em `.demo-mac/`, sem instalar serviços ou alterar o Homebrew.
A primeira compilação do banco demora alguns minutos; logs em
`.demo-mac/postgres-configure.log` e `.demo-mac/postgres-build.log`.
macOS anterior ao 11 e macOS 11 ARM não estão cobertos por essa adaptação.

Use uma clonagem exclusiva da demo, sem `.env`. Os dados ficam em `.demo-mac/`,
ignorada pelo Git, e continuam salvos nas próximas execuções. O PostgreSQL da
demo usa somente `127.0.0.1:55439`, separado de outros bancos. Para iniciar de
novo, execute `bash scripts/demo-mac.sh`; para parar, Ctrl+C. O banco iniciado
pelo comando também é encerrado, sem apagar os dados.

Abra **http://localhost:5173**. Login: `demo@lavanderia.local`; senha:
`LavanderiaDemo123!`. As portas 3000, 5173 e 55439 precisam estar disponíveis.
Se a preparação dos dados for interrompida, não apague pastas automaticamente:
consulte a mensagem e preserve `.demo-mac/` antes de refazer a demo.

O caminho de macOS 11 Intel teve compilação da aplicação, lint e tipos
verificados nesta máquina. Consulte [docs/DEMO_MAC.md](docs/DEMO_MAC.md) para
detalhes da validação local. O instalador via Homebrew em outros Macs ainda
precisa ser validado nesses sistemas.

## Com Docker

1. Instale e abra o Docker Desktop (com Docker Compose v2).
2. Clone a branch e entre na pasta (ou extraia o ZIP e abra sua pasta):

```sh
git clone -b demo-lavanderia --single-branch https://github.com/GAVVYO/sistema-estoque.git
cd sistema-estoque
```

3. Execute:

```sh
docker compose -f compose.demo.yml up --build
```

A primeira execução baixa e compila os componentes; aguarde a API e o frontend
iniciarem. Abra **http://localhost:5173** no navegador.

**E-mail:** `demo@lavanderia.local`  
**Senha:** `LavanderiaDemo123!`

Para parar: **Ctrl+C**. Para iniciar novamente: o mesmo comando.
As alterações ficam salvas no banco local exclusivo desta demo.

Precisa de internet na primeira preparação. Não precisa instalar Node ou banco,
nem configurar `.env`. Se a porta 5173 estiver ocupada, feche o outro sistema que
estiver usando essa porta antes de iniciar.

Roteiro de apresentação e recuperação: [docs/DEMO.md](docs/DEMO.md).

Validação do Compose: YAML e sintaxe do inicializador passaram. A execução
completa no Docker ainda precisa ser conferida em uma máquina com Docker
disponível. A compilação local passou com a adaptação para macOS 11 acima.
