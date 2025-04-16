import { HTTPOptions } from '../../types/core/http.js';

/**
 * Default HTTP options
 */
export class HTTPDefaults {
  /**
   * Get the default HTTP options
   */
  static getDefaultOptions(): HTTPOptions {
    return {
      userAgent: 'web2md/1.0',
      compression: {
        enabled: true,
        // Only include compression formats we truly support well
        formats: ['gzip', 'br', 'deflate']
      },
      requestOptions: {
        timeout: 30000,
        retry: 3,
        followRedirects: true,
        maxRedirects: 10,
        throwHttpErrors: false
      },
      cookies: {
        enabled: true,
        jar: true
      },
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        // Only list compression formats we have good support for
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
      proxy: {
        enabled: false,
        url: '',
        auth: {
          username: '',
          password: ''
        }
      }
    };
  }
}