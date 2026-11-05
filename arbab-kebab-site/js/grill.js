/* =====================================================================
   ARBAB KEBAB — the rotisserie floating in the bottom-right corner (decorative)
   ---------------------------------------------------------------------
   Three chickens turning on steel spits, stacked in a rotisserie frame, drawn
   on a <canvas> from images/brand/rotisserie-sprite.webp — 60 frames of one
   full turn taken from a real rotisserie video, background removed.

   • Scrolling turns the spits: down turns them forward, up turns them back;
     at rest they keep turning at the video's own speed.
   • Each spit is a third of a turn apart, so they never move in step.
   • Neighbouring frames are blended so the turn stays smooth.
   • A small coal fire flickers under the bottom spit, with sparks rising.
   • The sprite loads only after the rest of the page has.
   • Drawn at the screen's pixel density; only animates while the tab is open.
     With reduced motion it shows a still frame. Clicks pass through it and
     screen readers skip it.
   ===================================================================== */
(() => {
  const host = document.getElementById("grill");
  if(!host) return;
  const canvas = host.querySelector("canvas");
  const ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if(!ctx) return;
  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* sprite sheet layout (written by the build step that made the sprite) */
  const N = +host.dataset.frames || 60, COLS = +host.dataset.cols || 8;
  const FW = +host.dataset.fw || 340, FH = +host.dataset.fh || 204;
  const SPIT = +host.dataset.spit || 0.465;          // spit height inside a frame (fraction of FH)
  const U = FW / 300;                                 // scale for the drawn steel parts
  const TURN_SECONDS = 9.3;                           // one full turn in the source video

  /* scene, in sprite pixels: three frames stacked, a little overlapped like an oven rack */
  const GAP = Math.round(FH * 0.74);                  // spit-to-spit distance
  const FIRE_H = 46;                                  // room under the bottom spit for the coal bed
  const PAD_TOP = 8, SW = FW, SH = PAD_TOP + GAP * 2 + FH + FIRE_H;
  const rowsY = [0, 1, 2].map(i => PAD_TOP + i * GAP);
  const POSTS = [12 * U, FW - 12 * U];                // the frame's two upright steel posts
  const COAL_Y = SH - 16;                             // top of the coal bed
  const FIRE_X0 = POSTS[0] + 12 * U, FIRE_X1 = POSTS[1] - 12 * U, FIRE_W = FIRE_X1 - FIRE_X0;
  let t = 0;                                          // seconds, drives the flicker
  canvas.style.aspectRatio = SW + " / " + SH;
  let k = 1;
  /* the sprite pre-shrunk (in high-quality halving steps) to exactly the size it's drawn at, so the
     chickens stay crisp instead of pixelated when the browser scales them down */
  let fit = null, fitScale = 0;
  function prepareFit(){
    const target = Math.min(1, k);
    if(fit && Math.abs(fitScale - target) < 0.01) return;
    let src = sheet, w = sheet.naturalWidth, h = sheet.naturalHeight;
    const tw = Math.max(1, Math.round(w * target)), th = Math.max(1, Math.round(h * target));
    while(w / 2 >= tw * 1.4){
      const step = document.createElement("canvas");
      step.width = Math.round(w / 2); step.height = Math.round(h / 2);
      const c = step.getContext("2d"); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
      c.drawImage(src, 0, 0, step.width, step.height);
      src = step; w = step.width; h = step.height;
    }
    const out = document.createElement("canvas"); out.width = tw; out.height = th;
    const oc = out.getContext("2d"); oc.imageSmoothingEnabled = true; oc.imageSmoothingQuality = "high";
    oc.drawImage(src, 0, 0, tw, th);
    fit = out; fitScale = target;
  }

  let pos = 0, scrollPush = 0, lastScroll = window.scrollY, raf = 0, last = 0;
  const sheet = new Image();
  let ready = false;

  function steel(x0, x1){
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#2a2521"); g.addColorStop(0.4, "#8a8178"); g.addColorStop(0.6, "#5c554e"); g.addColorStop(1, "#24201c");
    return g;
  }

  function drawFrame(index, y, alpha){
    const i = ((index % N) + N) % N;
    ctx.globalAlpha = alpha;
    const s = fitScale, fw = FW * s, fh = FH * s;
    ctx.drawImage(fit, (i % COLS) * fw, Math.floor(i / COLS) * fh, fw, fh, 0, y, FW, FH);
    ctx.globalAlpha = 1;
  }

  /* the fire under the bottom spit: a bed of glowing coals, flickering flame tongues and a few rising
     sparks — all drawn here, no image. Drawn before the chickens so the flames lick up behind them. */
  function fire(){
    const cx = SW / 2;
    // warm light thrown up from the coals
    const flick = 0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1);
    const light = ctx.createRadialGradient(cx, COAL_Y, 4, cx, COAL_Y, FIRE_W * 0.75);
    light.addColorStop(0, `rgba(255,140,40,${0.42 * flick})`); light.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = light; ctx.fillRect(0, COAL_Y - FIRE_W * 0.75, SW, FIRE_W * 0.75 + 16);
    // the coal tray
    ctx.fillStyle = "#24201c";
    if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(FIRE_X0 - 8 * U, COAL_Y + 4, FIRE_W + 16 * U, 9, 4); ctx.fill(); }
    else ctx.fillRect(FIRE_X0 - 8 * U, COAL_Y + 4, FIRE_W + 16 * U, 9);
    // one pointed flame tongue: wide at the base, narrowing to a tip that sways
    const BASE = COAL_Y + 5;
    function tongue(fx, fw, h, sway, stops){
      const g = ctx.createLinearGradient(0, BASE, 0, BASE - h);
      for(const [o, c] of stops) g.addColorStop(o, c);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fx - fw / 2, BASE);
      ctx.bezierCurveTo(fx - fw / 2, BASE - h * 0.35, fx - fw * 0.12 + sway * 0.4, BASE - h * 0.62, fx + sway, BASE - h);
      ctx.bezierCurveTo(fx + fw * 0.12 + sway * 0.4, BASE - h * 0.62, fx + fw / 2, BASE - h * 0.35, fx + fw / 2, BASE);
      ctx.closePath(); ctx.fill();
    }
    const OUTER = [[0, "rgba(255,170,40,.95)"], [0.45, "rgba(240,96,24,.85)"], [0.8, "rgba(210,52,14,.45)"], [1, "rgba(190,40,10,0)"]];
    const CORE = [[0, "rgba(255,250,215,.95)"], [0.5, "rgba(255,214,90,.7)"], [1, "rgba(255,180,60,0)"]];
    const n = 11, fw = FIRE_W / n * 1.5;
    const flames = [];
    for(let i = 0; i < n; i++){
      const edge = 1 - 0.6 * Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);   // taller in the middle
      flames.push({
        fx: FIRE_X0 + (i + 0.5) * FIRE_W / n,
        h: Math.max(10, (34 + 11 * Math.sin(t * 6.1 + i * 2.3) + 7 * Math.sin(t * 11.7 + i * 5.1)) * edge * U),
        sway: (Math.sin(t * 4.3 + i * 1.7) * 3.5 + Math.sin(t * 9.1 + i) * 1.5) * U
      });
    }
    for(const f of flames) tongue(f.fx, fw, f.h, f.sway, OUTER);                         // orange-red body
    ctx.globalCompositeOperation = "lighter";
    for(const f of flames) tongue(f.fx, fw * 0.5, f.h * 0.5, f.sway * 0.6, CORE);        // bright yellow core
    // glowing coals along the tray, each pulsing on its own
    for(let i = 0; i < 15; i++){
      const ex = FIRE_X0 + (i + 0.5) * FIRE_W / 15, glowAmt = 0.5 + 0.5 * Math.sin(t * 2.7 + i * 1.9);
      ctx.fillStyle = `rgba(255,${(70 + 80 * glowAmt) | 0},20,${0.35 + 0.45 * glowAmt})`;
      ctx.beginPath(); ctx.arc(ex, COAL_Y + 7, (2.2 + (i % 3) * 0.6) * U, 0, Math.PI * 2); ctx.fill();
    }
    // sparks drifting up and fading
    if(!REDUCE) for(let i = 0; i < 7; i++){
      const life = (t * 0.9 + i * 0.37) % 1;
      const sx = FIRE_X0 + ((i * 0.618) % 1) * FIRE_W + Math.sin(t * 2 + i * 3) * 6 * U;
      const sy = COAL_Y - life * 70 * U;
      ctx.fillStyle = `rgba(255,200,90,${(1 - life) * 0.9})`;
      ctx.fillRect(sx, sy, 1.6 * U, 1.6 * U);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function draw(){
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";   // resizing the canvas resets these
    // warm heat glow behind the spits
    const glow = ctx.createRadialGradient(SW / 2, SH / 2, 10, SW / 2, SH / 2, SW * 0.75);
    glow.addColorStop(0, "rgba(255,150,50,.22)"); glow.addColorStop(1, "rgba(255,150,50,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, SW, SH);
    // upright posts from the top spit down to the coal tray
    const top = rowsY[0] + FH * SPIT - 10, bottom = COAL_Y + 13;
    for(const x of POSTS){
      ctx.fillStyle = steel(x - 4, x + 4);
      ctx.fillRect(x - 3.5 * U, top, 7 * U, bottom - top);
      ctx.fillStyle = "#24201c"; ctx.fillRect(x - 6 * U, bottom - 3 * U, 12 * U, 4 * U);   // foot
    }
    fire();
    // the three spits, a third of a turn apart
    rowsY.forEach((y, r) => {
      const p = pos + r * N / 3, f = Math.floor(p), frac = p - f;
      drawFrame(f, y, 1);
      if(!REDUCE && frac > 0.02) drawFrame(f + 1, y, frac);   // blend toward the next frame
      // steel hubs where the spit meets the posts
      for(const x of POSTS){
        const cy = y + FH * SPIT;
        const g = ctx.createRadialGradient(x - 1.5 * U, cy - 1.5 * U, 0.5, x, cy, 6 * U);
        g.addColorStop(0, "#b8b0a7"); g.addColorStop(1, "#3a342f");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, 5.5 * U, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  function frame(now){
    raf = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now; t = now / 1000;
    // natural turning speed, plus whatever the scroll adds (eased so it never jumps)
    const step = Math.min(1, dt * 8), push = scrollPush * step;
    scrollPush -= push;
    pos += dt * N / TURN_SECONDS + push;
    draw();
    if(!document.hidden) raf = requestAnimationFrame(frame);
  }
  function start(){
    if(!ready) return;
    if(REDUCE){ draw(); return; }
    if(!raf){ last = 0; raf = requestAnimationFrame(frame); }
  }
  function resize(){
    const r = canvas.getBoundingClientRect();
    if(!r.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    k = canvas.width / SW;
    if(ready){ prepareFit(); draw(); }
  }

  /* load the sprite only once the page itself has finished loading */
  function load(){
    sheet.decoding = "async";
    sheet.onload = () => { ready = true; host.classList.add("ready"); resize(); start(); };
    sheet.src = host.dataset.sprite;
  }
  if(document.readyState === "complete") setTimeout(load, 300);
  else window.addEventListener("load", () => setTimeout(load, 300), {once: true});

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if(!document.hidden) start(); });
  if(!REDUCE) window.addEventListener("scroll", () => {
    const y = window.scrollY;
    scrollPush += (y - lastScroll) * 0.06;   // frames per pixel scrolled: down turns forward, up turns back
    lastScroll = y;
  }, {passive: true});
})();
