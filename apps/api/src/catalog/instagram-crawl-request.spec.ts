import { BadRequestException } from '@nestjs/common';
import {
  sanitizeInstagramCrawlCurl,
  type InstagramCrawlRequest,
} from './instagram-crawl-request';

describe('sanitizeInstagramCrawlCurl', () => {
  it('keeps the GraphQL recipe without account credentials', () => {
    const variables = encodeURIComponent(JSON.stringify({ username: 'example' }));
    const result = sanitizeInstagramCrawlCurl(
      `curl 'https://www.instagram.com/graphql/query' \\
        -H 'x-ig-app-id: 936619743392459' \\
        -H 'x-csrftoken: secret-csrf' \\
        -H 'cookie: sessionid=secret-session' \\
        --data-raw 'variables=${variables}&doc_id=987&fb_api_req_friendly_name=PolarisProfilePostsTabContentQuery_connection&__hs=web-client&__dyn=modules&fb_dtsg=secret-form-token'`,
    ) as InstagramCrawlRequest;

    expect(result.url).toBe('https://www.instagram.com/graphql/query');
    expect(result.headers['x-ig-app-id']).toBe('936619743392459');
    const savedForm = new URLSearchParams(result.body);
    expect(savedForm.get('__hs')).toBe('web-client');
    expect(savedForm.get('__dyn')).toBe('modules');
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

  it('accepts a browser cURL export using --url', () => {
    const result = sanitizeInstagramCrawlCurl(
      `curl --url 'https://www.instagram.com/graphql/query' \\
        -H 'x-ig-app-id: 936619743392459' \\
        -b 'sessionid=secret-session' \\
        --data-raw 'variables=%7B%22username%22%3A%22example%22%7D&doc_id=987&fb_api_req_friendly_name=PolarisProfilePostsTabContentQuery_connection&fb_dtsg=secret-token'`,
    ) as InstagramCrawlRequest;

    expect(result.url).toBe('https://www.instagram.com/graphql/query');
    expect(new URLSearchParams(result.body).get('doc_id')).toBe('987');
    expect(JSON.stringify(result)).not.toContain('secret-session');
    expect(JSON.stringify(result)).not.toContain('secret-token');
  });

  it.each(['PolarisFeedTimelineRootV2Query', 'QuickPromotionSupportIGSchemaBatchFetchQuery', 'PolarisScreenTimeLogger_syncMutation'])(
    'rejects unrelated operation %s even with a profile username', (operation) => {
      expect(() => sanitizeInstagramCrawlCurl(
        `curl 'https://www.instagram.com/graphql/query' --data-raw 'variables=%7B%22username%22%3A%22example%22%7D&doc_id=987&fb_api_req_friendly_name=${operation}'`,
      )).toThrow(BadRequestException);
    },
  );

  it('rejects a recipe for a different person', () => {
    expect(() => sanitizeInstagramCrawlCurl(
      `curl 'https://www.instagram.com/graphql/query' --data-raw 'variables=%7B%22username%22%3A%22example%22%7D&doc_id=987&fb_api_req_friendly_name=PolarisProfilePostsTabContentQuery_connection'`,
      'another_person',
    )).toThrow(BadRequestException);
  });
});
