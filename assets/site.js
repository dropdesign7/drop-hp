// しずく（Drop. の「.」）を押すと、もう一滴落ちる。
document.querySelectorAll('.dot').forEach((dot) => {
  dot.addEventListener('click', () => {
    dot.classList.remove('is-falling');
    void dot.offsetWidth; // アニメーションを最初からやり直すための読み出し
    dot.classList.add('is-falling');
  });
});

// キャラクターを背景写真の上の決まった場所に立たせる。
// 写真は object-fit:cover で切り抜かれるので、切り抜き方に合わせて位置と大きさを計算する。
(() => {
  const hero = document.querySelector('.hero');
  const photo = hero && hero.querySelector('.hero__photo');
  const chara = hero && hero.querySelector('.hero__chara');
  if (!photo || !chara) return;
  // 写真の画素で見た、キャラクターの枠（左・上・幅・高さ）
  const spots = {
    pc: { iw: 2508, ih: 1411, box: [470, 512, 391, 736] },
    sp: { iw: 1024, ih: 2048, box: [645, 1191, 277, 522] },   // スマホ：棚の右、床の上
    tab: { iw: 1024, ih: 2048, box: [150, 1191, 277, 522] },  // タブレット：右に文字があるので棚の前（キャッチを大きくしたので 210→150 に左へ。2026-11-24）
  };
  const place = () => {
    const src = photo.currentSrc || photo.src;
    const s = src.includes('mobile-r') ? spots.sp : src.includes('mobile') ? spots.tab : spots.pc;
    const cw = photo.clientWidth, ch = photo.clientHeight;
    if (!cw || !ch) return;
    const k = Math.max(cw / s.iw, ch / s.ih);
    const pos = getComputedStyle(photo).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    const ox = (cw - s.iw * k) * pos[0], oy = (ch - s.ih * k) * pos[1];
    const [l, t, w, h] = s.box;
    let left = ox + l * k, top = oy + t * k, cw2 = w * k, ch2 = h * k;
    // 左上のロゴに頭がかからないよう、ロゴの下に余白をとる。
    // かかるときは、足もとの位置はそのままで、少し小さくする
    const logo = hero.querySelector('.logo');
    if (logo) {
      const minTop = logo.getBoundingClientRect().bottom - hero.getBoundingClientRect().top + 28;
      const head = 0.018; // 絵の枠の上端から、髪のてっぺんまでの割合
      if (top + ch2 * head < minTop) {
        const bottom = top + ch2, feetX = left + cw2 * 0.6;
        ch2 = (bottom - minTop) / (1 - head);
        cw2 = ch2 * (w / h);
        top = bottom - ch2;
        left = feetX - cw2 * 0.6;
      }
    }
    Object.assign(chara.style, {
      left: `${left}px`, top: `${top}px`, width: `${cw2}px`, height: `${ch2}px`,
    });
    chara.classList.add('is-ready');
  };
  if (photo.complete) place(); else photo.addEventListener('load', place);
  addEventListener('resize', place);
})();

// PC では、上のメニューの左端を「DROP IN」の「D」の左の縦線にそろえる（2026-11-17 コウノさん指定）。
// 文字の形の端（インクの端）で測るので、字間や字の余白のずれも差し引く。
(() => {
  const hero = document.querySelector('.hero');
  const nav = hero && hero.querySelector('.head .nav');
  const word = hero && hero.querySelector('.hero__drop');
  if (!nav || !word) return;
  const ctx = document.createElement('canvas').getContext('2d');
  const align = () => {
    if (innerWidth < 900) { nav.removeAttribute('style'); return; }
    const cs = getComputedStyle(word);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const text = word.textContent.trim();
    const first = ctx.measureText(text[0]);
    const r = document.createRange(); r.selectNodeContents(word);
    const box = r.getBoundingClientRect();
    const inkL = box.left - first.actualBoundingBoxLeft;           // 「D」の左の縦線
    const head = nav.parentElement.getBoundingClientRect();
    // メニューの最初の文字（ABOUT の A）のインクの左端も差し引く
    const a = nav.querySelector('a:not([hidden])');
    const as = getComputedStyle(a);
    ctx.font = `${as.fontWeight} ${as.fontSize} ${as.fontFamily}`;
    const aInk = -ctx.measureText(a.textContent.trim()[0]).actualBoundingBoxLeft;
    Object.assign(nav.style, { position: 'absolute', left: `${inkL - head.left - aInk}px` });
  };
  align();
  if (document.fonts) document.fonts.ready.then(align);
  addEventListener('resize', align);
})();

