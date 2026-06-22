import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { JOB_SWEEP_DRAWS, QUEUE_DRAW } from '../common/constants';

/** Registers the repeatable midnight sweep (cron) when the worker boots. */
@Injectable()
export class DrawScheduler implements OnModuleInit {
  private readonly logger = new Logger('DrawScheduler');

  constructor(
    @InjectQueue(QUEUE_DRAW) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const pattern = this.config.get<string>('draw.cron') ?? '0 0 * * *';
    await this.queue.add(
      JOB_SWEEP_DRAWS,
      {},
      { repeat: { pattern }, jobId: 'sweep-draws', removeOnComplete: true, removeOnFail: 50 },
    );
    this.logger.log(`Tirage planifié (cron « ${pattern} »)`);
  }
}
