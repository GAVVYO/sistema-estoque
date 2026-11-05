import { restoreMysqlArchive } from '../backups/mysql-archive';

async function main() {
  const connection = process.env.BACKUP_RESTORE_TEST_URL;
  const archive = process.env.BACKUP_RESTORE_FILE;
  const checksum = process.env.BACKUP_RESTORE_SHA256;
  if (!connection || !archive || !checksum || !/^[a-f0-9]{64}$/.test(checksum)) throw new Error('Configuração de ensaio incompleta.');
  await restoreMysqlArchive(connection, archive, checksum);
  console.log('Cópia restaurada em destino isolado e referências verificadas. Compare também dados e restrições com a origem.');
}
void main().catch(() => { console.error('Restauração de ensaio recusada ou incompleta. Preserve o destino para inspeção e repita somente em outro banco vazio.'); process.exitCode = 1; });
