import { useEffect, useRef, useState } from 'react';
import { navigateTerminal } from './terminalNavigation';
import './Insight.css';
import ShapeWaves from './ShapeWaves';

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
  const [gpuFailed,setGpuFailed]=useState(false);
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
    const resize=()=>{
      const box=canvas.getBoundingClientRect();width=box.width;height=box.height;
      dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;
      artWidth=Math.min(width*1.06,height*1.85);left=(width-artWidth)/2;top=(height-artWidth*H/W)/2;
    };
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
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
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();if(timer.current)clearTimeout(timer.current);};
  },[]);
  return <main className="insight-page" data-leaving={leaving}>
    <canvas ref={canvasRef} className="insight-scene" aria-label="瞳孔对齐的冷蓝色眼睛影像，快速切换并带有几何波纹滤镜"/>
    <ShapeWaves imageSourceRef={canvasRef} className="insight-shapewave"
      shapes="mixed" cellSize={6} dotSize={.92} color="#d6eff6" hoverColor="#ffffff"
      backgroundColor="#071b25" speed={.8} scale={.75} contrast={1.1}
      brightness={.5} fade={.12} glow={.24} splashRadius={90} splashStrength={.65}
      introDuration={1.2} paused={paused} onError={error=>{console.error("ShapeWave:",error);setGpuFailed(true);}} />
    {gpuFailed&&<p className="insight-gpu-error" role="status">当前浏览器未能启用 ShapeWave（WebGPU），正在显示原始影像。</p>}
    <header className="insight-header"><a href="/terminal" onClick={event=>{
      if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();if(timer.current)return;setLeaving(true);
      timer.current=setTimeout(()=>navigateTerminal('/terminal',true,'/insight'),360);
    }}>← 返回</a><span>INSIGHT</span><span ref={countRef}>01 / 09</span></header>
    <footer className="insight-footer"><span>THE OBSERVER</span><button type="button" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?'播放 ↗':'暂停 Ⅱ'}</button></footer>
    {failed&&<p className="insight-error">影像暂时无法加载，请刷新重试。</p>}
  </main>;
}
