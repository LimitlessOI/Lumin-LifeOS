// server.js - v14.X (MICRO-first, Command Center, True Memory Uploads, Subconscious Index, Drift Guard)
import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.text({ type: "text/plain", limit: "50mb" }));

// Static assets
app.use(express.static(path.join(__dirname, "public")));
app.use("/reports", express.static(path.join(__dirname, "reports")));
app.use("/overlay", express.static(path.join(__dirname, "public/overlay")));

// Data dirs
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const SPEND_FILE = path.join(DATA_DIR, "spend.json");
const CONVERSATIONS_DIR = path.join(DATA_DIR, "conversations");
if (!fs.existsSync(CONVERSATIONS_DIR)) fs.mkdirSync(CONVERSATIONS_DIR, { recursive: true });

// ENV
const {
  DATABASE_URL,
  COMMAND_CENTER_KEY,
  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
  GEMINI_API_KEY,
  GROK_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPO = "LimitlessOI/Lumin-LifeOS",
} = process.env;

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_DAILY_SPEND = Number(process.env.MAX_DAILY_SPEND || 50.0);

// DB
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});

// Protected files
const PROTECTED_FILES = ["server.js", "package.json", "package-lock.json", ".env", ".gitignore"];

// ---------- MICRO ----------
const MICRO_PROTOCOL = {
  encode: (data) => {
    const parts = [];
    parts.push("V:2.0");
    if (data.operation) parts.push(`OP:${data.operation.charAt(0).toUpperCase()}`);
    if (data.description) {
      const compressed = String(data.description)
        .replace(/generate/gi, "GEN").replace(/analyze/gi, "ANL")
        .replace(/create/gi, "CRT").replace(/build/gi, "BLD")
        .replace(/optimize/gi, "OPT").replace(/review/gi, "REV")
        .replace(/\s+/g, "~");
      parts.push(`D:${compressed.slice(0, 2400)}`);
    }
    if (data.type) parts.push(`T:${data.type.charAt(0).toUpperCase()}`);
    if (data.returnFields) parts.push(`R:~${data.returnFields.join("~")}`);
    return parts.join("|");
  },
  decode: (micro) => {
    const result = {}; const parts = String(micro).split("|");
    for (const part of parts) {
      const [key, value] = part.split(":"); if (!value) continue;
      switch (key) {
        case "V": result.version = value; break;
        case "OP":
          result.operation = ({G:"generate",A:"analyze",C:"create",B:"build",O:"optimize",R:"review"})[value] || value; break;
        case "D":
          result.description = value.replace(/GEN/g,"generate").replace(/ANL/g,"analyze")
                                   .replace(/CRT/g,"create").replace(/BLD/g,"build")
                                   .replace(/OPT/g,"optimize").replace(/REV/g,"review")
                                   .replace(/~/g," ");
          break;
        case "T": result.type = ({S:"script",R:"report",L:"list",C:"code",A:"analysis"})[value] || value; break;
        case "R": result.returnFields = value.split("~").filter(Boolean); break;
        case "CT": result.content = value.replace(/~/g," "); break;
        case "KP": result.keyPoints = value.split("~").filter(Boolean); break;
      }
    }
    return result;
  },
};

// ---------- AI Council (providers optional) ----------
const COUNCIL = {
  claude: { model:"claude-sonnet-4", provider:"anthropic" },
  gpt:    { model:"gpt-4o",          provider:"openai"    },
  mini:   { model:"gpt-4o-mini",     provider:"openai"    },
  gem:    { model:"gemini-2.0-flash-exp", provider:"google" },
  grok:   { model:"grok-beta",       provider:"xai"       },
};

const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
async function safeFetch(url,init={},retries=3){ let last; for(let i=0;i<=retries;i++){ try{ const r=await fetch(url,init); const txt=await r.text(); if(!r.ok) throw new Error(`HTTP ${r.status}: ${txt.slice(0,200)}`); return { ok:true, status:r.status, text:async()=>txt, json:async()=>JSON.parse(txt) }; }catch(e){ last=e; await sleep(200*Math.pow(2,i)); } } throw last; }

