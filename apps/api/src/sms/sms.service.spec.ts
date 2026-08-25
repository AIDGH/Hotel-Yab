import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/environment';
import { SmsService } from './sms.service';

function createService(values: Partial<EnvironmentVariables>) {
  const config = {
    get: jest.fn((key: keyof EnvironmentVariables) => values[key]),
  } as unknown as ConfigService<EnvironmentVariables, true>;
  return new SmsService(config);
}

describe('SmsService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not call Najva in development delivery mode', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const service = createService({ SMS_PROVIDER: 'development' });

    await service.sendOtp('+989121234567', '123456');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not call Najva and exposes the code in preview delivery mode', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const service = createService({ SMS_PROVIDER: 'preview' });

    await service.sendOtp('+989121234567', '123456');

    expect(service.usesDevelopmentDelivery()).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects OTP delivery without exposing a development code when disabled', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const service = createService({ SMS_PROVIDER: 'disabled' });

    await expect(
      service.sendOtp('+989121234567', '123456'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(service.usesDevelopmentDelivery()).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends a normalized Iranian mobile through the approved Najva template', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          return: { status: 200 },
          entries: [{ messageid: 42, status: 1 }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const service = createService({
      SMS_PROVIDER: 'najva',
      NAJVA_API_BASE_URL: 'https://sms.najva.com',
      NAJVA_API_KEY: 'secret-key',
      NAJVA_SENDER: '90000123',
      NAJVA_OTP_TEMPLATE: 'HotelYabOTPTemplate',
      SMS_OTP_ORIGIN_HOST: 'hotel-yab.ir',
    });

    await service.sendOtp('+989121234567', '123456');

    const requestUrl = fetchSpy.mock.calls[0][0];
    expect(requestUrl).toBeInstanceOf(URL);
    if (!(requestUrl instanceof URL)) throw new Error('Expected a URL request');
    expect(requestUrl.origin + requestUrl.pathname).toBe(
      'https://sms.najva.com/v1/secret-key/verify/lookup.json',
    );
    expect(requestUrl.searchParams.get('receptor')).toBe('09121234567');
    expect(requestUrl.searchParams.get('sender')).toBe('90000123');
    expect(requestUrl.searchParams.get('template')).toBe('HotelYabOTPTemplate');
    expect(requestUrl.searchParams.get('token')).toBe('123456');
    expect(requestUrl.searchParams.get('token2')).toMatch(/^\d{2}:\d{2}$/);
    expect(requestUrl.searchParams.get('token3')).toBe('hotel-yab.ir');
    expect(fetchSpy.mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('rejects unsuccessful Najva responses', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ return: { status: 418 }, entries: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const service = createService({
      SMS_PROVIDER: 'najva',
      NAJVA_API_BASE_URL: 'https://sms.najva.com',
      NAJVA_API_KEY: 'secret-key',
      NAJVA_SENDER: '90000123',
      NAJVA_OTP_TEMPLATE: 'HotelYabOTPTemplate',
      SMS_OTP_ORIGIN_HOST: 'hotel-yab.ir',
    });

    await expect(
      service.sendOtp('+989121234567', '123456'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
