import Joi from 'joi';

export type EnvironmentVariables = {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  CORS_ORIGIN: string;
  SWAGGER_ENABLED: boolean;
  DATABASE_URL: string;
  AUTH_OTP_SECRET: string;
  AUTH_OTP_TTL_MINUTES: number;
  AUTH_OTP_RESEND_SECONDS: number;
  AUTH_SESSION_DAYS: number;
};

const nodeEnvironment = process.env.NODE_ENV ?? 'development';

export const environmentFilePaths = [`.env.${nodeEnvironment}`, '.env'];

export const environmentValidationSchema = Joi.object<EnvironmentVariables>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(4000),
  CORS_ORIGIN: Joi.string().uri().default('http://localhost:3000'),
  SWAGGER_ENABLED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(nodeEnvironment !== 'production'),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  AUTH_OTP_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().default(
        'hotel-yab-development-otp-secret-change-me',
      ),
    }),
  AUTH_OTP_TTL_MINUTES: Joi.number().integer().min(2).max(15).default(5),
  AUTH_OTP_RESEND_SECONDS: Joi.number().integer().min(30).max(300).default(60),
  AUTH_SESSION_DAYS: Joi.number().integer().min(1).max(90).default(30),
});