async function callModel(member, prompt, micro=true){
  const cfg = COUNCIL[member]; if(!cfg) throw new Error("unknown member");
  const sys = micro ? 'You are the LifeOS Architect. Speak MICRO only (V:2.0|CT:...|KP:~...). Be concrete.' : undefined;
  if (cfg.provider==="anthropic" && ANTHROPIC_API_KEY){
    const r=await safeFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:cfg.model,max_tokens:2000,system:sys,messages:[{role:"user",content:prompt}]})});
    const j=await r.json(); return j.content?.[0]?.text || "";
  }
  if (cfg.provider==="openai" && OPENAI_API_KEY){
    const messages = sys ? [{role:"system",content:sys},{role:"user",content:prompt}] : [{role:"user",content:prompt}];
    const r=await safeFetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${OPENAI_API_KEY}`},body:JSON.stringify({model:cfg.model,temperature:0.1,max_tokens:2000,messages})});
    const j=await r.json(); return j.choices?.[0]?.message?.content || "";
  }
  if (cfg.provider==="google" && GEMINI_API_KEY){
    const r=await safeFetch(`https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${GEMINI_API_KEY}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:(sys?`${sys}\n\n`:"")+prompt}]}],generationConfig:{temperature:0.1,maxOutputTokens:2000}})});
    const j=await r.json(); return j.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  if (cfg.provider==="xai" && GROK_API_KEY){
    const messages = sys ? [{role:"system",content:sys},{role:"user",content:prompt}] : [{role:"user",content:prompt}];
    const r=await safeFetch("https://api.x.ai/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${GROK_API_KEY}`},body:JSON.stringify({model:cfg.model,temperature:0.1,max_tokens:2000,messages})});
    const j=await r.json(); return j.choices?.[0]?.message?.content || "";
  }
  // no keys — return pass-through MICRO
  return "V:2.0|CT:bypassed~(missing~api~keys)|KP:~local-only";
}

// ---------- ROI / Spend ----------
function readSpend(){ try{ return JSON.parse(fs.readFileSync(SPEND_FILE,"utf8")); }catch{ return { day: dayjs().format("YYYY-MM-DD"), usd: 0 }; } }
function writeSpend(s){ try{ fs.writeFileSync(SPEND_FILE, JSON.stringify(s)); }catch{} }

// ---------- DB INIT ----------
async function initDb(){
  await pool.query(`create table if not exists shared_memory ( id serial primary key, key text unique not null, value jsonb not null, category text, created_at timestamptz default now(), updated_at timestamptz default now() )`);
  await pool.query(`create table if not exists approval_queue ( id serial primary key, action_type text not null, file_path text, content text, message text, status text default 'pending', requested_at timestamptz default now(), approved_at timestamptz, approved_by text )`);
  await pool.query(`create table if not exists conversation_archive ( id serial primary key, conversation_id text unique not null, source text not null, file_path text, summary text, tags text[], metadata jsonb, char_count int, word_count int, created_at timestamptz default now(), indexed_at timestamptz )`);
  // Subconscious — canonical context
  await pool.query(`create table if not exists subconscious ( id serial primary key, version text default 'v14.X', north_star text, drift_guards jsonb, pillars jsonb, glossary jsonb, project_map jsonb, updated_at timestamptz default now() )`);
}
initDb().then(()=>console.log("✅ DB ready")).catch(console.error);

// ---------- Auth ----------
function requireKey(req,res,next){ const k=req.query.key||req.headers["x-command-key"]; if(!COMMAND_CENTER_KEY || k!==COMMAND_CENTER_KEY) return res.status(401).json({error:"unauthorized"}); next(); }
const isProtected = (p)=> PROTECTED_FILES.some(x => (p||"").includes(x));

// ---------- GitHub helpers ----------
async function ghGet(repo, fpath){
  if(!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN missing");
  const r = await safeFetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(fpath)}`, { headers: { Authorization:`Bearer ${GITHUB_TOKEN}`, "User-Agent":"LifeOS", Accept:"application/vnd.github+json" } });
  return await r.json();
}
async function ghPut(repo, fpath, contentText, message){
  if(!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN missing");
  let sha; try{ const cur=await ghGet(repo,fpath); sha=cur.sha; }catch{}
  const body = { message: message || `chore: update ${fpath}`, content: Buffer.from(contentText,"utf8").toString("base64"), sha };
  const r = await safeFetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(fpath)}`, { method:"PUT", headers:{ Authorization:`Bearer ${GITHUB_TOKEN}`,"User-Agent":"LifeOS", Accept:"application/vnd.github+json","Content-Type":"application/json" }, body: JSON.stringify(body) });
  return await r.json();
}

