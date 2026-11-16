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
    pc: { iw: 2508, ih: 1411, box: [214, 61, 443, 835] },
    sp: { iw: 1200, ih: 2400, box: [290, 1220, 332, 626] },
  };
  const place = () => {
    const s = (photo.currentSrc || photo.src).includes('mobile') ? spots.sp : spots.pc;
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
