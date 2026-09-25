// Toli — premium launch film. Pure product + type. No plates.
const { C, F, M, W, H, MOTION, c01, mix, kf, inr, Ctx, Torn, Phone, Status, Tap, Header, Av, HomeScreen, AddScreen, TearOverlay } = window.ToliKit;
const useL = () => React.useContext(Ctx);

// Masked line reveal: rises out of its own baseline, fades on exit.
function Line({ at, out = Infinity, size = 96, weight = 700, color = C.text, track = '-.035em', align = 'center', children, style }) {
  const { T } = useL();
  if (T < at - 0.01 || T > out + 0.4) return null;
  const e = kf(T, at, at + 0.7, MOTION.enter), x = 1 - kf(T, out, out + 0.35, MOTION.enter);
  return (
    <div style={{ overflow: 'hidden', paddingBottom: size * 0.12, textAlign: align, ...style }}>
      <div style={{ font: `${weight} ${size}px/1.02 ${F}`, letterSpacing: track, color, transform: `translateY(${(1 - e) * 105}%)`, opacity: x, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{children}</div>
    </div>
  );
}
const Center = ({ children, top = '50%', gap = 0 }) => <div style={{ position: 'absolute', left: 0, right: 0, top, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap }}>{children}</div>;
const Glow = ({ x = W / 2, y = H * 0.8, w = 1100, o = 0.18 }) => <div style={{ position: 'absolute', left: x - w / 2, top: y - w * 0.18, width: w, height: w * 0.36, borderRadius: '50%', background: `radial-gradient(ellipse, rgba(212,242,106,${o}), rgba(212,242,106,0) 70%)` }} />;

function Phone3D({ x, y, s = 1, rx = 0, ry = 0, rz = 0, o = 1, children }) {
  return (
    <div style={{ position: 'absolute', left: x - 195, top: y - 400, width: 390, height: 800, perspective: 2400, opacity: o }}>
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `scale(${s}) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)` }}>
        <Phone x={195} y={400}>{children}</Phone>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 56, pointerEvents: 'none', background: `linear-gradient(${115 + ry * 2}deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 38%)` }} />
      </div>
    </div>
  );
}

function Scene({ from, to, children }) { return <Shot from={from} to={to}>{children}</Shot>; }

// ─── 1. Open ───
function Open() {
  const { T, CUES } = useL(); const s = CUES.Open;
  return (
    <Scene from={s} to={CUES.Chaos}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 + kf(T, s, s + 4, Easing.linear) * 0.03})` }}>
        <Center>
          <Line at={s + 0.4} out={s + 1.9} size={84} weight={600}>Every trip ends the same way.</Line>
        </Center>
        <Center>
          <Line at={s + 2.3} out={s + 3.6} size={84} weight={600} color={C.muted}>Someone does the maths.</Line>
        </Center>
      </div>
    </Scene>
  );
}

// ─── 2. Chaos ───
const TOKENS = Array.from({ length: 46 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const vals = [800, 1200, 4000, 350, 2400, 600, 150, 4200, 90, 1850, 3000, 480, 720, 260, 5000, 1100];
  return { x: r(1) * W, y: 120 + r(2) * (H - 240), z: r(3), v: vals[i % vals.length], d: r(4) };
});
function Chaos() {
  const { T, CUES } = useL(); const s = CUES.Chaos, e = CUES.Question;
  const push = kf(T, s, e + 1, Easing.linear), gone = kf(T, e - 0.3, e + 0.5, MOTION.move);
  return (
    <Scene from={s} to={e + 0.6}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 + push * 0.18})`, opacity: 1 - gone }}>
        {TOKENS.map((t, i) => {
          const a = kf(T, s + i * 0.09, s + i * 0.09 + 0.6);
          const size = mix(22, 64, t.z);
          return <div key={i} style={{ position: 'absolute', left: t.x + Math.sin(T * 0.5 + i) * 18 * t.z, top: t.y - (T - s) * 14 * t.z, font: `600 ${size}px ${M}`, color: t.z > 0.7 ? '#5b616b' : '#34383f', opacity: a * mix(0.3, 0.75, t.z), transform: `translate(-50%,-50%) scale(${mix(0.8, 1, a)})` }}>{inr(t.v)}</div>;
        })}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'radial-gradient(ellipse at center, rgba(0,0,0,.92) 20%, rgba(0,0,0,0) 65%)', padding: '80px 0' }}>
        <Line at={s + 0.9} out={e - 0.4} size={120}>60 expenses.</Line>
        <Line at={s + 2.0} out={e - 0.4} size={120}>4 friends.</Line>
        <Line at={s + 3.1} out={e - 0.4} size={120} color={C.lime}>1 awkward question.</Line>
      </div>
    </Scene>
  );
}