// ---------- Health ----------
app.get("/health", (_req,res)=>res.send("OK"));
app.get("/healthz", async (_req,res)=>{
  try{
    const spend = readSpend();
    const r = await pool.query("select now() as now");
    res.json({ status:"healthy", database:"connected", timestamp:r.rows[0].now, version:"v14.X", daily_spend:spend.usd, max_daily_spend:MAX_DAILY_SPEND });
  }catch(e){ res.status(500).json({status:"unhealthy", error:String(e)}); }
});

// ---------- Architect (MICRO chat) ----------
app.post("/api/v1/architect/micro", requireKey, async (req,res)=>{
  try{
    const microIn = typeof req.body==="string" ? req.body : (req.body?.micro || req.body?.text || "");
    if (!microIn || !String(microIn).startsWith("V:2.0")) return res.status(400).type("text/plain").send("V:2.0|CT:missing~micro|KP:~format");
    const out = await callModel("gpt", microIn, true);
    res.type("text/plain").send(out);
  }catch(e){ res.status(500).type("text/plain").send(`V:2.0|CT:error~${String(e).slice(0,90)}|KP:~retry`); }
});

// ---------- Memory (True memory KV) ----------
app.post("/api/v1/memory/store", requireKey, async (req,res)=>{
  try{
    const { key, value, category } = req.body;
    if(!key) return res.status(400).json({ok:false,error:"key required"});
    await pool.query(`insert into shared_memory (key,value,category,updated_at) values ($1,$2,$3,now()) on conflict (key) do update set value=$2, category=$3, updated_at=now()`, [key, JSON.stringify(value), category||"general"]);
    res.json({ ok:true, key, stored:true });
  }catch(e){ res.status(500).json({ok:false,error:String(e)}); }
});
app.get("/api/v1/memory/list", requireKey, async (_req,res)=>{
  try{ const r=await pool.query('select key, category, value, updated_at from shared_memory order by updated_at desc limit 500'); res.json({ok:true,memories:r.rows}); }catch(e){ res.status(500).json({ok:false,error:String(e)}); }
});

// ---------- Conversations (archive via MICRO) ----------
app.post("/api/v1/conversations/upload", requireKey, async (req,res)=>{
  try{
    const { conversation_id, source, content, metadata } = req.body || {};
    if(!conversation_id || !source || !content) return res.status(400).json({ok:false,error:"conversation_id, source, content required"});
    const micro = MICRO_PROTOCOL.encode({ operation:"archive", description: content, type:"full", returnFields:["CT"] });
    const fname = `${conversation_id}.micro`; const fpath = path.join(CONVERSATIONS_DIR, fname);
    fs.writeFileSync(fpath, micro, "utf8");
    await pool.query(`insert into conversation_archive (conversation_id, source, file_path, summary, tags, metadata, char_count, word_count, indexed_at) values ($1,$2,$3,$4,$5,$6,$7,$8,now()) on conflict (conversation_id) do update set file_path=$3, summary=$4, tags=$5, metadata=$6, char_count=$7, word_count=$8, indexed_at=now()`, 
      [conversation_id, source, fpath, `Compressed ${source}`, [source], metadata||{}, content.length, content.split(/\s+/).length]);
    res.json({ok:true, saved:true, file: fname});
  }catch(e){ res.status(500).json({ok:false,error:String(e)}); }
});

// ---------- Uploads (files → data/uploads + optional conversation ingest) ----------
app.post("/api/v1/upload", requireKey, async (req,res)=>{
  try{
    const { filename, content, encoding="utf8", destination="data/uploads", intent="archive" } = req.body||{};
    if(!filename || !content) return res.status(400).json({ok:false,error:"filename & content required"});
    const dest = path.isAbsolute(destination) ? destination : path.join(DATA_DIR, destination);
    fs.mkdirSync(dest, { recursive: true });
    const outPath = path.join(dest, filename);
    if (encoding==="base64") fs.writeFileSync(outPath, Buffer.from(content,"base64"));
    else fs.writeFileSync(outPath, content, "utf8");
    if (/\.txt$|\.md$|\.json$|\.log$/i.test(filename) && intent==="archive"){
      const convId = `upload-${Date.now()}`; const text = encoding==="base64" ? Buffer.from(content,"base64").toString("utf8") : content;
      const micro = MICRO_PROTOCOL.encode({ operation:"archive", description:text, type:"upload", returnFields:["CT"] });
      const fpath = path.join(CONVERSATIONS_DIR, `${convId}.micro`);
      fs.writeFileSync(fpath, micro, "utf8");
      await pool.query(`insert into conversation_archive (conversation_id, source, file_path, summary, tags, metadata, char_count, word_count, indexed_at) values ($1,$2,$3,$4,$5,$6,$7,$8,now())`, [convId, "upload", fpath, `Upload ${filename}`, ["upload"], { filename, outPath }, text.length, text.split(/\s+/).length]);
    }
    res.json({ok:true, saved:true, path: outPath});
  }catch(e){ res.status(500).json({ok:false,error:String(e)}); }
});

