import { Section } from '../schema/section.js';

/**
 * Build a hierarchical structure from a flat array of sections based on heading levels
 */
export function buildSectionHierarchy(sections: Section[]): Section[] {
  if (sections.length <= 1) return sections;
  
  // Make a copy to avoid modifying the original
  const sectionsCopy = JSON.parse(JSON.stringify(sections)) as Section[];
  
  // Find the minimum heading level
  const minLevel = Math.min(...sectionsCopy.map(s => s.level || Infinity).filter(l => l !== Infinity));
  
  // Group sections by their top-level parent
  const result: Section[] = [];
  let currentParent: Section | null = null;
  
  // First pass: identify top-level sections (those with minLevel)
  for (let i = 0; i < sectionsCopy.length; i++) {
    const section = sectionsCopy[i];
    const level = section.level || Infinity;
    
    if (level === minLevel) {
      // This is a top-level section
      result.push(section);
      currentParent = section;
    } else if (currentParent) {
      // This is a child of the current parent
      // We'll organize it properly in the second pass
      currentParent.children.push(section);
    } else {
      // No parent yet, must be a top section
      result.push(section);
      currentParent = section;
    }
  }
  
  // Second pass: organize children recursively for each top-level section
  for (const topSection of result) {
    organizeChildren(topSection);
  }
  
  return result;
}

/**
 * Recursively organize children within a section based on their levels
 */
function organizeChildren(section: Section): void {
  if (!section.children || section.children.length <= 1) return;
  
  const children = [...section.children];
  section.children = [];
  
  // Sort children by level
  children.sort((a, b) => (a.level || Infinity) - (b.level || Infinity));
  
  // Find the minimum level among children
  const minChildLevel = Math.min(...children.map(c => c.level || Infinity));
  
  // First pass: identify direct children (those with minChildLevel)
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const level = child.level || Infinity;
    
    if (level === minChildLevel) {
      // This is a direct child
      section.children.push(child);
    } else {
      // This must be a grandchild or deeper - find its parent
      const parentLevel = findParentLevel(level, children);
      const parent = findLastSectionWithLevel(parentLevel, section.children);
      
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(child);
      } else {
        // Fallback: add as direct child
        section.children.push(child);
      }
    }
  }
  
  // Recursively organize children for each child
  for (const child of section.children) {
    organizeChildren(child);
  }
}

/**
 * Find the appropriate parent level for a given child level
 */
function findParentLevel(childLevel: number, allSections: Section[]): number {
  // Find the highest level that's lower than childLevel
  const candidates = allSections
    .map(s => s.level || Infinity)
    .filter(level => level < childLevel);
  
  return candidates.length > 0 ? Math.max(...candidates) : 0;
}

/**
 * Find the last section with a specific level
 */
function findLastSectionWithLevel(level: number, sections: Section[]): Section | null {
  // Traverse the array in reverse to find the last matching section
  for (let i = sections.length - 1; i >= 0; i--) {
    if ((sections[i].level || Infinity) === level) {
      return sections[i];
    }
  }
  
  return null;
}