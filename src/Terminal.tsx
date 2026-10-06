import { useEffect, useRef, useState } from 'react';
import './Terminal.css';

const wordmark = String.raw` ____  _   _ ____ _____ _      _    _   _ ____
|  _ \| | | / ___|_   _| |    / \  | \ | |  _ \
| | | | | | \___ \ | | | |   / _ \ |  \| | | | |
| |_| | |_| |___) || | | |__/ ___ \| |\  | |_| |
|____/ \___/|____/ |_| |_____/_/   \_\_| \_|____/`;
const landscape = String.raw`                 .               +
       +                    .
                       .-.
        .             (   )       .
                       '-' 
             /\                 +
            /  \       /\
     ______/    \_____/  \____
 ___/     /      \   /    \   \___
/________/________\_/______\______\
 .  .  .  .  .  .  .  .  .  .  .
    .  .  .  .  .  .  .  .  .
       .  .  .  .  .  .  .
          .  .  .  .  .
             .  .  .`;
type Section = 'home' | 'about' | 'projects';
const directory: { id:Section; label:string; file:string }[] = [
  {id:'home',label:'主页',file:'index.txt'}, {id:'about',label:'关于',file:'about.md'}, {id:'projects',label:'项目',file:'projects/'}
];
const commands = ['help','home','about','projects','open productivity','open github','theme','clear'];

