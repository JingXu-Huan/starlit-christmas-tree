// All tree, spiral, orbit, and heart particles share one static vertex buffer.
// The shader handles projection, shimmer and drift. The foreground canvas carries the photo ornaments.
const TAU = Math.PI * 2;
const STRIDE = 10;

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function colorAt(y, tint) {
  // Cool blue near the ground, almost paper-white at the tree tip.
  const f = Math.min(1, Math.max(0, (1.02 - y) ** 1.6 + tint));
  return [0.26 + 0.74*f, 0.49 + 0.50*f, 0.94 + 0.06*f];
}

function radiusAt(y) {
  return 0.008 + 0.404 * Math.pow(Math.max(0, y), 0.86);
}

function makeCloud() {
  const random = seededRandom(298134), points = [];
  const spread = () => random() + random() + random() - 1.5;
  function add(x, y, z, size, color, brightness, kind = 0) {
    points.push(x, y, z, size, ...color, brightness, random() * TAU, kind);
  }
  function place(y, r, angle, size, color, brightness) {
    add(Math.cos(angle) * r, y, Math.sin(angle) * r, size, color, brightness);
  }
  // Six helical ribbons, thirteen latitude rings, and a sparse interior give the cone its depth.
  // Broad ribbons are built out of separate points and remain readable as they turn.
  for (let i=0; i<19040; i++) {
    const strand=i%6;
    const y=Math.pow(random(),0.69);
    const a=y*TAU*7.5 + strand*TAU/6 + .29*Math.sin(y*9+strand*.7) + spread()*.115;
    const r=radiusAt(y)*(.95 + .035*Math.sin(y*22+strand) + spread()*.10);
    const yy=y + spread()*(.004 + .011*y);
    const bright=random()<.08;
    const tint=bright ? .24+random()*.25 : spread()*.085;
    const size=bright ? .0029+random()*.0020 : .0008+random()**1.65*.0026;
    place(yy,r,a,size,colorAt(y,tint),bright ? .94 : .29+random()*.50);
  }
  for (let i=0; i<6160; i++) {
    const ring=i%13;
    const y=(ring+.55)/13, a=random()*TAU;
    const r=radiusAt(y)*(.96+spread()*.125);
    const yy=y+spread()*(.003+.009*y)+.008*Math.sin(a*3+ring);
    const bright=random()<.08;
    place(yy,r,a,bright?.0045:.001+random()**2*.0024,colorAt(y,.07+random()*.22),bright?.88:.28+random()*.44);
  }
  for(let i=0; i<2800; i++) {
    const y=Math.pow(random(),.67),a=random()*TAU;
    const r=radiusAt(y)*Math.sqrt(random())*.92;
    place(y,r,a,.001+random()**2*.0028,colorAt(y,spread()*.13),.22+random()*.41);
  }
  for (let band = 0; band < 4; band++) {
    const n = [1140,860,560,280][band], radius = [.35,.412,.469,.528][band];
    for (let i=0; i<n; i++) {
      const a = random()*TAU + band*0.22;
      const r = radius + Math.sin(a*3+band)*.005 + spread()*(.005+band*.0021);
      const intensity=(.22+random()*.63)*(.71+.29*Math.sin(a*2+band));
      add(Math.cos(a)*r, 1.018 + band*.004 + spread()*.0036, Math.sin(a)*r,
        .0011+random()**2*.0028, [.35+random()*.25,.61+random()*.21,1],intensity,4+band);
    }
  }
  for (let i=0; i<600; i++) {
    const a=random()*TAU;
    const r=.19+Math.sqrt(random())*.40;
    add(Math.cos(a)*r, 1.03+spread()*.009, Math.sin(a)*r,.001+random()*.002,[.40,.63,1],random()*.35,1);
  }
  // A camera-facing hollow heart preserves its silhouette at every viewing angle.
  for (let i=0; i<900; i++) {
    const t = random() * TAU;
    const x = Math.sin(t)**3;
    const y = (13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/16;
    const f = .91 + spread()*.085;
    const pink = random();
    add(x*.046*f+spread()*.0008, -.060-y*.042*f+spread()*.001, 0,
      .0013+random()**2*.0036,[1,.54+pink*.45,.75+pink*.25],.43+random()*.56,2);
  }
  for (let i=0; i<410; i++) {
    const x = (random()-.5)*1.94, y = random()*1.28-.16, z = (random()-.5)*1.1;
    add(x,y,z,.0008+random()**3*.0044,[.67+random()*.29,.77+random()*.21,1], .15+random()*.39,3);
  }
  return new Float32Array(points);
}

const vertexSource = `
attribute vec3 aPosition;
attribute float aSize;
attribute vec3 aColor;
attribute float aBrightness;
attribute float aPhase;
attribute float aKind;
uniform vec2 uViewport;
uniform vec2 uOrigin;
uniform vec2 uRotation;
uniform float uScale;
uniform float uRatio;
uniform float uTime;
varying vec3 vColor;
varying float vBrightness;
void main() {
  vec3 p=aPosition;
  float s=uRotation.x, c=uRotation.y;
  float x = p.x*c + p.z*s;
  float z = p.z*c - p.x*s;
  float y=p.y+z*0.157;
  float shimmer=0.85+0.15*sin(uTime*(0.86+0.12*aPhase)+aPhase*3.3);
  float brightness = aBrightness;
  float crown = aKind<0.5 ? 1.0-smoothstep(0.12,0.58,p.y) : 0.0;
  if (aKind < 0.5) {
    x += 0.0013*sin(1.15*uTime+aPhase*4.0);
    y += 0.0018*cos(0.81*uTime+aPhase*2.0);
    brightness *= 0.65 + 0.42*clamp(0.5+z/max(0.015,p.y*0.59),0.0,1.0);
  } else if (aKind > 3.5) {
    float speed = mod(aKind,2.0)<0.5 ? 0.071 : -0.057;
    float phase = speed*(1.0+(aKind-4.0)*0.25)*uTime;
    float rx=x*cos(phase)+z*sin(phase);
    float rz=z*cos(phase)-x*sin(phase);
    x=rx; y=p.y+rz*0.157;
  } else if (aKind > 2.5) {
    x=p.x+0.019*sin(0.23*uTime+aPhase);
    y=mod(p.y+0.16+uTime*(0.009+aSize*1.7),1.28)-0.16;
    shimmer=0.69+0.31*sin(0.92*uTime+aPhase);
  } else if (aKind > 1.5) {
    float beat=1.0+0.034*sin(1.8*uTime);
    x=p.x*beat;
    y=-0.06+(p.y+0.06)*beat;
  }
  vec2 screen=(uOrigin+uScale*vec2(x,y))/uViewport;
  gl_Position=vec4(screen.x*2.0-1.0,1.0-screen.y*2.0,0.0,1.0);
  gl_PointSize=max(1.7*uRatio,aSize*uScale*uRatio*(2.65+2.9*crown));
  vColor=mix(aColor,vec3(1.0),crown*0.78);
  vBrightness=brightness*shimmer*(1.0+0.87*crown);
}`;
const fragmentSource = `
precision mediump float;
varying vec3 vColor;
varying float vBrightness;
void main() {
  vec2 p=gl_PointCoord*2.0-1.0;
  float r=dot(p,p);
  if(r>=1.0) discard;
  float light=exp(-r*6.5)*0.83 + max(0.0,1.0-r)*0.14;
  float alpha=light*vBrightness;
  gl_FragColor=vec4(vColor*alpha,alpha);
}`;

function compile(gl, type, source) {
  const shader=gl.createShader(type);
  gl.shaderSource(shader,source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
    const reason=gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(reason);
  }
  return shader;
}

function createGPU(canvas, cloud) {
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,powerPreference:'low-power'});
  if (!gl) return null;
  const program=gl.createProgram();
  const vert=compile(gl,gl.VERTEX_SHADER,vertexSource), frag=compile(gl,gl.FRAGMENT_SHADER,fragmentSource);
  gl.attachShader(program,vert); gl.attachShader(program,frag); gl.linkProgram(program);
  gl.deleteShader(vert); gl.deleteShader(frag);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
  gl.useProgram(program);
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,cloud,gl.STATIC_DRAW);
  for (const [name,components,offset] of [['aPosition',3,0],['aSize',1,3],['aColor',3,4],['aBrightness',1,7],['aPhase',1,8],['aKind',1,9]]) {
    const loc=gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,components,gl.FLOAT,false,STRIDE*4,offset*4);
  }
  const [viewport,origin,rotation,scale,ratio,time] = ['uViewport','uOrigin','uRotation','uScale','uRatio','uTime'].map(n=>gl.getUniformLocation(program,n));
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE); gl.clearColor(0,0,0,0);
  return {
    draw(view, sn, cs, t) {
      gl.viewport(0,0,canvas.width,canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(viewport,view.w,view.h); gl.uniform2f(origin,view.x,view.y);
      gl.uniform2f(rotation,sn,cs); gl.uniform1f(scale,view.s); gl.uniform1f(ratio,view.dpr);
      gl.uniform1f(time,t); gl.drawArrays(gl.POINTS,0,cloud.length/STRIDE);
    },
    destroy() { gl.deleteBuffer(buffer); gl.deleteProgram(program); }
  };
}