// ─── 3. Question ───
function Question() {
  const { T, CUES } = useL(); const s = CUES.Question, full = 'so guys, hisaab?';
  let n = 0;
  if (T >= s + 0.5 && T < s + 1.6) n = Math.ceil(full.length * c01((T - s - 0.5) / 1.1));
  else if (T >= s + 1.6 && T < s + 2.3) n = full.length;
  else if (T >= s + 2.3) n = Math.max(0, full.length - Math.ceil(full.length * c01((T - s - 2.3) / 0.8)));
  const caret = Math.floor(T * 2.4) % 2 === 0;
  const box = kf(T, s + 0.1, s + 0.6), fade = 1 - kf(T, s + 3.1, s + 3.4);
  return (
    <Scene from={s} to={CUES.Silence}>
      <div style={{ position: 'absolute', left: W / 2 - 520, top: H / 2 - 70, width: 1040, height: 140, borderRadius: 70, background: '#131417', border: '1px solid #26292e', display: 'flex', alignItems: 'center', padding: '0 56px', boxSizing: 'border-box', opacity: box * fade, transform: `scale(${mix(0.96, 1, box)})` }}>
        <span style={{ font: `500 60px ${F}`, color: n ? C.text : '#4a4f57', letterSpacing: '-.02em' }}>{n ? full.slice(0, n) : 'Message'}</span>
        <span style={{ width: 4, height: 64, marginLeft: 6, background: C.lime, opacity: caret ? 1 : 0 }} />
      </div>
      <Center top="50%"><Line at={s + 3.4} out={CUES.Silence - 0.3} size={84} weight={600}>Nobody wants to be the one who asks.</Line></Center>
    </Scene>
  );
}

// ─── 4. Reveal ───
function Reveal() {
  const { T, CUES } = useL(); const s = CUES.Reveal;
  const line = kf(T, s + 0.2, s + 1.1, MOTION.move), lineOut = kf(T, s + 1.2, s + 1.5);
  const icon = kf(T, s + 1.1, s + 1.7, MOTION.pop), tear = kf(T, s + 2.1, s + 2.6, MOTION.pop);
  const lift = kf(T, s + 2.8, s + 3.5, MOTION.move);
  return (
    <Scene from={s} to={CUES.Hero}>
      <Glow y={H / 2 + 40} w={1400} o={0.12 * icon} />
      <div style={{ position: 'absolute', left: W / 2 - 700 * line, top: H / 2 - 1, width: 1400 * line, height: 3, background: `repeating-linear-gradient(90deg, ${C.lime} 0 18px, transparent 18px 30px)`, opacity: 1 - lineOut }} />
      <div style={{ position: 'absolute', left: W / 2 - 150, top: H / 2 - 92, width: 300, height: 184, display: 'flex', opacity: c01(icon * 2), transform: `translateY(${-lift * 150}px) scale(${mix(0.5, 1, icon) * mix(1, 0.62, lift)})` }}>
        <div style={{ width: 216, height: 184, background: C.lime, borderRadius: '34px 0 0 34px' }} />
        <div style={{ width: 84, height: 184, boxSizing: 'border-box', background: C.lime, borderRadius: '0 34px 34px 0', borderLeft: `6px dashed ${C.on}`, transformOrigin: 'left bottom', transform: `translate(${22 * tear}px,${18 * tear}px) rotate(${14 * tear}deg)` }} />
        <div style={{ position: 'absolute', left: 200, top: -16, width: 32, height: 32, borderRadius: '50%', background: '#000' }} />
        <div style={{ position: 'absolute', left: 200, bottom: -16, width: 32, height: 32, borderRadius: '50%', background: '#000' }} />
      </div>
      <div style={{ position: 'absolute', left: W / 2 - 200 * 1.923 / 2, top: H / 2 + 10 }}>
        <Torn fs={200} top={C.text} bot={C.lime} o={kf(T, s + 3.0, s + 3.4)} tear={kf(T, s + 3.5, s + 3.9, MOTION.pop)} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: H / 2 + 250 }}><Line at={s + 4.1} size={44} weight={500} color={C.muted}>Trip money, sorted.</Line></div>
    </Scene>
  );
}