// 見比べ（2026-11-24）：つまみで「素通りされる入口」と「立ち寄りたくなる入口」を見比べる。
const compare = (() => {
  const fig = document.getElementById('compare');
  if (!fig) return null;
  const range = fig.querySelector('.compare__range');
  let touched = false;
  const set = (v) => {
    fig.style.setProperty('--pos', `${v}%`);
    fig.dataset.side = v < 15 ? 'after' : v > 85 ? 'before' : '';
    range.value = Math.round(v);
  };
  range.addEventListener('input', () => { touched = true; set(+range.value); });
  // マウスでは、枠の上を動かすだけでつまみがついてくる（押さなくても見比べられる）
  fig.querySelector('.compare__frame').addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    touched = true;
    set(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  });
  return { set, touched: () => touched };
})();

// ラボへ入る動き（2026-11-24。参考：do Kaori さんのトップの「スクロールで動画を一コマずつ進める」しくみ）
// 入口：3Dのキャラクターがデザインラボの前で待つ → スクロールに合わせて動画が進み、扉を開けて中へ → ラボの中で見比べ。
// 動きを減らす設定の人・入口の言葉が1画面に収まらない画面では、動かさずにふつうに並べる。
(() => {
  const journey = document.querySelector('.journey');
  const hero = journey && journey.querySelector('.hero');
  const film = hero && hero.querySelector('.hero__film');
  const lab = journey && journey.querySelector('.lab');
  const main = hero && hero.querySelector('.hero__main');
  if (!journey || !hero || !film || !lab || !main) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) { film.removeAttribute('src'); film.load(); return; }

  const root = document.documentElement;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sp = matchMedia('(max-width:599px)'), tab = matchMedia('(min-width:600px) and (max-width:899px)');

  // ---- 動画：スクロールした量に合わせて currentTime を動かす（再生はしない） ----
  let ready = false, want = 0;
  const seek = () => {
    if (!ready || film.seeking || !Number.isFinite(film.duration)) return;
    if (Math.abs(film.currentTime - want) > 0.02) { try { film.currentTime = want; } catch (e) { /* 読み込み前はあとで */ } }
  };
  const onFrame = () => { if (film.readyState >= 2) { ready = true; hero.classList.add('is-film'); seek(); } };
  ['loadeddata', 'canplay'].forEach((t) => film.addEventListener(t, onFrame));
  film.addEventListener('seeked', seek);
  film.addEventListener('play', () => { if (!priming) film.pause(); });
  // Safari（とくに iPhone）は、一度だけ無音で再生しておかないとコマ送りに応じないので、最初の操作で準備する
  let priming = false;
  const prime = () => {
    if (priming || ready) return;
    priming = true;
    Promise.resolve(film.play()).then(() => { film.pause(); priming = false; onFrame(); }, () => { priming = false; });
  };
  ['touchstart', 'pointerdown', 'keydown', 'wheel'].forEach((t) => addEventListener(t, prime, { passive: true, once: true }));
  onFrame();

  // ---- スクロールの進み具合 → 動画・文字・ラボ ----
  let ticking = false;
  const update = () => {
    ticking = false;
    const total = journey.offsetHeight - innerHeight;
    const p = total > 0 ? clamp(-journey.getBoundingClientRect().top / total) : 0;
    const walk = seg(p, 0.03, 0.62);                 // 動画の進み（0〜1）
    if (Number.isFinite(film.duration)) { want = walk * (film.duration - 0.05); seek(); }
    const text = 1 - ease(seg(p, 0.02, 0.18));       // 入口の言葉が消える
    const open = ease(seg(p, 0.6, 0.74));            // ラボの中身が現れる
    const st = journey.style;
    st.setProperty('--text', text.toFixed(3));
    st.setProperty('--veil', open.toFixed(3));
    st.setProperty('--lab', open.toFixed(3));
    // スマホ・タブレットは横長の動画の一部しか見えないので、歩くキャラクターを追って見る位置をずらす
    st.setProperty('--ox', sp.matches ? `${lerp(53, 88, walk)}%` : tab.matches ? `${lerp(56, 86, walk)}%` : '50%');
    lab.classList.toggle('is-open', open > 0.5);
    lab.inert = open < 0.5;
    main.inert = text < 0.5;
    // ラボに入ったあとは、スクロールに合わせてつまみが左右に一往復する（自分で触ったら止める）
    if (compare && !compare.touched()) compare.set(50 + 34 * Math.sin(seg(p, 0.76, 0.97) * Math.PI * 2));
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  const fits = () => {
    root.classList.add('has-journey');
    const ok = main.scrollHeight <= hero.clientHeight + 1 && main.getBoundingClientRect().bottom <= innerHeight + 1;
    root.classList.toggle('has-journey', ok);
    if (!ok) { main.inert = false; lab.inert = false; ['--text', '--veil', '--lab', '--ox'].forEach((k) => journey.style.removeProperty(k)); }
    return ok;
  };
  addEventListener('scroll', () => { if (root.classList.contains('has-journey')) onScroll(); }, { passive: true });
  addEventListener('resize', () => { if (fits()) onScroll(); });
  if (document.fonts) document.fonts.ready.then(() => { if (fits()) onScroll(); });
  if (fits()) update();
})();
