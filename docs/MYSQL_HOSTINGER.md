# Migração MySQL e homologação Hostinger

Esta branch prepara a aplicação para MySQL/MariaDB. A produção continua dependendo de aprovação específica, preflight do banco contratado e homologação. Não executar os comandos de transferência em uma base compartilhada apenas para experimentar.

## Base e assinatura verificadas

A implementação parte de `Pe5ert/sistema-de-estoque`, integração `sistema-de-estoque-v2`, commit `ad1fbfa`, consultado no remoto em 05/11/2026. O commit `338bdbc` citado na solicitação não era a ponta dessa branch. O remoto informou posteriormente a mudança do endereço canônico para GAVVYO/sistema-estoque. A checkout da demonstração GAVVYO permanece separada.

O painel da assinatura Unlimited confirmou 50 GB, 3072 MB de RAM, 2 núcleos, 120 processos, 60 PHP workers, Node 18/20/22/24 e pnpm. O painel também lista NestJS como framework suportado. Esses recursos são compartilhados com os outros sites da assinatura.

A documentação oficial informa 5 aplicações Node.js por plano Business/Unlimited, requisições com limite de 120 segundos e ausência de garantia para workers permanentes e WebSockets de entrada. O lockfile pnpm e o campo packageManager são suportados no monorepo.

A Hostinger informa MariaDB nos planos Web/Cloud. O phpMyAdmin da conta examinada não apresentou um banco acessível para executar SELECT VERSION(). A versão exata do banco da assinatura, o max_allowed_packet, os limites efetivos de conexões por usuário, ferramentas SSH/cron e a persistência após redeploy continuam pendentes de medição. Não se considera o plano homologado só por aceitar Node.

Referências oficiais consultadas em 05/11/2026

