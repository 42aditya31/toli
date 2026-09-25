const a = { color: '#D4F26A' };
const b = { backgroundColor: 'rgba(0,0,0,0.5)' };
const c = { padding: 18, marginTop: -4 };
const d = 'width: 12px';
const e = 'cubic-bezier(.2,.9,.3,1)';
declare const Easing: { bezier: (...n: number[]) => unknown };
const f = Easing.bezier(0.2, 0.9, 0.3, 1);

export { a, b, c, d, e, f };
