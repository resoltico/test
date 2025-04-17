/**
 * Mapping for common MathML operators to LaTeX
 */
export function getOperatorMap(): Record<string, string> {
  return {
    '×': '\\times',
    '⋅': '\\cdot',
    '·': '\\cdot',
    '≤': '\\leq',
    '≥': '\\geq',
    '±': '\\pm',
    '→': '\\rightarrow',
    '←': '\\leftarrow',
    '↔': '\\leftrightarrow',
    '∑': '\\sum',
    '∏': '\\prod',
    '∫': '\\int',
    '∮': '\\oint',
    '∈': '\\in',
    '∉': '\\notin',
    '⊂': '\\subset',
    '⊃': '\\supset',
    '∞': '\\infty',
    '∀': '\\forall',
    '∃': '\\exists',
    '∧': '\\wedge',
    '∨': '\\vee',
    '⇒': '\\Rightarrow',
    '⇔': '\\Leftrightarrow',
    '≠': '\\neq',
    '≈': '\\approx',
    '⊥': '\\perp',
    '∥': '\\parallel',
    '∂': '\\partial',
    '∇': '\\nabla',
    '∝': '\\propto',
    '⨯': '\\times',
    '⋂': '\\cap',
    '⋃': '\\cup'
  };
}

/**
 * Common Greek letters mapping
 */
export function getGreekLetters(): Record<string, string> {
  return {
    'α': '\\alpha',
    'β': '\\beta',
    'γ': '\\gamma',
    'δ': '\\delta',
    'ε': '\\epsilon',
    'ζ': '\\zeta',
    'η': '\\eta',
    'θ': '\\theta',
    'ι': '\\iota',
    'κ': '\\kappa',
    'λ': '\\lambda',
    'μ': '\\mu',
    'ν': '\\nu',
    'ξ': '\\xi',
    'ο': 'o', // Omicron looks like Latin 'o'
    'π': '\\pi',
    'ρ': '\\rho',
    'σ': '\\sigma',
    'τ': '\\tau',
    'υ': '\\upsilon',
    'φ': '\\phi',
    'χ': '\\chi',
    'ψ': '\\psi',
    'ω': '\\omega',
    'Α': 'A', // Latin equivalents for uppercase Greek letters that look the same
    'Β': 'B',
    'Γ': '\\Gamma',
    'Δ': '\\Delta',
    'Ε': 'E',
    'Ζ': 'Z',
    'Η': 'H',
    'Θ': '\\Theta',
    'Ι': 'I',
    'Κ': 'K',
    'Λ': '\\Lambda',
    'Μ': 'M',
    'Ν': 'N',
    'Ξ': '\\Xi',
    'Ο': 'O',
    'Π': '\\Pi',
    'Ρ': 'P',
    'Σ': '\\Sigma',
    'Τ': 'T',
    'Υ': '\\Upsilon',
    'Φ': '\\Phi',
    'Χ': 'X',
    'Ψ': '\\Psi',
    'Ω': '\\Omega'
  };
}

/**
 * Common math functions that should not be in italics
 */
export function getMathFunctions(): string[] {
  return [
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
    'arcsin', 'arccos', 'arctan', 'arccot', 'arcsec', 'arccsc',
    'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch',
    'log', 'ln', 'exp', 'lim', 'inf', 'sup',
    'min', 'max', 'gcd', 'lcm', 'det', 'dim',
    'ker', 'deg', 'arg', 'Pr', 'hom'
  ];
}