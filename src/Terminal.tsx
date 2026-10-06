import './Terminal.css';

/** An empty CRT shell. A flat bezel surrounds the subtly bowed glass. */
export default function Terminal() {
  return <main className="crt-stage" aria-label="复古琥珀色 CRT 显示器">
    <svg className="crt-monitor" viewBox="0 0 2000 1100" preserveAspectRatio="none" role="img" aria-label="带有弧面玻璃、扫描线与厚边框的空白屏幕">
      <defs>
        <radialGradient id="crt-glass" cx=".49" cy=".49" r=".72">
          <stop stopColor="#291b0d"/>
          <stop offset=".5" stopColor="#211509"/>
          <stop offset=".82" stopColor="#130c04"/>
          <stop offset="1" stopColor="#070502"/>
        </radialGradient>
        <radialGradient id="crt-reflection" cx=".48" cy=".36" r=".65">
          <stop stopColor="#cda56e" stopOpacity=".025"/>
          <stop offset=".55" stopColor="#b18b57" stopOpacity=".012"/>
          <stop offset="1" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
        <pattern id="crt-scanlines" width="4" height="3.5" patternUnits="userSpaceOnUse">
          <rect width="4" height=".8" fill="#000" fillOpacity=".19"/>
          <rect y="1" width="4" height=".45" fill="#b98235" fillOpacity=".025"/>
        </pattern>
        <filter id="crt-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <clipPath id="crt-glass-clip"><path d="M76 42 Q1000 8 1924 42 Q1965 550 1924 1058 Q1000 1090 76 1058 Q35 550 76 42Z"/></clipPath>
      </defs>
      <rect width="2000" height="1100" fill="#494438"/>
      <path d="M76 42Q1000 8 1924 42Q1965 550 1924 1058Q1000 1090 76 1058Q35 550 76 42Z" fill="url(#crt-glass)"/>
      <g clipPath="url(#crt-glass-clip)">
        <rect width="2000" height="1100" fill="url(#crt-reflection)"/>
        <rect width="2000" height="1100" fill="url(#crt-scanlines)"/>
        <path d="M58 550Q1000 543 1942 550" fill="none" stroke="#ae702c" strokeOpacity=".025" strokeWidth="2"/>
      </g>
      <rect width="2000" height="1100" clipPath="url(#crt-glass-clip)" filter="url(#crt-grain)" opacity=".025" className="crt-grain"/>
    </svg>
  </main>;
}
