// Toli — launch film (78s hero, extended to include splash + loading beats).
// Live-action shots are graded placeholder plates labelled with their brief shot ids.
// All UI is rendered here, never generated.
const C = { base: '#2B2F36', card: '#212429', raised: '#393E47', lime: '#D4F26A', on: '#1F2A00', text: '#F2F4F6', muted: '#A3A9B3', bezel: '#0E0F11' };
const F = "'Bricolage Grotesque', system-ui, sans-serif", M = "'JetBrains Mono', ui-monospace, monospace";
const W = 1920, H = 1080;
const MOTION = { enter: Easing.easeOutCubic, move: Easing.easeInOutCubic, pop: Easing.easeOutBack };
const c01 = v => Math.max(0, Math.min(1, v));
const mix = (a, b, t) => a + (b - a) * t;
const kf = (T, a, b, e) => (e || MOTION.enter)(c01((T - a) / (b - a)));
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const Ctx = React.createContext(null);
const useF = () => React.useContext(Ctx);

const GR = {
  night: { bg: 'linear-gradient(180deg,#081114 0%,#0f1d21 55%,#070b0d 100%)', label: '#8fb3b8' },
  mess: { bg: 'linear-gradient(180deg,#5d655c,#3b423c)', label: '#e2e6dc' },
  warm: { bg: 'radial-gradient(ellipse at 68% 30%,#fffaf0 0%,#f6e2c0 40%,#dcae74 100%)', label: '#6b4a22' },
  golden: { bg: 'linear-gradient(180deg,#f7cf8e 0%,#eaa15c 55%,#7d4f32 100%)', label: '#fff3de' },
  day: { bg: 'linear-gradient(180deg,#ebe7de,#c7bfb0)', label: '#4a4438' },
  cool: { bg: 'linear-gradient(180deg,#c9d3d6,#8d9a9f)', label: '#1f2a2e' },
  blue: { bg: 'linear-gradient(180deg,#141d33 0%,#2e2a48 60%,#b77a52 100%)', label: '#d9d3ea' },
};
const TONES = {
  paper: { bg: '#F2F4F6', fg: '#212429', tear: '#212429', tearO: 0.5 },
  lime: { bg: '#D4F26A', fg: '#1F2A00', tear: '#1F2A00', tearO: 0.5 },
  ink: { bg: '#212429', fg: '#F2F4F6', tear: '#D4F26A', tearO: 1 },
};
const TOP = '0 0,100% 0,100% 55%,95% 62%,90% 55%,85% 62%,80% 55%,75% 62%,70% 55%,65% 62%,60% 55%,55% 62%,50% 55%,45% 62%,40% 55%,35% 62%,30% 55%,25% 62%,20% 55%,15% 62%,10% 55%,5% 62%,0 55%';
const BOT = '0 55%,5% 62%,10% 55%,15% 62%,20% 55%,25% 62%,30% 55%,35% 62%,40% 55%,45% 62%,50% 55%,55% 62%,60% 55%,65% 62%,70% 55%,75% 62%,80% 55%,85% 62%,90% 55%,95% 62%,100% 55%,100% 100%,0 100%';

function Torn({ fs, top, bot, botO = 1, tear = 1, o = 1 }) {
  const w = fs * 1.923, h = fs * 1.058;
  const half = { position: 'absolute', inset: 0, textAlign: 'center' };
  return (
    <div style={{ position: 'relative', width: w, height: h, fontFamily: F, fontSize: fs, fontWeight: 800, letterSpacing: '-.06em', lineHeight: h + 'px', opacity: o }}>
      <span style={{ ...half, color: top, clipPath: `polygon(${TOP})` }}>toli</span>
      <span style={{ ...half, color: bot, opacity: botO, clipPath: `polygon(${BOT})`, transform: `translate(${fs * 0.067 * tear}px,${fs * 0.085 * tear}px) rotate(${3 * tear}deg)` }}>toli</span>
    </div>
  );
}

function Streaks({ T }) {
  return [300, 370, 440, 560, 640].map((y, i) => {
    const x = W + 500 - ((T * 560 + i * 610) % (W + 1000));
    return <div key={i} style={{ position: 'absolute', left: x, top: y, width: 420 + i * 40, height: 14 + (i % 3) * 8, borderRadius: 40, background: 'radial-gradient(ellipse, rgba(255,160,70,.55), rgba(255,160,70,0) 70%)' }} />;
  });
}
function Lights({ T }) {
  return Array.from({ length: 16 }, (_, i) => (
    <div key={i} style={{ position: 'absolute', left: 180 + i * 100, top: 330 + Math.sin(i * 0.7) * 26, width: 12, height: 12, borderRadius: '50%', background: '#ffd9a0', opacity: 0.45 + 0.4 * Math.sin(T * 2 + i), boxShadow: '0 0 18px 6px rgba(255,210,150,.35)' }} />
  ));
}

function Plate({ from, to, grade, id, text, push = 0.06 }) {
  const { T, labels, lb } = useF();
  const g = GR[grade], p = c01((T - from) / (to - from));
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }}>
      <div style={{ position: 'absolute', inset: '-4%', background: g.bg, transform: `scale(${1 + p * push}) translateX(${(0.5 - p) * 28}px)` }} />
      {grade === 'night' && <Streaks T={T} />}
      {grade === 'golden' && <div style={{ position: 'absolute', left: 1240 + p * 140, top: 160 - p * 40, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,244,214,.7), rgba(255,244,214,0) 70%)' }} />}
      {grade === 'blue' && <Lights T={T} />}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,.42) 100%)' }} />
      {labels && id && (
        <div style={{ position: 'absolute', right: 96, bottom: lb + 48, textAlign: 'right', font: `500 15px/1.5 ${M}`, color: g.label, maxWidth: 560 }}>
          <div style={{ letterSpacing: '.12em' }}>{id} · AI PLATE</div><div style={{ opacity: 0.85 }}>{text}</div>
        </div>
      )}
    </div>
  );
}

const UIBg = () => <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 42%, #262a31 0%, #131518 75%)' }} />;

