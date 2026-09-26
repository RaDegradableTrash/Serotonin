import { useRef, useState } from 'react';
import { Music2, Plus, Trash2, Disc3 } from 'lucide-react';
import { useStored } from './useStored';
import { uid } from './model';
type Track = { id: string; title: string; url: string };
export default function Music() {
  const [tracks, setTracks] = useStored<Track[]>('serotonin.music.v1', []);
  const [current, setCurrent] = useState<string | null>(null), [title, setTitle] = useState(''), [url, setUrl] = useState(''), [error, setError] = useState(''), [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const track = tracks.find(item => item.id === current);
  const play = (id: string) => { setCurrent(id); setError(''); setTimeout(() => { audioRef.current?.play().catch(() => setError('请点击播放器的播放按钮。')); }, 0); };
  return <section className="music-page page-width"><h1>音乐</h1>
    <div className="music-layout"><div className="player-card"><div className={`record ${playing ? 'spinning' : ''}`}><div><Disc3 size={42} /></div></div><small>NOW PLAYING</small><h2>{track?.title || '未选择音频'}</h2><p>{track ? '你的播放列表' : '从右侧添加第一首音乐'}</p><audio ref={audioRef} src={track?.url} controls preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => { setPlaying(false); setError('音频无法播放。请使用允许访问的 MP3、WAV 或 OGG 直链。'); }} onEnded={() => { setPlaying(false); const next = tracks[tracks.findIndex(item => item.id === current) + 1]; if (next) play(next.id); }} /></div>
    <div className="playlist-card"><div className="section-title"><h2>播放列表</h2><span>{tracks.length} 首</span></div><form onSubmit={e => { e.preventDefault(); try { const parsed = new URL(url); if (!['https:', 'http:'].includes(parsed.protocol) || !title.trim()) throw new Error(); const entry = { id: uid(), title: title.trim(), url }; setTracks([...tracks, entry]); if (!current) setCurrent(entry.id); setTitle(''); setUrl(''); setError(''); } catch { setError('请输入名称和有效的 HTTP(S) 音频链接。'); } }}><label>音乐名称<input value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：雨天的白噪音" required /></label><label>音频直链<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…/music.mp3" required /></label><button className="secondary wide"><Plus size={16} /> 添加到播放列表</button></form><p className="hint">支持浏览器可播放的音频直链，不支持音乐网站页面链接。</p>{error && <p className="error" role="alert">{error}</p>}
    {tracks.map((item, i) => <div className={`track-row ${item.id === current ? 'active' : ''}`} key={item.id}><span>{String(i + 1).padStart(2, '0')}</span><button onClick={() => play(item.id)}><Music2 size={16} />{item.title}</button><button className="icon-button" aria-label={`移除 ${item.title}`} onClick={() => { setTracks(tracks.filter(t => t.id !== item.id)); if (current === item.id) { setCurrent(null); setPlaying(false); } }}><Trash2 size={15} /></button></div>)}
    </div></div>
  </section>;
}
