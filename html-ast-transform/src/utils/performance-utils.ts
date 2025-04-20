import { performance, PerformanceObserver } from 'node:perf_hooks';

/**
 * Utility functions for measuring and monitoring performance.
 */

/**
 * Result of a timed operation.
 */
export interface TimingResult<T> {
  /**
   * Result of the operation.
   */
  result: T;
  
  /**
   * Time taken to execute the operation in milliseconds.
   */
  duration: number;
}

/**
 * Time the execution of a synchronous function.
 * 
 * @param fn Function to time
 * @returns TimingResult containing the result and duration
 */
export function timeSync<T>(fn: () => T): TimingResult<T> {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  return { result, duration };
}

/**
 * Time the execution of an asynchronous function.
 * 
 * @param fn Async function to time
 * @returns Promise resolving to TimingResult containing the result and duration
 */
export async function timeAsync<T>(fn: () => Promise<T>): Promise<TimingResult<T>> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  return { result, duration };
}

/**
 * Create a performance mark.
 * 
 * @param name Name of the mark
 * @returns The name of the mark
 */
export function mark(name: string): string {
  performance.mark(name);
  return name;
}

/**
 * Measure the duration between two marks.
 * 
 * @param name Name of the measure
 * @param startMark Name of the start mark
 * @param endMark Name of the end mark
 * @returns Duration in milliseconds
 */
export function measure(name: string, startMark: string, endMark: string): number {
  const measure = performance.measure(name, startMark, endMark);
  return measure.duration;
}

/**
 * Options for the performance monitor.
 */
export interface PerformanceMonitorOptions {
  /**
   * Callback function to handle performance entries.
   */
  onEntry?: (entry: import('node:perf_hooks').PerformanceEntry) => void;
  
  /**
   * Types of entries to observe.
   * @default ['mark', 'measure']
   */
  entryTypes?: ('mark' | 'measure' | 'function' | 'gc' | 'node')[];
}

/**
 * Create a performance observer that monitors performance marks and measures.
 * 
 * @param options Configuration options
 * @returns PerformanceObserver instance
 */
export function createPerformanceMonitor(options: PerformanceMonitorOptions = {}): PerformanceObserver {
  const entryTypes = options.entryTypes || ['mark', 'measure'];
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    
    for (const entry of entries) {
      if (options.onEntry) {
        options.onEntry(entry);
      } else {
        console.log(`Performance Entry: ${entry.name}, Type: ${entry.entryType}, Duration: ${entry.duration}ms`);
      }
    }
  });
  
  observer.observe({ entryTypes });
  
  return observer;
}

/**
 * Create a simple time tracker for measuring multiple operations.
 * 
 * @returns Time tracker object
 */
export function createTimeTracker() {
  const measurements: Record<string, number> = {};
  const marks: Record<string, number> = {};
  
  return {
    /**
     * Start tracking a named operation.
     * 
     * @param name Name of the operation
     */
    start(name: string): void {
      marks[name] = performance.now();
    },
    
    /**
     * End tracking a named operation.
     * 
     * @param name Name of the operation
     * @returns Duration in milliseconds
     */
    end(name: string): number {
      if (!(name in marks)) {
        throw new Error(`No start mark found for "${name}"`);
      }
      
      const duration = performance.now() - marks[name];
      measurements[name] = duration;
      delete marks[name];
      
      return duration;
    },
    
    /**
     * Get the duration of a measured operation.
     * 
     * @param name Name of the operation
     * @returns Duration in milliseconds
     */
    get(name: string): number {
      return measurements[name] || 0;
    },
    
    /**
     * Get all measurements.
     * 
     * @returns Record of names to durations
     */
    getAll(): Record<string, number> {
      return { ...measurements };
    },
    
    /**
     * Clear all measurements.
     */
    clear(): void {
      Object.keys(measurements).forEach(key => {
        delete measurements[key];
      });
      
      Object.keys(marks).forEach(key => {
        delete marks[key];
      });
    }
  };
}
