import { describe, it, expect } from 'vitest';

describe('test setup', () => {
  it('works', () => {
    expect(1 + 1).toBe(2);
  });

  it('has localStorage mock', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
  });

  it('has crypto.randomUUID mock', () => {
    expect(crypto.randomUUID()).toBe('00000000-0000-0000-0000-000000000000');
  });
});
