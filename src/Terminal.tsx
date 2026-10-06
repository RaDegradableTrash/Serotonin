import './Terminal.css';

/** An empty CRT shell. The bowed outline and inset shading model the glass itself. */
export default function Terminal() {
  return <main className="crt-stage" aria-label="复古琥珀色 CRT 显示器">
    <svg className="crt-monitor" viewBox="0 0 2000 1100" preserveAspectRatio="none" role="img" aria-label="带有弧面玻璃、扫描线与厚边框的空白屏幕">
      <defs>
        <linearGradient id="crt-case" x1="0" y1="0" x2="0.95" y2="1">
          <stop offset="0" stopColor="#615848"/>
          <stop offset=".12" stopColor="#403b31"/>
          <stop offset=".52" stopColor="#322f28"/>
          <stop offset="1" stopColor="#504a3d"/>
        </linearGradient>
        <linearGradient id="crt-top-light" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#a19171" stopOpacity=".27"/>
          <stop offset=".5" stopColor="#74664f" stopOpacity=".08"/>
          <stop offset="1" stopColor="#090806" stopOpacity=".9"/>
        </linearGradient>
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
        <linearGradient id="crt-rim" x1="0" y1="0" x2=".8" y2="1">
          <stop stopColor="#b3a388" stopOpacity=".17"/>
          <stop offset=".32" stopColor="#81745b" stopOpacity=".03"/>
          <stop offset=".75" stopColor="#050402" stopOpacity=".8"/>
          <stop offset="1" stopColor="#b9a585" stopOpacity=".15"/>
        </linearGradient>
        <pattern id="crt-scanlines" width="4" height="3.5" patternUnits="userSpaceOnUse">
          <rect width="4" height=".8" fill="#000" fillOpacity=".19"/>
          <rect y="1" width="4" height=".45" fill="#b98235" fillOpacity=".025"/>
        </pattern>
        <filter id="crt-soft-edge" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="11"/></filter>
        <filter id="crt-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <clipPath id="crt-glass-clip"><path d="M76 42 Q1000 8 1924 42 Q1965 550 1924 1058 Q1000 1090 76 1058 Q35 550 76 42Z"/></clipPath>
      </defs>
      <rect width="2000" height="1100" fill="url(#crt-case)"/>
      <path d="M0 0H2000L1924 42Q1000 8 76 42Z" fill="url(#crt-top-light)"/>
      <path d="M0 0L76 42Q35 550 76 1058L0 1100Z" fill="#817156" fillOpacity=".12"/>
      <path d="M2000 0L1924 42Q1965 550 1924 1058L2000 1100Z" fill="#090805" fillOpacity=".18"/>
      <path d="M0 1100L76 1058Q1000 1090 1924 1058L2000 1100Z" fill="#afa080" fillOpacity=".075"/>
      <path d="M70 34Q1000 0 1930 34Q1974 550 1930 1066Q1000 1100 70 1066Q26 550 70 34Z" fill="#050402" filter="url(#crt-soft-edge)"/>
      <path d="M76 42Q1000 8 1924 42Q1965 550 1924 1058Q1000 1090 76 1058Q35 550 76 42Z" fill="url(#crt-glass)"/>
      <g clipPath="url(#crt-glass-clip)">
        <rect width="2000" height="1100" fill="url(#crt-reflection)"/>
        <rect width="2000" height="1100" fill="url(#crt-scanlines)"/>
        <path d="M76 42Q1000 8 1924 42Q1965 550 1924 1058Q1000 1090 76 1058Q35 550 76 42Z" fill="none" stroke="#000" strokeOpacity=".7" strokeWidth="38" filter="url(#crt-soft-edge)"/>
        <path d="M74 68Q1000 25 1926 68" fill="none" stroke="#c5b08a" strokeOpacity=".035" strokeWidth="12" filter="url(#crt-soft-edge)"/>
        <path d="M58 550Q1000 543 1942 550" fill="none" stroke="#ae702c" strokeOpacity=".025" strokeWidth="2"/>
      </g>
      <path d="M73 39Q1000 5 1927 39Q1969 550 1927 1061Q1000 1094 73 1061Q31 550 73 39Z" fill="none" stroke="url(#crt-rim)" strokeWidth="5"/>
      <rect width="2000" height="1100" filter="url(#crt-grain)" opacity=".025" className="crt-grain"/>
    </svg>
  </main>;
}
