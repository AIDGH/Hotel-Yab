import { environmentValidationSchema } from './environment';

const productionEnvironment = {
  NODE_ENV: 'production',
  PORT: 4000,
  CORS_ORIGIN: 'https://hotel-yab.example',
  DATABASE_URL: 'postgresql://hotel-yab:secret@localhost:5432/hotel_yab',
  AUTH_OTP_SECRET: 'a-production-secret-with-32-characters',
  AUTH_OTP_TTL_MINUTES: 5,
  AUTH_OTP_RESEND_SECONDS: 60,
  AUTH_SESSION_DAYS: 30,
};

describe('environmentValidationSchema', () => {
  it('rejects development OTP delivery in production', () => {
    const result = environmentValidationSchema.validate({
      ...productionEnvironment,
      SMS_PROVIDER: 'development',
    });

    expect(result.error).toBeDefined();
  });

  it('requires Najva credentials in production', () => {
    const result = environmentValidationSchema.validate({
      ...productionEnvironment,
      SMS_PROVIDER: 'najva',
    });

    expect(result.error).toBeDefined();
  });

  it('accepts disabled OTP delivery in production', () => {
    const result = environmentValidationSchema.validate({
      ...productionEnvironment,
      SMS_PROVIDER: 'disabled',
    });

    expect(result.error).toBeUndefined();
  });

  it('accepts complete Najva production configuration', () => {
    const result = environmentValidationSchema.validate({
      ...productionEnvironment,
      SMS_PROVIDER: 'najva',
      NAJVA_API_KEY: 'secret-key',
      NAJVA_SENDER: '90000123',
      SMS_OTP_ORIGIN_HOST: 'hotel-yab.ir',
    });

    expect(result.error).toBeUndefined();
  });
});