export default function Terminal() {
  const [section,setSection] = useState<Section>('home');
  const [green,setGreen] = useState(false);
  const [command,setCommand] = useState('');
  const [history,setHistory] = useState<string[]>([]);
  const [cursor,setCursor] = useState(-1);
  const [lines,setLines] = useState(['session ready. 输入 help 查看命令，或点击目录探索。']);
  const [now,setNow] = useState(new Date());
  const input = useRef<HTMLInputElement>(null), output = useRef<HTMLDivElement>(null);
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),1000);return ()=>clearInterval(timer);},[]);
  useEffect(()=>{output.current?.scrollTo({top:output.current.scrollHeight});},[lines]);
  useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.key==='/' && !(e.target instanceof HTMLInputElement)){e.preventDefault();input.current?.focus();}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[]);
  const run = (raw:string) => {
    const value=raw.trim().toLowerCase(); if(!value)return;
    setHistory(current=>[raw,...current].slice(0,50));setCursor(-1);setCommand('');
    let answer='';
    if(value==='clear'){setLines([]);return;}
    if(value==='help')answer='home / about / projects — 浏览页面\nopen productivity / open github — 打开链接\ntheme — 切换荧光色    clear — 清空输出\n↑ ↓ 历史命令    Tab 补全    / 聚焦输入';
    else if(value==='home'||value==='about'||value==='projects'){setSection(value);answer=`loaded: ${directory.find(item=>item.id===value)?.file}`;}
    else if(value==='theme'){setGreen(current=>!current);answer='display palette updated.';}
    else if(value==='open productivity'){location.assign('/productivity/');return;}
    else if(value==='open github'){location.assign('https://github.com/RaDegradableTrash');return;}
    else answer=`command not found: ${raw}\n输入 help 查看可用命令。`;
    setLines(current=>[...current,`visitor@dustland:~$ ${raw}`,answer].slice(-40));
  };
  return <div className={`personal-terminal ${green?'phosphor':''}`}>
    <header className="terminal-top"><a href="/terminal" className="terminal-brand"><span>[D]</span> DUSTLAND<span className="terminal-slash">/</span><small>PERSONAL TERMINAL</small></a><div className="terminal-top-right"><span className="live-dot"/> SYSTEM ONLINE <button onClick={()=>setGreen(!green)} aria-label="切换终端配色">[ {green?'GREEN':'AMBER'} ]</button></div></header>
    <div className="terminal-shell">
      <aside className="terminal-directory"><div className="directory-label">~/RAGON</div><div className="directory-branch">│<br/>├── public/</div><nav aria-label="个人网站目录">{directory.map((item,i)=><button key={item.id} onClick={()=>setSection(item.id)} aria-current={section===item.id?'page':undefined}><span>0{i+1}</span><b>{item.file}</b><small>{item.label}</small>{section===item.id&&<i>←</i>}</button>)}</nav><div className="directory-branch">│<br/>└── links/</div><a className="directory-link" href="/productivity/">↗ productivity</a><a className="directory-link" href="https://github.com/RaDegradableTrash" target="_blank" rel="noreferrer">↗ github</a><div className="directory-bottom"><span>NO GUI REQUIRED.</span><br/>JUST A LITTLE CURIOSITY.<br/><button onClick={()=>input.current?.focus()}>[ / ] command line</button></div></aside>
      <main className="terminal-main">
        <div className="terminal-path"><span>visitor@dustland</span><span>~ / {directory.find(item=>item.id===section)?.file}</span><span>UTF-8</span></div>
        {section==='home'&&<section className="terminal-home"><div className="terminal-kicker">001 / WELCOME TO MY CORNER OF THE INTERNET</div><pre className="ascii-wordmark" aria-label="DUSTLAND">{wordmark}</pre><div className="terminal-hero"><div><p className="terminal-eyebrow">&gt; hello, world_</p><h1>我是 Ragon。<br/>这里是我的数字荒原<span>。</span></h1><p className="terminal-copy">一个放置代码、工具和未完成想法的地方。<br/>保持好奇，慢慢构建。</p><div className="terminal-hero-actions"><button onClick={()=>setSection('projects')}>探索项目 <span>→</span></button><button onClick={()=>setSection('about')}>[ 关于我 ]</button></div></div><figure className="ascii-landscape"><pre aria-hidden="true">{landscape}</pre><figcaption>FIG. 01 — SOMEWHERE IN DUSTLAND</figcaption></figure></div><div className="terminal-divider">+<span/> CURRENT DIRECTORY <span/>+</div><div className="terminal-feature"><div><span className="terminal-tag">01 / TOOL</span><h2>Productivity<span>_</span></h2><p>日历、待办、音乐。<br/>把日常放在一个自己的空间里。</p></div><pre aria-hidden="true">{'┌─────────────┐\n│ M T W T F   │\n│ · ■ · ■ ·   │\n│ ─────────── │\n│ [x] create  │\n│ [ ] explore │\n└─────────────┘'}</pre><a href="/productivity/">进入工作空间 <span>↗</span></a></div></section>}
        {section==='about'&&<section className="terminal-document"><div className="terminal-kicker">002 / ABOUT.MD</div><h1>你好，我是 Ragon<span>_</span></h1><p className="terminal-copy">DUSTLAND 是我的个人网站，也是这些小项目的入口。<br/>用最简单的字符，留下一点自己的痕迹。</p><pre className="terminal-profile">{'name       Ragon\nhome       dustland.ai\nworkspace  /productivity\nsource     github.com/RaDegradableTrash'}</pre><div className="terminal-note"><span># 关于这个空间</span><p>这里会慢慢积累项目、实验和想法。<br/>你可以用左边的目录，也可以在下面输入命令。</p></div><a className="terminal-inline-link" href="https://github.com/RaDegradableTrash" target="_blank" rel="noreferrer">[ 查看 GitHub → ]</a></section>}
        {section==='projects'&&<section className="terminal-document"><div className="terminal-kicker">003 / PROJECTS</div><h1>正在构建的东西<span>_</span></h1><p className="terminal-copy">小工具，自用空间，以及下一次实验。</p><a className="terminal-project" href="/productivity/"><div><span className="terminal-tag">01 · WEB APPLICATION</span><h2>Productivity</h2><p>带有空间透视的个人效率工具。日历 / 待办 / 音乐。</p></div><span className="project-arrow">↗</span></a><div className="terminal-project current"><div><span className="terminal-tag">02 · PERSONAL WEBSITE</span><h2>Dustland Terminal</h2><p>ASCII 字符组成的个人主页。你现在就在这里。</p></div><span>[ CURRENT ]</span></div><p className="terminal-end">— end of directory —</p></section>}
        <section className="terminal-console" aria-label="交互命令行"><div className="console-title"><span>+ TERMINAL</span><span>输入 help 开始</span></div><div className="console-output" ref={output} role="log" aria-live="polite">{lines.map((line,i)=><pre key={i} className={line.startsWith('visitor@')?'command-echo':''}>{line}</pre>)}</div><form onSubmit={e=>{e.preventDefault();run(command);}}><label htmlFor="terminal-command">visitor<span>@</span>dustland <b>~ $</b></label><input id="terminal-command" ref={input} value={command} onChange={e=>{setCommand(e.target.value);setCursor(-1);}} spellCheck={false} autoComplete="off" aria-label="终端命令" onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const next=e.key==='ArrowUp'?Math.min(cursor+1,history.length-1):Math.max(-1,cursor-1);setCursor(next);setCommand(next<0?'':history[next]||'');}if(e.key==='Tab'&&command){const match=commands.find(item=>item.startsWith(command));if(match){e.preventDefault();setCommand(match);}}if(e.key==='Escape')input.current?.blur();}}/><button type="submit" aria-label="执行命令">↵</button></form></section>
        <footer className="terminal-footer"><span>© {now.getFullYear()} RAGON / DUSTLAND</span><span>BUILT WITH CHARACTERS & CURIOSITY</span><time>{now.toLocaleTimeString('en-GB',{hour12:false})} LOCAL</time></footer>
      </main>
    </div>
  </div>;
}