// ─── 5. Hero ───
function Hero() {
  const { T, CUES } = useL(); const s = CUES.Hero, e = CUES.Add;
  const rise = kf(T, s, s + 1.8, MOTION.move), spin = kf(T, s + 1.8, e, Easing.easeInOutSine);
  const chips = [['Live balance', -420, 520, s + 3.4], ['Works offline', 440, 610, s + 3.7], ['Unlimited. Free.', -400, 800, s + 4.0]];
  return (
    <Scene from={s} to={e}>
      <Glow y={H - 40} w={1300} o={0.16} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 110 }}>
        <Line at={s + 0.9} size={104}>Your whole trip.</Line>
        <Line at={s + 1.6} size={104} color={C.lime}>One ledger.</Line>
      </div>
      <Phone3D x={W / 2} y={mix(H + 520, 820, rise)} s={1.05} rx={mix(58, 14, rise) - spin * 6} ry={mix(-24, -10, rise) + spin * 22}>
        <Status /><HomeScreen T={T} owed={3400} />
      </Phone3D>
      {chips.map(([t, dx, y, at]) => {
        const a = kf(T, at, at + 0.5);
        return <div key={t} style={{ position: 'absolute', left: W / 2 + dx - 130, top: y, width: 260, textAlign: 'center', opacity: a, transform: `translateY(${(1 - a) * 16}px)`, font: `500 26px ${F}`, color: C.text }}>
          <span style={{ padding: '12px 22px', borderRadius: 999, background: 'rgba(242,244,246,.06)', border: '1px solid rgba(242,244,246,.14)' }}>{t}</span>
        </div>;
      })}
    </Scene>
  );
}

