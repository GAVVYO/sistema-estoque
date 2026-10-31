# Lavanderia — demonstração local

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
