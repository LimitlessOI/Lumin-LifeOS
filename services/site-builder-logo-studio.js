/**
 * SYNOPSIS: Site Builder — Logo Studio.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 *
 * Site Builder — Logo Studio.
 *
 * A self-contained, interactive logo designer the client can "play with": pick a
 * style, tweak the text/initials, colors, font, icon and layout, see a live SVG
 * preview, and download SVG or PNG. Everything is rendered client-side from
 * parametric SVG templates, so it works instantly with zero external services
 * and never fabricates anything about the business.
 *
 * `generateLogoStudioPage(info)` returns a complete standalone HTML page.
 */

const FONTS = [
  { id: 'fraunces', label: 'Fraunces (serif)', css: '"Fraunces", Georgia, serif', link: 'Fraunces:opsz,wght@9..144,400;9..144,600' },
  { id: 'playfair', label: 'Playfair (serif)', css: '"Playfair Display", Georgia, serif', link: 'Playfair+Display:wght@500;700' },
  { id: 'inter', label: 'Inter (sans)', css: '"Inter", system-ui, sans-serif', link: 'Inter:wght@400;600;800' },
  { id: 'poppins', label: 'Poppins (rounded)', css: '"Poppins", system-ui, sans-serif', link: 'Poppins:wght@500;700' },
  { id: 'space', label: 'Space Grotesk', css: '"Space Grotesk", system-ui, sans-serif', link: 'Space+Grotesk:wght@500;700' },
  { id: 'mono', label: 'Space Mono', css: '"Space Mono", monospace', link: 'Space+Mono:wght@400;700' },
];

const ICONS = {
  none: '',
  leaf: '<path d="M32 8 C16 12 10 28 12 44 C28 44 44 34 44 16 C40 22 30 26 24 30 C30 22 32 14 32 8 Z"/>',
  lotus: '<path d="M32 12 C36 22 36 30 32 40 C28 30 28 22 32 12 Z M20 20 C28 24 30 32 30 42 C20 40 16 30 20 20 Z M44 20 C48 30 44 40 34 42 C34 32 36 24 44 20 Z"/>',
  heart: '<path d="M32 44 C14 32 16 16 26 16 C30 16 32 20 32 22 C32 20 34 16 38 16 C48 16 50 32 32 44 Z"/>',
  sun: '<circle cx="32" cy="32" r="10"/><g stroke-width="3" stroke-linecap="round"><path d="M32 10v6M32 48v6M10 32h6M48 32h6M17 17l4 4M43 43l4 4M47 17l-4 4M21 43l-4 4"/></g>',
  wave: '<path d="M8 34 C16 26 24 26 32 34 C40 42 48 42 56 34" fill="none" stroke-width="4" stroke-linecap="round"/><path d="M8 24 C16 16 24 16 32 24 C40 32 48 32 56 24" fill="none" stroke-width="4" stroke-linecap="round" opacity="0.5"/>',
  spark: '<path d="M32 8 L36 28 L56 32 L36 36 L32 56 L28 36 L8 32 L28 28 Z"/>',
  mountain: '<path d="M8 48 L24 20 L34 36 L40 26 L56 48 Z"/>',
};

export const LOGO_STYLES = [
  { id: 'monogram-circle', name: 'Monogram · Circle' },
  { id: 'monogram-square', name: 'Monogram · Rounded square' },
  { id: 'icon-badge', name: 'Icon badge' },
  { id: 'wordmark', name: 'Wordmark' },
  { id: 'stacked', name: 'Icon + stacked text' },
  { id: 'inline', name: 'Icon + inline text' },
];