- [Monorepos e pnpm](https://www.hostinger.com/support/how-to-deploy-monorepos-with-npm-yarn-or-pnpm-on-hostinger/)
- [Limites Node.js](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/)
- [Recursos por plano](https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans-in-hostinger/)
- [Mecanismo MariaDB](https://www.hostinger.com/support/1583226-which-database-management-system-is-used-at-hostinger/)
- [Consultar versão do banco](https://www.hostinger.com/support/how-to-check-your-database-version-in-phpmyadmin-at-hostinger/)

## Banco e migrations

O runtime usa PrismaMariaDb e pool de 5 conexões por processo. Cada sessão configura UTC e modo SQL estrito com ANSI_QUOTES. Transações de escrita usam READ COMMITTED, travas de linha e até duas repetições adicionais de transações integralmente revertidas por deadlock P2034. Os produtos continuam bloqueados em ordem de UUID. Inventário e imports mantêm as revisões e o rollback do lote.

OperationLock implementa a exclusão transacional das chaves de movimentação por usuário e dos UUIDs de recebimento. INSERT com chave única e lock InnoDB serializa também o primeiro envio simultâneo. A operação anterior e seu hash são consultados dentro da mesma transação. Linhas de trava são mantidas, sem limpeza concorrente que possa permitir duas operações para a mesma chave.

O schema usa UUID em CHAR(36), Decimal(18,2/3), enums, JSON e DATETIME(3). IDs são imutáveis no contrato da API. ON UPDATE RESTRICT nas FKs permite manter os CHECKs de estado no MySQL e recusa a alteração manual de um ID referenciado. O histórico PostgreSQL em `apps/api/prisma/migrations` foi preservado. A cadeia nova fica em `apps/api/prisma/mysql-migrations`. Nunca executar o SQL PostgreSQL no MySQL ou editar o histórico já aplicado em uma instalação.

As tabelas usam collation binária NO PAD, escolhida na migration entre utf8mb4_0900_bin no MySQL e utf8mb4_nopad_bin no MariaDB. Caixa, acentos e espaços finais permanecem distintos. O SKU recebe também chave gerada sobre LOWER(sku), mantendo sua unicidade sem distinguir caixa. A busca sem distinguir caixa aplica LOWER sem remover acentos. Barcodes são comparados exatamente. A ordenação passa a ser binária e determinística, e deve ser comparada com a collation do PostgreSQL de origem na revisão operacional.

URLs de imagem de até 2048 caracteres conservam o contrato. Uma chave gerada SHA-256 aplica unicidade ao valor inteiro, sem índice de prefixo que recusaria duas URLs diferentes com o mesmo começo. Cloudinary permanece responsável pelas imagens. A migração não copia os arquivos remotos.

## Build e execução

Usar Node 22 compatível com package.json e pnpm 11.24.0. Os comandos abaixo pressupõem dependências instaladas com o lockfile e variáveis configuradas fora do Git.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm db:preflight
pnpm --filter @stock/api db:deploy
pnpm start
```

`db:preflight` exige MYSQL_PREFLIGHT_URL explícita. É somente leitura e informa versão, mecanismo, collation, modo SQL, timezone e limites de pacote/conexões, sem imprimir a URL. Recusa versões anteriores a MySQL 8.0.17 ou MariaDB 10.6 e ausência da collation necessária. Isso é uma checagem mínima, não certificação de uma versão ainda não ensaiada.

No painel Node.js, selecionar a branch de trabalho ou sua versão revisada, diretório raiz do monorepo, Node 22, build `pnpm build` e start `pnpm start`. Não selecionar implantação estática nem apontar a raiz para a branch PHP legada.

Configurar na API e no build

| Variável | Uso |
| --- | --- |
| DATABASE_URL | Conexão mysql:// do banco homologado |
| MYSQL_PREFLIGHT_URL | Conexão explicitamente escolhida para o preflight |
| NODE_ENV | production |
| PORT | Porta fornecida pela Hostinger, com precedência sobre API_PORT |
| WEB_ORIGIN | Origem HTTPS exata do site, sem barra final |
| VITE_API_URL | /api, compilado pelo Vite |
| JWT_SECRET | Segredo aleatório próprio de produção |
| SERVE_WEB | true para servir React e API no mesmo processo |
| CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET | Configuração existente do serviço de imagens |
| BACKUP_DIRECTORY | Caminho absoluto privado fora de public_html e do diretório substituído no deploy |
| BACKUP_EXECUTION_MODE | inline na Hostinger |
| BACKUP_SCHEDULER_MODE | external na Hostinger |
| BACKUP_TIMEOUT_SECONDS | 90 como ponto inicial, a validar com o tamanho do banco |
| BACKUP_RETENTION_DAYS | Política de retenção, dentro da quota de disco |
| BACKUP_AUTO_ENABLED / BACKUP_HOUR / BACKUP_TIME_ZONE | Padrões iniciais da agenda |

A API serve os arquivos de apps/web/dist quando SERVE_WEB=true, com fallback SPA somente fora de /api. O cookie continua HttpOnly e Secure em produção HTTPS. Conferir login, /api/auth/me, CORS, Origin e logout no endereço final. Não colocar segredos em variáveis VITE_.

## Backups e restauração

Backups SQL são exportados por conexão própria em REPEATABLE READ com snapshot consistente e streaming das linhas. Só são aceitas tabelas InnoDB. O arquivo inclui estrutura, índices gerados, CHECKs e dados, inclusive as migrations MySQL e chaves de idempotência existentes no banco. Não depende de mysqldump ou pg_dump.

O arquivo é publicado após terminar a exportação, gravar o marcador de conclusão, fsync e calcular SHA-256. O marcador não substitui um ensaio de recuperação. ADMIN, proteção de Origin, trava de filesystem, escrita atômica de metadata, verificação de checksum no download e retenção após cópia válida permanecem ativos.

O download usa extensão .sql. Os arquivos internos mantêm extensão .dump por compatibilidade com os manifestos do serviço. Não misturar cópias PostgreSQL antigas na pasta configurada para os backups MySQL. Preservar ambas as pastas durante a transição.

Na Hostinger, o modo inline conclui o trabalho dentro da requisição para não depender de um worker sobrevivendo ao HTTP 202. A conexão e a exportação devem caber no limite de 120 segundos do provedor. Ajustar o timeout para que conexão, geração e resposta caibam nesse limite. Se o volume real não couber, usar execução externa supervisionada e armazenamento persistente antes de aprovar produção.

Para a agenda, configurar cron do provedor com o ambiente da aplicação e o mesmo BACKUP_DIRECTORY, executando a cada minuto

```sh
cd /caminho/privado/do/projeto
pnpm backup:tick
```

O comando verifica o período devido, aguarda a exportação e encerra. A API e o cron compartilham a trava, a agenda salva pelo ADMIN e os manifestos. O caminho e as variáveis reais devem ficar em arquivo privado com permissão 600. Confirmar no plano o acesso ao Node/pnpm do cron, a duração máxima e a persistência dessa pasta.

A função restoreMysqlArchive exige banco loopback novo terminado em _test, arquivo completo e checksum esperado. Recusa banco não vazio, restaura estrutura/dados e verifica referências. Em falha de DDL, o banco de ensaio pode ficar parcialmente criado. Preservar o erro e usar outro banco vazio para repetir. A recuperação foi projetada primeiro para ensaio, e não para sobrescrever produção pela interface.

Executar a restauração de homologação na mesma família/versão do banco de destino. SQL de SHOW CREATE TABLE pode variar entre MySQL e MariaDB. Não prometer portabilidade de um dump nativo entre mecanismos sem um ensaio separado. Backups do banco não incluem imagens do Cloudinary.

## Transferência verificável

A ferramenta exige MIGRATION_SOURCE_URL e MIGRATION_TARGET_URL explícitas, sem fallback para DATABASE_URL. A origem deve ser PostgreSQL e o destino MySQL. Por padrão ambos devem ser loopback com nome terminado em _test. Fora disso, a opção `--approved-production-transfer=NOME_DO_DESTINO` existe somente para uma execução posterior expressamente aprovada.

Preparar o destino com as migrations MySQL, deixando as tabelas de negócio vazias. Suspender escritas na origem e no destino durante a transferência final e impedir alterações de schema durante snapshot/backup. Executar em máquina administrativa com RAM para os dados, pois a ferramenta conserva snapshots em memória para comparação integral.

```sh
pnpm db:transfer
pnpm db:transfer --apply --maintenance-ack
pnpm db:transfer --apply --maintenance-ack
```

A primeira execução confere as tabelas e compara os destinos sem inserir linhas. Apply só insere num destino vazio e usa uma única transação. IDs, datas UTC com milissegundos, decimais como strings, hashes de senha e snapshots são preservados. O histórico de migrations PostgreSQL não é copiado sobre o histórico novo MySQL. A importação não converte vendas legadas em anônimas.

A ordem segue as FKs da origem. A ferramenta compara todas as colunas de todas as tabelas de negócio por representação canônica, com contagens e fingerprints internos. Não imprime dados, hashes de senha ou fingerprints de conteúdo privado. Distingue SQL NULL de JSON null. Números JSON que não podem passar pela representação de destino sem perda são recusados antes das inserções.

Uma reexecução com destino integralmente idêntico é no-op. Qualquer destino parcialmente preenchido ou divergente é recusado. Não há upsert que reescreva história. Uma falha antes do commit reverte os INSERTs. Sequências/autoincrementos explícitos são conservados pelos valores transferidos e devem ser conferidos com a próxima criação de pedido.

A comparação de contagens sozinha não é suficiente. Além da comparação integral, conferir login dos usuários migrados, vínculos, último saldo auditado de cada produto, snapshots, valores e próxima numeração de compra. Para dados reais, pedir antes autorização específica para cópia de ensaio e usar armazenamento privado.

## Entrada em produção e retorno

1. Aprovar preflight e homologação da versão exata MariaDB/MySQL da assinatura, do build, das permissões e das limitações pendentes.
2. Revisar PR e aprovar a implantação. Preparar domínio, HTTPS, origens, Cloudinary e armazenamento privado.
3. Fazer backup consistente PostgreSQL e testar sua restauração em base separada. Guardar também a configuração e as referências do Cloudinary.
4. Iniciar manutenção, suspender as escritas e registrar o ponto de corte. Produzir uma cópia final e comparar o conjunto completo.
5. Migrar para destino MySQL vazio, conferir dados e executar fumaça funcional. Liberar escritas somente após aprovação das comparações e do backup MySQL restaurado.
6. Antes da primeira escrita MySQL, o retorno pode usar a origem congelada e validada. Depois de novas operações, reabrir a base PostgreSQL antiga perderia esses registros.
7. Para retorno posterior, suspender novamente escritas, exportar os dados e eventos criados/alterados no MySQL e ensaiar sua reconciliação numa cópia PostgreSQL. O utilitário desta branch faz a transferência de ida e não implementa reconciliação reversa automática. Esse ensaio e aprovação são obrigatórios antes de prometer retorno sem perda.
8. Se a reconciliação não estiver pronta, manter a manutenção e corrigir o destino. Não apontar para uma cópia antiga como se ela fosse atual.

## Pendências de aprovação e homologação

- Versão real e recursos SQL do banco Hostinger, inclusive suporte à collation e aos CHECKs da migration.
- Instalação das dependências nativas Argon2/Sharp e geração Prisma no Linux da Hostinger.
- Porta e proxy HTTPS reais, cookies, domínio e certificados.
- Persistência e permissões da pasta privada após deploy/restart e cron na conta contratada.
- Tamanho/tempo real da exportação dentro dos limites e armazenamento externo das cópias.
- Cópia autorizada de dados reais para ensaio, confronto com a origem e plano reverso com operações pós-corte.
- Publicação em homologação, migração do compartilhado e entrada em produção, cada uma com autorização apropriada.

## Reproduzir a validação isolada

`pnpm test:mysql` exige `MYSQL_TEST_ADMIN_URL` e `POSTGRES_TEST_ADMIN_URL` explícitas apontando para servidores loopback descartáveis. As contas precisam criar bancos. Configure as URLs em ambiente privado; não coloque senhas no histórico de comandos. O runner cria bancos novos com prefixo `gav_qa_<timestamp>_`, aplica os históricos de cada mecanismo em seus respectivos bancos, define todas as URLs de integração e executa `pnpm test`. DATABASE_URL recebe um endereço inválido para impedir fallback. Os bancos fictícios são mantidos para inspeção; sua remoção é uma ação administrativa posterior, pelo prefixo exato informado.

A suíte exige MySQL real com `performance_schema.data_lock_waits` acessível para observar as corridas. A homologação MariaDB ainda deve adaptar/validar a observação equivalente de locks dessa versão, sem substituir as assertions por atrasos fixos.

`pnpm test` sem essas variáveis continua executando testes locais e sinalizando os testes de integração opt-in como ignorados. Uma execução com skips não vale como homologação completa. Lint/typecheck/build exigem DATABASE_URL configurada para a geração Prisma; a geração não se conecta ao banco.

Para restaurar o SQL em ensaio, configurar em ambiente privado `BACKUP_RESTORE_TEST_URL`, `BACKUP_RESTORE_FILE` (caminho absoluto do arquivo baixado) e `BACKUP_RESTORE_SHA256` (checksum do manifesto), e executar `pnpm db:restore-test`. O destino deve ser loopback, vazio e terminado em `_test`. Não altera o banco da aplicação por fallback. Após o retorno bem-sucedido, comparar as tabelas, valores, autenticação e CHECKs; o comando verifica integridade do arquivo e referências, não conhece sozinho os dados esperados da origem.

A limpeza periódica de imagens continua no serviço existente. Como o plano não garante workers permanentes, homologar também a retomada dessa limpeza; imagens órfãs podem permanecer no Cloudinary até a próxima execução. Não transferir a responsabilidade por fotos para o disco do plano nesta migração.