function Phone({ x = W / 2, y = H / 2, s = 1, r = 0, o = 1, bg = C.base, children }) {
  return (
    <div style={{ position: 'absolute', left: x - 195, top: y - 400, width: 390, height: 800, boxSizing: 'border-box', padding: 10, borderRadius: 56, background: C.bezel, boxShadow: '0 60px 120px rgba(0,0,0,.5)', transform: `scale(${s}) rotate(${r}deg)`, opacity: o }}>
      <div style={{ position: 'relative', width: 370, height: 780, borderRadius: 46, background: bg, overflow: 'hidden', fontFamily: F, color: C.text }}>{children}</div>
    </div>
  );
}
function Status({ fg = C.text, label = '5G ▮▮▮' }) {
  return <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44, padding: '0 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', font: `700 13px ${M}`, color: fg, zIndex: 6 }}><span>21:41</span><span style={{ opacity: 0.7, whiteSpace: 'nowrap' }}>{label}</span></div>;
}
function Tap({ at, x, y }) {
  const { T } = useF(); const d = T - at;
  if (d < -0.3 || d > 0.5) return null;
  const pre = c01((d + 0.3) / 0.3), post = c01(d / 0.45);
  return (
    <React.Fragment>
      <div style={{ position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: '50%', background: 'rgba(242,244,246,.35)', border: '2px solid rgba(242,244,246,.6)', opacity: d < 0 ? pre : 1 - post, transform: `scale(${d < 0 ? mix(1.3, 1, pre) : mix(1, 0.85, post)})`, zIndex: 40 }} />
      {d >= 0 && <div style={{ position: 'absolute', left: x - 40, top: y - 40, width: 80, height: 80, borderRadius: '50%', border: '2px solid rgba(212,242,106,.9)', opacity: 1 - post, transform: `scale(${mix(0.4, 1.3, post)})`, zIndex: 40 }} />}
    </React.Fragment>
  );
}
function Header({ title, sub, back = true }) {
  return (
    <div style={{ position: 'absolute', top: 52, left: 18, right: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
      {back && <div style={{ width: 44, height: 44, borderRadius: 14, background: C.raised, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>‹</div>}
      <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 20, fontWeight: 600 }}>{title}</span>{sub && <span style={{ fontSize: 12, color: C.muted }}>{sub}</span>}</div>
    </div>
  );
}
const Av = ({ i, s = 34, bg = C.raised, fg = C.text }) => <div style={{ width: s, height: s, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: s * 0.4, flex: 'none' }}>{i}</div>;

function Card({ from, to, lines }) {
  const { T, tone } = useF(); const t = TONES[tone];
  const ein = kf(T, from, from + 0.2), out = 1 - c01((T - (to - 0.15)) / 0.15);
  return (
    <Shot from={from} to={to}>
      <div style={{ position: 'absolute', inset: 0, background: t.bg }}>
        <div style={{ position: 'absolute', left: '14%', top: '50%', transform: `translateY(calc(-50% + ${(1 - ein) * 8}px))`, opacity: ein * out, font: `500 72px/1.15 ${F}`, color: t.fg, fontVariantNumeric: 'tabular-nums' }}>
          {lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </Shot>
  );
}
function Overlay({ from, to, text }) {
  const { T, lb } = useF();
  if (T < from || T >= to) return null;
  const ein = kf(T, from, from + 0.2), out = 1 - c01((T - (to - 0.15)) / 0.15);
  return (
    <React.Fragment>
      <div style={{ position: 'absolute', left: 0, bottom: lb, width: 1200, height: 420, background: 'radial-gradient(ellipse at 0% 100%, rgba(0,0,0,.6), rgba(0,0,0,0) 70%)', opacity: ein * out }} />
      <div style={{ position: 'absolute', left: 134, bottom: lb + 64, font: `500 40px/1.2 ${F}`, color: '#F2F4F6', opacity: ein * out, transform: `translateY(${(1 - ein) * 8}px)`, fontVariantNumeric: 'tabular-nums' }}>{text}</div>
    </React.Fragment>
  );
}

// ─── ACT I ───
function ActOne() {
  const { T, CUES } = useF();
  const s = CUES.Deleted, full = 'so guys, hisaab?';
  let n = 0;
  if (T >= s + 0.6 && T < s + 1.9) n = Math.ceil(full.length * c01((T - s - 0.6) / 1.3));
  else if (T >= s + 1.9 && T < s + 2.5) n = full.length;
  else if (T >= s + 2.5) n = Math.max(0, full.length - Math.ceil(full.length * c01((T - s - 2.5) / 0.9)));
  const caret = Math.floor(T * 2.4) % 2 === 0;
  const dim = kf(T, s + 3.4, s + 3.8);
  const bubble = (txt, who, mine) => (
    <div style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: 240, padding: '10px 14px', borderRadius: 16, background: mine ? '#2f4a3a' : '#2a2f33', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {!mine && <span style={{ fontSize: 11, fontWeight: 600, color: '#9fc4ae' }}>{who}</span>}<span style={{ fontSize: 15 }}>{txt}</span>
    </div>
  );
  return (
    <React.Fragment>
      <Shot from={CUES.Car} to={CUES.Deleted}><Plate from={CUES.Car} to={CUES.Deleted} grade="night" id="S01" text="Interior SUV at night on a wet highway. Three friends asleep, one awake, lit only by his phone." /></Shot>
      <Shot from={CUES.Deleted} to={CUES.Ask}>
        <Plate from={CUES.Deleted} to={CUES.Ask} grade="night" id="S02" text="Macro on a thumb over a blank screen. Real chat UI composited in." />
        <Phone y={H / 2 - 170} s={mix(1.22, 1.3, kf(T, s, s + 4, Easing.linear))} bg="#111416">
          <Status />
          <div style={{ position: 'absolute', top: 44, left: 0, right: 0, height: 64, background: '#1b1f22', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
            <span style={{ fontSize: 22, color: C.muted }}>‹</span><Av i="GF" s={36} bg="#2f4a3a" />
            <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 16, fontWeight: 600 }}>GOA FINAL</span><span style={{ fontSize: 11, color: C.muted }}>Aditya, Rahul, Neha, Jay</span></div>
          </div>
          <div style={{ position: 'absolute', top: 130, left: 14, right: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bubble('photo dump tomorrow', 'Neha')}{bubble('who has the car keys', 'Jay')}{bubble('reached home. what a trip', 'Rahul')}{bubble('best one yet', '', true)}
          </div>
          <div style={{ position: 'absolute', left: 12, right: 12, bottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, height: 48, borderRadius: 24, background: '#22272a', display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 16, color: n ? C.text : C.muted }}>
              {n ? full.slice(0, n) : 'Message'}<span style={{ width: 2, height: 22, marginLeft: 2, background: '#9fc4ae', opacity: caret ? 1 : 0 }} />
            </div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#2f4a3a' }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: dim }} />
        </Phone>
      </Shot>
      <Shot from={CUES.Ask} to={CUES.Ask + 0.4}><Plate from={CUES.Ask} to={CUES.Ask + 0.4} grade="night" id="S01b" text="Back to his face in the dark. He looks out the window." /></Shot>
      <Card from={CUES.Ask + 0.4} to={CUES.Mess} lines={['Nobody wants to be', 'the one who asks.']} />
    </React.Fragment>
  );
}

// ─── ACT II ───
function ActTwo() {
  const { T, CUES } = useF();
  const s = CUES.Mess;
  const rows = ['Hotel', 'Cab', 'Dinner', 'Fuel', 'Tolls', 'Scooty', 'Bar', 'Breakfast', 'Scuba', 'Snacks', 'Tips'];
  const push = kf(T, s + 2, s + 5, Easing.linear);
  return (
    <React.Fragment>
      <Shot from={s} to={s + 2}><Plate from={s} to={s + 2} grade="mess" id="S03" text="Overhead: thirty crumpled receipts on rumpled hotel sheets. Harsh overhead light." /></Shot>
      <Shot from={s + 2} to={s + 5}>
        <Plate from={s + 2} to={s + 5} grade="mess" />
        <div style={{ position: 'absolute', left: 320, top: 150, width: 1280, height: 760, borderRadius: 18, background: '#0c0d0c', padding: 16, boxSizing: 'border-box', transform: `scale(${1 + push * 0.1})`, transformOrigin: '64% 58%', boxShadow: '0 0 160px rgba(220,235,220,.18)' }}>
          <div style={{ width: '100%', height: '100%', background: '#e3e7e0', borderRadius: 6, overflow: 'hidden', font: `500 17px ${M}`, color: '#3b423c' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '220px repeat(5,1fr)', background: '#cfd5cc', height: 40, alignItems: 'center' }}>
              {['', 'Aditya', 'Rahul', 'Neha', 'Jay', 'TOTAL'].map((h, i) => <div key={i} style={{ padding: '0 12px', fontWeight: 700 }}>{h}</div>)}
            </div>
            {rows.map((r, ri) => (
              <div key={r} style={{ display: 'grid', gridTemplateColumns: '220px repeat(5,1fr)', height: 56, alignItems: 'center', borderBottom: '1px solid #cdd3ca' }}>
                <div style={{ padding: '0 12px' }}>{r}</div>
                {[0, 1, 2, 3, 4].map(ci => {
                  const bad = ri === 6 && ci === 4;
                  return <div key={ci} style={{ padding: '0 12px', height: '100%', display: 'flex', alignItems: 'center', outline: bad ? '3px solid #9a3b32' : 'none', color: bad ? '#9a3b32' : undefined, fontWeight: bad ? 700 : 500 }}>{bad ? '#REF!' : ((ri * 37 + ci * 91) % 900 + 100)}</div>;
                })}
              </div>
            ))}
          </div>
        </div>
        <Overlay from={s + 2.2} to={s + 4.4} text="A sheet nobody updates." />
      </Shot>
      <Shot from={s + 5} to={s + 7}>
        <Plate from={s + 5} to={s + 7} grade="mess" />
        <Phone s={1.08} bg="#dfe2dc">
          <Status fg="#3b423c" />
          <div style={{ position: 'absolute', top: 70, left: 18, right: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3, 4, 5].map(i => <div key={i} style={{ height: 58, borderRadius: 12, background: '#cdd1ca' }} />)}
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(30,34,30,.45)', opacity: 1 - kf(T, s + 6.3, s + 6.5) }} />
          <div style={{ position: 'absolute', left: 28, right: 28, top: 250, borderRadius: 20, background: '#f4f5f2', color: '#2b302b', padding: 24, display: 'flex', flexDirection: 'column', gap: 10, opacity: 1 - kf(T, s + 6.3, s + 6.5) }}>
            <span style={{ fontSize: 20, fontWeight: 600 }}>Daily limit reached</span>
            <span style={{ fontSize: 14, lineHeight: 1.4, color: '#5b635b' }}>Upgrade to add more expenses.</span>
            <div style={{ height: 46, borderRadius: 12, background: '#3b423c', color: '#f4f5f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginTop: 6 }}>Upgrade</div>
            <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#5b635b' }}>Not now</div>
          </div>
          <Tap at={s + 6.1} x={185} y={478} />
        </Phone>
      </Shot>
      <Shot from={s + 7} to={s + 9}><Plate from={s + 7} to={s + 9} grade="mess" id="S03b" text="A hand doing sums on a napkin with a leaking pen. Crosses it out. Starts again." /></Shot>
      <Shot from={s + 9} to={s + 10}><Plate from={s + 9} to={s + 10} grade="mess" id="S03c" text="Four phones face-up on a restaurant table, four different screens." /></Shot>
      <Shot from={s + 10} to={s + 11}>
        <Plate from={s + 10} to={s + 11} grade="mess" />
        <Phone s={1.1} bg="#111416">
          <Status />
          <div style={{ position: 'absolute', top: 120, left: 14, right: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ alignSelf: 'flex-end', width: 210, borderRadius: 16, background: '#2f4a3a', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 150, borderRadius: 10, background: '#dfe2dc', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 12px ${M}`, color: '#5b635b' }}>screenshot · transfer</div>
              <span style={{ fontSize: 13, padding: '0 6px' }}>sent my part</span>
            </div>
            <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 16, background: '#2a2f33', fontSize: 14, color: C.muted, opacity: T > s + 10.25 && T < s + 10.75 ? 1 : 0 }}>Rahul is typing…</div>
          </div>
        </Phone>
      </Shot>
      <Shot from={s} to={s + 11}><div style={{ position: 'absolute', inset: 0, background: 'rgba(80,100,80,.12)', pointerEvents: 'none' }} /></Shot>
      <Card from={CUES.Eat} to={CUES.Nothing} lines={['Or you eat the ₹1,200.']} />
      <Card from={CUES.Nothing} to={CUES.Silence} lines={['And say nothing.']} />
    </React.Fragment>
  );
}

// ─── ACT III: persistent phone from splash to save ───
function AddScreen({ T, K }) {
  const hits = [0.6, 1.1, 1.6, 2.1];
  const amt = ['', '1', '12', '120', '1200'][hits.filter(h => T >= K + h).length];
  const last = hits.filter(h => T >= K + h).pop();
  const pop = last != null ? mix(1.35, 1, kf(T, K + last, K + last + 0.28, MOTION.pop)) : 1;
  const a = +amt || 0;
  const per = !a ? 'Amount is the only thing you need' : a < 10 ? 'Split 4 ways' : `Split 4 ways · ${inr(Math.floor(a / 4))} each`;
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];
  const pressed = { 0: [0.6], 1: [1.1], 10: [1.6, 2.1] };
  return (
    <React.Fragment>
      <Header title="Add expense" />
      <div style={{ position: 'absolute', top: 120, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 34, fontWeight: 600, color: C.muted }}>₹</span>
          <span style={{ fontSize: 66, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: a ? C.text : C.raised, fontVariantNumeric: 'tabular-nums' }}>
            {a ? a.toLocaleString('en-IN').slice(0, -1) : '0'}{a ? <span style={{ display: 'inline-block', transform: `scale(${pop})`, transformOrigin: 'bottom' }}>{a.toLocaleString('en-IN').slice(-1)}</span> : null}
          </span>
        </div>
        <span style={{ font: `500 14px ${M}`, color: C.lime, opacity: a ? 1 : 0.6 }}>{per}</span>
      </div>
      <div style={{ position: 'absolute', top: 262, left: 18, right: 18, display: 'flex', gap: 8 }}>
        {[['PAID BY', 'You'], ['SPLIT', 'Equal · 4'], ['BILL', 'Scan']].map(([k, v]) => <div key={k} style={{ flex: 1, height: 44, borderRadius: 14, background: C.raised, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 10, color: C.muted }}>{k}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span></div>)}
      </div>
      <div style={{ position: 'absolute', top: 330, left: 18, right: 18, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {keys.map((k, i) => {
          const on = (pressed[i] || []).some(h => T >= K + h && T < K + h + 0.18);
          return <div key={i} style={{ height: 62, borderRadius: 16, background: on ? C.raised : C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 600, transform: on ? 'scale(.95)' : 'none' }}>{k}</div>;
        })}
      </div>
      <div style={{ position: 'absolute', left: 18, right: 18, top: 664, height: 56, borderRadius: 18, background: a >= 1200 ? C.lime : C.raised, color: a >= 1200 ? C.on : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 600 }}>Save &amp; tear stubs ✂</div>
      {hits.map((h, i) => <Tap key={i} at={K + h} x={[71, 185, 185, 185][i]} y={[361, 361, 571, 571][i]} />)}
    </React.Fragment>
  );
}
function HomeScreen({ T, owed, newRowAt, offline }) {
  const nr = newRowAt != null ? kf(T, newRowAt, newRowAt + 0.4) : 0;
  const rows = [['Cab to Baga', 'Rahul paid · 4 people', '₹800'], ["Dinner at Fisherman's Wharf", 'You paid · 2 people', '₹1,200'], ['Casa Anjuna · 2 rooms', 'You paid · 4 people', '₹4,000']];
  return (
    <React.Fragment>
      <Header title="Goa Weekend" sub="12 – 15 Oct · Day 2 of 4" />
      <div style={{ position: 'absolute', top: 116, left: 18, right: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {offline && <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 16, background: C.raised, fontSize: 13 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: C.muted }} /><span><b>Offline</b> · 3 expenses will sync</span></div>}
        <div style={{ position: 'relative', background: C.lime, color: C.on, borderRadius: 24, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>You are owed</span>
            <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{inr(owed)}</span>
          </div>
          <div style={{ borderTop: '2px dashed rgba(31,42,0,.35)', margin: '0 18px' }} />
          <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Group spent <b>₹6,000</b></span><span style={{ fontWeight: 600 }}>Settle up →</span></div>
        </div>
        <div style={{ background: C.card, borderRadius: 24, padding: '8px 16px' }}>
          <div style={{ padding: '8px 0 4px', fontSize: 15, fontWeight: 600 }}>Recent</div>
          {newRowAt != null && (
            <div style={{ height: 58 * nr, opacity: nr, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid #2B2F36' }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: C.lime, color: C.on, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 12px ${M}` }}>{offline ? 'TO' : 'FO'}</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 14, fontWeight: 600 }}>{offline ? 'Toll · Patradevi' : "Lunch at Britto's"}</span><span style={{ fontSize: 11, color: offline ? C.lime : C.muted, fontFamily: offline ? M : F }}>{offline ? 'SAVED ON PHONE · WILL SYNC' : 'You paid · 4 people'}</span></div>
              <span style={{ font: `700 14px ${M}` }}>{offline ? '₹150' : '₹1,200'}</span>
            </div>
          )}
          {rows.map(r => (
            <div key={r[0]} style={{ height: 58, display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid #2B2F36' }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: C.raised }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 14, fontWeight: 600 }}>{r[0]}</span><span style={{ fontSize: 11, color: C.muted }}>{r[1]}</span></div>
              <span style={{ font: `700 14px ${M}` }}>{r[2]}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 16, height: 64, borderRadius: 24, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'space-around', fontSize: 13, fontWeight: 600 }}>
        <span style={{ color: C.lime }}>Trip</span><span style={{ color: C.muted }}>Plan</span>
        <div style={{ width: 60, height: 60, borderRadius: 22, background: C.lime, color: C.on, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, transform: 'translateY(-16px)' }}>+</div>
        <span style={{ color: C.muted }}>Vault</span><span style={{ color: C.muted }}>Feed</span>
      </div>
    </React.Fragment>
  );
}
function Skeleton({ T }) {
  const sk = { background: 'linear-gradient(90deg,#393E47 25%,#474D57 50%,#393E47 75%)', backgroundSize: '200% 100%', backgroundPosition: `${-((T * 1.5) % 2) * 100}% 0` };
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '52px 18px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ ...sk, width: 44, height: 44, borderRadius: 14 }} /><div style={{ ...sk, width: 160, height: 14, borderRadius: 6 }} /></div>
      <div style={{ ...sk, height: 168, borderRadius: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><div style={{ ...sk, height: 96, borderRadius: 20 }} /><div style={{ ...sk, height: 96, borderRadius: 20 }} /></div>
      {[0, 1, 2].map(i => <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ ...sk, width: 34, height: 34, borderRadius: '50%' }} /><div style={{ ...sk, flex: 1, height: 12, borderRadius: 6 }} /></div>)}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'center' }}><div style={{ padding: '10px 16px', borderRadius: 999, background: C.text, color: C.card, fontSize: 13, fontWeight: 600 }}>Syncing Goa Weekend · 3 changes</div></div>
    </div>
  );
}
function Splash({ T, a }) {
  const icon = kf(T, a + 1.1, a + 1.5, MOTION.pop), tear = kf(T, a + 1.9, a + 2.3, MOTION.pop);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
      <div style={{ position: 'relative', display: 'flex', width: 150, height: 92, opacity: c01(icon * 2), transform: `scale(${mix(0.6, 1, icon)}) rotate(${mix(-8, 0, icon)}deg)` }}>
        <div style={{ width: 108, height: 92, background: C.lime, borderRadius: '18px 0 0 18px' }} />
        <div style={{ width: 42, height: 92, boxSizing: 'border-box', background: C.lime, borderRadius: '0 18px 18px 0', borderLeft: `3px dashed ${C.on}`, transformOrigin: 'left bottom', transform: `translate(${12 * tear}px,${10 * tear}px) rotate(${14 * tear}deg)` }} />
        <div style={{ position: 'absolute', left: 100, top: -8, width: 16, height: 16, borderRadius: '50%', background: C.base }} />
        <div style={{ position: 'absolute', left: 100, bottom: -8, width: 16, height: 16, borderRadius: '50%', background: C.base }} />
      </div>
      <Torn fs={80} top={C.text} bot={C.lime} tear={kf(T, a + 2.4, a + 2.8, MOTION.pop)} o={kf(T, a + 2.1, a + 2.4)} />
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: kf(T, a + 1.0, a + 1.3) }}>
        <span style={{ font: `500 11px ${M}`, letterSpacing: '.12em', color: C.muted }}>LOADING YOUR TRIPS</span>
        <div style={{ width: '100%', height: 3, borderRadius: 3, background: C.raised, overflow: 'hidden' }}><div style={{ height: '100%', width: `${kf(T, a + 1.3, a + 3.1, MOTION.move) * 100}%`, background: C.lime }} /></div>
      </div>
    </div>
  );
}
function TearOverlay({ T, S }) {
  const rise = kf(T, S + 0.25, S + 0.6, MOTION.enter), torn = T >= S + 0.75, split = T >= S + 0.95;
  const fade = 1 - kf(T, S + 1.75, S + 1.95);
  if (T < S + 0.2 || fade <= 0) return null;
  const who = [['R', 'Rahul'], ['N', 'Neha'], ['J', 'Jay']], base = 103;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(20,22,25,.9)', opacity: fade * c01((T - S - 0.2) / 0.15) }}>
      <div style={{ position: 'absolute', top: 58, left: 0, right: 0, textAlign: 'center', font: `700 11px ${M}`, letterSpacing: '.14em', color: C.muted }}>{T > S + 1.6 ? 'STUBS DELIVERED' : T > S + 1.15 ? 'SENDING STUBS' : 'TEARING'}</div>
      {who.map(([i, n], j) => {
        const got = T >= S + 1.15 + j * 0.1 + 0.55;
        return <div key={i} style={{ position: 'absolute', left: 185 + (j - 1) * 76 - 26, top: 80, width: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: got ? C.lime : C.raised, color: got ? C.on : C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, transform: `scale(${got ? 1.12 : 1})` }}>{i}</div>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{n}</span><span style={{ font: `700 11px ${M}`, color: got ? C.lime : C.muted }}>{got ? '₹300' : '·'}</span>
        </div>;
      })}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - rise) * 160}px)`, opacity: rise }}>
        <div style={{ position: 'absolute', left: 30, top: 234, width: 310, height: 190, boxSizing: 'border-box', padding: '18px 20px', background: C.lime, color: C.on, borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', gap: 8, transform: torn ? 'translateY(-8px)' : 'none' }}>
          <span style={{ alignSelf: 'flex-start', background: C.on, color: C.lime, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999 }}>New expense</span>
          <span style={{ fontSize: 20, fontWeight: 600 }}>Lunch at Britto's</span>
          <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1 }}>₹1,200</span>
          <span style={{ fontSize: 12, opacity: 0.75 }}>You paid · split 4 ways</span>
          {!torn && <div style={{ position: 'absolute', left: 20, right: 20, bottom: -1, borderTop: '2px dashed rgba(31,42,0,.4)' }} />}
          {torn && <div style={{ position: 'absolute', left: 12, right: 12, bottom: -6, height: 6, background: `linear-gradient(135deg,${C.lime} 4.5px,transparent 0) 0 0/9px 6px repeat-x,linear-gradient(-135deg,${C.lime} 4.5px,transparent 0) 0 0/9px 6px repeat-x` }} />}
        </div>
        {who.map(([i, n], j) => {
          const w = j === 2 ? 310 - base * 2 : base, left = 30 + base * j, cx = left + w / 2;
          const fs = S + 1.15 + j * 0.1, fx = kf(T, fs, fs + 0.55, MOTION.move), fy = kf(T, fs, fs + 0.55, MOTION.pop), fly = T >= fs;
          const mid = j - 1;
          let core = 'none';
          if (torn && !split) core = `translateY(${14 + j * 4}px) rotate(2deg)`;
          if (split && !fly) core = `translate(${mid * 14}px,30px) rotate(${mid * 7}deg)`;
          if (fly) core = `rotate(${mix(mid * 7, mid * 22 + 10, fx)}deg) scale(${mix(1, 0.34, fx)})`;
          const got = T >= fs + 0.55;
          return <div key={i} style={{ position: 'absolute', left, top: 424, width: torn ? w : w + 2, height: 110, opacity: got ? 0 : 1, transform: `translate(${(185 + mid * 76 - cx) * fx}px,${(106 - 479) * fy}px)` }}>
            <div style={{ width: '100%', height: '100%', transform: core }}>
              <div style={{ width: '100%', height: '100%', background: C.lime, color: C.on, borderRadius: split ? '4px 4px 16px 16px' : j === 0 ? '0 0 0 20px' : j === 2 ? '0 0 20px 0' : 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: split ? '0 18px 30px rgba(0,0,0,.4)' : 'none' }}>
                <Av i={i} s={30} bg={C.on} fg={C.lime} /><span style={{ fontSize: 12, fontWeight: 600 }}>{n}</span><span style={{ font: `700 13px ${M}` }}>₹300</span>
              </div>
            </div>
          </div>;
        })}
      </div>
    </div>
  );
}
function ActThree() {
  const { T, CUES } = useF();
  const a = CUES.Arrival, K = CUES.Keypad, S = CUES.Save, J = CUES.JustAdd;
  const rise = kf(T, a + 0.7, a + 1.3, MOTION.move);
  const zin = kf(T, K + 0.2, K + 0.9, MOTION.move), zout = kf(T, K + 2.9, K + 3.7, MOTION.move);
  const sc = mix(mix(1, 1.62, zin), 1.1, zout) + kf(T, S, J, Easing.linear) * 0.04;
  const dy = mix(mix(0, -150, zin), 0, zout);
  const y = mix(H + 460, H / 2 - dy * sc, rise);
  let screen;
  if (T < a + 3.1) screen = <Splash T={T} a={a} />;
  else if (T < a + 3.6) screen = <Skeleton T={T} />;
  else if (T < K) screen = <div style={{ position: 'absolute', inset: 0, opacity: kf(T, a + 3.6, a + 3.85) }}><HomeScreen T={T} owed={3400} /><Tap at={K - 0.15} x={185} y={718} /></div>;
  else if (T < S + 1.7) screen = <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - kf(T, K, K + 0.35, MOTION.enter)) * 60}px)`, opacity: kf(T, K, K + 0.2) }}><AddScreen T={T} K={K} /><Tap at={S + 0.05} x={185} y={692} /><TearOverlay T={T} S={S} /></div>;
  else screen = <HomeScreen T={T} owed={mix(3400, 4300, kf(T, S + 1.9, S + 2.3, MOTION.move))} newRowAt={S + 1.75} />;
  return (
    <React.Fragment>
      <Shot from={a} to={a + 0.7}><Plate from={a} to={a + 0.7} grade="warm" id="S04" text="Hard cut to overexposed morning light in a beach shack. A thumb enters frame." /></Shot>
      <Shot from={a + 0.7} to={J}>
        <div style={{ position: 'absolute', inset: 0, background: GR.warm.bg, opacity: 1 - kf(T, K - 0.2, K + 0.4) }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 42%, #262a31 0%, #131518 75%)', opacity: kf(T, K - 0.2, K + 0.4) }} />
        <Phone y={y} s={sc}><Status />{screen}</Phone>
      </Shot>
      <Shot from={J} to={J + 0.5}><Plate from={J} to={J + 0.5} grade="warm" id="S04b" text="Pull back: phone already down, he's rejoined the table. Nobody noticed." /></Shot>
      <Card from={J + 0.5} to={CUES.Build} lines={['Or you just add it.']} />
    </React.Fragment>
  );
}

