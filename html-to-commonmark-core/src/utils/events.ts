/**
 * Simple event emitter for plugin hooks
 */

/**
 * Handler function for events
 */
export type EventHandler<T> = (data: T) => Promise<void | T> | void | T;

/**
 * Registry of event handlers
 */
type EventRegistry = Map<string, EventHandler<any>[]>;

/**
 * Simple event emitter for plugin hooks
 */
export class EventEmitter {
  /**
   * Event handlers registry
   */
  private handlers: EventRegistry = new Map();
  
  /**
   * Registers a handler for an event
   * @param event Event name
   * @param handler Handler function
   * @returns This event emitter
   */
  public on<T>(event: string, handler: EventHandler<T>): EventEmitter {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
    
    return this;
  }
  
  /**
   * Removes a handler from an event
   * @param event Event name
   * @param handler Handler function
   * @returns This event emitter
   */
  public off<T>(event: string, handler: EventHandler<T>): EventEmitter {
    const handlers = this.handlers.get(event) || [];
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
      this.handlers.set(event, handlers);
    }
    
    return this;
  }
  
  /**
   * Removes all handlers for an event
   * @param event Event name
   * @returns This event emitter
   */
  public removeAllListeners(event?: string): EventEmitter {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
    
    return this;
  }
  
  /**
   * Emits an event
   * @param event Event name
   * @param data Event data
   * @returns Event data, possibly modified by handlers
   */
  public async emit<T>(event: string, data: T): Promise<T> {
    const handlers = this.handlers.get(event) || [];
    let result = data;
    
    for (const handler of handlers) {
      try {
        const handlerResult = await handler(result);
        
        // Update result if handler returned something
        if (handlerResult !== undefined) {
          result = handlerResult;
        }
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
    
    return result;
  }
  
  /**
   * Gets the number of handlers for an event
   * @param event Event name
   * @returns Number of handlers
   */
  public listenerCount(event: string): number {
    const handlers = this.handlers.get(event) || [];
    return handlers.length;
  }
  
  /**
   * Checks if an event has handlers
   * @param event Event name
   * @returns True if the event has handlers
   */
  public hasListeners(event: string): boolean {
    return this.listenerCount(event) > 0;
  }
}