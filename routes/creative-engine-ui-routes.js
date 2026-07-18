// SYNOPSIS: Creative Engine SSR UI — Studio with graphic_design (Ideogram/Flux) + 2026 calm design
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

function escapeHtml(unsafe) {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderPage(title, body, script = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | Creative Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --ink:#132229; --muted:#5b6f76; --deep:#0a3d40; --teal:#14716c;
      --paper:#f3f7f7; --line:rgba(10,61,64,.12); --ok:#1f6b45; --bad:#8a3b2a;
      --serif:"Fraunces",Georgia,serif; --sans:"Manrope",system-ui,sans-serif;
    }
    *{box-sizing:border-box}
    body{
      margin:0;min-height:100vh;font-family:var(--sans);color:var(--ink);
      background:
        radial-gradient(ellipse 80% 50% at 100% -10%,rgba(126,196,188,.28),transparent 55%),
        linear-gradient(180deg,#e8f2f1 0%,var(--paper) 45%,#e2eceb 100%);
      line-height:1.55;-webkit-font-smoothing:antialiased;
    }
    .shell{width:min(760px,calc(100vw - 2rem));margin:0 auto;padding:1.4rem 0 3rem}
    .top{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;margin-bottom:1.2rem}
    .brand{font-family:var(--serif);font-size:1.45rem;font-weight:700;color:var(--deep);letter-spacing:-.02em}
    .brand span{color:var(--teal);font-weight:500}
    .quiet{font-size:.85rem;color:var(--muted)}
    .panel{
      background:rgba(255,255,255,.78);border:1px solid var(--line);border-radius:22px;
      padding:1.35rem 1.45rem;box-shadow:0 24px 60px rgba(10,40,48,.08);
    }
    h1{margin:0 0 .45rem;font-family:var(--serif);font-size:clamp(1.7rem,3vw,2.15rem);color:var(--deep);letter-spacing:-.03em}
    .lead{margin:0 0 1.1rem;color:var(--muted)}
    label{display:grid;gap:.3rem;font-size:.82rem;font-weight:600;color:var(--muted);margin-bottom:.75rem}
    input,select,textarea,button{
      font:inherit;width:100%;padding:.75rem .85rem;border-radius:12px;
      border:1px solid var(--line);background:#fbfeff;color:var(--ink);
    }
    button{
      appearance:none;border:0;cursor:pointer;font-weight:700;margin-top:.35rem;
      background:var(--deep);color:#fff;border-radius:999px;padding:.9rem 1.2rem;
    }
    button:disabled{opacity:.55;cursor:wait}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
    .msg{display:none;padding:.8rem 1rem;border-radius:14px;margin:0 0 1rem;font-size:.92rem}
    .msg.ok{display:block;background:rgba(31,107,69,.1);border:1px solid rgba(31,107,69,.22);color:var(--ok)}
    .msg.err{display:block;background:rgba(138,59,42,.08);border:1px solid rgba(138,59,42,.22);color:var(--bad)}
    .preview{margin-top:1rem;display:none}
    .preview img{width:100%;border-radius:16px;border:1px solid var(--line);display:block}
    pre{white-space:pre-wrap;font-size:.75rem;color:var(--muted);max-height:180px;overflow:auto;margin-top:.75rem}
    a{color:var(--teal);font-weight:600;text-decoration:none}
    .links{margin-top:1rem;font-size:.9rem;color:var(--muted)}
    .gd-only{display:none}
    body.mode-gd .gd-only{display:grid}
    body.mode-gd .legacy-only{display:none}
    @media (max-width:720px){.row{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="shell">
    <header class="top">
      <div class="brand">Creative <span>Studio</span></div>
      <div class="quiet">2026 · purposeful tools · no purple chrome</div>
    </header>
    <div class="panel">
      ${body}
    </div>
    <p class="links"><a href="/creative">Creative home</a> · <a href="/marketing">SocialMediaOS</a> · <a href="/site-builder">Site Builder</a> · <a href="/birthbill/for-you">BirthBill</a></p>
  </div>
  <script>
    function authHeaders(){
      const h={'Content-Type':'application/json'};
      const token=localStorage.getItem('lifeos_access_token')||'';
      const key=localStorage.getItem('COMMAND_CENTER_KEY')||localStorage.getItem('lifeos_cmd_key')||localStorage.getItem('command_key')||localStorage.getItem('lifeos_command_key')||localStorage.getItem('x_api_key')||'';
      if(token) h.Authorization='Bearer '+token;
      else if(key){h['x-command-key']=key;h['x-api-key']=key;}
      return h;
    }
    function ownerId(){
      try{
        const token=localStorage.getItem('lifeos_access_token')||'';
        if(!token) return localStorage.getItem('lifeos_user')||'adam';
        const p=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
        return p.sub||p.handle||'adam';
      }catch{return 'adam';}
    }
    ${script}
  </script>
</body>
</html>`;
}

export function registerCreativeEngineUiRoutes(app, deps = {}) {
  const { logger } = deps;

  app.get('/creative', (_req, res) => {
    res.send(renderPage('Creative Engine', `
      <h1>Creative Engine</h1>
      <p class="lead">Shared media infra — graphic design (Ideogram / Flux), video edit, photo polish, script compose.</p>
      <p><a href="/creative/studio">Open Studio</a></p>
    `));
  });

  app.get('/creative/studio', (_req, res) => {
    const body = `
      <h1>Studio</h1>
      <p class="lead">Generate stills for Site Builder / SocialMediaOS, or edit footage. Graphic design uses Replicate (needs tip credit).</p>
      <div id="msg" class="msg"></div>
      <label>Mode
        <select id="mode">
          <option value="graphic_design" selected>Graphic design — Ideogram / Flux / Recraft</option>
          <option value="footage_edit">Footage edit (trim + captions + 9:16)</option>
          <option value="photo_polish">Photo polish</option>
          <option value="script_compose">Script compose</option>
          <option value="generative_broll">Generative b-roll (scaffold)</option>
        </select>
      </label>
      <div class="gd-only">
        <label>Prompt
          <textarea id="gdPrompt" rows="3" placeholder="16:9 hero still for a midwifery practice — soft teal light, no text, editorial"></textarea>
        </label>
        <div class="row">
          <label>Asset type
            <select id="assetType">
              <option value="thumbnail">YouTube thumbnail (Ideogram)</option>
              <option value="photo">Photo / hero (Flux)</option>
              <option value="vector">Vector / logo mark (Recraft)</option>
            </select>
          </label>
          <label>Aspect
            <select id="aspectRatio">
              <option value="16:9">16:9</option>
              <option value="1:1">1:1</option>
              <option value="9:16">9:16</option>
              <option value="4:3">4:3</option>
            </select>
          </label>
        </div>
      </div>
      <div class="legacy-only">
        <label>File
          <input type="file" id="file" />
        </label>
        <div class="row">
          <label>Start sec
            <input type="number" id="startSec" value="0" step="0.1" />
          </label>
          <label>End sec
            <input type="number" id="endSec" value="8" step="0.1" />
          </label>
        </div>
        <label>Caption text
          <input type="text" id="captionText" placeholder="Optional on-screen caption" />
        </label>
        <label>Script (script_compose)
          <textarea id="script" rows="3" placeholder="Scene script"></textarea>
        </label>
      </div>
      <button id="runBtn" type="button">Estimate + Render</button>
      <div class="preview" id="preview"><img id="previewImg" alt="Generated preview" /></div>
      <pre id="out"></pre>
    `;
    const script = `
      const msg=document.getElementById('msg');
      const out=document.getElementById('out');
      const modeEl=document.getElementById('mode');
      const preview=document.getElementById('preview');
      const previewImg=document.getElementById('previewImg');
      function show(text, ok){ msg.textContent=text; msg.className='msg '+(ok?'ok':'err'); }
      function syncMode(){
        document.body.classList.toggle('mode-gd', modeEl.value==='graphic_design');
      }
      modeEl.addEventListener('change', syncMode);
      syncMode();
      document.getElementById('runBtn').onclick=async()=>{
        const btn=document.getElementById('runBtn');
        try{
          btn.disabled=true; msg.className='msg'; out.textContent='Working…'; preview.style.display='none';
          const mode=modeEl.value;
          if(mode==='graphic_design'){
            const prompt=document.getElementById('gdPrompt').value.trim();
            if(!prompt) throw new Error('Prompt required for graphic design');
            const body={
              owner_id:ownerId(),
              prompt,
              assetType:document.getElementById('assetType').value,
              aspectRatio:document.getElementById('aspectRatio').value,
            };
            const est=await fetch('/api/v1/creative/graphic-design/estimate',{method:'POST',headers:authHeaders(),body:JSON.stringify(body)});
            const ej=await est.json();
            const ren=await fetch('/api/v1/creative/graphic-design/render',{method:'POST',headers:authHeaders(),body:JSON.stringify(body)});
            const rj=await ren.json();
            out.textContent=JSON.stringify({estimate:ej,render:rj},null,2);
            if(rj.gated || String(rj.error||'').includes('402') || String(rj.error||'').includes('Insufficient credit')){
              throw new Error('Replicate credit required on tip — add billing at replicate.com, then retry.');
            }
            if(!ren.ok || rj.ok===false) throw new Error(rj.error||'graphic_design failed');
            const url=rj.publicUrl||rj.public_url;
            if(url){ previewImg.src=url; preview.style.display='block'; show('Generated — '+url,true); }
            else show('Render returned ok without publicUrl', false);
            return;
          }
          const file=document.getElementById('file').files[0];
          let assetKey=null;
          if(file && mode!=='script_compose' && mode!=='generative_broll'){
            const dataUrl=await new Promise((resolve,reject)=>{
              const r=new FileReader();
              r.onload=()=>resolve(r.result);
              r.onerror=()=>reject(new Error('file_read_failed'));
              r.readAsDataURL(file);
            });
            const b64=String(dataUrl).split(',')[1]||'';
            const up=await fetch('/api/v1/creative/assets',{method:'POST',headers:authHeaders(),body:JSON.stringify({owner_id:ownerId(),filename:file.name,content_base64:b64,kind: mode==='photo_polish'?'photo':'upload'})});
            const uj=await up.json();
            if(!up.ok) throw new Error(uj.error||'upload failed');
            assetKey=uj.key;
          }
          const request={
            owner_id:ownerId(),
            assetKey,
            startSec:Number(document.getElementById('startSec').value||0),
            endSec:Number(document.getElementById('endSec').value||8),
            captionText:document.getElementById('captionText').value||'',
            aspect:'9:16',
            script:document.getElementById('script').value||'',
            brandOverlayText:'SocialMediaOS'
          };
          const est=await fetch('/api/v1/creative/estimate',{method:'POST',headers:authHeaders(),body:JSON.stringify({mode,...request})});
          const ej=await est.json();
          const ren=await fetch('/api/v1/creative/render',{method:'POST',headers:authHeaders(),body:JSON.stringify({owner_id:ownerId(),mode,request,sync: mode==='photo_polish'})});
          const rj=await ren.json();
          out.textContent=JSON.stringify({estimate:ej,render:rj},null,2);
          let url=rj?.processed?.result?.publicUrl||rj?.job?.result_json?.publicUrl;
          if(!url && rj.job?.id && rj.job?.status!=='completed'){
            for(let i=0;i<40;i++){
              await new Promise(r=>setTimeout(r,1500));
              const jr=await fetch('/api/v1/creative/jobs/'+rj.job.id,{headers:authHeaders()});
              const jj=await jr.json();
              if(jj.job?.status==='completed'){ url=jj.job.result_json?.publicUrl; rj.polled=jj.job; break; }
              if(jj.job?.status==='failed'){ throw new Error(jj.job.error||'render failed'); }
            }
          }
          if(url) show('Done — '+url,true); else if(rj.ok===false||rj.processed?.ok===false) show(rj.error||rj.processed?.error||'failed',false); else show('Job '+ (rj.job?.status||'queued'), true);
        }catch(e){ show(e.message,false); out.textContent=String(e); }
        finally{ btn.disabled=false; }
      };
    `;
    res.send(renderPage('Studio', body, script));
  });

  logger?.info?.('Creative Engine UI routes registered at /creative');
}

export default registerCreativeEngineUiRoutes;
