import { useEffect, useRef, useState } from 'react';
import { navigateTerminal } from './terminalNavigation';
import './Insight.css';

// Hand-registered source landmarks: pupil center/radius, mirror, then eye-line tilt.
// Normalize the pupil itself, rather than the larger iris or the image dimensions.
const eyes = [
  { x:187,y:105,r:12,flip:false,angle:8 },
  { x:416,y:300,r:39,flip:true,angle:5 },
  { x:195,y:155,r:25,flip:false,angle:4 },
  { x:242,y:150,r:25,flip:false,angle:4 },
  { x:227,y:220,r:18,flip:true,angle:4 },
  { x:481,y:530,r:62,flip:true,angle:3 },
  { x:262,y:154,r:11,flip:false,angle:1 },
  { x:579,y:240,r:16,flip:false,angle:0 },
  { x:435,y:215,r:49,flip:false,angle:5 },
];
const W=1000, H=640, CX=500, CY=310;
const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
function prepareEye(image: HTMLImageElement, registration: typeof eyes[number]) {
  const raw=document.createElement('canvas'); raw.width=W; raw.height=H;
  const c=raw.getContext('2d', {willReadFrequently:true})!;
  c.fillStyle='#a3bdc5';c.fillRect(0,0,W,H);
  c.translate(CX,CY); c.rotate(registration.angle*Math.PI/180);
  const scale=38/registration.r;
  c.scale(registration.flip ? -scale:scale,scale);
  c.drawImage(image,-registration.x,-registration.y);
  c.resetTransform();
  const pixels=c.getImageData(0,0,W,H);
  // A soft almond-shaped focus field suppresses skin, brows and hair uniformly.
  // All source assets stay intact; cropping, registration and grading happen at runtime.
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) {
    const i=(y*W+x)*4, dx=x-CX,dy=y-CY;
    const u=dx*.990+dy*.139, v=-dx*.139+dy*.990;
    const focus=Math.exp(-Math.pow(u/350,6)-Math.pow(v/115,4));
    const lum=(pixels.data[i]*.2126+pixels.data[i+1]*.7152+pixels.data[i+2]*.0722)/255;
    const tone=Math.max(0,Math.min(1,(lum-.12)*1.19));
    const fog=1-focus;
    pixels.data[i]=(17+tone*180)*focus+158*fog;
    pixels.data[i+1]=(36+tone*191)*focus+188*fog;
    pixels.data[i+2]=(42+tone*198)*focus+199*fog;
  }
  c.putImageData(pixels,0,0); return raw;
}
export default function Insight(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const countRef=useRef<HTMLSpanElement>(null);
  const pausedRef=useRef(false);
  const [paused,setPaused]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [failed,setFailed]=useState(false);
  const [leaving,setLeaving]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{pausedRef.current=paused;},[paused]);
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas?.getContext('2d');
    if(!canvas||!ctx)return;
    let disposed=false,frame=0,last=0,clock=0,switchTime=0,index=0,oldIndex=0;
    let width=1,height=1,dpr=1, artWidth=1,left=0,top=0;
    let frames: HTMLCanvasElement[]=[];
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const pointer={x:-1000,y:-1000};
    let ripples:{x:number;y:number;age:number}[]=[];
    const resize=()=>{
      const box=canvas.getBoundingClientRect();width=box.width;height=box.height;
      dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;
      artWidth=Math.min(width*1.06,height*1.85);left=(width-artWidth)/2;top=(height-artWidth*H/W)/2;
    };
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
    const move=(event:PointerEvent)=>{const r=canvas.getBoundingClientRect();pointer.x=event.clientX-r.left;pointer.y=event.clientY-r.top;};
    const leave=()=>{pointer.x=pointer.y=-1000;};
    const down=(event:PointerEvent)=>{if(event.button!==0)return;move(event);ripples.push({x:pointer.x,y:pointer.y,age:0});};
    canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('pointerdown',down);
    const render=(now:number)=>{
      frame=requestAnimationFrame(render);
      if(document.hidden){last=now;return;}
      if(now-last<1000/30)return;
      const dt=Math.min((now-(last||now))/1000,.08);last=now;
      if(!pausedRef.current)clock+=dt;
      if(frames.length>1&&!pausedRef.current&&clock-switchTime>.4){oldIndex=index;index=(index+1)%frames.length;switchTime=clock;}
      if(countRef.current) countRef.current.textContent=String(index+1).padStart(2,'0')+' / '+String(frames.length||9).padStart(2,'0');
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#9ebcc7';ctx.fillRect(0,0,width,height);
      const intro=reduced.matches?1:ease(clock/1.2);
      if(frames.length){
        ctx.globalAlpha=intro;
        ctx.drawImage(frames[oldIndex],left,top,artWidth,artWidth*H/W);
        ctx.globalAlpha=intro*ease((clock-switchTime)/.065);
        if(pausedRef.current)ctx.globalAlpha=1;
        ctx.drawImage(frames[index],left,top,artWidth,artWidth*H/W);ctx.globalAlpha=1;
      }
      // ShapeWave adaptation: mixed geometric cells, flowing field, radial intro,
      // pointer charge, outward waves and a faint luminous crest.
      ripples=ripples.map(r=>({...r,age:r.age+dt})).filter(r=>r.age<1.8);
      const cell=Math.max(6,width/210),fieldTime=reduced.matches?0:clock*.1;
      for(let y=cell/2;y<height;y+=cell)for(let x=cell/2;x<width;x+=cell){
        const nx=(x-width/2)/(artWidth*.5),ny=(y-height/2)/(artWidth*.32);
        const fade=Math.exp(-(nx*nx+ny*ny)*1.4);
        let charge=reduced.matches?0:Math.exp(-Math.pow(Math.hypot(x-pointer.x,y-pointer.y)/85,2))*.65;
        for(const r of ripples)charge=Math.max(charge,Math.exp(-Math.pow((Math.hypot(x-r.x,y-r.y)-r.age*380)/34,2))*(1-r.age/1.8));
        const noise=Math.sin(x/94+Math.sin(y/107+fieldTime))*Math.cos(y/83-fieldTime);
        const kind=Math.min(2,Math.floor((noise*.5+.5)*3));
        const radius=cell*(.10+.13*(noise*.5+.5)+charge*.12);
        const front=ease((intro*1.7-Math.hypot(nx,ny)*.65)/.25);
        ctx.globalAlpha=(.045+charge*.19)*fade*front;ctx.fillStyle=charge>.3?'#eefcff':'#153b4b';
        ctx.beginPath();
        if(kind===0)ctx.rect(x-radius,y-radius,radius*2,radius*2);
        else if(kind===1)ctx.arc(x,y,radius,0,Math.PI*2);
        else{ctx.moveTo(x,y-radius);ctx.lineTo(x+radius,y+radius);ctx.lineTo(x-radius,y+radius);ctx.closePath();}
        ctx.fill();
      }
      ctx.globalAlpha=1;
    };
    void Promise.allSettled(eyes.map((eye,i)=>new Promise<HTMLCanvasElement>((resolve,reject)=>{
      const image=new Image();image.onload=()=>{try{resolve(prepareEye(image,eye));}catch(e){reject(e);}};image.onerror=reject;
      image.src=import.meta.env.BASE_URL+'insight/eye-'+(i+1)+'.png';
    }))).then(results=>{
      if(disposed)return;
      frames=results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);
      if(!frames.length)setFailed(true);
      frame=requestAnimationFrame(render);
    });
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('pointerdown',down);if(timer.current)clearTimeout(timer.current);};
  },[]);
  return <main className="insight-page" data-leaving={leaving}>
    <canvas ref={canvasRef} className="insight-scene" aria-label="瞳孔对齐的冷蓝色眼睛影像，快速切换并带有几何波纹滤镜"/>
    <header className="insight-header"><a href="/terminal" onClick={event=>{
      if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();if(timer.current)return;setLeaving(true);
      timer.current=setTimeout(()=>navigateTerminal('/terminal',true,'/insight'),360);
    }}>← 返回</a><span>INSIGHT</span><span ref={countRef}>01 / 09</span></header>
    <footer className="insight-footer"><span>THE OBSERVER</span><button type="button" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?'播放 ↗':'暂停 Ⅱ'}</button></footer>
    {failed&&<p className="insight-error">影像暂时无法加载，请刷新重试。</p>}
  </main>;
}
