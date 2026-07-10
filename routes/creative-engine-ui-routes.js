// SYNOPSIS: Creative Engine SSR UI — upload + footage edit / photo polish controls
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
  <title>${escapeHtml(title)} | Creative Engine</title>
  <style>
    body{font-family:Manrope,system-ui,sans-serif;margin:0;padding:24px;background:#0a0a0f;color:#e8e8f0}
    .wrap{max-width:720px;margin:0 auto;background:#14141c;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px}
    .brand{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7c3aed;font-weight:700}
    h1{margin:8px 0 12px;font-family:Space Grotesk,sans-serif}
    p,label{color:#9999bb}
    input,select,textarea,button{width:100%;box-sizing:border-box;margin:6px 0 14px;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#0d0d15;color:#e8e8f0}
    button{background:#7c3aed;border:none;cursor:pointer;font-weight:600}
    .msg{padding:10px;border-radius:8px;display:none;margin-bottom:12px}
    .msg.ok{display:block;background:rgba(16,185,129,.15);color:#6ee7b7}
    .msg.err{display:block;background:rgba(239,68,68,.15);color:#fca5a5}
    a{color:#a78bfa}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">Creative Engine</div>
    ${body}
  </div>
  <script>
    function authHeaders(){
      const h={'Content-Type':'application/json'};
      const token=localStorage.getItem('lifeos_access_token')||'';
      const key=localStorage.getItem('command_key')||localStorage.getItem('lifeos_command_key')||localStorage.getItem('COMMAND_CENTER_KEY')||'';
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
      <p>Shared render infrastructure — video edit, photo polish, script compose.</p>
      <p><a href="/creative/studio">Open Studio</a> · <a href="/marketing">SocialMediaOS</a> · <a href="/overlay/lifeos-app.html">LifeOS</a></p>
    `));
  });

  app.get('/creative/studio', (_req, res) => {
    const body = `
      <h1>Studio</h1>
      <p>Upload a file (base64 from file picker), then run a mode.</p>
      <div id="msg" class="msg"></div>
      <label>Mode</label>
      <select id="mode">
        <option value="footage_edit">Footage edit (trim + captions + 9:16)</option>
        <option value="photo_polish">Photo polish</option>
        <option value="script_compose">Script compose (Replicate gated)</option>
        <option value="generative_broll">Generative b-roll (scaffold)</option>
      </select>
      <label>File</label>
      <input type="file" id="file" />
      <label>Start sec (video)</label>
      <input type="number" id="startSec" value="0" step="0.1" />
      <label>End sec (video)</label>
      <input type="number" id="endSec" value="8" step="0.1" />
      <label>Caption text</label>
      <input type="text" id="captionText" placeholder="Optional on-screen caption" />
      <label>Script (script_compose only)</label>
      <textarea id="script" rows="4" placeholder="Scene script for Flux + FFmpeg compose"></textarea>
      <button id="runBtn" type="button">Estimate + Render</button>
      <pre id="out" style="white-space:pre-wrap;font-size:12px;color:#9999bb"></pre>
    `;
    const script = `
      const msg=document.getElementById('msg');
      const out=document.getElementById('out');
      function show(text, ok){ msg.textContent=text; msg.className='msg '+(ok?'ok':'err'); }
      document.getElementById('runBtn').onclick=async()=>{
        try{
          msg.className='msg'; out.textContent='Working…';
          const mode=document.getElementById('mode').value;
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
          const ren=await fetch('/api/v1/creative/render',{method:'POST',headers:authHeaders(),body:JSON.stringify({owner_id:ownerId(),mode,request,sync:true})});
          const rj=await ren.json();
          out.textContent=JSON.stringify({estimate:ej,render:rj},null,2);
          const url=rj?.processed?.result?.publicUrl||rj?.job?.result_json?.publicUrl;
          if(url) show('Done — '+url,true); else if(rj.ok===false||rj.processed?.ok===false) show(rj.error||rj.processed?.error||'failed',false); else show('Job '+ (rj.job?.status||'queued'), true);
        }catch(e){ show(e.message,false); out.textContent=String(e); }
      };
    `;
    res.send(renderPage('Studio', body, script));
  });

  logger?.info?.('Creative Engine UI routes registered at /creative');
}

export default registerCreativeEngineUiRoutes;
