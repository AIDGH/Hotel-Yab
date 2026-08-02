import Joi from 'joi';

export type EnvironmentVariables = {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  CORS_ORIGIN: string;
  SWAGGER_ENABLED: boolean;
  DATABASE_URL: string;
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
});
