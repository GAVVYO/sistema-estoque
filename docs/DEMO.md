# Demo GAVYO Estoque – Lavanderia de EPI

Demonstração presencial, rodando no notebook. Dados fictícios de uma lavanderia industrial que vende e aluga EPI: 19 produtos, 6 clientes, 2 fornecedores, ~60 dias de movimentações e pedidos de compra. Os 3 produtos genéricos do seed base (cabo USB-C, caixa organizadora, fita para embalagem) ficam inativos e com o movimento inicial 60 dias atrás, fora do total e da atividade recente.

## Rodar com um comando (pacote para compartilhar)

**Mac sem Docker:** siga [INICIAR-DEMO.md](../INICIAR-DEMO.md) e execute
`bash scripts/demo-mac.sh` na pasta do projeto. O comando verifica o macOS,
instala os componentes locais e preserva os dados em `.demo-mac/` entre usos.
Não use `pnpm demo:reset` nesse modo: ele pertence ao Compose antigo.

Instale e abra o Docker Desktop com Docker Compose v2. Para obter pelo Git:

```sh
git clone -b demo-lavanderia --single-branch https://github.com/GAVVYO/sistema-estoque.git
cd sistema-estoque
```

Se recebeu o pacote `lavanderia-demo.zip`, extraia e abra o terminal dentro da
pasta `lavanderia-demo`. Na pasta do projeto, execute:

```sh
docker compose -f compose.demo.yml up --build
```

Na primeira execução precisa de internet para baixar as imagens e dependências.
Quando a API e o frontend estiverem prontos, abra **http://localhost:5173**.

- E-mail: `demo@lavanderia.local`
- Senha: `LavanderiaDemo123!`

O comando instala Node/pnpm dentro do contêiner, compila o projeto, aplica as
migrations e prepara a lavanderia somente na primeira inicialização. Não precisa
instalar Node/PostgreSQL ou preencher `.env` no computador. O banco fica em um
volume exclusivo `gavyo-lavanderia-demo_demo_database`, sem
publicar a porta do PostgreSQL; a aplicação atende somente no próprio computador.
Backups automáticos ficam desligados; ferramentas de backup e upload de imagens
não são configurados neste pacote de demonstração.

Para parar, pressione **Ctrl+C**. Para voltar, execute o mesmo comando; os dados
continuam salvos. Para encerrar e remover apenas os contêineres:

```sh
docker compose -f compose.demo.yml down
```

Se a primeira preparação for interrompida após criar o usuário, o inicializador
recusa continuar com dados incompletos. Somente para **apagar toda esta demo** e
preparar novamente, execute `docker compose -f compose.demo.yml down -v` e depois
o comando de início. Não use `pnpm demo:reset` para este pacote: esse comando
antigo pertence ao outro Compose.

Estas credenciais são públicas e exclusivas dos dados fictícios da demo local.
O pacote deve conter os arquivos `compose.demo.yml`, `Dockerfile.demo` e
`scripts/start-demo.mjs`; eles precisam acompanhar o código ao compartilhar.

## 1. Preparar (uma vez, na véspera)

Pré-requisitos: Docker rodando, Node 22, pnpm.

```
cp .env.example .env
```

No `.env`, ajuste:

- `JWT_SECRET`: 32+ caracteres aleatórios (`openssl rand -hex 32`).
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`: login usado na apresentação.
- `BACKUP_AUTO_ENABLED=false`: evita backup automático durante a demo.
- `WEB_ORIGIN=http://localhost:5173` (padrão; o `demo:start` usa essa porta).

```
pnpm install
pnpm demo:reset
```

`demo:reset` **apaga o banco local**, recria, aplica migrations, cria o admin e gera os dados da lavanderia. Pode rodar de novo sempre que quiser voltar ao estado inicial da demo; o resultado é sempre o mesmo.

## 2. Rodar no dia

```
pnpm demo:start
```

Faz o build de produção e sobe API + front em http://localhost:5173 (sem overlay de erro do Vite). Para desenvolvimento normal continue usando `pnpm dev`.

## 2b. Alternativa: GitHub Codespaces (sem instalar nada no notebook)

Útil quando o notebook não roda Docker/Node atuais (ex.: macOS 11). Tudo roda numa máquina Linux do GitHub; no notebook só o navegador.

1. No GitHub, no repositório, escolha a branch e clique em **Code → Codespaces → Create codespace**. Use máquina de 4 núcleos.
2. Com o `.devcontainer` no repositório, o Codespace já instala dependências e cria o `.env` (origem correta, `JWT_SECRET`, backup desligado). Sem ele, rode no terminal: `corepack enable && pnpm install && node .devcontainer/setup-env.mjs`.
3. `pnpm demo:reset` e depois `pnpm demo:start`.
4. Abra a porta **5173** pela aba **Ports** (não use a 3000: o front chama `/api` pelo proxy do Vite, mantendo front e API na mesma origem).
5. Para apresentar, deixe o Codespace ligado e a aba aberta antes do cliente chegar. Codespaces desligam após ~30 min sem uso; ao religar, rode só `pnpm demo:start`.

