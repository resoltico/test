/**
 * Type declarations for unist modules
 * This allows us to use the Node type from unist without installing @types/unist
 */

declare module 'unist' {
  export interface Node {
    type: string;
    [key: string]: unknown;
  }

  export interface Parent extends Node {
    children: Node[];
  }

  export interface Literal extends Node {
    value: unknown;
  }
}

// Declare the exports from unist-util-visit
declare module 'unist-util-visit' {
  // Visit takes test as an optional parameter
  export function visit(tree: any, visitor: any): void;
  export function visit(tree: any, test: any, visitor: any, reverse?: boolean): void;
  export const SKIP: symbol;
}