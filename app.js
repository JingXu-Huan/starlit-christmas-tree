import {createTree} from './tree.js';
import {drawLandscape} from './landscape.js';
import {createGestures} from './gestures.js';
const shapes={
  book:'M3 4.5c3-1 6-.7 9 1 3-1.7 6-2 9-1v14c-3-1-6-.7-9 1-3-1.7-6-2-9-1z M12 5.5v14',
  camera:'M3 7h4l2-3h6l2 3h4v13H3z M15.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0',
  pinch:'M5 13c-1-2 1-3 2-2l3 3-1-7c-.4-2 2-2.7 2.7-.6l1.6 4.9 1-4c.5-2 3-1.4 2.6.5l-.5 4 1.5-2.5c1-1.5 3-.5 2.2 1.2l-2.5 7c-.7 2.3-2.5 3.5-5 3.5-2.1 0-3.4-.9-4.6-2.6z M4 6 2 5 M6 3 5 1',
  fist:'M4 11V8.5c0-2 3.4-2 3.4 0V11 6.5c0-2 3.5-2 3.5 0v4-5c0-2 3.6-2 3.6 0v5-3.7c0-2 3.5-2 3.5 0v5l1.4-1.2c1.6-1.2 3.1.5 1.9 2.1L18 18c-1 1.8-2.5 2.7-4.5 2.7h-2c-3.3 0-5.3-1.4-6.3-4.5L4 11z',
  hand:'M7 13V6.5c0-1.9 2.8-1.9 2.8 0V11 4c0-2 3-2 3 0v7-6c0-1.9 3-1.9 3 0v6-4c0-1.9 2.9-1.9 2.9 0v7c0 4.4-2.2 7.2-6 7.2-2.3 0-3.7-.8-5.2-2.7L3 13c-1.2-1.7.7-3.3 2.1-2z',
  drag:'M3 12h18 M7 8l-4 4 4 4 M17 8l4 4-4 4',full:'M9 4H4v5 M15 4h5v5 M20 15v5h-5 M4 15v5h5',
  album:'M6 6h15v14H6z M3 16V3h14 M7 17l4-5 3 3 3-4 4 6 M10 10h.1',
  plus:'M12 5v14 M5 12h14',close:'M5 5l14 14 M19 5 5 19',left:'M15 5l-7 7 7 7',right:'M9 5l7 7-7 7'
};
for(const icon of document.querySelectorAll('[data-icon]')){
  icon.setAttribute('aria-hidden','true');
  icon.innerHTML='<svg viewBox="0 0 24 24"><path d="'+shapes[icon.dataset.icon]+'"/></svg>';
}
const el=id=>document.getElementById(id);
const samples=[['village','雪夜小镇'],['cabin','林间小屋'],['forest','冬日晨光'],['lights','圣诞市集']].map(([id,name])=>({src:'./photos/'+id+'.jpg',name}));
let photos=[...samples], selected=0, cameraOn=false, timer;
const viewer=el('viewer'),guide=el('guide'),scene=el('scene');
function notify(message){el('toast').textContent=message;clearTimeout(timer);timer=setTimeout(()=>el('toast').textContent='',4500)}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let closingViewer=false;
function closeViewer(){
  if(!viewer.open||closingViewer)return;
  if(reducedMotion){viewer.close();return}
  closingViewer=true;
  const animation=viewer.animate(
    [{opacity:1,transform:'scale(1) translateY(0)'},{opacity:0,transform:'scale(.94) translateY(14px)'}],
    {duration:240,easing:'cubic-bezier(.5,0,.75,.4)'});
  animation.finished.then(()=>{closingViewer=false;if(viewer.open)viewer.close()}).catch(()=>{closingViewer=false;if(viewer.open)viewer.close()});
}
function sparkles(){
  if(reducedMotion)return;
  for(let i=0;i<14;i++){
    const dot=document.createElement('i');
    dot.className='sparkle';
    const angle=Math.random()*Math.PI*2, distance=70+Math.random()*150;
    dot.style.left='50%';dot.style.top='42%';
    viewer.append(dot);
    dot.animate([
      {opacity:0,transform:'translate(-50%,-50%) scale(.4)'},
      {opacity:1,transform:`translate(calc(-50% + ${Math.cos(angle)*distance*.35}px),calc(-50% + ${Math.sin(angle)*distance*.35}px)) scale(1)`,offset:.25},
      {opacity:0,transform:`translate(calc(-50% + ${Math.cos(angle)*distance}px),calc(-50% + ${Math.sin(angle)*distance}px)) scale(.2)`}
    ],{duration:650+Math.random()*300,easing:'cubic-bezier(.22,1,.36,1)'}).finished.then(()=>dot.remove()).catch(()=>dot.remove());
  }
}
function viewerStrip(){
  const strip=el('viewerStrip');
  strip.replaceChildren(...photos.map((p,i)=>{
    const thumb=document.createElement('button');
    thumb.className='strip-thumb'+(i===selected?' active':'');
    thumb.setAttribute('aria-label',p.name);
    const img=new Image();img.alt='';img.src=p.src;
    thumb.append(img);
    thumb.onclick=()=>showPhoto(i,null,i>selected?1:-1);
    return thumb;
  }));
}
function showPhoto(index,origin=null,direction=0){
  if(guide.open||index<0||index>=photos.length)return;
  const opening=!viewer.open;
  const previous=selected;
  selected=index;
  const p=photos[index];
  const image=el('large');
  el('large').src=p.src;el('large').alt=p.name;el('photoName').textContent=p.name;
  el('photoIndex').textContent=(index+1)+' / '+photos.length;
  viewerStrip();
  if(opening){
    // Expand from the photo that was tapped: the dialog grows out of it.
    if(origin&&!reducedMotion){
      const rect=viewer.getBoundingClientRect();
      const cx=origin.x??(origin.left+origin.width/2), cy=origin.y??(origin.top+origin.height/2);
      viewer.style.transformOrigin=`${cx-rect.left}px ${cy-rect.top}px`;
    }else viewer.style.transformOrigin='50% 50%';
    viewer.showModal();
    if(!reducedMotion){
      image.getAnimations().forEach(animation=>animation.cancel());
      image.animate([
        {opacity:0,transform:'scale(1.14)',filter:'blur(10px)'},
        {opacity:1,transform:'scale(1)',filter:'blur(0)'}
      ],{duration:520,easing:'cubic-bezier(.22,1,.36,1)'});
      sparkles();
    }
  }else if(!reducedMotion){
    // Switching photos slides sideways in the direction of travel.
    const dir=direction||(index>previous?1:-1);
    image.getAnimations().forEach(animation=>animation.cancel());
    image.animate([
      {opacity:0,transform:`translateX(${dir*46}px) scale(.985)`,filter:'blur(4px)'},
      {opacity:1,transform:'translateX(0) scale(1)',filter:'blur(0)'}
    ],{duration:380,easing:'cubic-bezier(.22,1,.36,1)'});
  }
}
function cycle(direction=1){showPhoto((selected+direction+photos.length)%photos.length,null,direction)}
el('prev').onclick=()=>cycle(-1);el('next').onclick=()=>cycle();
el('guideBtn').onclick=()=>guide.showModal();
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>{if(button.dataset.close==='viewer')closeViewer();else el(button.dataset.close).close()};
viewer.addEventListener('cancel',e=>{e.preventDefault();closeViewer()});
for(const dialog of [viewer,guide])dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom){if(dialog===viewer)closeViewer();else dialog.close()}});
drawLandscape(el('landscape'));
const tree=createTree(el('tree'),{onSelect:showPhoto});
function gallery(){
  const fragment=document.createDocumentFragment();
  photos.forEach((p,i)=>{
    const tile=document.createElement('button'),img=new Image(),caption=document.createElement('span');
    tile.className='tile';tile.onclick=()=>{const r=tile.getBoundingClientRect();showPhoto(i,{x:r.left+r.width/2,y:r.top+r.height/2})};img.alt='';img.src=p.src;caption.textContent=p.name;
    tile.append(img,caption);fragment.append(tile);
  });
  el('film').replaceChildren(fragment);el('count').textContent=photos.length+' 张照片';tree.setPhotos(photos);
}
gallery();
function openAlbum(){return new Promise((resolve,reject)=>{
  const req=indexedDB.open('noel-atelier-album',1);
  req.onupgradeneeded=()=>req.result.createObjectStore('photos',{keyPath:'id',autoIncrement:true});
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
})}
const database=openAlbum().catch(()=>null);
async function restore(){
  const db=await database;if(!db)return;
  const records=await new Promise((res,rej)=>{const r=db.transaction('photos').objectStore('photos').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  if(!records.length)return;
  photos=[...records.map(p=>({src:URL.createObjectURL(p.blob),name:p.name})),...samples];gallery();
}
const restored=restore().catch(()=>notify('本地相册读取失败，可以重新添加照片。'));
async function preparePhoto(file){
  const src=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=src;await img.decode();
    const scale=Math.min(1,1500/Math.max(img.width,img.height));const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#10191f';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.87));if(!blob)throw Error('decode');
    return {blob,name:file.name.replace(/\.[^.]+$/,'')||'我的照片'};
  }finally{URL.revokeObjectURL(src)}
}
el('upload').onclick=()=>el('files').click();
el('files').onchange=async()=>{
  const files=[...el('files').files];if(!files.length)return;
  el('files').value='';el('upload').disabled=true;await restored;
  const fresh=[];for(const file of files){try{fresh.push(await preparePhoto(file))}catch{}}
  if(fresh.length){
    const db=await database;let saved=false;
    try{if(db){await new Promise((res,rej)=>{const tx=db.transaction('photos','readwrite');for(const p of fresh)tx.objectStore('photos').add(p);tx.oncomplete=res;tx.onerror=tx.onabort=()=>rej(tx.error)});saved=true}}catch{}
    const start=photos.length-samples.length;
    photos.splice(start,0,...fresh.map(p=>({name:p.name,src:URL.createObjectURL(p.blob)})));selected=start;gallery();el('film').children[start].scrollIntoView({block:'nearest',inline:'nearest'});
    notify('已挂上 '+fresh.length+' 张照片'+(saved?'':'，本次浏览有效')+(fresh.length<files.length?'，部分文件未能读取':''));
  }else notify('照片读取失败，请选择浏览器支持的图片。');
  el('upload').disabled=false;
};
const HAND_LINKS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function drawHandPreview(frame){
  const preview=el('handPreview'), canvas=el('handCanvas'), ctx=canvas.getContext('2d');
  if(!cameraOn||preview.hidden)return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!frame?.present||!frame.landmarks){
    el('handHint').textContent='等待手掌';el('pinchMeter').style.width='0%';
    return;
  }
  const W=canvas.width,H=canvas.height;
  const point=i=>[(1-frame.landmarks[i].x)*W,frame.landmarks[i].y*H];
  ctx.lineWidth=2;ctx.strokeStyle='rgba(221,195,144,.9)';
  for(const [a,b] of HAND_LINKS){const [x1,y1]=point(a),[x2,y2]=point(b);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
  for(let i=0;i<frame.landmarks.length;i++){
    const [x,y]=point(i);
    ctx.fillStyle=i===4||i===8?'#ffd98a':'#eef3ff';
    ctx.beginPath();ctx.arc(x,y,i===0?5:3.4,0,Math.PI*2);ctx.fill();
  }
  // Pinch line between thumb tip and index tip, gold while pinched.
  const [tx,ty]=point(4),[ix,iy]=point(8);
  ctx.strokeStyle=frame.pinchGap<0.31?'#ffd98a':'rgba(255,255,255,.75)';ctx.lineWidth=2.5;ctx.setLineDash([4,3]);
  ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(ix,iy);ctx.stroke();ctx.setLineDash([]);
  const meter=Math.max(0,Math.min(100,(0.68-frame.pinchGap)/0.37*100));
  el('pinchMeter').style.width=meter+'%';
  el('handHint').textContent=frame.distance==='far'?'手靠近一点':frame.distance==='near'?'手远一点':frame.fist?'已握拳':frame.pinchGap<0.31?'捏合中…':'已识别手掌';
}
let cameraRequest=0;
function cameraState(on){cameraOn=on;el('handPreview').hidden=!on;el('camera').querySelector('span').textContent=on?'关闭摄像头':'开启摄像头';scene.classList.toggle('active',on)}
const gestures=createGestures({
  onDoublePinch(){tree.pulse(1);if(!guide.open){if(viewer.open)cycle();else showPhoto(selected)}},
  onFist(){tree.pulse(.6);if(viewer.open)closeViewer()},
  onRotate(delta){if(!viewer.open&&!guide.open)tree.rotate(delta)},
  onStatus(message){el('status').textContent=message},
  onFrame(frame){drawHandPreview(frame)},
  onError(error){cameraState(false);notify(error.message)}
});
el('camera').onclick=async()=>{
  const request=++cameraRequest;
  if(cameraOn||el('camera').getAttribute('aria-busy')==='true'){
    gestures.stop();
    el('camera').removeAttribute('aria-busy');
    cameraState(false);
    return;
  }
  const button=el('camera');
  button.setAttribute('aria-busy','true');
  button.querySelector('span').textContent='取消开启';
  try{
    await gestures.start();
    if(request===cameraRequest)cameraState(true);
  }catch(error){
    if(request===cameraRequest){cameraState(false);notify(error.message)}
  }finally{
    if(request===cameraRequest)button.removeAttribute('aria-busy');
  }
};
document.addEventListener('keydown',e=>{
  if(viewer.open&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();cycle(e.key==='ArrowLeft'?-1:1)}
  else if(e.target===el('tree')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();tree.rotate(e.key==='ArrowLeft'?-.25:.25)}
  else if(e.key==='Escape'&&scene.classList.contains('expanded'))toggleExpanded(false);
});
function fullLabel(on){el('full').setAttribute('aria-label',on?'退出全屏':'进入全屏');el('full').title=on?'退出全屏':'全屏'}
function toggleExpanded(on){scene.classList.toggle('expanded',on);fullLabel(on)}
el('full').onclick=async()=>{if(scene.classList.contains('expanded'))return toggleExpanded(false);if(document.fullscreenElement)return document.exitFullscreen();try{await scene.requestFullscreen()}catch{toggleExpanded(true)}};
document.addEventListener('fullscreenchange',()=>fullLabel(!!document.fullscreenElement));
window.addEventListener('pagehide',()=>{++cameraRequest;gestures.stop();el('camera').removeAttribute('aria-busy');cameraState(false)});
