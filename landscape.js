// A stationary deep-sky field makes the moving foreground sparks readable during rotation.
export function drawLandscape(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = [];
  let seed = 73211;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let i = 0; i < 310; i++) {
    stars.push({x:random(), y:random(), radius:.35 + random() ** 4 * 1.35, light: .15 + random() * .5});
  }
  function paint() {
    const {width,height} = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width*dpr);
    canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle = '#050810';
    ctx.fillRect(0,0,width,height);
    const sky = ctx.createRadialGradient(width*.5,height*.62,0,width*.5,height*.62,Math.max(width*.48,height*.75));
    sky.addColorStop(0,'#101626');
    sky.addColorStop(.65,'#090e1a');
    sky.addColorStop(1,'#050810');
    ctx.fillStyle = sky;
    ctx.fillRect(0,0,width,height);
    const count = Math.min(stars.length, Math.ceil(width*height/2950));
    ctx.fillStyle = '#e7e9ff';
    for (const star of stars.slice(0,count)) {
      ctx.globalAlpha = star.light;
      ctx.beginPath();
      ctx.arc(star.x*width,star.y*height,star.radius,0,Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  paint();
  const observer = new ResizeObserver(paint);
  observer.observe(canvas);
  return ()=>observer.disconnect();
}
