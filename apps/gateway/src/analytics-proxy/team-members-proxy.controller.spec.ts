import { HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { CORRELATION_ID_HEADER } from 'common/common';
import { TeamMembersProxyController } from './team-members-proxy.controller';

const ANALYTICS_SERVICE_URL = 'http://analytics-service:3008';

describe('TeamMembersProxyController', () => {
  let controller: TeamMembersProxyController;
  let httpService: { request: jest.Mock };

  beforeEach(async () => {
    httpService = { request: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamMembersProxyController],
      providers: [
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => ANALYTICS_SERVICE_URL },
        },
      ],
    }).compile();

    controller = module.get(TeamMembersProxyController);
  });

  it('fails to construct when ANALYTICS_SERVICE_URL is not configured', async () => {
    // Mirrors production: a missing <SERVICE>_SERVICE_URL is a startup-time
    // failure (docs/service-communication.md §1), not something that
    // surfaces later on the first request.
    const badModule = Test.createTestingModule({
      controllers: [TeamMembersProxyController],
      providers: [
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => {
              throw new Error(
                'Configuration key "ANALYTICS_SERVICE_URL" does not exist',
              );
            },
          },
        },
      ],
    }).compile();

    await expect(badModule).rejects.toThrow('ANALYTICS_SERVICE_URL');
  });

  it('forwards GET requests to the analytics service with query params and headers', async () => {
    httpService.request.mockReturnValueOnce(of({ data: [{ id: 'tm-1' }] }));

    const result = await controller.findAll(
      { active: 'true' },
      'Bearer token-123',
      'corr-abc',
    );

    expect(result).toEqual([{ id: 'tm-1' }]);
    expect(httpService.request).toHaveBeenCalledWith({
      method: 'get',
      url: `${ANALYTICS_SERVICE_URL}/team-members`,
      data: undefined,
      params: { active: 'true' },
      headers: {
        authorization: 'Bearer token-123',
        [CORRELATION_ID_HEADER]: 'corr-abc',
      },
    });
  });

  it('retries a GET once on a network failure and still returns the retried result', async () => {
    httpService.request
      .mockReturnValueOnce(throwError(() => ({ message: 'ECONNRESET' })))
      .mockReturnValueOnce(of({ data: [] }));

    const result = await controller.findAll({}, 'Bearer t', 'corr-1');

    expect(result).toEqual([]);
    expect(httpService.request).toHaveBeenCalledTimes(2);
  });

  it('forwards POST requests with the body, and does not retry on failure', async () => {
    const upstreamError = {
      response: { status: 400, data: { message: 'bad input' } },
    };
    httpService.request.mockReturnValueOnce(throwError(() => upstreamError));

    await expect(
      controller.create({ name: 'Ann' }, 'Bearer t', 'corr-2'),
    ).rejects.toBeInstanceOf(HttpException);
    expect(httpService.request).toHaveBeenCalledTimes(1);
    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: `${ANALYTICS_SERVICE_URL}/team-members`,
        data: { name: 'Ann' },
      }),
    );
  });

  it('translates an upstream error response into an HttpException with the same status', async () => {
    const upstreamError = {
      response: { status: 404, data: { message: 'not found' } },
    };
    httpService.request.mockReturnValueOnce(throwError(() => upstreamError));

    const call = controller.findOne('missing-id', 'Bearer t', 'corr-3');

    await expect(call).rejects.toBeInstanceOf(HttpException);
    await expect(call).rejects.toMatchObject({ status: 404 });
  });

  it('routes DELETE to the correct sub-path', async () => {
    httpService.request.mockReturnValueOnce(of({ data: undefined }));

    await controller.remove('tm-1', 'Bearer t', 'corr-4');

    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'delete',
        url: `${ANALYTICS_SERVICE_URL}/team-members/tm-1`,
      }),
    );
  });
});
