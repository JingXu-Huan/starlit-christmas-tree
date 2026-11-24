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
  const t = Math.max(0, Math.min(1, y));
  // Four stacked tiers: each layer flares at its lower edge and pinches
  // slightly where the next layer starts, so the cone reads as a tree.
  const edges = [0, 0.30, 0.58, 0.82, 1.0];
  const radii = [0.012, 0.158, 0.268, 0.358, 0.418];
  let k = 0;
  while (k < 3 && t >= edges[k + 1]) k++;
  const local = (t - edges[k]) / (edges[k + 1] - edges[k]);
  let r = radii[k] + (radii[k + 1] - radii[k]) * Math.pow(local, 0.85);
  r += Math.pow(Math.max(0, (local - 0.86) / 0.14), 2) * 0.028;
  r *= 1 - 0.05 * Math.exp(-Math.pow(local / 0.10, 2));
  return r;
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
  // About 7% of the tree points are warm gold, so the ice-blue cone has a
  // contrasting sparkle instead of one flat colour.
  const gold = () => [1, .68 + random() * .18, .34 + random() * .14];
  for (let i=0; i<19040; i++) {
    const strand=i%6;
    const y=Math.pow(random(),0.69);
    const a=y*TAU*7.5 + strand*TAU/6 + .29*Math.sin(y*9+strand*.7) + spread()*.115;
    const r=radiusAt(y)*(.95 + .035*Math.sin(y*22+strand) + spread()*.10);
    const yy=y + spread()*(.004 + .011*y);
    const bright=random()<.08;
    const tint=bright ? .24+random()*.25 : spread()*.085;
    const size=bright ? .0029+random()*.0020 : .0008+random()**1.65*.0026;
    const isGold=random() < .05 + .11*(1-y);
    place(yy,r,a,isGold?size*1.35:size,isGold?gold():colorAt(y,tint),isGold?.92:bright ? .94 : .29+random()*.50);
  }
  for (let i=0; i<6160; i++) {
    const ring=i%13;
    const y=(ring+.55)/13, a=random()*TAU;
    const r=radiusAt(y)*(.96+spread()*.125);
    const yy=y+spread()*(.003+.009*y)+.008*Math.sin(a*3+ring);
    const bright=random()<.08;
    const isGold=random() < .05 + .11*(1-y);
    place(yy,r,a,bright?.0045:.001+random()**2*.0024,isGold?gold():colorAt(y,.07+random()*.22),isGold?.9:bright?.88:.28+random()*.44);
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
  // A thick, bright trunk grounds the cone: it starts tucked under the
  // lowest branch layer and reaches below the ground glow, so it stays
  // visible from the front and while the tree turns instead of being
  // washed out by the glow at the base.
  for (let i=0; i<980; i++) {
    const y=.985+random()*.175, a=random()*TAU;
    const f=(y-.985)/.175;
    const r=(.086-.024*f)*(.88+spread()*.16);
    const warm=random()<.45;
    add(Math.cos(a)*r, y, Math.sin(a)*r, .0016+random()**2*.0028,
      warm?[.88,.6,.3]:[.58+random()*.14,.4+random()*.09,.22+random()*.06],
      .58+random()*.38);
  }
  // A dense garland ring marks the lowest branch layer so the base reads clearly.
  for (let i=0; i<760; i++) {
    const y=.965+random()*.035, a=random()*TAU;
    const r=radiusAt(y)*(.985+spread()*.045);
    const isGold=random()<.16, bright=random()<.14;
    place(y,r,a,bright?.0038:.001+random()**2*.0026,isGold?gold():colorAt(y,.1+random()*.2),isGold?.92:bright?.9:.4+random()*.45);
  }
  // A five-point gold star crowns the heart: outline points plus a bright core.
  {
    const cy=-0.148, outer=.052, inner=.0215, star=[];
    for (let k=0;k<10;k++){
      const ang=-Math.PI/2 + k*Math.PI/5, rad=k%2===0?outer:inner;
      star.push([Math.cos(ang)*rad, cy+Math.sin(ang)*rad]);
    }
    for (let i=0;i<520;i++){
      const seg=i%10, p0=star[seg], p1=star[(seg+1)%10], f=random();
      add(p0[0]+(p1[0]-p0[0])*f+spread()*.0012, p0[1]+(p1[1]-p0[1])*f+spread()*.0012, 0,
        .0012+random()**2*.0028,[1,.78+random()*.16,.42+random()*.12],.72+random()*.28,2);
    }
    for (let i=0;i<130;i++){
      const a=random()*TAU, r=Math.sqrt(random())*.016;
      add(Math.cos(a)*r, cy+Math.sin(a)*r*.9, 0, .0014+random()**2*.003,[1,.9,.72],.9,2);
    }
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
uniform float uPulse;
uniform float uIntro;
uniform float uGather;
uniform float uBurst;
varying vec3 vColor;
varying float vBrightness;
void main() {
  vec3 p=aPosition;
  float s=uRotation.x, c=uRotation.y;
  float x = p.x*c + p.z*s;
  float z = p.z*c - p.x*s;
  float y=p.y+z*0.157;
  // Entrance: the cloud rises a little and fades in over the first moment.
  y += (1.0-uIntro)*0.22*(0.5+0.5*sin(aPhase*3.0));
  // Twinkle is stronger than a gentle shimmer, and bright points flare.
  // Several speeds overlap so the sparkle never settles into one rhythm.
  float shimmer=0.70+0.30*sin(uTime*(1.25+0.12*aPhase)+aPhase*3.3);
  shimmer += 0.30*pow(0.5+0.5*sin(uTime*2.8+aPhase*5.0),3.0)*step(0.72,aBrightness);
  shimmer += 0.10*sin(uTime*3.7+aPhase*9.0);
  float brightness = aBrightness * (0.25+0.75*uIntro) * (1.0+uPulse*0.9);
  float crown = aKind<0.5 ? 1.0-smoothstep(0.12,0.58,p.y) : 0.0;
  if (aKind < 0.5) {
    // Drift was only ~1-2 px and read as frozen; roughly triple it, with
    // a second harmonic so neighbouring points do not move in lockstep.
    x += 0.0032*sin(1.6*uTime+aPhase*4.0);
    y += 0.0040*cos(1.1*uTime+aPhase*2.0) + 0.0012*sin(2.3*uTime+aPhase*6.0);
    brightness *= 0.65 + 0.42*clamp(0.5+z/max(0.015,p.y*0.59),0.0,1.0);
  } else if (aKind > 3.5) {
    float speed = mod(aKind,2.0)<0.5 ? 0.095 : -0.078;
    float phase = speed*(1.0+(aKind-4.0)*0.25)*uTime;
    float rx=x*cos(phase)+z*sin(phase);
    float rz=z*cos(phase)-x*sin(phase);
    x=rx; y=p.y+rz*0.157;
  } else if (aKind > 2.5) {
    x=p.x+0.019*sin(0.23*uTime+aPhase);
    y=mod(p.y+0.16+uTime*(0.009+aSize*1.7),1.28)-0.16;
    shimmer=0.69+0.31*sin(0.92*uTime+aPhase);
  } else if (aKind > 1.5) {
    float beat=1.0+(0.06+0.08*uPulse)*sin(1.8*uTime);
    x=p.x*beat;
    y=-0.06+(p.y+0.06)*beat;
  }
  // Sway and breathing: the top moves more than the base, and the whole
  // cone breathes a little, so the tree reads as alive instead of frozen.
  // Gathering (below) mixes toward the ball, so a gathered ball does not sway.
  float sway = sin(uTime*0.45 + p.y*1.4) * 0.011 * p.y;
  float gust = max(0.0, sin(uTime*0.21) + sin(uTime*0.13+1.7)) * 0.006 * p.y;
  float breathe = 1.0 + 0.012*sin(uTime*0.75);
  x = x*breathe + sway + gust;
  y += cos(uTime*0.45 + p.y*1.4) * 0.0035 * p.y;
  // Gathering: every particle except the falling snow drifts toward one
  // glowing ball at the middle of the tree, with a little per-particle
  // jitter so the ball reads as a dense cluster instead of a single point.
  if (uGather > 0.001 && (aKind < 2.5 || aKind > 3.5)) {
    vec2 gathered = vec2(0.0, 0.45)
      + vec2(sin(aPhase*12.9898), cos(aPhase*7.233)) * 0.028;
    vec2 pos = mix(vec2(x, y), gathered, uGather);
    x = pos.x; y = pos.y;
    brightness *= 1.0 + uGather * 0.55;
  }
  // Burst: after a gather, opening the palm throws the particles outward
  // past the tree outline, then they settle back into the tree as the
  // burst decays and the gather mix releases. Each particle flies in a
  // fixed pseudo-random direction plus a radial push from the ball centre,
  // so the burst reads as an explosion, not a uniform scale-up. The push
  // grows as the gather releases, so it peaks mid-expansion, not while
  // the ball is still fully gathered.
  if (uBurst > 0.001 && (aKind < 2.5 || aKind > 3.5)) {
    vec2 dir = vec2(cos(aPhase*17.0), sin(aPhase*13.0));
    vec2 radial = vec2(x, y) - vec2(0.0, 0.45);
    float rl = length(radial);
    if (rl > 0.001) dir += (radial / rl) * 0.7;
    float push = uBurst * 0.22 * (0.35 + 0.65 * (1.0 - uGather));
    x += dir.x * push; y += dir.y * push;
    brightness *= 1.0 + uBurst * 1.1;
  }
  vec2 screen=(uOrigin+uScale*vec2(x,y))/uViewport;
  gl_Position=vec4(screen.x*2.0-1.0,1.0-screen.y*2.0,0.0,1.0);
  gl_PointSize=max(1.7*uRatio,aSize*uScale*uRatio*(2.65+2.9*crown)*(0.45+0.55*uIntro)*(1.0+uGather*0.3)*(1.0+uBurst*0.4));
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
  float light=exp(-r*5.6)*0.88 + max(0.0,1.0-r)*0.16;
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
  const [viewport,origin,rotation,scale,ratio,time,pulse,intro,gather,burst] = ['uViewport','uOrigin','uRotation','uScale','uRatio','uTime','uPulse','uIntro','uGather','uBurst'].map(n=>gl.getUniformLocation(program,n));
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE); gl.clearColor(0,0,0,0);
  return {
    draw(view, sn, cs, t, pulseValue, introValue, gatherValue = 0, burstValue = 0) {
      gl.viewport(0,0,canvas.width,canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(viewport,view.w,view.h); gl.uniform2f(origin,view.x,view.y);
      gl.uniform2f(rotation,sn,cs); gl.uniform1f(scale,view.s); gl.uniform1f(ratio,view.dpr);
      gl.uniform1f(time,t); gl.uniform1f(pulse,pulseValue); gl.uniform1f(intro,introValue); gl.uniform1f(gather,gatherValue); gl.uniform1f(burst,burstValue);
      gl.drawArrays(gl.POINTS,0,cloud.length/STRIDE);
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
  return (c,view,sn,cs,t,pulseValue=0,introValue=1,gatherValue=0,burstValue=0)=>{
    c.globalCompositeOperation='lighter';
    for(const p of points) {
      let x=p.x*cs+p.z*sn;
      const z=p.z*cs-p.x*sn;
      let y=p.y+z*.157, a=p.b*(.70+.30*Math.sin(t*1.25+p.phase*2))*(0.25+0.75*introValue)*(1+pulseValue*0.9);
      y += (1-introValue)*0.22*(0.5+0.5*Math.sin(p.phase*3));
      if(p.kind>=4){
        const ph=(p.kind%2===0?.095:-.078)*(1+(p.kind-4)*.25)*t;
        const cc=Math.cos(ph),ss=Math.sin(ph);
        y=p.y+(z*cc-x*ss)*.157;x=x*cc+z*ss;
      } else if(p.kind===3) {
        x=p.x+.019*Math.sin(.23*t+p.phase); y=(p.y+.16+t*(.009+p.s*1.7))%1.28-.16;
      } else if(p.kind===2) {
        const beat=1+(.06+.08*pulseValue)*Math.sin(1.8*t);
        x=p.x*beat;y=-.06+(p.y+.06)*beat;
      } else if (p.kind===0) {
        x+=.0032*Math.sin(1.6*t+p.phase*4);y+=.0040*Math.cos(1.1*t+p.phase*2)+.0012*Math.sin(2.3*t+p.phase*6);
        a*=.72+.28*Math.min(1,Math.max(0,.5+z/Math.max(.015,p.y*.59)));
      }
      // Same sway and breathing as the WebGL shader, so the fallback
      // render does not look frozen either.
      const sway=Math.sin(t*0.45+p.y*1.4)*0.011*p.y;
      const gust=Math.max(0,Math.sin(t*0.21)+Math.sin(t*0.13+1.7))*0.006*p.y;
      x=x*(1+0.012*Math.sin(t*0.75))+sway+gust;
      y+=Math.cos(t*0.45+p.y*1.4)*0.0035*p.y;
      if (gatherValue > 0.001 && p.kind !== 3) {
        const gx = Math.sin(p.phase*12.9898) * 0.028, gy = 0.45 + Math.cos(p.phase*7.233) * 0.028;
        x = x + (gx - x) * gatherValue; y = y + (gy - y) * gatherValue;
        a *= 1 + gatherValue * 0.55;
      }
      // Same burst as the WebGL shader: outward push plus a flash.
      if (burstValue > 0.001 && p.kind !== 3) {
        let dirX = Math.cos(p.phase*17.0), dirY = Math.sin(p.phase*13.0);
        const rx = x, ry = y - 0.45, rl = Math.hypot(rx, ry);
        if (rl > 0.001) { dirX += (rx/rl)*0.7; dirY += (ry/rl)*0.7; }
        const push = burstValue * 0.22 * (0.35 + 0.65*(1-gatherValue));
        x += dirX*push; y += dirY*push;
        a *= 1 + burstValue * 1.1;
      }
      const crown=p.kind===0?Math.max(0,1-p.y/.7):0;
      const r=Math.max(1.1,p.s*view.s*(1.95+crown*.90)*(1+gatherValue*0.3)*(1+burstValue*0.4));
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

// A soft pool of light under the tree, painted on the foreground canvas.
function makeGroundGlow() {
  const sprite=document.createElement('canvas');
  sprite.width=256; sprite.height=96;
  const c=sprite.getContext('2d');
  c.save();
  c.translate(128,48); c.scale(1,0.375); c.translate(-128,-128);
  const glow=c.createRadialGradient(128,128,0,128,128,128);
  glow.addColorStop(0,'rgba(150,190,255,.30)');
  glow.addColorStop(.35,'rgba(120,165,245,.20)');
  glow.addColorStop(.62,'rgba(255,205,130,.10)');
  glow.addColorStop(1,'rgba(120,150,220,0)');
  c.fillStyle=glow; c.fillRect(0,0,256,256);
  c.restore();
  return sprite;
}

const PHOTO_HEIGHTS=[.43,.69,.33,.81,.57,.24,.74,.89];
const PHOTO_ANGLES=[1.22,2.23,4.68,.58,3.54,1.82,5.77,2.91];

export function createTree(canvas,{onSelect}={}) {
  const ctx=canvas.getContext('2d');
  const stage=document.createElement('canvas');
  stage.setAttribute('aria-hidden','true');
  stage.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  const cloud=makeCloud(), heartGlow=makeHeartGlow(), groundGlow=makeGroundGlow();
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
  let spinStart=0, spinFrom=0, spinTo=0, spinEnd=0;
  let drag=null, frame=0, last=0, animationTime=0, stopped=false, pauseOrbitUntil=0;
  let pulseValue=0, startedAt=0, parallax=0, parallaxTarget=0;
  let gatherValue=0, gatherTarget=0, burstValue=0;
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  function resize() {
    const {width:w,height:h}=canvas.getBoundingClientRect();
    if (!w||!h) return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const s=Math.min(h*.74,w*.94);
    view={w,h,dpr,s,x:w*.5,y:(h-s*1.34)*.5+s*.21};
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
      return {index:i,src:p.src,img,x:r*Math.cos(a),y:h,z:r*Math.sin(a),r,angle:a,tilt:Math.sin(i*1.8+.55)*.083};
    });
  }

  function drawPhotos(sn,cs,originX,gatherValue=0) {
    hits=[];
    const list=photos.map(p=>({p,z:p.z*cs-p.x*sn})).sort((a,b)=>a.z-b.z);
    for(const {p,z} of list) {
      if (!p.img.naturalWidth || z < -p.r*.11) continue;
      const alpha=Math.min(1,Math.max(0,(z/p.r+.11)*3.1))*(1-gatherValue*0.92);
      if (alpha <= 0.02) continue;
      let x=originX+(p.x*cs+p.z*sn)*view.s,y=view.y+(p.y+z*.157)*view.s;
      // Photos hang from the tree, so they bob gently instead of sitting
      // perfectly still. animationTime is frozen under reduced motion.
      y+=Math.sin(animationTime*0.9+p.index*1.7)*view.s*0.004;
      // While gathered, the photos shrink toward the ball and fade out
      // instead of floating where the tree used to be.
      x=originX+(x-originX)*(1-gatherValue*0.7);
      y=view.y+view.s*0.45+(y-(view.y+view.s*0.45))*(1-gatherValue*0.7);
      const w=view.s*(.077+.044*z)*(1-gatherValue*0.55), h=w*1.09;
      const iw=w*.88, ih=h*.79, crop=Math.max(iw/p.img.naturalWidth,ih/p.img.naturalHeight);
      const sw=iw/crop, sh=ih/crop;
      const wobble=Math.sin(animationTime*0.7+p.index*2.1)*0.018;
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(p.tilt+wobble);
      ctx.shadowColor='rgba(160,195,255,.4)';ctx.shadowBlur=Math.max(2,view.s*.018);
      ctx.lineWidth=Math.max(.6,view.s*.001);ctx.strokeStyle='#b7d3fa';
      ctx.beginPath();ctx.moveTo(-w*.37,-h*.47);ctx.lineTo(0,-h*.64);ctx.lineTo(w*.37,-h*.47);ctx.stroke();
      ctx.fillStyle='#bac5d3';ctx.fillRect(-w*.5,-h*.5,w,h);
      ctx.fillStyle='#f0f2f5';ctx.fillRect(-w*.476,-h*.478,w*.952,h*.956);
      ctx.shadowBlur=0;
      ctx.drawImage(p.img,(p.img.naturalWidth-sw)/2,(p.img.naturalHeight-sh)/2,sw,sh,-iw*.5,-h*.425,iw,ih);
      ctx.restore();
      if (alpha>.36 && gatherValue<0.5) hits.push({index:p.index,x,y,w,h});
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
      // The idle turn breathes instead of ticking at one constant speed.
      if(!drag && now>pauseOrbitUntil) target+=dt*(0.055+0.035*Math.sin(animationTime*0.4));
    }
    if (!startedAt) startedAt = now;
    const intro = reducedMotion?.matches ? 1 : Math.min(1, (now - startedAt) / 1400);
    const easedIntro = 1 - Math.pow(1 - intro, 3);
    pulseValue *= Math.exp(-2.6 * dt);
    // The burst flash decays in about a second; reduced motion skips it.
    burstValue = reducedMotion?.matches ? 0 : burstValue * Math.exp(-3.2 * dt);
    if (burstValue < 0.005) burstValue = 0;
    // Gathering is deliberately slow (about 2-3 s to a full ball) so a
    // brief fist that only closes a photo does not collapse the tree;
    // expanding back is quicker. Reduced motion snaps instead of easing.
    if (reducedMotion?.matches) gatherValue = gatherTarget;
    else {
      const rate = gatherTarget > gatherValue ? 0.85 : 2.2;
      gatherValue += (gatherTarget - gatherValue) * (1 - Math.exp(-rate * dt));
      if (Math.abs(gatherTarget - gatherValue) < 0.002) gatherValue = gatherTarget;
    }
    parallax += (parallaxTarget - parallax) * (1 - Math.exp(-6 * dt));
    const originX = view.x + parallax;
    // 24/s instead of 14/s: the old smoothing lagged visibly behind a
    // moving palm, which is what "not following the hand" felt like.
    // A programmed spin (photo switching) eases over its own duration
    // instead of being chased by the same lerp, so it reads as a turn
    // rather than a snap.
    if (spinEnd && now < spinEnd) {
      const progress=(now-spinStart)/(spinEnd-spinStart);
      const eased=progress<.5 ? 4*progress*progress*progress : 1-Math.pow(-2*progress+2,3)/2;
      angle=spinFrom+(spinTo-spinFrom)*eased;
      target=angle;
    } else {
      if (spinEnd) { angle=spinTo; target=spinTo; spinEnd=0; }
      angle+=(target-angle)*(1-Math.exp(-24*dt));
    }
    const sn=Math.sin(angle),cs=Math.cos(angle);
    ctx.setTransform(view.dpr,0,0,view.dpr,0,0);
    ctx.clearRect(0,0,view.w,view.h);
    const shiftedView = {...view, x: originX};
    if(gpu) gpu.draw(shiftedView,sn,cs,animationTime,pulseValue,easedIntro,gatherValue,burstValue);
    else fallback(ctx,shiftedView,sn,cs,animationTime,pulseValue,easedIntro,gatherValue,burstValue);
    const glowSize=view.s*(.236+.010*Math.sin(animationTime*1.4))*(1+pulseValue*.35)*(1+burstValue*.5);
    ctx.drawImage(heartGlow,originX-glowSize*.5,view.y-view.s*.06-glowSize*.5,glowSize,glowSize);
    const groundW=view.s*1.06, groundH=view.s*.20;
    ctx.drawImage(groundGlow,originX-groundW*.5,view.y+view.s*1.01-groundH*.5,groundW,groundH);
    drawPhotos(sn,cs,originX,gatherValue);
  }

  function pulse(strength=1) { pulseValue = Math.max(pulseValue, Math.min(1, strength)); }

  function burst() {
    // Only a real gather bursts: a palm that was never gathered must
    // not explode the tree on every ordinary rotation.
    if (gatherValue > 0.35 && !reducedMotion?.matches) burstValue = 1;
  }

  function setGather(on) {
    if (!on) burst();
    gatherTarget = on ? 1 : 0;
  }

  function rotate(delta) {
    if(!Number.isFinite(delta)) return;
    spinEnd=0;
    target+=delta; pauseOrbitUntil=performance.now()+1000;
    // Turning lights the tree up a little, so a gesture visibly answers.
    pulseValue=Math.max(pulseValue,Math.min(0.25,Math.abs(delta)*0.6));
  }
  // How far the tree must turn for this photo to face the viewer: a photo
  // faces front when its rotated depth z' = r*sin(a - angle) is largest,
  // i.e. angle = a - PI/2. The shortest way round is used.
  function photoFrontDelta(index) {
    const photo=photos[index];
    if(!photo) return 0;
    let delta=photo.angle-Math.PI/2-angle;
    while(delta>Math.PI) delta-=2*Math.PI;
    while(delta<-Math.PI) delta+=2*Math.PI;
    return delta;
  }
  // Turn the tree by a fixed amount over a fixed time, easing in and out,
  // so a photo switch can show the tree turning. Reduced motion snaps.
  function spinBy(delta, durationMs=850) {
    if(!Number.isFinite(delta)||Math.abs(delta)<0.02) return;
    if(reducedMotion?.matches){ angle+=delta; target=angle; return; }
    spinFrom=angle; spinTo=angle+delta;
    spinStart=performance.now(); spinEnd=spinStart+durationMs;
    pauseOrbitUntil=spinEnd+200;
  }
  function hit(x,y) {
    for(let i=hits.length-1;i>=0;i--) {
      const b=hits[i]; if(Math.abs(b.x-x)<b.w*.56+3 && Math.abs(b.y-y)<b.h*.56+3) return b;
    }
  }
  // A press counts as a tap only if the pointer stays within a small radius
  // of where it went down; anything further is a drag that rotates the tree.
  // The release-time distance decides, so a press that wobbles a little and
  // returns still opens the photo instead of being swallowed as a drag, and
  // no rotation is applied until the drag threshold is actually crossed.
  const CLICK_TOLERANCE=6;
  function down(e) {
    if(drag || e.button!==0) return;
    canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,dragging:false};
  }
  function move(e) {
    const bounds=canvas.getBoundingClientRect();
    if(!drag) {
      canvas.style.cursor=hit(e.clientX-bounds.left,e.clientY-bounds.top)?'pointer':'grab';
      // Gentle parallax: the tree leans a few pixels toward the pointer.
      parallaxTarget = reducedMotion?.matches ? 0 : (e.clientX - bounds.left) / Math.max(1, bounds.width) * 22 - 11;
      return;
    }
    if(e.pointerId!==drag.id) return;
    if(!drag.dragging) {
      if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>CLICK_TOLERANCE){drag.dragging=true;drag.lastX=e.clientX;canvas.style.cursor='grabbing';}
      return;
    }
    rotate((e.clientX-drag.lastX)*3.3/Math.max(160,view.s));
    drag.lastX=e.clientX;
  }
  function photoHit(index) {
    return hits.find(b => b.index === index) || null;
  }
  function up(e) {
    if(!drag || e.pointerId!==drag.id) return;
    if(e.type==='pointerup' && Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<=CLICK_TOLERANCE) {
      const bounds=canvas.getBoundingClientRect(), photo=hit(e.clientX-bounds.left,e.clientY-bounds.top);
      if(photo) onSelect?.(photo.index, {x: bounds.left + photo.x, y: bounds.top + photo.y},
        {left: bounds.left + photo.x - photo.w/2, top: bounds.top + photo.y - photo.h/2, width: photo.w, height: photo.h});
    }
    drag=null;canvas.style.cursor='grab';
  }
  canvas.style.cursor='grab';canvas.style.touchAction='pan-y';
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();frame=requestAnimationFrame(draw);
  return {setPhotos,rotate,spinBy,photoFrontDelta,pulse,setGather,burst,photoHit,destroy() {
    stopped=true;cancelAnimationFrame(frame);observer.disconnect();gpu?.destroy();stage.remove();
    canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);
    canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);
    stage.removeEventListener('webglcontextlost',onContextLost);stage.removeEventListener('webglcontextrestored',useGPU);
  }};
}
