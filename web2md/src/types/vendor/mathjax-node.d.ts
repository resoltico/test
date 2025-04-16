declare module 'mathjax-node' {
  export interface MathJaxOptions {
    math: string;
    format?: 'TeX' | 'inline-TeX' | 'MathML' | 'AsciiMath';
    svg?: boolean;
    html?: boolean;
    css?: boolean;
    mml?: boolean;
    speakText?: boolean;
    speakRuleset?: string;
    speakStyle?: string;
    ex?: number;
    width?: number;
    linebreaks?: boolean;
    semantics?: boolean;
  }

  export interface MathJaxResult {
    errors?: string[];
    svg?: string;
    html?: string;
    css?: string;
    mml?: string;
    tex?: string;
    speakText?: string;
    success: boolean;
  }

  export function config(options: Record<string, any>): void;
  export function start(): void;
  export function typeset(options: MathJaxOptions): Promise<MathJaxResult>;
}