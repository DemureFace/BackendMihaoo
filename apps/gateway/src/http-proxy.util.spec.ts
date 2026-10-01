import { HttpException } from '@nestjs/common';
import { rethrowUpstreamError, withGetRetry } from './http-proxy.util';

describe('rethrowUpstreamError', () => {
  it('rethrows the upstream status and body when the service answered with an error', () => {
    const axiosError = {
      response: { status: 404, data: { message: 'Not Found' } },
    };

    expect(() => rethrowUpstreamError(axiosError)).toThrow(HttpException);
    try {
      rethrowUpstreamError(axiosError);
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(404);
      expect((error as HttpException).getResponse()).toEqual({
        message: 'Not Found',
      });
    }
  });

  it('throws a 502 when the call never reached the downstream service', () => {
    const networkError = { message: 'connect ECONNREFUSED' };

    try {
      rethrowUpstreamError(networkError);
      throw new Error('expected rethrowUpstreamError to throw');
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(502);
      expect((error as HttpException).getResponse()).toBe(
        'Upstream service unavailable',
      );
    }
  });
});

describe('withGetRetry', () => {
  it('returns the result on the first try when it succeeds', async () => {
    const request = jest.fn().mockResolvedValue('ok');

    await expect(withGetRetry(request)).resolves.toBe('ok');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('retries once on a network failure and returns the retry result', async () => {
    const networkError = { message: 'ECONNRESET' };
    const request = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce('ok on retry');

    await expect(withGetRetry(request)).resolves.toBe('ok on retry');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the downstream service answered with an HTTP error', async () => {
    const upstreamError = { response: { status: 404, data: {} } };
    const request = jest.fn().mockRejectedValue(upstreamError);

    await expect(withGetRetry(request)).rejects.toBe(upstreamError);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('propagates the second failure when the retry also fails', async () => {
    const networkError = { message: 'ECONNRESET' };
    const secondError = { message: 'ETIMEDOUT' };
    const request = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(secondError);

    await expect(withGetRetry(request)).rejects.toBe(secondError);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