// ─── 6. Add ───
function Add() {
  const { T, CUES } = useL(); const s = CUES.Add, e = CUES.Split;
  const K = s + 1.0, S = s + 4.2;
  const inn = kf(T, s, s + 0.8, MOTION.move), swap = T >= s + 6.1;
  const px = 1330, py = H / 2 + 20;
  const who = [['R', 'Rahul'], ['N', 'Neha'], ['J', 'Jay']];
  return (
    <Scene from={s} to={e}>
      <Glow x={px} y={H - 60} w={900} o={0.14} />
      <div style={{ position: 'absolute', left: 180, top: 330 }}>
        {!swap && <React.Fragment><Line at={s + 0.3} out={s + 5.8} size={96} align="left">Type the amount.</Line><Line at={s + 1.0} out={s + 5.8} size={96} align="left" color={C.lime}>That's it.</Line>
          <Line at={s + 3.3} out={s + 5.8} size={30} weight={500} color={C.muted} align="left" style={{ marginTop: 24 }}>Split four ways, live, before you hit save.</Line></React.Fragment>}
        {swap && <React.Fragment><Line at={s + 6.1} size={96} align="left">Everyone gets</Line><Line at={s + 6.4} size={96} align="left" color={C.lime}>their stub.</Line></React.Fragment>}
      </div>
      <Phone3D x={mix(W + 300, px, inn)} y={py} s={1.08} rx={6} ry={mix(-30, -12, inn) + kf(T, s, e, Easing.linear) * 6}>
        <Status />
        {T < S + 1.9 ? <AddScreen T={T} K={K} /> : <HomeScreen T={T} owed={mix(3400, 4300, kf(T, S + 2.1, S + 2.6, MOTION.move))} newRowAt={S + 1.95} />}
        <Tap at={S + 0.05} x={185} y={692} />
        <TearOverlay T={T} S={S} />
      </Phone3D>
      {who.map(([i, n], j) => {
        const at = s + 6.6 + j * 0.18, a = kf(T, at, at + 0.7, MOTION.move);
        const tx = 190 + j * 250, ty = 700;
        return <div key={i} style={{ position: 'absolute', left: mix(px - 90, tx, a), top: mix(py - 60, ty, a), width: 220, height: 150, borderRadius: '6px 6px 24px 24px', background: C.lime, color: C.on, opacity: c01(a * 3), transform: `rotate(${mix(20, (j - 1) * -4, a)}deg) scale(${mix(0.4, 1, a)})`, display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px', boxSizing: 'border-box', boxShadow: '0 30px 60px rgba(0,0,0,.5)' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: -8, height: 8, background: `linear-gradient(45deg,${C.lime} 6px,transparent 0) 0 100%/12px 8px repeat-x,linear-gradient(-45deg,${C.lime} 6px,transparent 0) 0 100%/12px 8px repeat-x` }} />
          <Av i={i} s={56} bg={C.on} fg={C.lime} />
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 22, fontWeight: 600 }}>{n}</span><span style={{ font: `700 30px ${M}` }}>₹300</span></div>
        </div>;
      })}
    </Scene>
  );
}

// ─── 7. Split ───
function Split() {
  const { T, CUES } = useL(); const s = CUES.Split, e = CUES.Settle;
  const off = [false, false, T >= s + 1.3, T >= s + 2.1];
  const k = 4 - off.filter(Boolean).length, val = 1200 / k;
  const lastChange = T >= s + 2.1 ? s + 2.1 : T >= s + 1.3 ? s + 1.3 : s - 5;
  const pop = kf(T, lastChange, lastChange + 0.45, MOTION.pop);
  const up = kf(T, s + 3.1, s + 3.8, MOTION.move);
  const modes = ['Equal', 'Exact', 'Percent', 'Shares', 'Adjust', 'Itemised'];
  return (
    <Scene from={s} to={e}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 150, opacity: 1 - up }}><Line at={s + 0.2} size={40} weight={500} color={C.muted}>Only two of you ate?</Line></div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: mix(300, 150, up), textAlign: 'center', transform: `scale(${mix(1, 0.55, up)})`, transformOrigin: 'top center' }}>
        <div style={{ font: `800 300px/1 ${F}`, letterSpacing: '-.06em', color: k < 4 ? C.lime : C.text, fontVariantNumeric: 'tabular-nums', display: 'inline-block', transform: `translateY(${(1 - pop) * 40}px) scale(${mix(1.06, 1, pop)})`, opacity: kf(T, s + 0.1, s + 0.6) }}>{inr(val)}</div>
        <div style={{ font: `500 34px ${M}`, color: C.muted, marginTop: 10 }}>each · {k} people</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 760, display: 'flex', justifyContent: 'center', gap: 40, opacity: kf(T, s + 0.4, s + 0.9) * (1 - up) }}>
        {['A', 'R', 'N', 'J'].map((i, j) => <div key={i} style={{ opacity: off[j] ? 0.22 : 1, transform: `scale(${off[j] ? 0.86 : 1})` }}><Av i={i} s={120} bg={j < 2 || !off[j] ? C.raised : '#1a1c20'} /></div>)}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 830, display: 'flex', justifyContent: 'center', gap: 14 }}>
        {modes.map((m, j) => { const a = kf(T, s + 3.6 + j * 0.1, s + 4.1 + j * 0.1); return <div key={m} style={{ padding: '14px 26px', borderRadius: 999, border: `1.5px solid ${j === 0 ? C.lime : '#33373e'}`, color: j === 0 ? C.lime : C.text, font: `500 28px ${F}`, opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>{m}</div>; })}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 560 }}><Line at={s + 3.9} size={96}>Every split. Free. Forever.</Line></div>
    </Scene>
  );
}