## 3. Roteiro (~15 min)

A ordem conta uma história: "como está o estoque → o que está acabando → como repor → quem compra".

1. **Login** (`/login`). Entrar já com a sessão aberta antes do cliente chegar; mostrar o login só se perguntarem sobre acesso.
2. **Visão geral** (`/`). Contadores de produtos (normais, baixos, zerados), "Requerem atenção", atividade recente e gráfico de entradas e saídas (7, 30 ou 90 dias).
   - Fala: "Em um olhar você sabe o que entrou, o que saiu e o que está acabando."
   - Apontar os itens abaixo do mínimo: luva nitrílica G, bota PVC nº 42, máscara descartável, alvejante.
3. **Produtos** (`/products`). Filtrar por categoria "Proteção das mãos"; clicar na luva nitrílica G e mostrar saldo, mínimo, custo, venda e a evolução do saldo.
   - Mostrar a busca do topo ("Produto ou função…", Ctrl K) achando um item pelo nome, ex.: "respirador".
4. **Movimentações** (`/movements`). Registrar **ao vivo** uma venda: digitar `EPI-PFF2` + Enter, quantidade 10, **Saída**, motivo **Venda**, **Identificar cliente** → Hospital São Lucas, **Confirmar venda**.
   - Voltar à visão geral: a venda aparece em "Atividade recente" e nas saídas do gráfico.
5. **Histórico** (`/history`). Buscar `EPI-BOT-PVC-40`: aparecem vendas, devoluções (motivo Devolução), uma perda por peça danificada e saídas para aluguel (motivo **Outro**).
   - Clicar numa saída "Outro" para mostrar a observação "Saída para aluguel – cliente" e a referência `ALG-…`.
   - Fala: "Toda peça que sai e volta fica registrada, com quem fez e quando."
6. **Compras** (`/purchases`). Abrir o pedido **Enviado** (o mais recente, "Reposição urgente", itens críticos) e um pedido **Recebido** antigo.
   - Se der tempo, registrar uma entrega parcial: em **Receber mercadorias**, informar 5 em "Receber agora" da bota PVC nº 42, **Revisar recebimento** → **Confirmar recebimento**. O saldo da bota sobe de 3 para 8 e o pedido passa a **Parcialmente recebido**.
7. **Clientes** (`/customers`). Na linha do Hospital São Lucas, clicar em **Saídas por venda** (coluna Consulta) para ver as vendas dele no histórico. Clicar na linha abre o cadastro.
8. **Fornecedores** (`/suppliers`). Nordeste EPI e Química Limpa.
9. **Fechamento**: inventário físico (`/physical-inventories`), importação por planilha (`/products/import`) e backups como recursos de segurança/implantação.

### Perguntas prováveis

- **"Controla aluguel?"** Hoje registra saída para aluguel e devolução como movimentos comuns, com o cliente e a referência na observação. Controle de contratos, prazos e cobrança de aluguel é o próximo módulo do roadmap. Não prometer data sem combinar.
- **"Funciona no celular?"** O layout é responsivo; mostrar redimensionando a janela se precisar.
- **"Consigo importar o que já tenho?"** Sim, importação de produtos por planilha.
- **"E se perder os dados?"** Backups completos manuais e agendados (semanal/mensal), com download. A restauração é feita pelo administrador do banco, fora da tela, seguindo o guia da própria página de backups.
- **"Mais de um usuário?"** Sim, com perfis Admin, Gerente e Operador.

## 4. Checklist do dia

- [ ] `pnpm demo:reset` rodado de manhã (dados frescos, datas relativas a hoje).
- [ ] `pnpm demo:start` no ar e login feito.
- [ ] Roteiro ensaiado uma vez de ponta a ponta.
- [ ] Notebook na tomada, suspensão e notificações desligadas.
- [ ] Navegador em janela limpa, zoom 110–125% se for projetar.
- [ ] Plano B: vídeo curto gravado do roteiro.

## 5. Problemas comuns

| Sintoma | Causa provável | Ação |
|---|---|---|
| Login falha / 403 nas chamadas | `WEB_ORIGIN` diferente da porta do front | Deixar `http://localhost:5173` e reiniciar |
| "Dados de demo já existem" | Script já rodou nesse banco | `pnpm demo:reset` |
| `docker compose up --wait` falha | Docker parado ou porta 5432 ocupada | Abrir o Docker / parar outro Postgres |
| Erro de porta 5173 em uso | `pnpm dev` ainda aberto | Fechar o outro processo |
| Codespace: login volta para a tela inicial | `WEB_ORIGIN` não é a URL da porta 5173 | Rodar `node .devcontainer/setup-env.mjs` e reiniciar o `demo:start` |
