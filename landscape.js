// A living night sky: twinkling stars, drifting snow, a slow aurora and the
// occasional shooting star, so the tree never sits on a still backdrop.
// The field is painted every frame; with reduced motion it stays static.
export function drawLandscape(canvas) {
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let seed = 73211;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const stars = [];
  for (let i = 0; i < 420; i++) {
    stars.push({
      x: random(), y: random(),
      radius: .35 + random() ** 4 * 1.35,
      light: .15 + random() * .5,
      phase: random() * Math.PI * 2,
      // A few stars flare noticeably; most only breathe.
      speed: .35 + random() * .9 + (random() < .08 ? 1.4 : 0),
      warm: random() < .12,
    });
  }
  const brightStars = [];
  for (let i = 0; i < 14; i++) {
    brightStars.push({
      x: random(), y: random() * .62,
      radius: 1.5 + random() * 1.1,
      phase: random() * Math.PI * 2,
      speed: .5 + random() * .6,
      warm: random() < .3,
    });
  }
  const snow = [];
  for (let i = 0; i < 90; i++) {
    snow.push({
      x: random(), y: random(),
      radius: .6 + random() ** 2 * 1.9,
      fall: .008 + random() * .028,
      sway: .4 + random() * 1.1,
      phase: random() * Math.PI * 2,
      light: .25 + random() * .55,
    });
  }
  let meteors = [];
  let nextMeteor = 4200;
  let w = 0, h = 0, dpr = 1, frame = 0, last = 0;
  let observer;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const nextDpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const nextW = Math.round(rect.width * nextDpr), nextH = Math.round(rect.height * nextDpr);
    if (nextW === canvas.width && nextH === canvas.height) {
      w = rect.width; h = rect.height; dpr = nextDpr;
      return false;
    }
    w = rect.width; h = rect.height; dpr = nextDpr;
    canvas.width = nextW; canvas.height = nextH;
    return true;
  }

  function paint(now, dt) {
    if (!w || !h) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = now / 1000;
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, w, h);
    const sky = ctx.createRadialGradient(w * .5, h * .62, 0, w * .5, h * .62, Math.max(w * .48, h * .75));
    sky.addColorStop(0, '#101626');
    sky.addColorStop(.65, '#090e1a');
    sky.addColorStop(1, '#050810');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Slow aurora ribbons: two soft, drifting bands of teal and rose.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const [hue, alpha, speed, offset] of [[168, .075, .021, 0], [318, .05, .014, 2.1]]) {
      const grad = ctx.createLinearGradient(0, h * .08, 0, h * .55);
      grad.addColorStop(0, `hsla(${hue}, 72%, 62%, 0)`);
      grad.addColorStop(.55, `hsla(${hue}, 72%, 62%, ${alpha})`);
      grad.addColorStop(1, `hsla(${hue}, 72%, 62%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, h * .30);
      for (let x = 0; x <= w; x += 24) {
        ctx.lineTo(x, h * .30 + Math.sin(x / (w * .32) + t * speed + offset) * h * .055
          + Math.sin(x / (w * .11) - t * speed * 1.7 + offset) * h * .022);
      }
      ctx.lineTo(w, h * .08); ctx.lineTo(0, h * .08);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // Twinkling stars, brighter near the tree's glow.
    const count = Math.min(stars.length, Math.ceil(w * h / 2950));
    for (let i = 0; i < count; i++) {
      const star = stars[i];
      const twinkle = .62 + .38 * Math.sin(t * star.speed + star.phase);
      ctx.globalAlpha = star.light * twinkle;
      ctx.fillStyle = star.warm ? '#ffe9c4' : '#e7e9ff';
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.radius * (0.8 + .35 * twinkle), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // A quiet moon glow in the upper sky keeps the night from going flat black.
    {
      const moonX = w * .86, moonY = h * .13, moonR = Math.min(w, h) * .038;
      const halo = ctx.createRadialGradient(moonX, moonY, moonR * .4, moonX, moonY, moonR * 5);
      halo.addColorStop(0, 'rgba(226,234,255,.20)');
      halo.addColorStop(.4, 'rgba(200,214,250,.07)');
      halo.addColorStop(1, 'rgba(200,214,250,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(238,242,255,.92)';
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
    }

    // A few bright stars carry a halo and a cross flare.
    for (const star of brightStars) {
      const twinkle = .6 + .4 * Math.sin(t * star.speed + star.phase);
      const x = star.x * w, y = star.y * h, glowR = star.radius * 4.2;
      const g = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      g.addColorStop(0, star.warm ? `rgba(255,232,190,${.5 * twinkle})` : `rgba(214,226,255,${.5 * twinkle})`);
      g.addColorStop(1, 'rgba(214,226,255,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = twinkle; ctx.fillStyle = star.warm ? '#ffedcb' : '#f2f5ff';
      ctx.beginPath(); ctx.arc(x, y, star.radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .5 * twinkle; ctx.fillStyle = star.warm ? '#ffedcb' : '#f2f5ff';
      ctx.fillRect(x - star.radius * 2.6, y - .6, star.radius * 5.2, 1.2);
      ctx.fillRect(x - .6, y - star.radius * 2.6, 1.2, star.radius * 5.2);
    }
    ctx.globalAlpha = 1;

    // Shooting stars.
    if (!reduced) {
      nextMeteor -= dt;
      if (nextMeteor <= 0 && meteors.length < 2) {
        const fromLeft = random() < .5;
        meteors.push({
          x: fromLeft ? w * (.08 + random() * .3) : w * (.62 + random() * .3),
          y: h * (.04 + random() * .18),
          vx: (fromLeft ? 1 : -1) * (w * .55 + random() * w * .3),
          vy: h * (.22 + random() * .12),
          life: 0, span: .55 + random() * .3,
        });
        nextMeteor = 5200 + random() * 7000;
      }
      meteors = meteors.filter(m => (m.life += dt / 1000) < m.span);
      for (const m of meteors) {
        const px = m.x + m.vx * m.life, py = m.y + m.vy * m.life;
        const fade = Math.sin((m.life / m.span) * Math.PI);
        const tail = .16;
        const grad = ctx.createLinearGradient(px, py, px - m.vx * tail, py - m.vy * tail);
        grad.addColorStop(0, `rgba(255, 244, 214, ${.9 * fade})`);
        grad.addColorStop(1, 'rgba(255, 244, 214, 0)');
        ctx.strokeStyle = grad; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - m.vx * tail, py - m.vy * tail); ctx.stroke();
        ctx.fillStyle = `rgba(255, 250, 230, ${.9 * fade})`;
        ctx.beginPath(); ctx.arc(px, py, 1.7, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Drifting snow in front of the sky, behind the tree.
    ctx.fillStyle = '#f2f6ff';
    for (const flake of snow) {
      if (!reduced) {
        flake.y += flake.fall * (dt / 1000);
        if (flake.y > 1.02) { flake.y = -.02; flake.x = random(); }
      }
      const x = (flake.x + Math.sin(t * flake.sway + flake.phase) * .008) * w;
      ctx.globalAlpha = flake.light * (.7 + .3 * Math.sin(t * 1.3 + flake.phase));
      ctx.beginPath();
      ctx.arc(x, flake.y * h, flake.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Low mist drifting along the ground softens the base of the scene.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
      const mx = ((i * .27 + (reduced ? 0 : t * .004 * (1 + i * .3))) % 1.2 - .1) * w;
      const my = h * (.82 + i * .05);
      const mr = w * (.22 + i * .05);
      const mist = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
      mist.addColorStop(0, 'rgba(150,175,220,.055)');
      mist.addColorStop(1, 'rgba(150,175,220,0)');
      ctx.fillStyle = mist;
      ctx.beginPath(); ctx.ellipse(mx, my, mr, mr * .16, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function frameLoop(now) {
    frame = requestAnimationFrame(frameLoop);
    if (document.hidden || !w) return;
    const dt = Math.min(80, last ? now - last : 16);
    last = now;
    resize();
    paint(now, dt);
  }

  resize();
  if (reduced) {
    paint(performance.now(), 0);
    observer = new ResizeObserver(() => { resize(); paint(performance.now(), 0); });
  } else {
    last = 0;
    frame = requestAnimationFrame(frameLoop);
    observer = new ResizeObserver(resize);
  }
  observer.observe(canvas);
  return () => { cancelAnimationFrame(frame); observer.disconnect(); };
}
