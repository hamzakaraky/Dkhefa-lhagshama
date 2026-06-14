import { computeScalarKpis } from './insightsKpis';

// 2026-06-14T10:00:00Z — June 2026 is the "this month" window.
const NOW = Date.parse('2026-06-14T10:00:00Z');

describe('computeScalarKpis', () => {
  it('returns all-zero / null KPIs for an empty dataset', () => {
    const out = computeScalarKpis([], new Map(), NOW);
    expect(out).toEqual({
      totalRequests: 0,
      openRequests: 0,
      closedThisMonth: 0,
      closureRate: null,
    });
  });

  it('counts total over every request regardless of status', () => {
    const reqs = [
      { id: 'a', status: 'pending' },
      { id: 'b', status: 'closed' },
      { id: 'c', status: 'referred' },
    ];
    expect(computeScalarKpis(reqs, new Map(), NOW).totalRequests).toBe(3);
  });

  it('counts open as active statuses only (excludes closed/referred/rejected)', () => {
    const reqs = [
      { id: 'a', status: 'pending' },
      { id: 'b', status: 'in_progress' },
      { id: 'c', status: 'awaiting_review' },
      { id: 'd', status: 'closed' },
      { id: 'e', status: 'referred' },
      { id: 'f', status: 'rejected' },
    ];
    expect(computeScalarKpis(reqs, new Map(), NOW).openRequests).toBe(3);
  });

  it('counts closedThisMonth only for closes within the injected month window', () => {
    const reqs = [
      { id: 'a', status: 'closed' },
      { id: 'b', status: 'closed' },
      { id: 'c', status: 'closed' },
    ];
    const closedAt = new Map<string, Date>([
      ['a', new Date('2026-06-02T08:00:00Z')], // this month
      ['b', new Date('2026-06-30T23:00:00Z')], // this month
      ['c', new Date('2026-05-31T23:00:00Z')], // last month
    ]);
    expect(computeScalarKpis(reqs, closedAt, NOW).closedThisMonth).toBe(2);
  });

  it('computes closure rate as closed/total rounded to a whole percent', () => {
    const reqs = [
      { id: 'a', status: 'closed' },
      { id: 'b', status: 'closed' },
      { id: 'c', status: 'pending' },
      { id: 'd', status: 'in_progress' },
    ];
    // 2 closed / 4 total = 50
    expect(computeScalarKpis(reqs, new Map(), NOW).closureRate).toBe(50);
  });

  it('returns null closure rate when there are no requests', () => {
    expect(computeScalarKpis([], new Map(), NOW).closureRate).toBeNull();
  });
});
