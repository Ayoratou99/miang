import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JOB_SWEEP_DRAWS, QUEUE_DRAW } from '../common/constants';
import { DrawService } from '../draw/draw.service';

/** Consumes the draw queue: sweeps every session whose midnight has passed. */
@Processor(QUEUE_DRAW)
export class DrawProcessor extends WorkerHost {
  private readonly logger = new Logger('DrawProcessor');

  constructor(private readonly draw: DrawService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_SWEEP_DRAWS) {
      return;
    }
    const ids = await this.draw.dueSessionIds();
    if (ids.length) {
      this.logger.log(`Sweep: ${ids.length} session(s) à tirer`);
    }
    for (const id of ids) {
      try {
        await this.draw.runDrawForSession(id);
      } catch (err) {
        this.logger.error(`Tirage ${id} échoué`, (err as Error).stack);
      }
    }
  }
}
