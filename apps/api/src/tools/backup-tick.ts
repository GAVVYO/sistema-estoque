import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BackupsService } from '../backups/backups.service';

async function main() {
  if (process.env.BACKUP_SCHEDULER_MODE !== 'external') throw new Error('Configure BACKUP_SCHEDULER_MODE=external para o cron.');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try { await app.get(BackupsService).tick(); }
  finally { await app.close(); } // waits for the scheduled export to finish
}
void main().catch(() => { console.error('Backup agendado não concluído. Consulte a área de backups.'); process.exitCode = 1; });