// Reduced point count with prepainted radial sprites keeps the same shape on devices without WebGL.
function makeFallback(cloud) {
  const sprites = Array.from({length:16},(_,i)=>{
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=16;
    const c=canvas.getContext('2d');
    const t=i/12;
    const rgb=i>=13 ? [255,153+(i-13)*37,206+(i-13)*19] : [Math.floor(71+184*t),Math.floor(131+124*t),255];
    const gradient=c.createRadialGradient(8,8,0,8,8,8);
    for(const [at,alpha] of [[0,1],[.3,.74],[.65,.18],[1,0]]) gradient.addColorStop(at,'rgba('+rgb.join(',')+','+alpha+')');
    c.fillStyle=gradient;c.fillRect(0,0,16,16);
    return canvas;
  });
  const points=[];
  for (let i=0;i<cloud.length;i+=STRIDE) {
    const kind=cloud[i+9];
    if (i/STRIDE%(kind===3?2:kind===2?3:kind>=4?4:7)!==0) continue;
    const shade=kind===2?13+Math.floor(cloud[i+8]*.435):Math.min(12,Math.max(0,Math.round((cloud[i+4]-.26)/.74*12)));
    points.push({x:cloud[i],y:cloud[i+1],z:cloud[i+2],s:cloud[i+3],b:cloud[i+7],phase:cloud[i+8],kind,sprite:sprites[shade]});
  }
  return (c,view,sn,cs,t)=>{
    c.globalCompositeOperation='lighter';
    for(const p of points) {
      let x=p.x*cs+p.z*sn;
      const z=p.z*cs-p.x*sn;
      let y=p.y+z*.157, a=p.b*(.85+.15*Math.sin(t*.94+p.phase*2));
      if(p.kind>=4){
        const ph=(p.kind%2===0?.071:-.057)*(1+(p.kind-4)*.25)*t;
        const cc=Math.cos(ph),ss=Math.sin(ph);
        y=p.y+(z*cc-x*ss)*.157;x=x*cc+z*ss;
      } else if(p.kind===3) {
        x=p.x+.019*Math.sin(.23*t+p.phase); y=(p.y+.16+t*(.009+p.s*1.7))%1.28-.16;
      } else if(p.kind===2) {
        const beat=1+.034*Math.sin(1.8*t);
        x=p.x*beat;y=-.06+(p.y+.06)*beat;
      } else if (p.kind===0) {
        x+=.0013*Math.sin(t+p.phase*4);y+=.0018*Math.cos(t*.81+p.phase*2);
        a*=.72+.28*Math.min(1,Math.max(0,.5+z/Math.max(.015,p.y*.59)));
      }
      const crown=p.kind===0?Math.max(0,1-p.y/.7):0;
      const r=Math.max(1.1,p.s*view.s*(1.95+crown*.90));
      a*=1+crown*.66;
      c.globalAlpha=Math.min(.98,a*1.18);c.drawImage(p.sprite,view.x+x*view.s-r,view.y+y*view.s-r,r*2,r*2);
    }
    c.globalAlpha=1; c.globalCompositeOperation='source-over';
  };
}

