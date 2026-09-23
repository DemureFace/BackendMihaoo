import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ExportJob } from '../types/banner-export.types';

@Injectable()
export class BannerExportJobService {
  private jobs = new Map<string, ExportJob>();

  createJob(cacheKey?: string) {
    const jobId = randomUUID();

    const job: ExportJob = {
      id: jobId,
      status: 'processing',
      progress: 0,
      createdAt: new Date().toISOString(),
      cacheKey,
    };

    this.jobs.set(jobId, job);

    return job;
  }

  getJob(jobId: string) {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    return job;
  }

  findJob(jobId: string) {
    return this.jobs.get(jobId) || null;
  }

  setJob(jobId: string, job: ExportJob) {
    this.jobs.set(jobId, job);
    return job;
  }

  updateJob(jobId: string, patch: Partial<ExportJob>) {
    const job = this.getJob(jobId);

    const updatedJob: ExportJob = {
      ...job,
      ...patch,
    };

    this.jobs.set(jobId, updatedJob);

    return updatedJob;
  }

  updateProgress(jobId: string, progress: number) {
    return this.updateJob(jobId, { progress });
  }

  markCompleted(
    jobId: string,
    payload: {
      zipPath: string;
      downloadUrl: string;
    },
  ) {
    return this.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      zipPath: payload.zipPath,
      downloadUrl: payload.downloadUrl,
    });
  }

  markFailed(
    jobId: string,
    payload: {
      error: string;
      retryAfterSeconds?: number;
      retryAvailableAt?: string;
    },
  ) {
    return this.updateJob(jobId, {
      status: 'failed',
      progress: 100,
      error: payload.error,
      retryAfterSeconds: payload.retryAfterSeconds,
      retryAvailableAt: payload.retryAvailableAt,
    });
  }
}
