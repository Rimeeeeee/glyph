import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, Check, Copy, Download, FileCode2, ImagePlus, Maximize2, RotateCcw, Sparkles, Upload, X } from 'lucide-react';

const RAMPS = {
  Classic: '@%#*+=-:. ',
  Fine: '@$B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`\'. ',
  Blocks: '█▓▒░ ',
  Soft: 'MWNXK0Okxdolc:,. '
};
const FONT = {
  A:['01110','10001','11111','10001','10001'],B:['11110','10001','11110','10001','11110'],C:['01111','10000','10000','10000','01111'],D:['11110','10001','10001','10001','11110'],E:['11111','10000','11110','10000','11111'],F:['11111','10000','11110','10000','10000'],G:['01111','10000','10111','10001','01110'],H:['10001','10001','11111','10001','10001'],I:['11111','00100','00100','00100','11111'],J:['00111','00010','00010','10010','01100'],K:['10001','10010','11100','10010','10001'],L:['10000','10000','10000','10000','11111'],M:['10001','11011','10101','10001','10001'],N:['10001','11001','10101','10011','10001'],O:['01110','10001','10001','10001','01110'],P:['11110','10001','11110','10000','10000'],Q:['01110','10001','10101','10010','01101'],R:['11110','10001','11110','10010','10001'],S:['01111','10000','01110','00001','11110'],T:['11111','00100','00100','00100','00100'],U:['10001','10001','10001','10001','01110'],V:['10001','10001','10001','01010','00100'],W:['10001','10001','10101','11011','10001'],X:['10001','01010','00100','01010','10001'],Y:['10001','01010','00100','00100','00100'],Z:['11111','00010','00100','01000','11111'],
  0:['01110','10011','10101','11001','01110'],1:['00100','01100','00100','00100','01110'],2:['01110','10001','00010','00100','11111'],3:['11110','00001','00110','00001','11110'],4:['00010','00110','01010','11111','00010'],5:['11111','10000','11110','00001','11110'],6:['01110','10000','11110','10001','01110'],7:['11111','00010','00100','01000','01000'],8:['01110','10001','01110','10001','01110'],9:['01110','10001','01111','00001','01110'],
  ' ':['000','000','000','000','000'],'!':['1','1','1','0','1'],'?':['1110','0001','0110','0000','0100'],'-':['00000','00000','11111','00000','00000'],'.':['0','0','0','0','1'],':':['0','1','0','1','0']
};
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function makeAsciiText(value, style, is3d) {
  if (!value.trim()) return '';
  const bold = style === 'bold' || style === 'boldItalic';
  const italic = style === 'italic' || style === 'boldItalic';
  const ink = bold ? '@@' : '@';
  const lines = value.toUpperCase().split('\n').slice(0, 3);
  const output = [];
  lines.forEach((line, lineIndex) => {
    for (let row = 0; row < 5; row++) {
      const lean = italic ? ' '.repeat(4 - row) : '';
      output.push(lean + [...line].map(char => (FONT[char] || FONT['?'])[row].split('').map(bit => bit === '1' ? ink : ' '.repeat(ink.length)).join('')).join(' '));
    }
    if (lineIndex < lines.length - 1) output.push('');
  });
  if (!is3d) return output.join('\n').replace(/ +$/gm, '');
  const width = Math.max(...output.map(line => line.length)) + 2;
  const depth = output.map(line => [...line.padEnd(width)].map(char => char === '@' ? '#' : ' ').join(''));
  const canvas = Array.from({length:output.length + 1}, () => Array(width + 2).fill(' '));
  depth.forEach((line,y) => [...line].forEach((char,x) => { if(char === '#') canvas[y+1][x+2] = '#'; }));
  output.forEach((line,y) => [...line].forEach((char,x) => { if(char !== ' ') canvas[y][x] = char; }));
  return canvas.map(line => line.join('').replace(/ +$/, '')).join('\n');
}

