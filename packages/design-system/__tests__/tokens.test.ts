import { color, dur, ease, radius, size, space, type } from '../src/tokens';

// Every value must match docs/13-design-system.md exactly.
describe('tokens (13 §2–§7)', () => {
  it('has the documented colours', () => {
    expect(color.bg).toEqual({
      base: '#2B2F36',
      card: '#212429',
      raised: '#393E47',
      shimmer: '#474D57',
      bezel: '#0E0F11',
      overlayNotch: '#16181B',
    });
    expect(color.accent).toBe('#D4F26A');
    expect(color.onAccent).toBe('#1F2A00');
    expect(color.text).toBe('#F2F4F6');
    expect(color.textMuted).toBe('#A3A9B3');
    expect(color.divider).toBe(color.bg.base);
    expect(color.warning).toBe('#F2B54A');
    expect(color.danger).toBe('#FF7A6B');
  });
  it('has the documented type scale', () => {
    expect(type.hero.fontSize).toBe(72);
    expect(type.amountXL.fontSize).toBe(64);
    expect(type.display).toMatchObject({ fontSize: 52, tracking: -0.04, line: 0.95 });
    expect(type.mono).toMatchObject({ fontSize: 14, fontFamily: 'JetBrainsMono_700Bold' });
    expect(type.label).toMatchObject({ fontSize: 11, tracking: 0.12, uppercase: true });
  });
  it('has the documented spacing, radii, sizes, easings and durations', () => {
    expect(space.gutter).toBe(18);
    expect(radius).toMatchObject({
      badge: 8,
      chip: 12,
      control: 14,
      key: 16,
      cta: 18,
      card: 24,
      sheet: 28,
    });
    expect(size).toMatchObject({
      iconButton: 44,
      cta: 56,
      row: 52,
      rowTall: 58,
      fab: 60,
      tabBar: 64,
      keyMin: 48,
    });
    expect(ease.pop).toEqual([0.34, 1.56, 0.64, 1]);
    expect(ease.screen).toEqual([0.2, 0.9, 0.3, 1]);
    expect(dur).toMatchObject({
      tap: 180,
      fast: 280,
      base: 380,
      count: 400,
      ticket: 500,
      hold: 900,
      toast: 2800,
    });
  });
});
