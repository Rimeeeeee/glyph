import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, Check, Copy, Download, FileCode2, ImagePlus, Maximize2, RotateCcw, Sparkles, Upload, X } from 'lucide-react';

const RAMPS = {
  Classic: '@%#*+=-:. ',
  Fine: '@$B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`\'. ',
  Blocks: '█▓▒░ ',
  Soft: 'MWNXK0Okxdolc:,. '
};
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function Slider({ label, value, min, max, step = 1, unit = '', onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return <label className="slider-row"><span>{label}</span><output>{value}{unit}</output>
    <input style={{ '--fill': `${pct}%` }} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/>
  </label>;
}

function App() {
  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState('');
  const [ascii, setAscii] = useState('');
  const [cells, setCells] = useState([]);
  const [rows, setRows] = useState(0);
  const [columns, setColumns] = useState(96);
  const [contrast, setContrast] = useState(1.25);
  const [brightness, setBrightness] = useState(0);
  const [gamma, setGamma] = useState(1);
  const [saturation, setSaturation] = useState(115);
  const [edge, setEdge] = useState(0);
  const [fontScale, setFontScale] = useState(100);
  const [invert, setInvert] = useState(false);
  const [dither, setDither] = useState(true);
  const [colorMode, setColorMode] = useState(false);
  const [background, setBackground] = useState('light');
  const [ramp, setRamp] = useState('Classic');
  const [copied, setCopied] = useState(false);
  const [copyTarget, setCopyTarget] = useState('markdown');
  const [wordFont, setWordFont] = useState(7);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);

  const convert = useCallback(() => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = columns;
    canvas.height = Math.max(1, Math.round(columns * (image.height / image.width) * .48));
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const lumMap = new Float32Array(canvas.width * canvas.height);
    for (let p = 0; p < lumMap.length; p++) {
      const i = p * 4;
      lumMap[p] = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    }
    const chars = RAMPS[ramp];
    const nextCells = [];
    let out = '';
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const p = y * canvas.width + x, i = p * 4;
        const base = lumMap[p];
        const neighbor = lumMap[y * canvas.width + Math.min(x + 1, canvas.width - 1)];
        const below = lumMap[Math.min(y + 1, canvas.height - 1) * canvas.width + x];
        const edgeValue = Math.abs(base - neighbor) + Math.abs(base - below);
        let lum = Math.pow(clamp(((base - .5) * contrast + .5) + brightness / 100 - edgeValue * edge / 100, 0, 1), gamma);
        // Density direction depends on the paper: on white, dark pixels need dense
        // black glyphs; on black, bright pixels need dense light glyphs.
        if (dither) {
          const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
          lum = clamp(lum + (bayer[y % 4][x % 4] / 15 - .5) * .075, 0, 1);
        }
        if ((background === 'dark') !== invert) lum = 1 - lum;
        const char = chars[Math.min(chars.length - 1, Math.floor(lum * chars.length))];
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const sat = saturation / 100;
        const rgb = [data[i], data[i + 1], data[i + 2]].map(c => Math.round(clamp(gray + (c - gray) * sat, 0, 255)));
        nextCells.push({ char, color: `rgb(${rgb.join(',')})` });
        out += char;
      }
      out += '\n';
    }
    setRows(canvas.height); setCells(nextCells); setAscii(out);
  }, [image, columns, contrast, brightness, gamma, saturation, edge, invert, dither, ramp, background]);

  useEffect(() => { convert(); }, [convert]);

  const loadFile = file => {
    if (!file?.type.startsWith('image/')) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { setImage(img); setFileName(file.name); URL.revokeObjectURL(url); };
    img.src = url;
  };
  const saveBlob = (blob, suffix) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${fileName.replace(/\.[^.]+$/, '') || 'portrait'}-glyph.${suffix}`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  };
  const downloadText = () => saveBlob(new Blob([ascii], { type: 'text/plain' }), 'txt');
  const downloadHtml = () => {
    const fg = background === 'dark' ? '#f1efe8' : '#151512', bg = background === 'dark' ? '#151512' : '#f8f7f2';
    let body = '';
    cells.forEach((c, i) => { body += `<span${colorMode ? ` style=\"color:${c.color}\"` : ''}>${c.char === ' ' ? '&nbsp;' : c.char.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>${(i + 1) % columns === 0 ? '\n' : ''}`; });
    const html = `<!doctype html><meta charset=\"utf-8\"><title>Glyph portrait</title><style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:${bg};color:${fg}}pre{font:8px/.86 monospace;letter-spacing:-.08em}</style><pre>${body}</pre>`;
    saveBlob(new Blob([html], { type: 'text/html' }), 'html');
  };
  const downloadPng = () => {
    const size = 10, line = size * .86, canvas = document.createElement('canvas');
    canvas.width = Math.ceil(columns * size * .6 + 40); canvas.height = Math.ceil(rows * line + 40);
    const ctx = canvas.getContext('2d'); ctx.fillStyle = background === 'dark' ? '#151512' : '#f8f7f2'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${size}px monospace`; ctx.textBaseline = 'top';
    cells.forEach((c, i) => { ctx.fillStyle = colorMode ? c.color : (background === 'dark' ? '#f1efe8' : '#151512'); ctx.fillText(c.char, 20 + (i % columns) * size * .6, 20 + Math.floor(i / columns) * line); });
    canvas.toBlob(blob => saveBlob(blob, 'png'));
  };
  const copyTargets = {
    markdown: { columns: 88, label: 'HackMD / GitHub', note: 'Fenced Markdown block; spacing stays intact.' },
    code: { columns: 100, label: 'Source code', note: 'Raw text for comments, strings, and text files.' },
    word: { columns: 80, font: 10, label: 'Microsoft Word', note: 'Rich Courier New formatting with exact spacing.' },
    universal: { columns: 72, label: 'Universal', note: 'Narrow raw text for chat, notes, and unknown editors.' }
  };
  const copyOutput = async () => {
    if (!ascii) return;
    const font = wordFont;
    const foreground = background === 'dark' ? '#f1efe8' : '#151512';
    const bg = background === 'dark' ? '#151512' : '#ffffff';
    let htmlCells = '';
    cells.forEach((cell, i) => {
      const safe = cell.char === ' ' ? '&nbsp;' : cell.char.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      htmlCells += colorMode ? `<span style=\"color:${cell.color}\">${safe}</span>` : safe;
      if ((i + 1) % columns === 0) htmlCells += '<br>';
    });
    const html = `<div style=\"background:${bg};padding:8pt\"><div style=\"margin:0;font-family:'Courier New',monospace;font-size:${font}pt;line-height:0.86;letter-spacing:-0.08em;white-space:nowrap;color:${foreground}\">${htmlCells}</div></div>`;
    const plain = copyTarget === 'markdown' ? `\`\`\`text\n${ascii.replace(/\s+$/, '')}\n\`\`\`` : ascii;
    try {
      if (copyTarget === 'word' && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([ascii], { type: 'text/plain' })
        })]);
      } else await navigator.clipboard.writeText(plain);
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    } catch { await navigator.clipboard.writeText(plain); }
  };
  const chooseCopyTarget = target => {
    setCopyTarget(target); setColumns(copyTargets[target].columns);
    if (copyTargets[target].font) setWordFont(copyTargets[target].font);
  };
  const reset = () => { setColumns(96); setContrast(1.25); setBrightness(0); setGamma(1); setSaturation(115); setEdge(0); setFontScale(100); setInvert(false); setDither(true); setColorMode(false); setBackground('light'); setRamp('Classic'); setCopyTarget('markdown'); setWordFont(10); };
  const clear = () => { setImage(null); setAscii(''); setCells([]); setRows(0); };
  const fontSize = clamp(920 / columns, 4.4, 11) * fontScale / 100;

  return <main>
    <header><a className="brand" href="#top"><span>G</span> GLYPH</a><nav><a href="#studio">Studio</a><a href="#method">Method</a></nav><button className="open-btn" onClick={() => fileInput.current?.click()}><span>Open image</span><Upload size={15}/></button></header>
    <section className="hero" id="top"><div className="eyebrow"><Sparkles size={13}/> image → character study</div><h1>Portraits,<br/><em>retyped.</em></h1><p>Turn light, shadow, and color into detailed ASCII art—entirely on your device.</p><button className="primary" onClick={() => fileInput.current?.click()}>Create yours <ArrowDown size={17}/></button><div className="hero-ascii" aria-hidden="true">{'@@@@@@@@%#*+=-:.\n@@@%#*+=--:..   \n@%#*+=--:..      \n#*+=-:..   .:-=+*\n+=-:.   .:-+*#%@@\n-:.  .:-+*#%@@@@@'}</div></section>

    <section className="studio" id="studio"><div className="section-title"><span>01</span><h2>THE STUDIO</h2><p>Precision controls. Instant output.</p></div>
      <div className="mobile-jump"><a href="#result">See result ↓</a><span>{ascii ? `${ascii.replace(/\n/g, '').length.toLocaleString()} glyphs` : 'Add a photo to begin'}</span></div>
      <div className="workbench"><aside className="controls">
        <div className="control-head"><span>INPUT</span>{image && <button onClick={clear}><X size={14}/> clear</button>}</div>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={e => loadFile(e.target.files[0])}/>
        <button className={`dropzone ${dragging ? 'dragging' : ''}`} onClick={() => fileInput.current?.click()} onDragOver={e => {e.preventDefault(); setDragging(true)}} onDragLeave={() => setDragging(false)} onDrop={e => {e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0])}}>{image ? <><img src={image.src}/><span className="file-chip">{fileName}</span></> : <><ImagePlus/><strong>ADD A PORTRAIT</strong><small>Tap to browse · JPG, PNG, WEBP</small></>}</button>

        <div className="control-head spaced"><span>RENDER STYLE</span></div>
        <div className="mode-switch"><button className={!colorMode ? 'active' : ''} onClick={() => setColorMode(false)}>Monochrome</button><button className={colorMode ? 'active color' : ''} onClick={() => setColorMode(true)}>Full color</button></div>
        <div className="background-switch"><span>Canvas</span><div><button className={background === 'light' ? 'active' : ''} onClick={() => setBackground('light')}>Light</button><button className={background === 'dark' ? 'active' : ''} onClick={() => setBackground('dark')}>Dark</button></div></div>
        <div className="control-head spaced"><span>CHARACTER SET</span></div><div className="ramp-grid">{Object.keys(RAMPS).map(name => <button className={ramp === name ? 'active' : ''} onClick={() => setRamp(name)} key={name}><b>{name}</b><small>{RAMPS[name].slice(0, 10)}</small></button>)}</div>
        <div className="control-head spaced"><span>IMAGE TUNING</span><button onClick={reset}><RotateCcw size={13}/> reset</button></div>
        <Slider label="Detail" value={columns} min={32} max={180} unit=" cols" onChange={setColumns}/><Slider label="Contrast" value={contrast} min={.5} max={2.5} step={.05} onChange={setContrast}/><Slider label="Brightness" value={brightness} min={-40} max={40} onChange={setBrightness}/><Slider label="Gamma" value={gamma} min={.4} max={2} step={.05} onChange={setGamma}/><Slider label="Edge definition" value={edge} min={0} max={100} unit="%" onChange={setEdge}/>{colorMode && <Slider label="Color intensity" value={saturation} min={0} max={200} unit="%" onChange={setSaturation}/>}<Slider label="Glyph size" value={fontScale} min={70} max={150} unit="%" onChange={setFontScale}/>
        <label className="toggle"><span><b>Invert density</b><small>Reverse light and dense characters</small></span><input type="checkbox" checked={invert} onChange={e => setInvert(e.target.checked)}/><i/></label>
        <label className="toggle secondary"><span><b>Preserve fine tones</b><small>Dithering keeps detail at copy-safe sizes</small></span><input type="checkbox" checked={dither} onChange={e => setDither(e.target.checked)}/><i/></label>
        <div className="control-head spaced"><span>COPY DESTINATION</span></div>
        <div className="copy-presets">{Object.entries(copyTargets).map(([key, value]) => <button key={key} className={copyTarget === key ? 'active' : ''} onClick={() => chooseCopyTarget(key)}><span><b>{value.label}</b><em>{value.note}</em></span><small>{value.columns} cols</small></button>)}</div>
        {copyTarget === 'word' && <><Slider label="Word paste size" value={wordFont} min={4} max={14} step={0.5} unit="pt" onChange={setWordFont}/><div className="word-size-guide"><span>Estimated width</span><b>{Math.round(columns * wordFont * .6)}pt / ~450pt page</b></div></>}
        <p className="copy-note">The destination sets a safe width automatically. Colored text is preserved in Word; use HTML or PNG for color elsewhere.</p>
      </aside>

      <div className="output" id="result"><div className="output-bar"><span>OUTPUT / {columns} × {rows || '—'}</span><div><button className="word-copy" disabled={!ascii} onClick={copyOutput}>{copied ? <Check size={14}/> : <Copy size={14}/>}<span>{copied ? 'Copied' : `Copy for ${copyTargets[copyTarget].label}`}</span></button><button disabled={!ascii} onClick={downloadPng}><Download size={14}/><span>PNG</span></button><button disabled={!ascii} onClick={downloadHtml}><FileCode2 size={14}/><span>HTML</span></button></div></div>
        <div className={`ascii-frame ${background === 'dark' ? 'dark' : ''} ${colorMode ? 'is-color' : 'is-mono'}`}>{ascii ? <div className="ascii-art" style={{ '--cols': columns, '--glyph-size': `${fontSize}px` }}>{cells.map((cell, i) => <span key={i} style={colorMode ? { color: cell.color } : undefined}>{cell.char === ' ' ? '\u00a0' : cell.char}</span>)}</div> : <div className="empty"><Maximize2/><p>Your portrait will be reconstructed here,<br/>one character at a time.</p></div>}</div>
        <div className="status"><span><i className={ascii ? 'ready' : ''}/>{ascii ? `${colorMode ? 'COLOR' : 'MONO'} RENDER COMPLETE` : 'AWAITING IMAGE'}</span><button disabled={!ascii} onClick={downloadText}>PLAIN .TXT ↓</button></div>
      </div></div></section>

    <section className="method" id="method"><div className="section-title"><span>02</span><h2>HOW IT SEES</h2><p>Your photo never leaves this browser.</p></div><div className="steps"><article><b>01</b><div className="step-icon">▣</div><h3>Sample</h3><p>The image is resized into a precise character grid while preserving portrait proportions.</p></article><article><b>02</b><div className="step-icon">◒</div><h3>Read the light</h3><p>Every pixel is read for luminance and color, then shaped with your tuning controls.</p></article><article><b>03</b><div className="step-icon">@</div><h3>Retype</h3><p>Each tone becomes a glyph. In color mode, every glyph carries its source pixel’s hue.</p></article></div></section>
    <footer><div className="brand"><span>G</span> GLYPH</div><p>Every face has a type.</p><small>PRIVATE BY DESIGN · BUILT FOR EVERY SCREEN</small></footer>
  </main>;
}
export default App;