function composeAsciiLayers(imageAscii, bannerAscii, position, clearBackground) {
  if (!imageAscii) return bannerAscii ? `${bannerAscii}\n` : '';
  if (!bannerAscii) return imageAscii;
  const imageLines = imageAscii.replace(/\n$/, '').split('\n');
  const bannerLines = bannerAscii.split('\n');
  const width = Math.max(...imageLines.map(line => line.length), ...bannerLines.map(line => line.length));
  const canvas = imageLines.map(line => {
    const row = Array(width).fill(' '), start = Math.floor((width - line.length) / 2);
    [...line].forEach((char, index) => { row[start + index] = char; });
    return row;
  });
  const startY = position === 'top' ? 1 : position === 'center' ? Math.floor((canvas.length - bannerLines.length) / 2) : canvas.length - bannerLines.length - 1;
  const safeY = clamp(startY, 0, Math.max(0, canvas.length - bannerLines.length));
  bannerLines.forEach((line, row) => {
    const startX = Math.max(0, Math.floor((width - line.length) / 2));
    if (!canvas[safeY + row]) return;
    if (clearBackground) {
      const bannerWidth = Math.max(...bannerLines.map(value => value.length));
      const bgX = Math.max(0, Math.floor((width - bannerWidth) / 2));
      for (let x = bgX; x < Math.min(width, bgX + bannerWidth); x++) canvas[safeY + row][x] = ' ';
    }
    [...line].forEach((char, col) => { if (char !== ' ') canvas[safeY + row][startX + col] = char; });
  });
  return `${canvas.map(line => line.join('').replace(/ +$/, '')).join('\n')}\n`;
}