function initialsFrom(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'AB';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Build the standalone Logo Studio page for a business.
 */
export function generateLogoStudioPage(info = {}) {
  const name = String(info.businessName || 'Your Business').replace(/[<>]/g, '');
  const primary = info.primaryColor || '#7C3AED';
  const accent = info.accentColor || '#EC4899';
  const initials = initialsFrom(name);
  const fontLinks = FONTS.map((f) => f.link).join('&family=');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Logo Studio — ${name}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=${fontLinks}&display=swap" rel="stylesheet">
<style> body{font-family:"Inter",system-ui,sans-serif} .swatch{width:28px;height:28px;border-radius:8px;border:2px solid #fff;box-shadow:0 0 0 1px #cbd5e1;cursor:pointer} </style>
</head>
<body class="bg-slate-100 text-slate-800">
<div x-data="logoStudio()" x-init="init()" class="max-w-6xl mx-auto p-4 md:p-8">
  <header class="mb-6">
    <h1 class="text-2xl md:text-3xl font-bold">Logo Studio</h1>
    <p class="text-slate-500">Play with a logo for <span class="font-semibold" x-text="text"></span>. Pick a style, tweak it, and download it. These are starting points — make it yours.</p>
  </header>

  <div class="grid md:grid-cols-[1fr_360px] gap-6">
    <!-- Preview -->
    <div class="bg-white rounded-2xl shadow p-4">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs uppercase tracking-widest text-slate-400">Live preview</span>
        <label class="flex items-center gap-2 text-sm">
          <span>Background</span>
          <input type="color" x-model="bg" class="w-8 h-8 rounded">
        </label>
      </div>
      <div class="rounded-xl flex items-center justify-center p-10 min-h-[280px]" :style="'background:'+bg">
        <div x-ref="stage" x-html="svg()"></div>
      </div>
      <div class="grid grid-cols-6 gap-2 mt-4">
        <template x-for="s in styles" :key="s.id">
          <button @click="style=s.id" class="text-[10px] leading-tight px-1 py-2 rounded-lg border"
            :class="style===s.id ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-500'"
            x-text="s.name"></button>
        </template>
      </div>
    </div>

    <!-- Controls -->
    <div class="bg-white rounded-2xl shadow p-4 space-y-4">
      <div>
        <label class="text-xs font-semibold text-slate-500">Business name</label>
        <input x-model="text" @input="syncInitials()" class="w-full mt-1 border rounded-lg px-3 py-2">
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500">Monogram initials</label>
        <input x-model="initials" maxlength="3" class="w-full mt-1 border rounded-lg px-3 py-2 uppercase">
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500">Tagline (optional)</label>
        <input x-model="tagline" class="w-full mt-1 border rounded-lg px-3 py-2" placeholder="e.g. Holistic wellness care">
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500">Icon</label>
        <div class="grid grid-cols-4 gap-2 mt-1">
          <template x-for="(v,k) in icons" :key="k">
            <button @click="icon=k" class="border rounded-lg p-2 flex items-center justify-center"
              :class="icon===k ? 'border-slate-800' : 'border-slate-200'">
              <svg viewBox="0 0 64 64" class="w-6 h-6" :fill="primary"><g x-html="v"></g></svg>
            </button>
          </template>
        </div>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500">Font</label>
        <select x-model="font" class="w-full mt-1 border rounded-lg px-3 py-2">
          <template x-for="f in fonts" :key="f.id"><option :value="f.id" x-text="f.label"></option></template>
        </select>
      </div>
      <div class="flex gap-6">
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1">Primary</label>
          <input type="color" x-model="primary" class="w-12 h-9 rounded">
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1">Accent</label>
          <input type="color" x-model="accent" class="w-12 h-9 rounded">
        </div>
        <div class="flex-1">
          <label class="text-xs font-semibold text-slate-500 block mb-1">Palettes</label>
          <div class="flex gap-2 flex-wrap">
            <template x-for="p in palettes" :key="p[0]+p[1]">
              <button class="swatch" :style="'background:linear-gradient(135deg,'+p[0]+' 50%,'+p[1]+' 50%)'" @click="primary=p[0];accent=p[1]"></button>
            </template>
          </div>
        </div>
      </div>
      <div class="flex gap-2 pt-2">
        <button @click="downloadSvg()" class="flex-1 bg-slate-800 text-white rounded-lg py-2 text-sm font-semibold">Download SVG</button>
        <button @click="downloadPng()" class="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-semibold">Download PNG</button>
      </div>
      <p class="text-xs text-slate-400">SVG scales perfectly for print & web. PNG (1024px) is great for social profiles.</p>
    </div>
  </div>
</div>

<script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
<script>
function logoStudio(){
  return {
    text: ${JSON.stringify(name)},
    initials: ${JSON.stringify(initials)},
    tagline: ${JSON.stringify(info.tagline ? String(info.tagline).slice(0, 40) : '')},
    primary: ${JSON.stringify(primary)},
    accent: ${JSON.stringify(accent)},
    bg: '#f8fafc',
    font: 'fraunces',
    icon: 'leaf',
    style: 'monogram-circle',
    styles: ${JSON.stringify(LOGO_STYLES)},
    fonts: ${JSON.stringify(FONTS.map((f) => ({ id: f.id, label: f.label })))},
    fontCss: ${JSON.stringify(Object.fromEntries(FONTS.map((f) => [f.id, f.css])))},
    icons: ${JSON.stringify(ICONS)},
    palettes: [['#7C3AED','#EC4899'],['#0EA5E9','#22D3EE'],['#059669','#84CC16'],['#B45309','#F59E0B'],['#0F172A','#64748B'],['#DB2777','#FB7185']],
    init(){},
    syncInitials(){ /* keep manual initials but offer default when empty */ if(!this.initials){ const w=this.text.trim().split(/\\s+/).filter(Boolean); this.initials=(w.length>1?(w[0][0]+w[w.length-1][0]):(w[0]||'AB').slice(0,2)).toUpperCase(); } },
    ff(){ return this.fontCss[this.font] || 'sans-serif'; },
    iconPath(){ return this.icons[this.icon] || ''; },
    esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
    svg(){
      const p=this.primary,a=this.accent,ff=this.ff(),t=this.esc(this.text),ini=this.esc(this.initials||'AB'),tag=this.esc(this.tagline),icon=this.iconPath();
      const gid='g'+Math.abs(this.hash(p+a));
      const grad='<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+p+'"/><stop offset="1" stop-color="'+a+'"/></linearGradient></defs>';
      const W=520,H=200;
      let body='';
      const iconSvg=(cx,cy,sc,fill)=> icon? '<g transform="translate('+cx+','+cy+') scale('+sc+')" fill="'+fill+'" stroke="'+fill+'">'+icon+'</g>':'';
      // Scale the name down so a long business name always fits its available width.
      const fit=(str,maxFont,avail)=> Math.max(16, Math.min(maxFont, Math.floor(avail/(Math.max(1,String(str).length)*0.56))));
      const fs=fit(this.text,42,296), fw=fit(this.text,52,470), fst=fit(this.text,40,470), fin=fit(this.text,44,372);
      if(this.style==='monogram-circle'){
        body='<circle cx="100" cy="100" r="76" fill="url(#'+gid+')"/>'+
          '<text x="100" y="100" font-family="'+ff+'" font-size="66" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">'+ini+'</text>'+
          '<text x="210" y="'+(tag?90:106)+'" font-family="'+ff+'" font-size="'+fs+'" font-weight="700" fill="'+p+'">'+t+'</text>'+
          (tag?'<text x="212" y="122" font-family="'+ff+'" font-size="18" fill="#64748b">'+tag+'</text>':'');
      } else if(this.style==='monogram-square'){
        body='<rect x="26" y="26" width="148" height="148" rx="34" fill="url(#'+gid+')"/>'+
          '<text x="100" y="100" font-family="'+ff+'" font-size="66" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">'+ini+'</text>'+
          '<text x="210" y="'+(tag?90:106)+'" font-family="'+ff+'" font-size="'+fs+'" font-weight="700" fill="'+p+'">'+t+'</text>'+
          (tag?'<text x="212" y="122" font-family="'+ff+'" font-size="18" fill="#64748b">'+tag+'</text>':'');
      } else if(this.style==='icon-badge'){
        body='<circle cx="100" cy="100" r="76" fill="url(#'+gid+')"/>'+iconSvg(66,66,1.05,'#fff')+
          '<text x="210" y="'+(tag?90:106)+'" font-family="'+ff+'" font-size="'+fs+'" font-weight="700" fill="'+p+'">'+t+'</text>'+
          (tag?'<text x="212" y="122" font-family="'+ff+'" font-size="18" fill="#64748b">'+tag+'</text>':'');
      } else if(this.style==='wordmark'){
        body='<text x="260" y="96" font-family="'+ff+'" font-size="'+fw+'" font-weight="700" fill="url(#'+gid+')" text-anchor="middle">'+t+'</text>'+
          '<rect x="160" y="118" width="200" height="5" rx="2.5" fill="'+a+'"/>'+
          (tag?'<text x="260" y="150" font-family="'+ff+'" font-size="18" fill="#64748b" text-anchor="middle">'+tag+'</text>':'');
      } else if(this.style==='stacked'){
        body=iconSvg(216,20,1.4,p)+
          '<text x="260" y="120" font-family="'+ff+'" font-size="'+fst+'" font-weight="700" fill="'+p+'" text-anchor="middle">'+t+'</text>'+
          (tag?'<text x="260" y="150" font-family="'+ff+'" font-size="16" fill="#64748b" text-anchor="middle">'+tag+'</text>':'');
      } else { // inline
        body=iconSvg(40,64,1.15,p)+
          '<text x="130" y="'+(tag?94:108)+'" font-family="'+ff+'" font-size="'+fin+'" font-weight="700" fill="'+p+'">'+t+'</text>'+
          (tag?'<text x="132" y="126" font-family="'+ff+'" font-size="18" fill="#64748b">'+tag+'</text>':'');
      }
      return '<svg id="logoSvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+grad+body+'</svg>';
    },
    hash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; } return h; },
    downloadSvg(){
      const blob=new Blob([this.svg()],{type:'image/svg+xml'});
      const u=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=u; link.download=(this.text||'logo').replace(/\\s+/g,'-').toLowerCase()+'-logo.svg'; link.click(); URL.revokeObjectURL(u);
    },
    downloadPng(){
      const svg=this.svg(); const img=new Image(); const scale=2;
      const blob=new Blob([svg],{type:'image/svg+xml'}); const u=URL.createObjectURL(blob);
      img.onload=()=>{ const c=document.createElement('canvas'); c.width=520*scale; c.height=200*scale; const ctx=c.getContext('2d'); ctx.fillStyle=this.bg; ctx.fillRect(0,0,c.width,c.height); ctx.drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(u); const link=document.createElement('a'); link.href=c.toDataURL('image/png'); link.download=(this.text||'logo').replace(/\\s+/g,'-').toLowerCase()+'-logo.png'; link.click(); };
      img.src=u;
    },
  };
}
</script>
</body>
</html>`;
}
