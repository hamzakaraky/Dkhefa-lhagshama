import { formatDisplayId, REQUEST_REF_PREFIX } from './displayId';

describe('formatDisplayId', () => {
  it('zero-pads to 4 digits with the REQ- prefix', () => {
    expect(formatDisplayId(42)).toBe('REQ-0042');
  });

  it('formats the first id as REQ-0001', () => {
    expect(formatDisplayId(1)).toBe('REQ-0001');
  });

  it('does not truncate numbers wider than 4 digits', () => {
    expect(formatDisplayId(12345)).toBe('REQ-12345');
  });

  it('exposes the prefix constant', () => {
    expect(REQUEST_REF_PREFIX).toBe('REQ-');
  });

  it('throws on a non-positive or non-integer counter value', () => {
    expect(() => formatDisplayId(0)).toThrow();
    expect(() => formatDisplayId(-3)).toThrow();
    expect(() => formatDisplayId(1.5)).toThrow();
  });
});