// A soft halo reaches beyond individual point sprites on both render paths.
function makeHeartGlow() {
  const sprite=document.createElement('canvas');
  sprite.width=sprite.height=192;
  const c=sprite.getContext('2d');
  const bloom=c.createRadialGradient(96,96,0,96,96,96);
  bloom.addColorStop(0,'rgba(255,192,223,.23)');
  bloom.addColorStop(.23,'rgba(255,143,196,.25)');
  bloom.addColorStop(.49,'rgba(247,115,179,.13)');
  bloom.addColorStop(.76,'rgba(202,84,166,.045)');
  bloom.addColorStop(1,'rgba(174,71,158,0)');
  c.fillStyle=bloom; c.fillRect(0,0,192,192);
  c.beginPath();
  for(let i=0; i<=128; i++) {
    const t=TAU*i/128;
    const x=96+Math.sin(t)**3*37;
    const y=96-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*2.11;
    if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
  }
  c.closePath(); c.shadowBlur=14;c.shadowColor='#ff88bb';
  c.lineWidth=5;c.strokeStyle='rgba(255,174,214,.44)';c.stroke();
  return sprite;
}

const PHOTO_HEIGHTS=[.43,.69,.33,.81,.57,.24,.74,.89];
const PHOTO_ANGLES=[1.22,2.23,4.68,.58,3.54,1.82,5.77,2.91];

