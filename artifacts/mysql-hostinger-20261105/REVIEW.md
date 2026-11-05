# Relatório de implementação e validação — 05/11/2026

## Resultado e escopo

Runtime, schema, migrations, transferência e backups foram adaptados para MySQL. Validação exclusivamente em bancos locais fictícios; Neon, banco compartilhado e produção não foram alterados. Frontend preservado, com alteração indispensável no texto da extensão de backup SQL e suporte a servir React/API no mesmo processo.

Base: integração `sistema-de-estoque-v2`, `ad1fbfad5a7fb269f94339a6b3ef518f76b76a48`. O remoto Pe5ert informa que o endereço canônico passou a `GAVVYO/sistema-estoque`. Branch de trabalho: `codex/mysql-hostinger`. O histórico PostgreSQL permanece intacto; nova cadeia em `apps/api/prisma/mysql-migrations`.

## Ambiente e resultados

- MySQL Community Server **8.0.33**, InnoDB, loopback, bancos novos separados por suíte.
- Node **22.23.4**, Prisma **7.10.0**, pnpm **11.24.0**, macOS. A versão MySQL usada no ensaio não é recomendação para instalar essa versão antiga em produção.
- PostgreSQL local separado, com migrations originais, usado somente como origem fictícia de transferência.
- `pnpm lint`: aprovado.
- `pnpm typecheck`: aprovado.
- `pnpm build`: aprovado; aviso de chunk JavaScript existente de aproximadamente 703 kB permanece. Não impede o build.
- `pnpm test`, com todas as URLs isoladas: **137 testes API aprovados, 0 falhas, 0 ignorados; 29 testes frontend aprovados, 0 falhas, 0 ignorados**. Testes unitários/simulados e integração real coexistem nessa contagem; ela não significa 137 cenários exclusivamente de banco.
- `prisma migrate deploy` em banco MySQL vazio: aprovado. Segunda execução: nenhuma migration pendente.
- `pnpm db:preflight`: aprovado no MySQL local; UTC, SQL estrito, collation `utf8mb4_0900_bin`. Limites locais medidos: pacote 64 MiB, 151 conexões. Esses números não são os limites da Hostinger.
- Fumaça HTTP da aplicação compilada: HTML inicial e rota SPA, API inexistente retorna JSON 404, sessão ausente 401, login Argon2 de usuário transferido e cookie HttpOnly, consultas autenticadas de produtos/clientes/fornecedores/compras/inventário/backups/dashboard: aprovados.

## Evidências de integridade

| Área | Verificação efetivamente executada |
| --- | --- |
| Estoque e Decimal | Persistência exata, saída acima do saldo recusada, duas sessões disputando saldo, estoque e movimento atômicos, rollback e unidade protegida após histórico |
| Idempotência e clientes | Reenvios simultâneos, mesma chave/payload devolve original, payload diferente conflita, cliente ativo, identificação explícita, snapshots e corrida de inativação versus venda |
| Compras | Recebimentos parciais, repetição e concorrência sem duplicação, saldo e auditoria na mesma transação |
| Inventário físico | Revisões/conflitos, movimentação concorrente, ajustes exatos e conclusão/rollback |
| Importação | Lotes 10/100/1000, confirmação/refresh concorrentes, revalidação de códigos, rollback integral e repetição |
| Collations | Caixa, acentos, espaços finais, barcode exato, SKU sem distinguir caixa, URLs longas com prefixo igual sem falso conflito |
| Transferência | Conferência/check/apply/reexecução, destino divergente recusado, IDs/FKs/decimais/datas/senha/snapshots e comparação canônica integral |
| Datas | UTC com milissegundos preservado; teste verifica string SQL e leitura/gravação pelo Prisma no host America/Fortaleza |
| Backup | ADMIN/Origin, trava, checksum, retenção, timeout de conexão e restauração em outro banco vazio; dados, Decimal, hashes fictícios, referências e CHECKs conferidos |

Um ensaio adicional preencheu **14 tabelas de negócio** no PostgreSQL com dados fictícios, incluindo pedido/recebimento parcial, movimentos, inventário, importação JSON e imagem. Transferência e reexecução compararam todas as colunas dessas tabelas; o login do usuário transferido foi confirmado na API compilada. Nenhum valor privado ou fingerprint de linha consta deste relatório.

A diferença de três horas detectada inicialmente pertencia ao parsing automático Date do driver usado na observação direta. O teste passou a ler o valor SQL bruto e a verificar separadamente o adaptador Prisma, que trata UTC. Não foi alterada a expectativa de horário para aceitar deslocamento.

## Limitações e prioridades antes de produção

**Prioridade alta — bloqueiam liberação:**

1. Confirmar versão exata MariaDB da assinatura e executar migrations, concorrência e restauração nessa mesma família/versão. A execução MySQL 8.0.33 não homologa MariaDB. A observação dos locks da suíte usa performance_schema do MySQL e precisa da equivalente MariaDB.
2. Homologar instalação Linux de Argon2/Sharp, geração Prisma, start, proxy HTTPS, Secure cookies e origem real.
3. Confirmar armazenamento privado persistente após redeploy/restart e cron efetivo. Backups locais sujeitos à substituição do deploy não são aceitáveis.
4. Concluir a conferência visual desktop/mobile, mensagens de erro e preservação de rascunhos. Nesta execução, o controle do navegador recusou criar abas e o serviço nativo não iniciou. A fumaça HTTP e os testes de frontend não substituem essa homologação visual.
5. Aprovar janela de manutenção, cópia real de ensaio e procedimento de corte. Não existe autorização para migrar o banco compartilhado nesta entrega.

**Prioridade média — dimensionar antes de liberação:**

- A Hostinger limita requisições Node a 120 segundos e não garante workers permanentes. Configurar backup inline com orçamento menor; agenda por cron externo. Se o volume real ultrapassar esse limite, executar exportação supervisionada fora da requisição.
- O transferidor conserva dados em memória. Dimensionar a máquina administrativa pelo volume real; suspender escritas e DDL durante o corte.
- Cloudinary permanece separado. Conferir quota e retomada da limpeza periódica; backup SQL não contém fotos.
- Testar restauração na versão de destino; SHOW CREATE TABLE não garante portabilidade MySQL ↔ MariaDB.
- Reversão após novas escritas MySQL exige reconciliação com PostgreSQL. O transferidor de ida não fornece migração reversa automática.

**Melhoria posterior:** dividir o bundle frontend para reduzir o carregamento inicial. Fora do escopo desta migração.

Não foi encontrada falha crítica remanescente nos cenários aprovados em MySQL. Isso não equivale a garantia de ausência de erros nem aprovação para produção enquanto os bloqueios acima permanecerem.

## Procedimentos e revisão

Configuração, comandos, criação de bancos isolados, backup/restauração, transferência, corte e retorno estão em [docs/MYSQL_HOSTINGER.md](../../docs/MYSQL_HOSTINGER.md). `pnpm test:mysql` exige administradores locais explícitos, cria bancos novos e não utiliza DATABASE_URL da aplicação. As contas e os dumps ficam fora do Git.

Commits de implementação: `fb563f6` (schema/runtime/integridade) e `f3fd3ff` (backups/transferência/ferramentas). A documentação e este relatório são entregues em commit próprio posterior. PR destinado à revisão, sem merge ou publicação automática.