// ─── 8. Settle ───
function Settle() {
  const { T, CUES } = useL(); const s = CUES.Settle, e = CUES.Montage;
  const count = Math.round(mix(12, 3, kf(T, s + 1.4, s + 2.6, MOTION.move)));
  const shift = kf(T, s + 3.0, s + 3.8, MOTION.move);
  const sheet = kf(T, s + 5.4, s + 5.8, MOTION.move) * (1 - kf(T, s + 6.4, s + 6.7, MOTION.move));
  const pays = [['N', 'Neha pays you', '₹1,200'], ['J', 'Jay pays you', '₹1,200'], ['R', 'Rahul pays you', '₹1,000']];
  return (
    <Scene from={s} to={e}>
      <div style={{ position: 'absolute', left: mix(W / 2 - 420, 180, shift), top: mix(240, 170, shift), transform: `scale(${mix(1, 0.62, shift)})`, transformOrigin: 'top left', display: 'flex', alignItems: 'flex-end', gap: 40, opacity: kf(T, s + 0.2, s + 0.7) }}>
        <span style={{ font: `800 420px/0.8 ${F}`, letterSpacing: '-.07em', color: count <= 3 ? C.lime : C.text, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
        <span style={{ font: `600 72px ${F}`, color: C.muted, paddingBottom: 20 }}>payments.</span>
      </div>
      <div style={{ position: 'absolute', left: 180, top: 520 }}>
        <Line at={s + 3.4} size={80} align="left">Fewest payments.</Line>
        <Line at={s + 4.0} size={80} align="left" color={C.lime}>One tap to UPI.</Line>
        <Line at={s + 6.9} size={28} weight={500} align="left" color={C.muted} style={{ marginTop: 26 }}>Your money never passes through Toli.</Line>
      </div>
      <Phone3D x={mix(W + 300, 1360, shift)} y={H / 2 + 20} s={1.08} rx={6} ry={-12 + kf(T, s + 3, e, Easing.linear) * 5}>
        <Status /><Header title="Settle up" sub="Goa Weekend · 4 days" />
        <div style={{ position: 'absolute', top: 124, left: 18, right: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pays.map(([i, l, a], j) => {
            const en = kf(T, s + 3.8 + j * 0.2, s + 4.2 + j * 0.2), paid = j === 0 && T >= s + 6.7;
            return <div key={i} style={{ position: 'relative', background: C.lime, color: C.on, borderRadius: 22, padding: '16px', display: 'flex', alignItems: 'center', gap: 12, opacity: en, transform: `translateY(${(1 - en) * 30}px)` }}>
              <Av i={i} s={40} bg={C.on} fg={C.lime} /><span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{l}</span><span style={{ fontSize: 22, fontWeight: 800 }}>{a}</span>
              {paid && <div style={{ position: 'absolute', right: 14, top: -10, padding: '4px 8px', border: `2.5px solid ${C.on}`, borderRadius: 8, background: C.lime, font: `700 12px ${M}`, transform: `rotate(-10deg) scale(${mix(2, 1, kf(T, s + 6.7, s + 6.95, MOTION.pop))})` }}>PAID ✓</div>}
            </div>;
          })}
        </div>
        <div style={{ position: 'absolute', left: 18, right: 18, top: 430, height: 56, borderRadius: 18, background: C.text, color: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, opacity: kf(T, s + 4.5, s + 4.8) }}>Pay ₹1,200 via UPI</div>
        <Tap at={s + 5.2} x={185} y={458} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,15,17,.6)', opacity: sheet }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 360, background: C.raised, borderRadius: '28px 28px 0 0', padding: '24px 22px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 8, transform: `translateY(${(1 - sheet) * 100}%)` }}>
          <span style={{ font: `700 11px ${M}`, letterSpacing: '.12em', color: C.muted }}>YOUR UPI APP</span>
          <span style={{ fontSize: 16 }}>Pay Aditya</span>
          <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1 }}>₹1,200</span>
          <div style={{ flex: 1 }} />
          <div style={{ height: 56, borderRadius: 18, background: C.lime, color: C.on, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600 }}>Confirm with PIN</div>
        </div>
        <Tap at={s + 6.2} x={185} y={742} />
      </Phone3D>
    </Scene>
  );
}

