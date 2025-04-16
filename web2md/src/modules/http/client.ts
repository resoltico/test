import got from 'got';
import { CookieJar } from 'tough-cookie';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HTTPOptions, HTTPResponse } from '../../types/core/http.js';
import { Logger } from '../../shared/logger/console.js';
import { HTTPDefaults } from './defaults.js';

/**
 * HTTP client for web requests
 */
export class HTTPClient {
  private options: HTTPOptions;
  
  /**
   * Create a new HTTP client
   */
  constructor(options: Partial<HTTPOptions>, private logger: Logger) {
    this.options = this.normalizeOptions(options);
  }
  
  /**
   * Configure the HTTP client with new options
   */
  configure(options: Partial<HTTPOptions>): void {
    this.options = this.normalizeOptions(options);
  }
  
  /**
   * Get the default HTTP options
   */
  getDefaultOptions(): HTTPOptions {
    return HTTPDefaults.getDefaultOptions();
  }
  
  /**
   * Get content from a URL with the configured options
   */
  async fetch(url: string): Promise<HTTPResponse> {
    this.logger.debug(`Fetching URL: ${url}`);
    this.logger.debug(`Using user agent: ${this.options.userAgent}`);
    
    try {
      // Prepare the got options
      const gotOptions = {
        headers: {
          'User-Agent': this.options.userAgent,
          ...this.options.headers
        },
        timeout: {
          request: this.options.requestOptions.timeout
        },
        retry: {
          limit: this.options.requestOptions.retry
        },
        followRedirect: this.options.requestOptions.followRedirects,
        maxRedirects: this.options.requestOptions.maxRedirects,
        throwHttpErrors: this.options.requestOptions.throwHttpErrors,
        decompress: this.options.compression.enabled
      };
      
      // Add cookie handling if enabled
      if (this.options.cookies.enabled) {
        const cookieJar = this.options.cookies.jar ? new CookieJar() : undefined;
        if (cookieJar) {
          Object.assign(gotOptions, { cookieJar });
        }
      }
      
      // Add proxy if enabled
      if (this.options.proxy.enabled && this.options.proxy.url) {
        // Create a proper proxy URL string
        let proxyUrl = this.options.proxy.url;
        
        // If the URL doesn't start with a protocol, add http://
        if (!proxyUrl.startsWith('http://') && !proxyUrl.startsWith('https://')) {
          proxyUrl = `http://${proxyUrl}`;
        }
        
        // Create a URL object to ensure proper formatting
        const proxyUrlObj = new URL(proxyUrl);
        
        // Add authentication if provided
        if (this.options.proxy.auth.username) {
          proxyUrlObj.username = this.options.proxy.auth.username;
          proxyUrlObj.password = this.options.proxy.auth.password;
        }
        
        const agent = {
          https: new HttpsProxyAgent(proxyUrlObj.toString())
        };
        
        Object.assign(gotOptions, { agent });
      }
      
      // Make the request
      const response = await got(url, gotOptions);
      
      // Extract response details
      const contentType = response.headers['content-type'] as string || '';
      const contentEncoding = response.headers['content-encoding'] as string || '';
      
      this.logger.debug(`Response status: ${response.statusCode}`);
      this.logger.debug(`Content-Type: ${contentType}`);
      this.logger.debug(`Content-Encoding: ${contentEncoding}`);
      
      // Create and return the HTTP response
      return {
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body,
        contentType,
        contentEncoding
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`HTTP request failed: ${error.message}`);
      }
      throw error;
    }
  }
  
  /**
   * Normalize and validate options with defaults
   */
  private normalizeOptions(options: Partial<HTTPOptions>): HTTPOptions {
    const defaults = HTTPDefaults.getDefaultOptions();
    
    return {
      userAgent: options.userAgent || defaults.userAgent,
      compression: {
        enabled: options.compression?.enabled ?? defaults.compression.enabled,
        formats: options.compression?.formats || defaults.compression.formats
      },
      requestOptions: {
        timeout: options.requestOptions?.timeout || defaults.requestOptions.timeout,
        retry: options.requestOptions?.retry || defaults.requestOptions.retry,
        followRedirects: options.requestOptions?.followRedirects ?? defaults.requestOptions.followRedirects,
        maxRedirects: options.requestOptions?.maxRedirects || defaults.requestOptions.maxRedirects,
        throwHttpErrors: options.requestOptions?.throwHttpErrors ?? defaults.requestOptions.throwHttpErrors
      },
      cookies: {
        enabled: options.cookies?.enabled ?? defaults.cookies.enabled,
        jar: options.cookies?.jar ?? defaults.cookies.jar
      },
      headers: options.headers || defaults.headers,
      proxy: {
        enabled: options.proxy?.enabled ?? defaults.proxy.enabled,
        url: options.proxy?.url || defaults.proxy.url,
        auth: {
          username: options.proxy?.auth?.username || defaults.proxy.auth.username,
          password: options.proxy?.auth?.password || defaults.proxy.auth.password
        }
      }
    };
  }
}
