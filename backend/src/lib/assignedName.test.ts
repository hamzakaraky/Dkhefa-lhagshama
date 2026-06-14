import { needsNameResolution } from './assignedName';

describe('needsNameResolution', () => {
  it('returns true when name is null', () => {
    expect(needsNameResolution(null, 'uid-abc123')).toBe(true);
  });
  it('returns true when name is undefined', () => {
    expect(needsNameResolution(undefined, 'uid-abc123')).toBe(true);
  });
  it('returns true when name is an empty string', () => {
    expect(needsNameResolution('', 'uid-abc123')).toBe(true);
  });
  it('returns true when name is only whitespace', () => {
    expect(needsNameResolution('   ', 'uid-abc123')).toBe(true);
  });
  it('returns true when name byte-equals the uid', () => {
    expect(needsNameResolution('uid-abc123', 'uid-abc123')).toBe(true);
  });
  it('returns true when name equals the uid after trimming', () => {
    expect(needsNameResolution('  uid-abc123  ', 'uid-abc123')).toBe(true);
  });
  it('returns false for a real human name', () => {
    expect(needsNameResolution('Sara Cohen', 'uid-abc123')).toBe(false);
  });
  it('returns false for a Hebrew name', () => {
    expect(needsNameResolution('שרה כהן', 'uid-abc123')).toBe(false);
  });
  it('returns false when there is no uid to compare against', () => {
    expect(needsNameResolution('Sara Cohen', null)).toBe(false);
  });
});