// ─── ACT IV ───
function Beat({ from, children }) {
  const { T } = useF();
  return <Shot from={from} to={from + 2}><UIBg /><Phone s={mix(1.04, 1.1, kf(T, from, from + 2, Easing.linear))}>{children}</Phone></Shot>;
}
function ActFour() {
  const { T, CUES } = useF();
  const b = CUES.Build;
  const nehaOff = T >= b + 0.55, jayOff = T >= b + 0.9;
  const k = 4 - (nehaOff ? 1 : 0) - (jayOff ? 1 : 0), each = 1200 / k;
  const bump = t0 => mix(1.25, 1, kf(T, t0, t0 + 0.3, MOTION.pop));
  const splitRows = [['A', 'You', true], ['R', 'Rahul', true], ['N', 'Neha', !nehaOff], ['J', 'Jay', !jayOff]];
  const kv = mix(20000, 8400, kf(T, b + 12.2, b + 13.3, MOTION.move));
  const ring = 2 * Math.PI * 110;
  const payer = (name, card, amt, t0, t1, frac) => (
    <div style={{ background: C.card, borderRadius: 20, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Av i={name[0]} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span><span style={{ font: `500 11px ${M}`, color: C.muted }}>{card}</span></div><span style={{ font: `700 16px ${M}` }}>{amt}</span></div>
      <div style={{ height: 8, borderRadius: 8, background: C.raised }}><div style={{ height: '100%', width: `${kf(T, t0, t1, MOTION.move) * frac}%`, borderRadius: 8, background: C.lime }} /></div>
    </div>
  );
  return (
    <React.Fragment>
      <Beat from={b}>
        <Status /><Header title="Split ₹1,200" sub="Paid by you" />
        <div style={{ position: 'absolute', top: 122, left: 18, display: 'flex', gap: 6 }}>{['Equal', 'Exact', 'Percent', 'Shares'].map((m, i) => <div key={m} style={{ height: 36, padding: '0 14px', borderRadius: 12, background: i ? C.card : C.lime, color: i ? C.text : C.on, display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600 }}>{m}</div>)}</div>
        <div style={{ position: 'absolute', top: 180, left: 18, right: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {splitRows.map(([i, n, on], j) => (
            <div key={i} style={{ height: 74, boxSizing: 'border-box', background: C.card, borderRadius: 20, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 12, opacity: on ? 1 : 0.45 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: on ? C.lime : 'transparent', border: `1.5px solid ${C.raised}`, color: C.on, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>{on ? '✓' : ''}</div>
              <Av i={i} /><span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{n}</span>
              <span style={{ font: `700 17px ${M}`, display: 'inline-block', transform: `scale(${on ? bump(jayOff ? b + 0.9 : nehaOff ? b + 0.55 : b - 1) : 1})` }}>{on ? inr(each) : '—'}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 22, bottom: 40, font: `600 14px ${F}`, color: C.lime }}>✓ All ₹1,200 assigned · {k} people</div>
        <Tap at={b + 0.55} x={45} y={405} /><Tap at={b + 0.9} x={45} y={489} />
      </Beat>
      <Overlay from={b + 0.2} to={b + 1.9} text="Only two of you ate." />
      <Shot from={b + 2} to={b + 4}><Plate from={b + 2} to={b + 4} grade="golden" id="S04c" text="Two friends eating prawns at a plastic-table shack. The other two absent." /></Shot>
      <Beat from={b + 4}><Status label="OFFLINE" /><HomeScreen T={T} owed={4300} offline newRowAt={b + 4.6} />
        <div style={{ position: 'absolute', left: 18, right: 18, bottom: 100, padding: '14px 16px', borderRadius: 16, background: C.text, color: C.card, fontSize: 14, fontWeight: 600, opacity: kf(T, b + 4.8, b + 5.0) * (1 - kf(T, b + 5.8, b + 6)) }}>Saved on this phone</div>
      </Beat>
      <Overlay from={b + 4.2} to={b + 5.6} text="No signal." />
      <Shot from={b + 6} to={b + 8}><Plate from={b + 6} to={b + 8} grade="golden" id="S05" text="Scooter on a red-dirt road lined with palms. No towers, no signal." /></Shot>
      <Beat from={b + 8}>
        <Status /><Header title="Members" sub="Goa Weekend · 4 people" />
        <div style={{ position: 'absolute', top: 120, left: 18, right: 18, background: C.card, borderRadius: 24, padding: '4px 16px' }}>
          {[['A', 'Aditya', 'Day 1'], ['R', 'Rahul', 'Day 1'], ['N', 'Neha', 'Day 1'], ['J', 'Jay', 'joined day 2']].map(([i, n, d], j) => (
            <div key={i} style={{ height: 58, display: 'flex', alignItems: 'center', gap: 12, borderTop: j ? '1px solid #2B2F36' : 'none' }}>
              <Av i={i} /><span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{n}</span>
              <span style={{ padding: '5px 10px', borderRadius: 999, font: `700 11px ${M}`, background: j === 3 ? C.lime : 'transparent', color: j === 3 ? C.on : C.muted, transform: j === 3 ? `scale(${mix(1.3, 1, kf(T, b + 8.3, b + 8.6, MOTION.pop))})` : 'none' }}>{d}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', top: 390, left: 18, right: 18, background: C.lime, color: C.on, borderRadius: 22, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, opacity: kf(T, b + 8.6, b + 8.9), transform: `translateY(${(1 - kf(T, b + 8.6, b + 8.9)) * 20}px)` }}>
          <span style={{ font: `700 11px ${M}`, letterSpacing: '.1em' }}>NIGHT 1 · CASA ANJUNA</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 30, fontWeight: 800 }}>₹3,000</span><span style={{ fontSize: 14, fontWeight: 600 }}>split 3 ways</span></div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{['A', 'R', 'N'].map(i => <Av key={i} i={i} s={30} bg={C.on} fg={C.lime} />)}<div style={{ opacity: 0.3 }}><Av i="J" s={30} bg={C.on} fg={C.lime} /></div><span style={{ marginLeft: 'auto', font: `700 14px ${M}` }}>₹1,000 each</span></div>
        </div>
      </Beat>
      <Overlay from={b + 8.2} to={b + 9.9} text="Someone joined on day two." />
      <Shot from={b + 10} to={b + 12}><Plate from={b + 10} to={b + 12} grade="day" id="S05b" text="The fourth friend walks out of arrivals, bag over shoulder, grinning." /></Shot>
      <Beat from={b + 12}>
        <Status /><Header title="Kitty" sub="The common pot · held by Rahul" />
        <div style={{ position: 'absolute', top: 130, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 260, height: 260 }}>
            <svg width="260" height="260" viewBox="0 0 260 260" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="130" cy="130" r="110" fill="none" stroke={C.raised} strokeWidth="20" />
              <circle cx="130" cy="130" r="110" fill="none" stroke={C.lime} strokeWidth="20" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - kv / 20000)} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums' }}>{inr(Math.round(kv / 100) * 100)}</span>
              <span style={{ fontSize: 13, color: C.muted }}>left of ₹20,000</span>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', top: 430, left: 18, right: 18, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {['Aditya', 'Rahul', 'Neha', 'Jay'].map(n => <div key={n} style={{ background: C.card, borderRadius: 16, padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}><span style={{ fontSize: 12, color: C.muted }}>{n}</span><span style={{ font: `700 13px ${M}` }}>₹5,000</span></div>)}
        </div>
      </Beat>
      <Overlay from={b + 12.2} to={b + 13.9} text="Everyone threw in ₹5,000." />
      <Shot from={b + 14} to={b + 16}><Plate from={b + 14} to={b + 16} grade="golden" id="S06" text="Four hands put folded notes into a zip pouch on a car bonnet." /></Shot>
      <Beat from={b + 16}>
        <Status /><Header title="Dinner at Thalassa" sub="Day 3 · 4 people" />
        <div style={{ position: 'absolute', top: 124, left: 22, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13, color: C.muted }}>Total bill</span><span style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1 }}>₹3,000</span></div>
        <div style={{ position: 'absolute', top: 220, left: 18, right: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 13, color: C.muted, padding: '0 4px' }}>Paid by</span>
          {payer('Aditya', 'HDFC CARD ••42', '₹2,000', b + 16.3, b + 16.9, 66.7)}
          {payer('Neha', 'ICICI CARD ••17', '₹1,000', b + 16.6, b + 17.1, 33.3)}
        </div>
        <div style={{ position: 'absolute', left: 22, top: 470, fontSize: 15, fontWeight: 600, color: C.lime, opacity: kf(T, b + 17.1, b + 17.3) }}>✓ ₹3,000 covered · 2 payers</div>
      </Beat>
      <Overlay from={b + 16.2} to={b + 17.8} text="One bill. Two cards." />
      <Shot from={b + 18} to={b + 20}><Plate from={b + 18} to={b + 20} grade="golden" id="S07" text="Drone, low over turquoise water at golden hour. The group small on the sand." push={0.14} /></Shot>
    </React.Fragment>
  );
}

// ─── ACT V ───
function ActFive() {
  const { T, CUES, labels, lb } = useF();
  const s = CUES.Settle;
  const zin = kf(T, s + 4.8, s + 5.3, MOTION.move);
  const sc = mix(1.5, 1.08, zin), dy = mix(-150, 0, zin);
  const count = Math.round(mix(12, 3, kf(T, s + 2.5, s + 3.7, MOTION.move)));
  const pays = [['N', 'Neha pays Aditya', '₹1,200', 'Casa Anjuna ₹1,000 + Cab ₹200'], ['J', 'Jay pays Aditya', '₹1,200', 'Casa Anjuna ₹1,000 + Cab ₹200'], ['R', 'Rahul pays Aditya', '₹1,000', 'Net of shared expenses']];
  const sheet = kf(T, s + 7.45, s + 7.85, MOTION.move) * (1 - kf(T, s + 8.45, s + 8.75, MOTION.move));
  const quads = [['cool', 'Metro carriage', 'N', '₹1,200'], ['warm', 'Home kitchen', 'J', '₹1,200'], ['golden', 'Back of an auto', 'R', '₹1,000'], ['day', 'Office desk', 'A', '₹3,400']];
  return (
    <React.Fragment>
      <Shot from={s} to={s + 2}><Plate from={s} to={s + 2} grade="day" id="S08" text="Airport departures. Hugs, bags, the awkward shuffle before splitting up." /></Shot>
      <Shot from={s + 2} to={s + 9}>
        <UIBg />
        <Phone y={H / 2 - dy * sc} s={sc}>
          <Status /><Header title="Settle up" sub="Goa Weekend · 4 days" />
          <div style={{ position: 'absolute', top: 118, left: 22, right: 22, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 0.9, color: C.muted, textDecoration: T > s + 3.7 ? 'line-through' : 'none', textDecorationThickness: 3 }}>12</span><span style={{ fontSize: 11, color: C.muted }}>payments</span></div>
            <span style={{ fontSize: 28, color: C.muted, paddingBottom: 14 }}>→</span>
            <span style={{ fontSize: 88, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 0.85, color: C.lime, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
          </div>
          <div style={{ position: 'absolute', top: 232, left: 22, fontSize: 13, color: C.muted, opacity: kf(T, s + 3.9, s + 4.2) }}>Simplified. Nobody's total changes.</div>
          <div style={{ position: 'absolute', top: 272, left: 18, right: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pays.map(([i, line, amt, why], j) => {
              const e = kf(T, s + 5 + j * 0.25, s + 5.4 + j * 0.25), paid = j === 0 && T >= s + 8.75;
              return <div key={i} style={{ position: 'relative', background: C.lime, color: C.on, borderRadius: 22, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: e, transform: `translateY(${(1 - e) * 30}px)` }}>
                <Av i={i} s={40} bg={C.on} fg={C.lime} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 15, fontWeight: 600 }}>{line}</span><span style={{ fontSize: 11, opacity: 0.7 }}>{why}</span></div>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{amt}</span>
                {paid && <div style={{ position: 'absolute', right: 14, top: -10, padding: '4px 8px', border: `2.5px solid ${C.on}`, borderRadius: 8, background: C.lime, font: `700 12px ${M}`, transform: `rotate(-10deg) scale(${mix(2, 1, kf(T, s + 8.75, s + 9, MOTION.pop))})` }}>PAID ✓</div>}
              </div>;
            })}
          </div>
          <div style={{ position: 'absolute', left: 18, right: 18, top: 640, height: 56, borderRadius: 18, background: C.text, color: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, opacity: kf(T, s + 5.8, s + 6.1) }}>Pay ₹1,200 via UPI</div>
          <Tap at={s + 7.3} x={185} y={668} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,15,17,.6)', opacity: sheet }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 380, background: C.raised, borderRadius: '28px 28px 0 0', padding: '24px 22px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 8, transform: `translateY(${(1 - sheet) * 100}%)` }}>
            <span style={{ font: `700 11px ${M}`, letterSpacing: '.12em', color: C.muted }}>YOUR UPI APP</span>
            <span style={{ fontSize: 16 }}>Pay Aditya</span>
            <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1 }}>₹1,200</span>
            <span style={{ font: `500 12px ${M}`, color: C.muted }}>aditya@okhdfc · Goa Weekend</span>
            <div style={{ flex: 1 }} />
            <div style={{ height: 56, borderRadius: 18, background: C.lime, color: C.on, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600 }}>Confirm with PIN</div>
          </div>
          <Tap at={s + 8.3} x={185} y={752} />
        </Phone>
      </Shot>
      <Shot from={s + 9} to={CUES.Resolve}>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 4, background: '#000' }}>
          {quads.map(([g, place, i, amt], j) => {
            const lit = kf(T, s + 9.2 + j * 0.25, s + 9.5 + j * 0.25);
            return <div key={place} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: '-5%', background: GR[g].bg, transform: `scale(${1 + c01((T - s - 9) / 3) * 0.06})` }} />
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: 240, height: 330, marginLeft: -120, marginTop: -150, borderRadius: 34, background: C.bezel, padding: 7, boxSizing: 'border-box' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: 28, background: mix(0, 1, lit) > 0.5 ? C.base : '#0b0c0e', position: 'relative', overflow: 'hidden', transition: 'none' }}>
                  <div style={{ position: 'absolute', top: 70, left: 10, right: 10, background: C.lime, color: C.on, borderRadius: '4px 4px 16px 16px', padding: 12, display: 'flex', flexDirection: 'column', gap: 4, opacity: lit, transform: `translateY(${(1 - lit) * -20}px)`, fontFamily: F }}>
                    <span style={{ font: `700 9px ${M}`, letterSpacing: '.1em', opacity: 0.7 }}>TOLI · GOA WEEKEND</span>
                    <span style={{ fontSize: 12 }}>{i === 'A' ? 'Coming back to you' : 'Your share, ready to pay'}</span>
                    <span style={{ fontSize: 26, fontWeight: 800 }}>{amt}</span>
                  </div>
                </div>
              </div>
              {labels && <div style={{ position: 'absolute', right: 24, bottom: j > 1 ? lb + 20 : 20, font: `500 13px ${M}`, color: GR[g].label, letterSpacing: '.1em' }}>S09 · {place.toUpperCase()}</div>}
            </div>;
          })}
        </div>
        <Overlay from={s + 9.3} to={s + 11.8} text="Everyone knows what they owe." />
      </Shot>
    </React.Fragment>
  );
}

