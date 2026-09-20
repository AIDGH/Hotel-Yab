import { BadRequestException } from '@nestjs/common';
import {
  sanitizeInstagramCrawlCurl,
  type InstagramCrawlRequest,
} from './instagram-crawl-request';

describe('sanitizeInstagramCrawlCurl', () => {
  it('keeps the GraphQL recipe without account credentials', () => {
    const variables = encodeURIComponent(JSON.stringify({ id: '123' }));
    const result = sanitizeInstagramCrawlCurl(
      `curl 'https://www.instagram.com/graphql/query' \\
        -H 'x-ig-app-id: 936619743392459' \\
        -H 'x-csrftoken: secret-csrf' \\
        -H 'cookie: sessionid=secret-session' \\
        --data-raw 'variables=${variables}&doc_id=987&fb_dtsg=secret-form-token'`,
    ) as InstagramCrawlRequest;

    expect(result.url).toBe('https://www.instagram.com/graphql/query');
    expect(result.headers['x-ig-app-id']).toBe('936619743392459');
    expect(JSON.stringify(result)).not.toContain('secret-session');
    expect(JSON.stringify(result)).not.toContain('secret-csrf');
    expect(JSON.stringify(result)).not.toContain('secret-form-token');
  });

  it('rejects non-Instagram GraphQL requests', () => {
    expect(() =>
      sanitizeInstagramCrawlCurl(
        `curl 'https://example.com/graphql/query' --data-raw 'variables=%7B%7D&doc_id=1'`,
      ),
    ).toThrow(BadRequestException);
  });
});
