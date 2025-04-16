/**
 * HTTP options for web requests
 */
export interface HTTPOptions {
  /**
   * User agent string to use for requests
   */
  userAgent: string;
  
  /**
   * Compression options
   */
  compression: {
    /**
     * Enable support for compressed responses
     */
    enabled: boolean;
    
    /**
     * Supported compression formats
     */
    formats: string[];
  };
  
  /**
   * HTTP request options
   */
  requestOptions: {
    /**
     * Request timeout in milliseconds
     */
    timeout: number;
    
    /**
     * Number of retry attempts
     */
    retry: number;
    
    /**
     * Automatically follow redirects
     */
    followRedirects: boolean;
    
    /**
     * Maximum number of redirects to follow
     */
    maxRedirects: number;
    
    /**
     * Throw on HTTP error codes (4xx, 5xx)
     */
    throwHttpErrors: boolean;
  };
  
  /**
   * Cookie handling options
   */
  cookies: {
    /**
     * Enable cookie handling
     */
    enabled: boolean;
    
    /**
     * Use a cookie jar for storing cookies
     */
    jar: boolean;
  };
  
  /**
   * Custom HTTP headers
   */
  headers: Record<string, string>;
  
  /**
   * Proxy configuration
   */
  proxy: {
    /**
     * Enable proxy
     */
    enabled: boolean;
    
    /**
     * Proxy URL
     */
    url: string;
    
    /**
     * Proxy authentication
     */
    auth: {
      /**
       * Proxy username
       */
      username: string;
      
      /**
       * Proxy password
       */
      password: string;
    };
  };
}

/**
 * HTTP response
 */
export interface HTTPResponse {
  /**
   * HTTP status code
   */
  statusCode: number;
  
  /**
   * HTTP headers
   */
  headers: Record<string, string | string[] | undefined>;
  
  /**
   * Response body
   */
  body: string;
  
  /**
   * Content type header value
   */
  contentType: string;
  
  /**
   * Content encoding header value
   */
  contentEncoding: string;
}