function Slider({ label, value, min, max, step = 1, unit = '', onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return <label className="slider-row"><span>{label}</span><output>{value}{unit}</output>
    <input style={{ '--fill': `${pct}%` }} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/>
  </label>;
}

function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
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
  const [textValue, setTextValue] = useState('');
  const [textStyle, setTextStyle] = useState('plain');
  const [text3d, setText3d] = useState(false);
  const [textColor, setTextColor] = useState('#ffcc33');
  const [textBg, setTextBg] = useState('#151512');
  const [textBgEnabled, setTextBgEnabled] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [textPosition, setTextPosition] = useState('bottom');
  const [textSize, setTextSize] = useState(24);
  const [text3dColor, setText3dColor] = useState('#777777');
  const [text3dDepthColor, setText3dDepthColor] = useState('#333333');
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
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      img.onload = () => { setImage(img); setImagePreview(dataUrl); setFileName(file.name); };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };
  const saveBlob = (blob, suffix) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${fileName.replace(/\.[^.]+$/, '') || 'portrait'}-glypheeeeee.${suffix}`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  };
  const asciiText = makeAsciiText(textValue, textStyle, text3d);
  const activeTextColor = colorMode ? textColor : (background === 'dark' ? '#f1efe8' : '#151512');
  const activeTextBg = colorMode ? textBg : (background === 'dark' ? '#151512' : '#f8f7f2');
  const hasOutput = Boolean(ascii || asciiText);
  const composedAscii = composeAsciiLayers(ascii, asciiText, textPosition, textBgEnabled);
  const plainWithText = composedAscii;
  const textCss = `font-family:'Courier New',monospace;font-size:${textSize}px;line-height:.9;white-space:pre;color:${activeTextColor};background:${textBgEnabled ? activeTextBg : 'transparent'};padding:8px 12px;${text3d ? `text-shadow:1px 1px 0 ${text3dColor};` : ''}`;
  const downloadText = () => saveBlob(new Blob([plainWithText], { type: 'text/plain' }), 'txt');
  const downloadHtml = () => {
    const fg = background === 'dark' ? '#f1efe8' : '#151512', bg = background === 'dark' ? '#151512' : '#f8f7f2';
    let body = '';
    cells.forEach((c, i) => { body += `<span${colorMode ? ` style=\"color:${c.color}\"` : ''}>${c.char === ' ' ? '&nbsp;' : c.char.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>${(i + 1) % columns === 0 ? '\n' : ''}`; });
    const safeText = asciiText.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const caption = asciiText ? `<pre class=\"caption ${textPosition}\" style=\"${textCss}\">${safeText}</pre>` : '';
    const html = `<!doctype html><meta charset=\"utf-8\"><title>Glypheeeeee artwork</title><style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:${bg};color:${fg}}.art{position:relative;width:max-content;min-width:${ascii ? 0 : 640}px;min-height:${ascii ? 0 : 240}px}.caption{position:absolute;left:50%;transform:translateX(-50%);z-index:2;white-space:nowrap}.caption.top{top:18px}.caption.center{top:50%;transform:translate(-50%,-50%)}.caption.bottom{bottom:18px}pre{font:8px/.86 monospace;letter-spacing:-.08em;margin:0}</style><div class=\"art\">${caption}<pre>${body}</pre></div>`;
    saveBlob(new Blob([html], { type: 'text/html' }), 'html');
  };
  const downloadPng = () => {
    const size = 10, line = size * .86, canvas = document.createElement('canvas');
    const bannerLines = asciiText ? asciiText.split('\n') : [];
    const bannerWidth = bannerLines.length ? Math.max(...bannerLines.map(value => value.length)) * textSize * .6 + 40 : 0;
    canvas.width = Math.ceil(Math.max(columns * size * .6 + 40, bannerWidth));
    canvas.height = ascii ? Math.ceil(rows * line + 40) : Math.max(240, Math.ceil(bannerLines.length * textSize * .9 + 80));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = background === 'dark' ? '#151512' : '#f8f7f2'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${size}px monospace`; ctx.textBaseline = 'top';
    cells.forEach((c, i) => { ctx.fillStyle = colorMode ? c.color : (background === 'dark' ? '#f1efe8' : '#151512'); ctx.fillText(c.char, 20 + (i % columns) * size * .6, 20 + Math.floor(i / columns) * line); });
    if (asciiText) {
      ctx.font = `${textSize}px monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      const blockHeight = bannerLines.length * textSize * .9;
      const startY = textPosition === 'top' ? 24 : textPosition === 'center' ? (canvas.height - blockHeight) / 2 : canvas.height - blockHeight - 24;
      const maxChars = Math.max(...bannerLines.map(value => value.length)), startX = (canvas.width - maxChars * textSize * .6) / 2;
      if (textBgEnabled) { ctx.fillStyle = activeTextBg; ctx.fillRect(startX - 10, startY - 8, maxChars * textSize * .6 + 20, blockHeight + 16); }
      bannerLines.forEach((value, row) => [...value].forEach((char, col) => {
        if (char === ' ') return;
        const x = startX + col * textSize * .6, y = startY + row * textSize * .9;
        if (char === '@' && text3d) { ctx.fillStyle = text3dColor; ctx.fillText(char, x + 1, y + 1); }
        ctx.fillStyle = char === '#' ? text3dDepthColor : activeTextColor; ctx.fillText(char, x, y);
      }));
    }
    canvas.toBlob(blob => saveBlob(blob, 'png'));
  };
  const copyTargets = {
    markdown: { columns: 88, label: 'HackMD / GitHub', note: 'Fenced Markdown block; spacing stays intact.' },
    code: { columns: 100, label: 'Source code', note: 'Raw text for comments, strings, and text files.' },
    word: { columns: 80, font: 10, label: 'Microsoft Word', note: 'Rich Courier New formatting with exact spacing.' },
    universal: { columns: 72, label: 'Universal', note: 'Narrow raw text for chat, notes, and unknown editors.' }
  };
  const copyOutput = async () => {
    if (!hasOutput) return;
    const font = wordFont;
    const foreground = background === 'dark' ? '#f1efe8' : '#151512';
    const bg = background === 'dark' ? '#151512' : '#ffffff';
    const safeComposed = composedAscii.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const html = `<div style=\"background:${bg};padding:8pt\"><pre style=\"margin:0;font-family:'Courier New',monospace;font-size:${font}pt;line-height:0.86;letter-spacing:-0.08em;white-space:pre;color:${foreground}\">${safeComposed}</pre></div>`;
    const plain = copyTarget === 'markdown' ? `\`\`\`text\n${plainWithText.replace(/\s+$/, '')}\n\`\`\`` : plainWithText;
    try {
      if (copyTarget === 'word' && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainWithText], { type: 'text/plain' })
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
  const clear = () => { setImage(null); setImagePreview(''); setAscii(''); setCells([]); setRows(0); };
  const fontSize = clamp(920 / columns, 4.4, 11) * fontScale / 100;

  return <main>
    <header><a className="brand" href="#top"><span>G</span> GLYPHEEEEEE</a><nav><a href="#studio">Studio</a><a href="#method">Method</a></nav><button className="open-btn" onClick={() => fileInput.current?.click()}><span>Open image</span><Upload size={15}/></button></header>
    <section className="hero" id="top"><div className="eyebrow"><Sparkles size={13}/> image → character study</div><h1>Portraits,<br/><em>retyped.</em></h1><p>Turn light, shadow, and color into detailed ASCII art—entirely on your device.</p><button className="primary" onClick={() => fileInput.current?.click()}>Create yours <ArrowDown size={17}/></button><div className="hero-ascii" aria-hidden="true">{'@@@@@@@@%#*+=-:.\n@@@%#*+=--:..   \n@%#*+=--:..      \n#*+=-:..   .:-=+*\n+=-:.   .:-+*#%@@\n-:.  .:-+*#%@@@@@'}</div></section>

    <section className="studio" id="studio"><div className="section-title"><span>01</span><h2>THE STUDIO</h2><p>Precision controls. Instant output.</p></div>
      <div className="mobile-jump"><a href="#result">See result ↓</a><span>{ascii ? `${ascii.replace(/\n/g, '').length.toLocaleString()} glyphs` : 'Add a photo to begin'}</span></div>
      <div className="workbench"><aside className="controls">
        <div className="control-head"><span>INPUT</span>{image && <button onClick={clear}><X size={14}/> clear</button>}</div>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={e => loadFile(e.target.files[0])}/>
        <button className={`dropzone ${dragging ? 'dragging' : ''}`} onClick={() => fileInput.current?.click()} onDragOver={e => {e.preventDefault(); setDragging(true)}} onDragLeave={() => setDragging(false)} onDrop={e => {e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0])}}>{image ? <><img src={imagePreview}/><span className="file-chip">{fileName}</span></> : <><ImagePlus/><strong>ADD A PORTRAIT</strong><small>Tap to browse · JPG, PNG, WEBP</small></>}</button>

        <div className="control-head spaced"><span>RENDER STYLE</span></div>
        <div className="mode-switch"><button className={!colorMode ? 'active' : ''} onClick={() => setColorMode(false)}>Monochrome</button><button className={colorMode ? 'active color' : ''} onClick={() => setColorMode(true)}>Full color</button></div>
        <div className="background-switch"><span>Canvas</span><div><button className={background === 'light' ? 'active' : ''} onClick={() => setBackground('light')}>Light</button><button className={background === 'dark' ? 'active' : ''} onClick={() => setBackground('dark')}>Dark</button></div></div>
        <div className="control-head spaced"><span>TEXT LAYER</span>{textValue && <button onClick={() => setTextValue('')}><X size={13}/> clear</button>}</div>
        <textarea className="text-input" value={textValue} maxLength={80} onChange={e => setTextValue(e.target.value)} placeholder="Write something…" aria-label="Text overlay"/>
        <div className="text-style-grid">{[['plain','Plain'],['bold','Bold'],['italic','Italic'],['boldItalic','Bold italic']].map(([key,label]) => <button key={key} className={textStyle === key ? 'active' : ''} onClick={() => setTextStyle(key)}>{label}</button>)}</div>
        <button className="palette-toggle" disabled={!colorMode} onClick={() => setPaletteOpen(true)}><span>Color palette</span><i style={{ background:textColor }}/><i style={{ background:textBg }}/><i style={{ background:text3dColor }}/></button>
        {colorMode && paletteOpen && <div className="color-palette"><div className="palette-head"><span>TEXT COLORS</span><button onClick={() => setPaletteOpen(false)} aria-label="Close color palette"><X size={15}/></button></div><div className="text-options"><label><span>Text</span><input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}/></label><label><span>Background</span><input type="color" value={textBg} onChange={e => setTextBg(e.target.value)}/></label><label><span>3D highlight</span><input type="color" value={text3dColor} onChange={e => setText3dColor(e.target.value)}/></label><label><span>3D depth</span><input type="color" value={text3dDepthColor} onChange={e => setText3dDepthColor(e.target.value)}/></label></div></div>}
        <div className="position-switch">{['top','center','bottom'].map(pos => <button key={pos} className={textPosition === pos ? 'active' : ''} onClick={() => setTextPosition(pos)}>{pos}</button>)}</div>
        <Slider label="Text size" value={textSize} min={12} max={52} unit="px" onChange={setTextSize}/>
        <label className="toggle compact"><span><b>Text background</b><small>Add a readable block behind text</small></span><input type="checkbox" checked={textBgEnabled} onChange={e => setTextBgEnabled(e.target.checked)}/><i/></label>
        <label className="toggle secondary"><span><b>3D text</b><small>Layered dimensional shadow</small></span><input type="checkbox" checked={text3d} onChange={e => setText3d(e.target.checked)}/><i/></label>
        <div className="control-head spaced"><span>CHARACTER SET</span></div><div className="ramp-grid">{Object.keys(RAMPS).map(name => <button className={ramp === name ? 'active' : ''} onClick={() => setRamp(name)} key={name}><b>{name}</b><small>{RAMPS[name].slice(0, 10)}</small></button>)}</div>
        <div className="control-head spaced"><span>IMAGE TUNING</span><button onClick={reset}><RotateCcw size={13}/> reset</button></div>
        <Slider label="Detail" value={columns} min={32} max={180} unit=" cols" onChange={setColumns}/><Slider label="Contrast" value={contrast} min={.5} max={2.5} step={.05} onChange={setContrast}/><Slider label="Brightness" value={brightness} min={-40} max={40} onChange={setBrightness}/><Slider label="Gamma" value={gamma} min={.4} max={2} step={.05} onChange={setGamma}/><Slider label="Edge definition" value={edge} min={0} max={100} unit="%" onChange={setEdge}/>{colorMode && <Slider label="Color intensity" value={saturation} min={0} max={200} unit="%" onChange={setSaturation}/>}<Slider label="Rendered ASCII zoom" value={fontScale} min={40} max={300} step={5} unit="%" onChange={setFontScale}/>
        <label className="toggle"><span><b>Invert density</b><small>Reverse light and dense characters</small></span><input type="checkbox" checked={invert} onChange={e => setInvert(e.target.checked)}/><i/></label>
        <label className="toggle secondary"><span><b>Preserve fine tones</b><small>Dithering keeps detail at copy-safe sizes</small></span><input type="checkbox" checked={dither} onChange={e => setDither(e.target.checked)}/><i/></label>
        <div className="control-head spaced"><span>COPY DESTINATION</span></div>
        <div className="copy-presets">{Object.entries(copyTargets).map(([key, value]) => <button key={key} className={copyTarget === key ? 'active' : ''} onClick={() => chooseCopyTarget(key)}><span><b>{value.label}</b><em>{value.note}</em></span><small>{value.columns} cols</small></button>)}</div>
        {copyTarget === 'word' && <><Slider label="Word paste size" value={wordFont} min={4} max={14} step={0.5} unit="pt" onChange={setWordFont}/><div className="word-size-guide"><span>Estimated width</span><b>{Math.round(columns * wordFont * .6)}pt / ~450pt page</b></div></>}
        <p className="copy-note">The destination sets a safe width automatically. Colored text is preserved in Word; use HTML or PNG for color elsewhere.</p>
      </aside>

      <div className="output" id="result"><div className="output-bar"><span>OUTPUT / {ascii ? `${columns} × ${rows}` : 'TEXT CANVAS'}</span><div><button className="word-copy" disabled={!hasOutput} onClick={copyOutput}>{copied ? <Check size={14}/> : <Copy size={14}/>}<span>{copied ? 'Copied' : `Copy for ${copyTargets[copyTarget].label}`}</span></button><button disabled={!hasOutput} onClick={downloadPng}><Download size={14}/><span>PNG</span></button><button disabled={!hasOutput} onClick={downloadHtml}><FileCode2 size={14}/><span>HTML</span></button></div></div>
        <div className={`ascii-frame ${background === 'dark' ? 'dark' : ''} ${colorMode ? 'is-color' : 'is-mono'}`}>{hasOutput ? <div className={`ascii-stage ${!ascii ? 'text-only' : ''}`}><pre className={`text-overlay ${textPosition} ${text3d ? 'three-d' : ''}`} style={{ color: activeTextColor, background: textBgEnabled ? activeTextBg : 'transparent', fontSize: `${textSize}px`, '--3d-highlight': text3dColor, '--3d-depth': text3dDepthColor }}>{asciiText.split('\n').map((line, row) => <span className="banner-line" key={row}>{[...line].map((char, col) => <span className={char === '#' ? 'depth' : ''} key={col}>{char}</span>)}{row < asciiText.split('\n').length - 1 && '\n'}</span>)}</pre>{ascii && <div className="ascii-art" style={{ '--cols': columns, '--glyph-size': `${fontSize}px` }}>{cells.map((cell, i) => <span key={i} style={colorMode ? { color: cell.color } : undefined}>{cell.char === ' ' ? '\u00a0' : cell.char}</span>)}</div>}</div> : <div className="empty"><Maximize2/><p>Add an image or write text<br/>to begin creating.</p></div>}</div>
        <div className="status"><span><i className={hasOutput ? 'ready' : ''}/>{hasOutput ? `${colorMode ? 'COLOR' : 'MONO'} RENDER COMPLETE` : 'AWAITING CONTENT'}</span><button disabled={!hasOutput} onClick={downloadText}>PLAIN .TXT ↓</button></div>
      </div></div></section>

    <section className="method" id="method"><div className="section-title"><span>02</span><h2>HOW IT SEES</h2><p>Your photo never leaves this browser.</p></div><div className="steps"><article><b>01</b><div className="step-icon">▣</div><h3>Sample</h3><p>The image is resized into a precise character grid while preserving portrait proportions.</p></article><article><b>02</b><div className="step-icon">◒</div><h3>Read the light</h3><p>Every pixel is read for luminance and color, then shaped with your tuning controls.</p></article><article><b>03</b><div className="step-icon">@</div><h3>Retype</h3><p>Each tone becomes a glyph. In color mode, every glyph carries its source pixel’s hue.</p></article></div></section>
    <footer><div className="brand"><span>G</span> GLYPHEEEEEE</div><p>Every face has a type.</p><small>PRIVATE BY DESIGN · BUILT FOR EVERY SCREEN</small></footer>
  </main>;
}
export default App;