// ─── 9. Montage ───
const WORDS = [['Offline.', 'Works with no signal'], ['Kitty.', 'The common pot, counted'], ['Any currency.', 'Rates frozen per expense'], ['Scan the bill.', 'Itemised in seconds'], ['Tickets, saved.', 'PNRs and documents, offline'], ['The recap.', 'Your trip, ready to share']];
function Montage() {
  const { T, CUES } = useL(); const s = CUES.Montage, d = (CUES.Close - s) / WORDS.length;
  const i = Math.max(0, Math.min(WORDS.length - 1, Math.floor((T - s) / d))), t0 = s + i * d;
  const a = kf(T, t0, t0 + 0.25), sc = mix(1.08, 1, kf(T, t0, t0 + d, MOTION.enter));
  return (
    <Scene from={s} to={CUES.Close}>
      <Glow y={H / 2} w={1500} o={0.07 + (i % 2) * 0.05} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: `translateY(-50%) scale(${sc})`, textAlign: 'center', opacity: a }}>
        <div style={{ font: `800 180px/1 ${F}`, letterSpacing: '-.05em', color: i % 2 ? C.lime : C.text }}>{WORDS[i][0]}</div>
        <div style={{ font: `500 26px ${M}`, color: C.muted, marginTop: 26, letterSpacing: '.04em' }}>{WORDS[i][1]}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 90, display: 'flex', justifyContent: 'center', gap: 10 }}>
        {WORDS.map((_, j) => <div key={j} style={{ width: j === i ? 36 : 8, height: 8, borderRadius: 8, background: j === i ? C.lime : '#33373e' }} />)}
      </div>
    </Scene>
  );
}

// ─── 10. Close + End ───
function Close() {
  const { T, CUES } = useL(); const s = CUES.Close, e = CUES.End;
  return (
    <React.Fragment>
      <Scene from={s} to={e}><Center><Line at={s + 0.3} out={e - 0.4} size={120}>Nobody has to ask.</Line></Center></Scene>
      <Scene from={e} to={Infinity}>
        <Glow y={H / 2 + 60} w={1400} o={0.1 * kf(T, e + 0.2, e + 1)} />
        <div style={{ position: 'absolute', left: W / 2 - 240 * 1.923 / 2, top: H / 2 - 190 }}>
          <Torn fs={240} top={C.text} bot={C.lime} o={kf(T, e + 0.1, e + 0.6)} tear={kf(T, e + 0.8, e + 1.25, MOTION.pop)} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: H / 2 + 110 }}><Line at={e + 1.4} size={40} weight={500} color={C.muted}>Free on iOS and Android.</Line></div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: H / 2 + 180, textAlign: 'center', font: `500 24px ${M}`, color: C.lime, letterSpacing: '.08em', opacity: kf(T, e + 1.9, e + 2.3) }}>toli.app</div>
      </Scene>
    </React.Fragment>
  );
}

function Launch() {
  const { T, CUES } = useComposition();
  return (
    <Ctx.Provider value={{ T, CUES }}>
      <div data-screen-label={'t=' + Math.floor(T) + 's'} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000', fontFamily: F, color: C.text }}>
        <Open /><Chaos /><Question /><Reveal /><Hero /><Add /><Split /><Settle /><Montage /><Close />
      </div>
    </Ctx.Provider>
  );
}

function ToliLaunch() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <CompositionStage width={W} height={H} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="#000">
        <Launch />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Editor" />
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={v => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </div>
  );
}
window.ToliLaunch = ToliLaunch;