// ─── ACT VI ───
function ActSix() {
  const { T, CUES, tone } = useF();
  const r = CUES.Resolve, e = CUES.Endcard, t = TONES[tone];
  return (
    <React.Fragment>
      <Shot from={r} to={r + 2.2}><Plate from={r} to={r + 2.2} grade="blue" id="S10" text="Weeks later. The same four on a Bengaluru rooftop, laughing. No phones in frame." push={0.1} /></Shot>
      <Card from={r + 2.2} to={e} lines={['Nobody has to ask.']} />
      <Shot from={e} to={Infinity}>
        <div style={{ position: 'absolute', inset: 0, background: t.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
          <Torn fs={180} top={t.fg} bot={t.tear} botO={t.tearO} tear={kf(T, e + 0.7, e + 1.1, MOTION.pop)} o={kf(T, e + 0.1, e + 0.5)} />
          <span style={{ font: `500 32px ${F}`, color: t.fg, opacity: kf(T, e + 1.0, e + 1.3) * 0.8 }}>Trip expenses, settled.</span>
          <div style={{ display: 'flex', gap: 16, marginTop: 18, opacity: kf(T, e + 1.6, e + 1.9) }}>
            {['App Store', 'Google Play'].map(s => <div key={s} style={{ height: 60, padding: '0 26px', borderRadius: 14, border: `2px solid ${t.fg}`, display: 'flex', alignItems: 'center', font: `600 20px ${F}`, color: t.fg }}>{s}</div>)}
          </div>
        </div>
      </Shot>
    </React.Fragment>
  );
}

function Film({ tweaks }) {
  const { T, CUES } = useComposition();
  const lb = tweaks.letterbox ? Math.round((H - W / 2.39) / 2) : 0;
  const ctx = { T, CUES, lb, labels: tweaks.plateLabels, tone: tweaks.cardTone };
  return (
    <Ctx.Provider value={ctx}>
      <div data-screen-label={'t=' + Math.floor(T) + 's'} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000', fontFamily: F }}>
        <ActOne /><ActTwo /><ActThree /><ActFour /><ActFive /><ActSix />
        {lb > 0 && <React.Fragment><div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: lb, background: '#000' }} /><div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: lb, background: '#000' }} /></React.Fragment>}
      </div>
    </Ctx.Provider>
  );
}

function ToliFilm() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <CompositionStage width={W} height={H} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="#000">
        <Film tweaks={t} />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Editor" />
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={v => setTweak('motionEditor', v)} />
        <TweakSection label="Film" />
        <TweakToggle label="2.39:1 letterbox" value={t.letterbox} onChange={v => setTweak('letterbox', v)} />
        <TweakToggle label="Show plate labels" value={t.plateLabels} onChange={v => setTweak('plateLabels', v)} />
        <TweakRadio label="Card tone" value={t.cardTone} options={['paper', 'lime', 'ink']} onChange={v => setTweak('cardTone', v)} />
      </TweaksPanel>
    </div>
  );
}
window.ToliFilm = ToliFilm;

window.ToliKit = { C, F, M, W, H, MOTION, c01, mix, kf, inr, Ctx, Torn, Phone, Status, Tap, Header, Av, HomeScreen, AddScreen, Splash, Skeleton, TearOverlay };
