import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mysqlAdapter } from './mysql-adapter';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ConfigService) config: ConfigService) {
    super({ adapter: mysqlAdapter(config.getOrThrow<string>('DATABASE_URL')), transactionOptions: { isolationLevel: 'ReadCommitted', maxWait: 10000, timeout: 30000 } });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
