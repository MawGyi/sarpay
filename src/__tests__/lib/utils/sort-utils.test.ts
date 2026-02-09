import { describe, it, expect } from 'vitest';
import { naturalSort, sortFilesByName } from '@/lib/utils/sort-utils';

describe('naturalSort', () => {
  it('sorts simple strings alphabetically', () => {
    const items = ['banana', 'apple', 'cherry'];
    expect(items.sort(naturalSort)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('sorts strings with embedded numbers naturally', () => {
    const items = ['Law 1', 'Law 10', 'Law 2', 'Law 20', 'Law 3'];
    expect(items.sort(naturalSort)).toEqual([
      'Law 1', 'Law 2', 'Law 3', 'Law 10', 'Law 20',
    ]);
  });

  it('handles chapter numbering correctly', () => {
    const items = ['Chapter 10', 'Chapter 1', 'Chapter 2', 'Chapter 20'];
    expect(items.sort(naturalSort)).toEqual([
      'Chapter 1', 'Chapter 2', 'Chapter 10', 'Chapter 20',
    ]);
  });

  it('handles filenames with extensions', () => {
    const items = ['Law 10.md', 'Law 1.md', 'Law 2.md', 'Law 11.md'];
    expect(items.sort(naturalSort)).toEqual([
      'Law 1.md', 'Law 2.md', 'Law 10.md', 'Law 11.md',
    ]);
  });

  it('is case-insensitive', () => {
    const items = ['Banana', 'apple', 'Cherry'];
    expect(items.sort(naturalSort)).toEqual(['apple', 'Banana', 'Cherry']);
  });

  it('sorts numbers before strings when mixed', () => {
    // When comparing a number part to a string part, numbers come first
    const result = naturalSort('2abc', 'abc');
    expect(result).toBeLessThan(0);
  });

  it('returns 0 for identical strings', () => {
    expect(naturalSort('same', 'same')).toBe(0);
  });

  it('handles empty strings', () => {
    expect(naturalSort('', '')).toBe(0);
    expect(naturalSort('', 'a')).toBeLessThan(0);
    expect(naturalSort('a', '')).toBeGreaterThan(0);
  });

  it('handles strings that are purely numeric', () => {
    const items = ['100', '10', '1', '20', '2'];
    expect(items.sort(naturalSort)).toEqual(['1', '2', '10', '20', '100']);
  });

  it('handles multiple numbers in a string', () => {
    const items = ['file1-part10', 'file1-part2', 'file2-part1'];
    expect(items.sort(naturalSort)).toEqual([
      'file1-part2', 'file1-part10', 'file2-part1',
    ]);
  });

  it('handles strings with leading zeros', () => {
    const items = ['file001', 'file01', 'file1'];
    // parseInt strips leading zeros, so all parse to 1
    expect(items.sort(naturalSort)).toEqual(['file001', 'file01', 'file1']);
  });
});

describe('sortFilesByName', () => {
  function makeFile(name: string): File {
    return new File([''], name, { type: 'text/plain' });
  }

  it('sorts files by name using natural sort', () => {
    const files = [makeFile('Law 10.md'), makeFile('Law 1.md'), makeFile('Law 2.md')];
    const sorted = sortFilesByName(files);
    expect(sorted.map((f) => f.name)).toEqual(['Law 1.md', 'Law 2.md', 'Law 10.md']);
  });

  it('does not mutate the original array', () => {
    const files = [makeFile('b.md'), makeFile('a.md')];
    const sorted = sortFilesByName(files);
    expect(sorted).not.toBe(files);
    expect(files[0].name).toBe('b.md'); // original unchanged
  });

  it('handles empty array', () => {
    expect(sortFilesByName([])).toEqual([]);
  });

  it('handles single file', () => {
    const files = [makeFile('only.md')];
    const sorted = sortFilesByName(files);
    expect(sorted.map((f) => f.name)).toEqual(['only.md']);
  });

  it('handles a larger set of chapter files', () => {
    const names = Array.from({ length: 48 }, (_, i) => `Law ${i + 1}.md`);
    const shuffled = [...names].sort(() => Math.random() - 0.5);
    const files = shuffled.map(makeFile);
    const sorted = sortFilesByName(files);
    expect(sorted.map((f) => f.name)).toEqual(names);
  });
});
