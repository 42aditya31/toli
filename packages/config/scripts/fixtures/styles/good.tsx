declare const t: { color: { accent: string }; space: { gutter: number } };
const a = { color: t.color.accent, padding: t.space.gutter, flex: 1, margin: 0, opacity: 0.5 };
const b = { width: '100%' };
const id = '#trip-1'; // not a colour: too long for hex? (it has non-hex letters)

export { a, b, id };
