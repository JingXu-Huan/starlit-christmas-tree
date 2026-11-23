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
function showPhoto(index){
  if(guide.open||index<0||index>=photos.length)return;
  selected=index;
  const p=photos[index];
  el('large').src=p.src;el('large').alt=p.name;el('photoName').textContent=p.name;
  el('photoIndex').textContent=(index+1)+' / '+photos.length;
  if(!viewer.open)viewer.showModal();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const image=el('large');
    image.getAnimations().forEach(animation=>animation.cancel());
    image.animate([{opacity:.6,transform:'scale(.975)'},{opacity:1,transform:'scale(1)'}],{duration:230,easing:'ease-out'});
  }
}
function cycle(direction=1){showPhoto((selected+direction+photos.length)%photos.length)}
el('prev').onclick=()=>cycle(-1);el('next').onclick=()=>cycle();
el('guideBtn').onclick=()=>guide.showModal();
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>el(button.dataset.close).close();
for(const dialog of [viewer,guide])dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)dialog.close()});
drawLandscape(el('landscape'));
const tree=createTree(el('tree'),{onSelect:showPhoto});
function gallery(){
  const fragment=document.createDocumentFragment();
  photos.forEach((p,i)=>{
    const tile=document.createElement('button'),img=new Image(),caption=document.createElement('span');
    tile.className='tile';tile.onclick=()=>showPhoto(i);img.alt='';img.src=p.src;caption.textContent=p.name;
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
let cameraRequest=0;
function cameraState(on){cameraOn=on;el('camera').querySelector('span').textContent=on?'关闭摄像头':'开启摄像头';scene.classList.toggle('active',on)}
const gestures=createGestures({
  onDoublePinch(){if(!guide.open){if(viewer.open)cycle();else showPhoto(selected)}},
  onFist(){if(viewer.open)viewer.close()},
  onRotate(delta){if(!viewer.open&&!guide.open)tree.rotate(delta)},
  onStatus(message){el('status').textContent=message},
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
