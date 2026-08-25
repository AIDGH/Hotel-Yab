import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/environment';

type NajvaSendResponse = {
  return?: {
    status?: number;
  };
  entries?: Array<{
    messageid?: number;
    status?: number;
  }>;
};

const NAJVA_REQUEST_TIMEOUT_MS = 5_000;
const ACCEPTED_NAJVA_STATUSES = new Set([1, 2, 4, 10]);

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  usesDevelopmentDelivery(): boolean {
    const provider = this.config.get('SMS_PROVIDER', { infer: true });
    return provider === 'development' || provider === 'preview';
  }

  async sendOtp(mobile: string, code: string): Promise<void> {
    if (this.usesDevelopmentDelivery()) return;

    if (this.config.get('SMS_PROVIDER', { infer: true }) === 'disabled') {
      this.logger.warn('SMS delivery is disabled');
      throw new ServiceUnavailableException(
        'ارسال کد ورود موقتاً در دسترس نیست؛ از ورود با رمز استفاده کنید',
      );
    }

    const apiBaseUrl = this.config.get('NAJVA_API_BASE_URL', { infer: true });
    const apiKey = this.config.get('NAJVA_API_KEY', { infer: true });
    const sender = this.config.get('NAJVA_SENDER', { infer: true });
    const template = this.config.get('NAJVA_OTP_TEMPLATE', {
      infer: true,
    });
    const originHost = this.config.get('SMS_OTP_ORIGIN_HOST', { infer: true });

    if (!apiKey || !sender || !template || !originHost) {
      this.logger.error('Najva SMS credentials are not configured');
      throw new ServiceUnavailableException(
        'ارسال کد ورود انجام نشد؛ کمی بعد دوباره تلاش کنید',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      NAJVA_REQUEST_TIMEOUT_MS,
    );

    try {
      const endpoint = new URL(
        `${apiBaseUrl}/v1/${encodeURIComponent(apiKey)}/verify/lookup.json`,
      );
      endpoint.searchParams.set('receptor', toNajvaMobile(mobile));
      endpoint.searchParams.set('sender', sender);
      endpoint.searchParams.set('template', template);
      endpoint.searchParams.set('token', code);
      endpoint.searchParams.set('token2', formatTehranTime(new Date()));
      endpoint.searchParams.set('token3', originHost);

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });

      const payload = (await response
        .json()
        .catch(() => null)) as NajvaSendResponse | null;
      const accepted =
        response.ok &&
        payload?.return?.status === 200 &&
        payload.entries?.length === 1 &&
        payload.entries.every(
          (entry) =>
            typeof entry.messageid === 'number' &&
            typeof entry.status === 'number' &&
            ACCEPTED_NAJVA_STATUSES.has(entry.status),
        );

      if (!accepted) {
        this.logger.error(
          `Najva rejected the OTP request (HTTP ${response.status}, provider status ${payload?.return?.status ?? 'unknown'})`,
        );
        throw new ServiceUnavailableException(
          'ارسال کد ورود انجام نشد؛ کمی بعد دوباره تلاش کنید',
        );
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(
        `Najva OTP request failed (${error instanceof Error ? error.name : 'unknown error'})`,
      );
      throw new ServiceUnavailableException(
        'ارسال کد ورود انجام نشد؛ کمی بعد دوباره تلاش کنید',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function toNajvaMobile(mobile: string): string {
  if (/^\+989\d{9}$/.test(mobile)) return `0${mobile.slice(3)}`;
  return mobile;
}

function formatTehranTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