export function createTree(canvas,{onSelect}={}) {
  const ctx=canvas.getContext('2d');
  const stage=document.createElement('canvas');
  stage.setAttribute('aria-hidden','true');
  stage.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  const cloud=makeCloud(), heartGlow=makeHeartGlow();
  let gpu=null, fallback=null;
  function useGPU() {
    try { gpu=createGPU(stage,cloud); } catch { gpu=null; }
    if(!gpu && !fallback) fallback=makeFallback(cloud);
    stage.style.visibility=gpu?'visible':'hidden';
  }
  useGPU(); canvas.before(stage); canvas.style.position='relative';
  function onContextLost(event) { event.preventDefault(); gpu=null; if(!fallback) fallback=makeFallback(cloud);stage.style.visibility='hidden'; }
  stage.addEventListener('webglcontextlost',onContextLost); stage.addEventListener('webglcontextrestored',useGPU);

  let view={w:0,h:0,x:0,y:0,s:0,dpr:1}, photos=[], hits=[], angle=0, target=0;
  let drag=null, frame=0, last=0, animationTime=0, stopped=false, pauseOrbitUntil=0;
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  function resize() {
    const {width:w,height:h}=canvas.getBoundingClientRect();
    if (!w||!h) return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const s=Math.min(h*.81,w*.94);
    view={w,h,dpr,s,x:w*.5,y:(h-s*1.24)*.5+s*.127};
    stage.width=canvas.width=Math.max(1,Math.round(w*dpr));
    stage.height=canvas.height=Math.max(1,Math.round(h*dpr));
  }
  function setPhotos(list) {
    const loaded=new Map(photos.map(p=>[p.src,p.img]));
    photos=list.map((p,i)=>{
      let img=loaded.get(p.src);
      if (!img) {img=new Image();img.src=p.src;}
      const h=PHOTO_HEIGHTS[i%8]+.024*Math.sin(Math.floor(i/8)*2.39);
      const r=radiusAt(h)*1.11, a=PHOTO_ANGLES[i%8]+Math.floor(i/8)*2.39996;
      return {index:i,src:p.src,img,x:r*Math.cos(a),y:h,z:r*Math.sin(a),r,tilt:Math.sin(i*1.8+.55)*.083};
    });
  }

  function drawPhotos(sn,cs) {
    hits=[];
    const list=photos.map(p=>({p,z:p.z*cs-p.x*sn})).sort((a,b)=>a.z-b.z);
    for(const {p,z} of list) {
      if (!p.img.naturalWidth || z < -p.r*.11) continue;
      const alpha=Math.min(1,Math.max(0,(z/p.r+.11)*3.1));
      const x=view.x+(p.x*cs+p.z*sn)*view.s,y=view.y+(p.y+z*.157)*view.s;
      const w=view.s*(.077+.044*z), h=w*1.09;
      const iw=w*.88, ih=h*.79, crop=Math.max(iw/p.img.naturalWidth,ih/p.img.naturalHeight);
      const sw=iw/crop, sh=ih/crop;
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(p.tilt);
      ctx.lineWidth=Math.max(.6,view.s*.001);ctx.strokeStyle='#b7d3fa';
      ctx.beginPath();ctx.moveTo(-w*.37,-h*.47);ctx.lineTo(0,-h*.64);ctx.lineTo(w*.37,-h*.47);ctx.stroke();
      ctx.fillStyle='#bac5d3';ctx.fillRect(-w*.5,-h*.5,w,h);
      ctx.fillStyle='#f0f2f5';ctx.fillRect(-w*.476,-h*.478,w*.952,h*.956);
      ctx.drawImage(p.img,(p.img.naturalWidth-sw)/2,(p.img.naturalHeight-sh)/2,sw,sh,-iw*.5,-h*.425,iw,ih);
      ctx.restore();
      if (alpha>.36) hits.push({index:p.index,x,y,w,h});
    }
  }
  function draw(now) {
    if(stopped) return;
    frame=requestAnimationFrame(draw);
    if(document.hidden || !view.s) return;
    const dt=Math.min(.08,(now-last)/1000);
    if(!gpu && now-last < 32) return;
    last=now;
    if(!reducedMotion?.matches) {
      animationTime+=dt;
      if(!drag && now>pauseOrbitUntil) target+=dt*.062;
    }
    angle+=(target-angle)*(1-Math.exp(-14*dt));
    const sn=Math.sin(angle),cs=Math.cos(angle);
    ctx.setTransform(view.dpr,0,0,view.dpr,0,0);
    ctx.clearRect(0,0,view.w,view.h);
    if(gpu) gpu.draw(view,sn,cs,animationTime);
    else fallback(ctx,view,sn,cs,animationTime);
    const glowSize=view.s*(.236+.004*Math.sin(animationTime*1.8));
    ctx.drawImage(heartGlow,view.x-glowSize*.5,view.y-view.s*.06-glowSize*.5,glowSize,glowSize);
    drawPhotos(sn,cs);
  }

  function rotate(delta) {
    if(!Number.isFinite(delta)) return;
    target+=delta; pauseOrbitUntil=performance.now()+2000;
  }
  function hit(x,y) {
    for(let i=hits.length-1;i>=0;i--) {
      const b=hits[i]; if(Math.abs(b.x-x)<b.w*.56+3 && Math.abs(b.y-y)<b.h*.56+3) return b;
    }
  }
  function down(e) {
    if(drag || e.button!==0) return;
    canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,moved:false};
  }
  function move(e) {
    const bounds=canvas.getBoundingClientRect();
    if(!drag) {canvas.style.cursor=hit(e.clientX-bounds.left,e.clientY-bounds.top)?'pointer':'grab';return;}
    if(e.pointerId!==drag.id) return;
    if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4) drag.moved=true;
    if(drag.moved) {rotate((e.clientX-drag.lastX)*3.3/Math.max(160,view.s));canvas.style.cursor='grabbing';}
    drag.lastX=e.clientX;
  }
  function up(e) {
    if(!drag || e.pointerId!==drag.id) return;
    if(!drag.moved && e.type==='pointerup') {
      const bounds=canvas.getBoundingClientRect(), photo=hit(e.clientX-bounds.left,e.clientY-bounds.top);
      if(photo) onSelect?.(photo.index);
    }
    drag=null;canvas.style.cursor='grab';
  }
  canvas.style.cursor='grab';canvas.style.touchAction='pan-y';
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();frame=requestAnimationFrame(draw);
  return {setPhotos,rotate,destroy() {
    stopped=true;cancelAnimationFrame(frame);observer.disconnect();gpu?.destroy();stage.remove();
    canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);
    canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);
    stage.removeEventListener('webglcontextlost',onContextLost);stage.removeEventListener('webglcontextrestored',useGPU);
  }};
}