// ---------- Subconscious — canonical project context ----------
// Build a single "North Star" + Pillars + Drift Guards from archive + memory.
app.post("/api/v1/subconscious/recompute", requireKey, async (req,res)=>{
  try{
    // Gather inputs
    const mem = await pool.query("select key, value, category from shared_memory order by updated_at desc limit 500");
    const conv = await pool.query("select conversation_id, summary, tags from conversation_archive order by created_at desc limit 500");
    const prompt = [
      "Synthesize the canonical context for the LifeOS project.",
      "Return MICRO V:2.0 with CT containing the 'North Star' paragraph and bullet lists for: Pillars, Drift Guards, and Glossary.",
      "Use project terms from memory and conversations. Be precise, no fluff."
    ].join("\n");
    const microIn = MICRO_PROTOCOL.encode({ operation:"generate", description: prompt + "\nMEM:" + JSON.stringify(mem.rows).slice(0,1600) + "\nCONV:" + JSON.stringify(conv.rows).slice(0,1600), type:"analysis", returnFields:["CT","KP"] });
    const out = await callModel("mini", microIn, true);
    const decoded = MICRO_PROTOCOL.decode(out);
    // Basic parsing into sections
    const ct = decoded.content || "";
    const chunk = (label)=>{
      const re = new RegExp(label+"[:\\-]*\\s*([\\s\\S]*?)(?=\\n\\s*\\w+[:\\-]|$)","i");
      const m = re.exec(ct); return m? m[1].trim() : "";
    };
    const payload = {
      north_star: chunk("North Star") || ct.slice(0, 600),
      pillars: chunk("Pillars").split(/\n|•|\-/).map(s=>s.trim()).filter(Boolean).slice(0,15),
      drift_guards: chunk("Drift Guards").split(/\n|•|\-/).map(s=>s.trim()).filter(Boolean).slice(0,15),
      glossary: chunk("Glossary").split(/\n/).map(s=>s.strip).filter(Boolean).slice(0,40),
      project_map: { updated: new Date().toISOString(), counts: { memories: mem.rowCount, conversations: conv.rowCount } }
    };
    await pool.query("delete from subconscious");
    await pool.query("insert into subconscious (north_star, drift_guards, pillars, glossary, project_map, updated_at) values ($1,$2,$3,$4,$5, now())",
      [payload.north_star, JSON.stringify(payload.drift_guards), JSON.stringify(payload.pillars), JSON.stringify(payload.glossary), JSON.stringify(payload.project_map)]);
    res.json({ ok:true, version:"v14.X", subconscious: payload });
  }catch(e){ res.status(500).json({ok:false,error:String(e)}); }
});
app.get("/api/v1/subconscious", requireKey, async (_req,res)=>{
  try{ const r = await pool.query("select * from subconscious order by updated_at desc limit 1"); res.json({ok:true, version:"v14.X", data:r.rows[0]||null}); }catch(e){ res.status(500).json({ok:false,error:String(e)}); }
});

// ---------- Dev commit (with protection) ----------
app.post("/api/v1/dev/commit", requireKey, async (req,res)=>{
  try{
    const { path: file_path, content, message } = req.body||{};
    if(!file_path || typeof content!=="string") return res.status(400).json({ok:false,error:"path and content required"});
    if (isProtected(file_path)) return res.status(403).json({ ok:false, error:"protected_file", file:file_path });
    const info = await ghPut(GITHUB_REPO, file_path.replace(/^\/+/,""), content, message||`chore: update ${file_path}`);
    res.json({ ok:true, committed:file_path, sha: info.content?.sha || info.commit?.sha });
  }catch(e){ res.status(500).json({ok:false,error:String(e)}); }
});

// LISTEN
app.listen(PORT, HOST, () => {
  console.log(`✅ Server v14.X on http://${HOST}:${PORT}`);
  console.log(`✅ Portal: /overlay/portal.html?key=${COMMAND_CENTER_KEY}`);
  console.log(`✅ MICRO protocol enabled`);
  console.log(`✅ Subconscious endpoints online`);
});
