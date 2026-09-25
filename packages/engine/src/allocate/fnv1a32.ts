// FNV-1a 32-bit over UTF-8 bytes (07 §3). Pure; no TextEncoder dependency.
export function fnv1a32(s: string): number {
  let hash = 2166136261;
  const step = (byte: number) => {
    hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  };
  for (const ch of s) {
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80) {
      step(cp);
    } else if (cp < 0x800) {
      step(0xc0 | (cp >> 6));
      step(0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      step(0xe0 | (cp >> 12));
      step(0x80 | ((cp >> 6) & 0x3f));
      step(0x80 | (cp & 0x3f));
    } else {
      step(0xf0 | (cp >> 18));
      step(0x80 | ((cp >> 12) & 0x3f));
      step(0x80 | ((cp >> 6) & 0x3f));
      step(0x80 | (cp & 0x3f));
    }
  }
  return hash;
}
