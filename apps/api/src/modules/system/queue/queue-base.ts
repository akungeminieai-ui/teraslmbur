import { Queue, Job } from 'bullmq';
import { RedisService } from '../redis/redis.service';
import * as crypto from 'crypto';

export abstract class QueueBase<T = any> {
  constructor(
    protected readonly queue: Queue,
    protected readonly redisService: RedisService,
  ) {}

  /**
   * Adds a job to the queue, applying backoff rules, timeouts, priorities, and idempotency locks.
   *
   * @param name Name identifier for the job worker
   * @param data Job payload details
   * @param options Execution configurations
   */
  async enqueue(
    name: string,
    data: T,
    options: {
      priority?: number;
      jobId?: string; // Idempotency key
      timeout?: number; // Job timeout duration in ms
      delay?: number; // Delayed start offset in ms
    } = {},
  ): Promise<Job> {
    const jobId = options.jobId || `${this.queue.name}:${crypto.randomUUID()}`;

    // Duplicate Job Protection (Idempotency) via Redis lock key
    const redis = this.redisService.getClient();
    const lockKey = `lock:job:${jobId}`;
    const acquired = await redis.set(lockKey, 'active', 'PX', 10000, 'NX'); // 10 second lock

    if (!acquired) {
      throw new Error(`Duplicate job execution prevented: Job ID '${jobId}' is already locked/running.`);
    }

    return this.queue.add(name, data, {
      jobId,
      priority: options.priority || 0,
      delay: options.delay || 0,
      attempts: 5, // Retry up to 5 times
      backoff: {
        type: 'exponential',
        delay: 2000, // Starting retry delay offset
      },
      removeOnComplete: true, // Keep DB clean of successful runs
      removeOnFail: false, // Retain failed logs for Dead Letter Queue review
    });
  }

  /**
   * Schedules a recurring cron job.
   */
  async schedule(name: string, data: T, cronExpression: string, jobId?: string): Promise<Job> {
    return this.queue.add(name, data, {
      jobId,
      repeat: { pattern: cronExpression },
    });
  }

  /**
   * Cancels a job matching the target Job ID.
   */
  async cancel(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;
    await job.remove();
    return true;
  }

  /**
   * Explicitly triggers a retry mapping for a failed job.
   */
  async retry(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.retry();
    }
  }
}
