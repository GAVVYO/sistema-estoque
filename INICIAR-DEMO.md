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
Requer internet na primeira preparação. O Homebrew pode não oferecer suporte
ao sistema/hardware antigo: [requisitos oficiais](https://docs.brew.sh/Installation).
No macOS 11 ou anterior, o comando para antes de instalar: uma dependência
atual do projeto exige macOS 12 ou posterior.

Use uma clonagem exclusiva da demo, sem `.env`. Os dados ficam em `.demo-mac/`,
ignorada pelo Git, e continuam salvos nas próximas execuções. O PostgreSQL da
demo usa somente `127.0.0.1:55439`, separado de outros bancos. Para iniciar de
novo, execute `bash scripts/demo-mac.sh`; para parar, Ctrl+C. O banco iniciado
pelo comando também é encerrado, sem apagar os dados.

Abra **http://localhost:5173**. Login: `demo@lavanderia.local`; senha:
`LavanderiaDemo123!`. As portas 3000, 5173 e 55439 precisam estar disponíveis.
Se a preparação dos dados for interrompida, não apague pastas automaticamente:
consulte a mensagem e preserve `.demo-mac/` antes de refazer a demo.

O instalador foi validado quanto à sintaxe e ao bloqueio de macOS 11; a
instalação e execução completas ainda precisam ser testadas em um Mac compatível.

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

Validação deste pacote: lint, checagem de tipos, YAML e sintaxe do inicializador
passaram. O build local foi impedido por uma dependência que exige macOS 12 ou
posterior (esta máquina usa macOS 11). A execução completa no Docker ainda
precisa ser conferida em uma máquina com Docker disponível.
