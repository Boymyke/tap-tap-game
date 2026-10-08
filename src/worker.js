import { authPage } from './ui/auth.js';
import { legalPage, LEGAL_PATHS } from './ui/legal.js';
import { landingPage, demoPools } from './ui/landing.js';
import { howToPlayPage, rulesPage, merchPage, faqPage, aboutPage, offlinePage, errorPage } from './ui/pages.js';
import { emailProblem } from './auth-rules.js';
import { handleAuthApi } from './auth-api.js';
import { json, html, uid, nowIso, esc, sessionCookie, hashPassword, currentUser, createSession, destroySession, sameOrigin, readJson, allow, clientIp } from './lib.js';

async function requireUser(req,env){const user=await currentUser(req,env);return user?{user}:{response:json({error:'Unauthorized'},401)};}
async function requireAdmin(req,env){const r=await requireUser(req,env);if(r.response)return r;if(r.user.role!=='ADMIN')return{response:json({error:'Admin only'},403)};return r;}

function nav(user){return `<header><a class="brand" href="/">NAK AM</a><nav><a href="/">Home</a><a href="/how-to-play">How to Play</a><a href="/privacy">Privacy</a><a href="/suggest">Suggest</a>${user?`<a href="/dashboard">Dashboard</a>${user.role==='ADMIN'?'<a href="/admin">Admin</a>':''}<button class="linkbtn" onclick="logout()">Logout</button>`:'<a href="/login">Login</a><a class="pill" href="/signup">Sign Up</a>'}</nav></header>`;}
function shell(title,content,user=null,script=''){return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | NAK AM</title><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f7f7f8;color:#111}a{color:inherit;text-decoration:none}header{min-height:68px;background:#fff;border-bottom:1px solid #ddd;display:flex;align-items:center;justify-content:space-between;padding:10px 5%;position:sticky;top:0;z-index:10}.brand{font-size:24px;font-weight:900;letter-spacing:-1px}nav{display:flex;align-items:center;gap:18px;font-size:14px;flex-wrap:wrap}.pill,.btn{background:#111;color:#fff;border:0;border-radius:8px;padding:11px 16px;cursor:pointer;font-weight:700;display:inline-block}.btn.secondary{background:#eee;color:#111}.linkbtn{border:0;background:none;cursor:pointer}.wrap{max-width:1120px;margin:auto;padding:48px 20px}.hero{padding:90px 0 70px;display:grid;grid-template-columns:1.3fr .7fr;gap:32px;align-items:center}.hero h1{font-size:64px;line-height:.95;margin:0 0 20px;letter-spacing:-4px}.hero p{font-size:19px;line-height:1.6;color:#555}.card{background:#fff;border:1px solid #dedede;border-radius:14px;padding:24px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.two{grid-template-columns:repeat(2,1fr)}.ad{min-height:110px;border:2px dashed #bbb;border-radius:12px;display:flex;align-items:center;justify-content:center;text-align:center;color:#666;background:#fff;margin:20px 0;padding:20px}.muted{color:#666}.section{padding:28px 0}.section h2{font-size:34px;margin:0 0 18px}.stat{font-size:34px;font-weight:900}.tap{width:240px;height:240px;border-radius:50%;border:0;background:#111;color:#fff;font-weight:900;font-size:42px;cursor:pointer;user-select:none;touch-action:manipulation}.tap:active{transform:scale(.96)}.center{text-align:center}input,textarea,select{width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;margin:6px 0 14px;font:inherit}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #eee}.badge{font-size:12px;background:#eee;border-radius:999px;padding:5px 9px}.odogwo{background:#111;color:#fff}.notice{padding:12px 14px;border-radius:8px;background:#eee;margin:12px 0}.danger{background:#ffe8e8}.success{background:#e8fff0}.actions{display:flex;gap:10px;flex-wrap:wrap}.footer{border-top:1px solid #ddd;margin-top:60px;padding:30px 5%;display:flex;justify-content:space-between;color:#666;font-size:14px}@media(max-width:800px){header{align-items:flex-start}.hero{grid-template-columns:1fr;padding-top:50px}.hero h1{font-size:48px}.grid,.two{grid-template-columns:1fr}.wrap{padding:30px 16px}.tap{width:210px;height:210px}nav{gap:10px;font-size:13px}}</style></head><body>${nav(user)}<main>${content}</main><footer class="footer"><span>Tap Am</span><span>Powered by <a href="https://www.ferrnagency.com" target="_blank" rel="noopener" style="color:#ff2600;font-weight:700">Ferrn Agency</a></span></footer><script>async function logout(){await fetch('/api/logout',{method:'POST'});location.href='/'}${script}</script></body></html>`;}
async function adSlot(env,slot){const a=await env.DB.prepare('SELECT title,image_url,target_url FROM ads WHERE slot=? AND active=1').bind(slot).first();if(!a)return'';const inner=a.image_url?`<img src="${esc(a.image_url)}" alt="${esc(a.title)}" style="max-width:100%;max-height:120px">`:`<div><strong>${esc(a.title)}</strong><br><small>Advertising space</small></div>`;return `<div class="ad">${a.target_url?`<a href="${esc(a.target_url)}" target="_blank" rel="noopener">${inner}</a>`:inner}</div>`;}

async function pageDashboard(req,env,user){if(!user)return Response.redirect(new URL('/login',req.url),302);const ps=await env.DB.prepare(`SELECT p.*,pe.taps my_taps,pe.joined_at FROM pools p LEFT JOIN pool_entries pe ON pe.pool_id=p.id AND pe.user_id=? ORDER BY p.starts_at DESC LIMIT 20`).bind(user.id).all();const cards=ps.results.map(p=>`<div class="card"><span class="badge">${esc(p.status)}</span> <span class="badge ${p.min_tier==='ODOGWO'?'odogwo':''}">${esc(p.min_tier)}</span><h3>${esc(p.name)}</h3><p class="muted">${esc(p.description)}</p><p><b>Score:</b> ${Number(p.my_taps||0).toLocaleString()}</p>${p.joined_at?`<a class="btn" href="/play?pool=${p.id}">Play</a>`:`<button class="btn" onclick="joinPool('${p.id}')">Join pool</button>`}</div>`).join('')||'<div class="card">No pools yet.</div>';return shell('Dashboard',`<div class="wrap"><h1>Welcome, ${esc(user.username)}</h1><p><span class="badge ${user.tier==='ODOGWO'?'odogwo':''}">${user.tier}</span> &nbsp; Lifetime verified taps: <b>${Number(user.lifetime_taps).toLocaleString()}</b></p><div id="msg"></div><section class="section"><h2>Pools</h2><div class="grid">${cards}</div></section></div>`,user,`async function joinPool(id){let r=await fetch('/api/pools/'+id+'/join',{method:'POST'});let j=await r.json();msg.innerHTML='<div class="notice '+(r.ok?'success':'danger')+'">'+(j.message||j.error)+'</div>';if(r.ok)setTimeout(()=>location.href='/play?pool='+id,300)}`);}
async function pagePlay(req,env,user){if(!user)return Response.redirect(new URL('/login',req.url),302);const poolId=new URL(req.url).searchParams.get('pool');if(!poolId)return Response.redirect(new URL('/dashboard',req.url),302);const p=await env.DB.prepare('SELECT p.*,pe.taps FROM pools p JOIN pool_entries pe ON pe.pool_id=p.id WHERE p.id=? AND pe.user_id=?').bind(poolId,user.id).first();if(!p)return shell('Play','<div class="wrap"><div class="notice danger">Join this pool first.</div></div>',user);const lr=await env.DB.prepare(`SELECT u.username,pe.taps FROM pool_entries pe JOIN users u ON u.id=pe.user_id WHERE pe.pool_id=? ORDER BY pe.taps DESC LIMIT 20`).bind(poolId).all();const rows=lr.results.map((r,i)=>`<tr><td>#${i+1}</td><td>${esc(r.username)}</td><td>${Number(r.taps).toLocaleString()}</td></tr>`).join('');return shell('Play',`<div class="wrap"><div class="grid two"><section class="card center"><span class="badge">${esc(p.status)}</span><h1>${esc(p.name)}</h1><div class="stat" id="score">${Number(p.taps).toLocaleString()}</div><p>verified taps</p><button id="tap" class="tap">TAP</button><p class="muted">Pending: <span id="pending">0</span></p><div id="tapmsg"></div></section><section class="card"><h2>Leaderboard</h2><table><tbody id="leader">${rows}</tbody></table></section></div>${await adSlot(env,'GAME')}</div>`,user,`let pending=0,display=${Number(p.taps)||0},sending=false,pid=${JSON.stringify(poolId)};tap.onpointerdown=()=>{pending++;display++;score.textContent=display.toLocaleString();document.getElementById('pending').textContent=pending};async function flush(){if(sending||pending===0)return;sending=true;const n=Math.min(pending,20);pending-=n;document.getElementById('pending').textContent=pending;let r=await fetch('/api/pools/'+pid+'/tap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({taps:n})});let j=await r.json();if(r.ok){display=j.taps;score.textContent=display.toLocaleString()}else{display-=n;score.textContent=display.toLocaleString();tapmsg.innerHTML='<div class="notice danger">'+(j.error||'Tap rejected')+'</div>'}sending=false}setInterval(flush,1200);setInterval(async()=>{let r=await fetch('/api/pools/'+pid+'/leaderboard');if(!r.ok)return;let j=await r.json();leader.innerHTML=j.leaderboard.map((x,i)=>'<tr><td>#'+(i+1)+'</td><td>'+x.username+'</td><td>'+Number(x.taps).toLocaleString()+'</td></tr>').join('')},2500);`);}
function setupPage(user){if(user?.role==='ADMIN')return `<script>location.href='/admin'</script>`;return shell('Admin Setup',`<div class="wrap" style="max-width:620px"><div class="card"><h1>Set up super admin</h1><form id="setup"><label>Setup key</label><input name="setupKey" required><label>Username</label><input name="username" minlength="3" maxlength="24" required><label>Email</label><input type="email" name="email" required><label>Password</label><input type="password" name="password" minlength="10" required><button class="btn">Create admin</button></form><div id="msg"></div></div></div>`,user,`setup.onsubmit=async e=>{e.preventDefault();let d=Object.fromEntries(new FormData(e.target));let r=await fetch('/api/setup-admin',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)});let j;try{j=await r.json()}catch{j={error:'Server returned an invalid response'}}msg.innerHTML='<div class="notice '+(r.ok?'success':'danger')+'">'+(j.message||j.error||'Request failed')+'</div>';if(r.ok)setTimeout(()=>location.href='/admin',300)}`);}
async function pageAdmin(req,env,user){if(!user||user.role!=='ADMIN')return Response.redirect(new URL('/admin/setup',req.url),302);const [ps,ss,us]=await Promise.all([env.DB.prepare('SELECT * FROM pools ORDER BY created_at DESC LIMIT 50').all(),env.DB.prepare('SELECT * FROM suggestions ORDER BY created_at DESC LIMIT 20').all(),env.DB.prepare('SELECT id,username,email,role,tier,lifetime_taps,created_at FROM users ORDER BY created_at DESC LIMIT 50').all()]);return shell('Admin',`<div class="wrap"><h1>Super Admin</h1><div id="msg"></div><div class="grid"><div class="card"><div class="stat">${us.results.length}</div><p>Recent users</p></div><div class="card"><div class="stat">${ps.results.length}</div><p>Pools</p></div><div class="card"><div class="stat">${ss.results.length}</div><p>Suggestions</p></div></div><section class="section"><div class="card"><h2>Create pool</h2><form id="pool"><label>Name</label><input name="name" required><label>Description</label><textarea name="description"></textarea><label>Starts</label><input type="datetime-local" name="starts_at" required><label>Ends</label><input type="datetime-local" name="ends_at" required><label>Entry fee (₦)</label><input type="number" min="0" name="entry_fee" value="0"><label>Minimum tier</label><select name="min_tier"><option>FREE</option><option>ODOGWO</option></select><label><input style="width:auto" type="checkbox" name="boosters_allowed"> Boosters allowed</label><br><br><button class="btn">Create pool</button></form></div></section><section class="section"><h2>Pools</h2><div class="grid">${ps.results.map(p=>`<div class="card"><b>${esc(p.name)}</b><p>${esc(p.status)} · ${esc(p.min_tier)}</p><small>${esc(p.starts_at)} → ${esc(p.ends_at)}</small></div>`).join('')}</div></section></div>`,user,`pool.onsubmit=async e=>{e.preventDefault();let f=new FormData(e.target),d=Object.fromEntries(f);d.boosters_allowed=f.get('boosters_allowed')==='on';let r=await fetch('/api/admin/pools',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)});let j=await r.json();msg.innerHTML='<div class="notice '+(r.ok?'success':'danger')+'">'+(j.message||j.error)+'</div>';if(r.ok)setTimeout(()=>location.reload(),400)}`);}
async function pageSuggest(env,user){return shell('Suggest',`<div class="wrap" style="max-width:700px"><div class="card"><h1>Suggest something</h1><form id="sug"><label>Name</label><input name="name" value="${user?esc(user.username):''}"><label>Email</label><input type="email" name="email" value="${user?esc(user.email):''}"><label>Suggestion</label><textarea name="message" rows="7" required></textarea><button class="btn">Send suggestion</button></form><div id="msg"></div></div></div>`,user,`sug.onsubmit=async e=>{e.preventDefault();let d=Object.fromEntries(new FormData(e.target));let r=await fetch('/api/suggestions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)});let j=await r.json();msg.innerHTML='<div class="notice '+(r.ok?'success':'danger')+'">'+(j.message||j.error)+'</div>';if(r.ok)e.target.reset()}`);}

async function handleApi(req,env,path){
  if(req.method!=='GET'&&!sameOrigin(req))return json({error:'Request blocked.'},403);
  const authResponse=await handleAuthApi(req,env,path);if(authResponse)return authResponse;
  const body=async()=>{try{return await req.json()}catch{return{}}};
  if(path==='/api/setup-admin'&&req.method==='POST'){
    const b=await body();
    if(!env.ADMIN_SETUP_KEY||b.setupKey!==env.ADMIN_SETUP_KEY)return json({error:'Invalid setup key'},403);
    const exists=await env.DB.prepare("SELECT id FROM users WHERE role='ADMIN' LIMIT 1").first();if(exists)return json({error:'Admin already exists'},409);
    const username=String(b.username||'').trim(),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
    if(!/^[A-Za-z0-9_]{3,24}$/.test(username))return json({error:'Username must be 3-24 letters, numbers or underscores'},400);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:'Valid email required'},400);
    if(password.length<10)return json({error:'Password must be at least 10 characters'},400);
    const hp=await hashPassword(password);const id=uid();
    try{
      await env.DB.prepare(`INSERT INTO users(id,username,email,password_hash,password_salt,password_iter,role,tier,email_verified_at) VALUES(?,?,?,?,?,?,'ADMIN','ODOGWO',?)`).bind(id,username,email,hp.hash,hp.salt,hp.iterations,nowIso()).run();
      await env.DB.prepare('INSERT INTO wallets(user_id,balance_kobo) VALUES(?,0)').bind(id).run();
      const sid=await createSession(id,env);
      return json({message:'Super admin created'},200,{'set-cookie':sessionCookie(sid)});
    }catch(e){console.error('setup-admin',e);await env.DB.prepare('DELETE FROM users WHERE id=?').bind(id).run().catch(()=>{});return json({error:'Could not create admin. Please retry.'},500);}
  }
  if(path==='/api/logout'&&req.method==='POST'){await destroySession(req,env);return json({message:'Logged out'},200,{'set-cookie':sessionCookie('',0)});}
  if(path==='/api/suggestions'&&req.method==='POST'){const b=await body();if(String(b.message||'').trim().length<3)return json({error:'Suggestion is too short'},400);const user=await currentUser(req,env);await env.DB.prepare('INSERT INTO suggestions(id,user_id,name,email,message) VALUES(?,?,?,?,?)').bind(uid(),user?.id||null,String(b.name||'').trim()||null,String(b.email||'').trim()||null,String(b.message).trim().slice(0,2000)).run();return json({message:'Suggestion received. Thank you.'});}
  const join=path.match(/^\/api\/pools\/([^/]+)\/join$/);if(join&&req.method==='POST'){const a=await requireUser(req,env);if(a.response)return a.response;const p=await env.DB.prepare('SELECT * FROM pools WHERE id=?').bind(join[1]).first();if(!p)return json({error:'Pool not found'},404);if(p.min_tier==='ODOGWO'&&a.user.tier!=='ODOGWO')return json({error:'This pool is for Odogwo members'},403);const c=await env.DB.prepare('SELECT COUNT(*) c FROM pool_entries WHERE pool_id=?').bind(p.id).first();if(Number(c.c)>=Number(p.max_players))return json({error:'Pool is full'},409);await env.DB.prepare('INSERT OR IGNORE INTO pool_entries(pool_id,user_id) VALUES(?,?)').bind(p.id,a.user.id).run();return json({message:'Joined pool'});}
  const tap=path.match(/^\/api\/pools\/([^/]+)\/tap$/);if(tap&&req.method==='POST'){const a=await requireUser(req,env);if(a.response)return a.response;const b=await body(),n=Math.floor(Number(b.taps));if(!Number.isFinite(n)||n<1||n>20)return json({error:'Invalid tap batch'},400);const p=await env.DB.prepare('SELECT * FROM pools WHERE id=?').bind(tap[1]).first();if(!p)return json({error:'Pool not found'},404);const now=Date.now();if(now<Date.parse(p.starts_at))return json({error:'Pool has not started'},409);if(now>Date.parse(p.ends_at))return json({error:'Pool has ended'},409);const e=await env.DB.prepare('SELECT taps,last_batch_at FROM pool_entries WHERE pool_id=? AND user_id=?').bind(p.id,a.user.id).first();if(!e)return json({error:'Join the pool first'},403);if(e.last_batch_at&&now-Date.parse(e.last_batch_at)<700&&n>12)return json({error:'Tap batch rejected by anti-cheat'},429);await env.DB.batch([env.DB.prepare('UPDATE pool_entries SET taps=taps+?,last_batch_at=? WHERE pool_id=? AND user_id=?').bind(n,nowIso(),p.id,a.user.id),env.DB.prepare('UPDATE users SET lifetime_taps=lifetime_taps+? WHERE id=?').bind(n,a.user.id)]);const fresh=await env.DB.prepare('SELECT taps FROM pool_entries WHERE pool_id=? AND user_id=?').bind(p.id,a.user.id).first();return json({taps:fresh.taps,accepted:n});}
  const lead=path.match(/^\/api\/pools\/([^/]+)\/leaderboard$/);if(lead&&req.method==='GET'){const r=await env.DB.prepare(`SELECT u.username,pe.taps FROM pool_entries pe JOIN users u ON u.id=pe.user_id WHERE pe.pool_id=? ORDER BY pe.taps DESC LIMIT 20`).bind(lead[1]).all();return json({leaderboard:r.results});}
  if(path==='/api/admin/pools'&&req.method==='POST'){const a=await requireAdmin(req,env);if(a.response)return a.response;const b=await body();if(!b.name||!b.starts_at||!b.ends_at)return json({error:'Name, start and end are required'},400);const start=new Date(b.starts_at),end=new Date(b.ends_at);if(!(start<end))return json({error:'End time must be after start time'},400);const id=uid(),status=start.getTime()>Date.now()?'SCHEDULED':end.getTime()>Date.now()?'LIVE':'COMPLETED';await env.DB.prepare(`INSERT INTO pools(id,name,description,starts_at,ends_at,entry_fee,min_tier,boosters_allowed,max_players,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(id,String(b.name).slice(0,100),String(b.description||'').slice(0,500),start.toISOString(),end.toISOString(),Math.max(0,Math.floor(Number(b.entry_fee)||0)),b.min_tier==='ODOGWO'?'ODOGWO':'FREE',b.boosters_allowed?1:0,1000,status,a.user.id).run();return json({message:'Pool created',id});}
  return json({error:'Not found'},404);
}

// ── landing data ────────────────────────────────────────────────────────────
async function siteStats(env){
  const since=new Date(Date.now()-120000).toISOString();
  const r=await env.DB.prepare('SELECT (SELECT COUNT(*) FROM visitors WHERE last_seen>?) AS online,(SELECT COUNT(*) FROM visitors) AS visits').bind(since).first();
  return {online:Math.max(1,Number(r?.online||0)),visits:Number(r?.visits||0)};
}
async function featuredPools(env,user){
  const href=user?'/dashboard':'/signup';
  const demo=(await env.DB.prepare("SELECT value FROM settings WHERE key='landing_demo_pools'").first())?.value!=='0';
  if(!demo){
    const now=nowIso();
    const r=await env.DB.prepare(`SELECT p.id,p.name,p.ends_at,p.entry_fee,p.min_tier,(SELECT COUNT(*) FROM pool_entries pe WHERE pe.pool_id=p.id) AS players
      FROM pools p WHERE p.ends_at>? ORDER BY p.starts_at ASC LIMIT 6`).bind(now).all();
    if(r.results.length) return r.results.map((p,i)=>({name:p.name,players:p.players,endsAt:p.ends_at,prize:0,color:['green','orange','gold','mustard'][i%4],href}));
  }
  return demoPools().map(p=>({...p,href}));
}

// ── extra API: presence + merch interest ────────────────────────────────────
async function handleSiteApi(req,env,path){
  if(path==='/api/presence'&&req.method==='POST'){
    const {data,response}=await readJson(req);if(response)return response;
    const vid=String(data.vid||'');
    if(!/^[0-9a-z-]{10,40}$/i.test(vid))return json({error:'Bad visitor id'},400);
    if(await allow(env,'presence:'+clientIp(req),120,3600)){
      const now=nowIso();
      await env.DB.prepare('INSERT INTO visitors(vid,first_seen,last_seen) VALUES(?,?,?) ON CONFLICT(vid) DO UPDATE SET last_seen=excluded.last_seen').bind(vid,now,now).run();
    }
    return json(await siteStats(env));
  }
  if(path==='/api/merch/notify'&&req.method==='POST'){
    const {data,response}=await readJson(req);if(response)return response;
    if(!await allow(env,'merch:'+clientIp(req),20,3600))return json({error:'Too many tries. Wait small.'},429);
    const email=String(data.email||'').trim().toLowerCase(),item=String(data.item||'');
    if(emailProblem(email))return json({error:'That email no look correct.'},400);
    if(!/^[a-z0-9-]{2,40}$/.test(item))return json({error:'Unknown item.'},400);
    await env.DB.prepare('INSERT OR IGNORE INTO merch_interest(email,item,created_at) VALUES(?,?,?)').bind(email,item,nowIso()).run();
    return json({message:'Saved'});
  }
  return null;
}

const asResponse=(x,status=200)=>x instanceof Response?x:html(x,status);

export default{async fetch(req,env){
  const requestId=uid();
  let user=null;
  try{
    const url=new URL(req.url),path=url.pathname.length>1?url.pathname.replace(/\/+$/,''):url.pathname;
    if(path.startsWith('/api/')){
      if(req.method!=='GET'&&!sameOrigin(req))return json({error:'Request blocked.'},403);
      const site=await handleSiteApi(req,env,path);if(site)return site;
      return await handleApi(req,env,path);
    }
    user=await currentUser(req,env);
    const res=await route(req,env,url,path,user);
    if(user&&user._renewCookie&&!res.headers.has('set-cookie')){const r2=new Response(res.body,res);r2.headers.append('set-cookie',user._renewCookie);return r2;}
    return res;
  }catch(e){
    console.error('fatal',requestId,e?.stack||e);
    if(new URL(req.url).pathname.startsWith('/api/'))return json({error:'Server error. Please retry.',requestId},500);
    return html(errorPage(500,{user,ref:requestId.slice(0,8)}),500);
  }
}};

async function route(req,env,url,path,user){
  if(req.method!=='GET'&&req.method!=='HEAD')return html(errorPage(400,{user}),405);
  switch(path){
    case '/':{const [stats,pools]=await Promise.all([siteStats(env),featuredPools(env,user)]);return html(landingPage({user,pools,stats}));}
    case '/login':case '/signup':if(user)return Response.redirect(new URL(user.role==='ADMIN'?'/admin':'/dashboard',req.url),302);return html(authPage(path.slice(1)));
    case '/how-to-play':return html(howToPlayPage(user));
    case '/rules':return html(rulesPage(user));
    case '/merch':return html(merchPage(user));
    case '/faq':return html(faqPage(user));
    case '/about':return html(aboutPage(user));
    case '/offline':return html(offlinePage());
    case '/policy':return Response.redirect(new URL('/rules',req.url),301);
    case '/dashboard':return asResponse(await pageDashboard(req,env,user));
    case '/play':return asResponse(await pagePlay(req,env,user));
    case '/suggest':return asResponse(await pageSuggest(env,user));
    case '/admin':return asResponse(await pageAdmin(req,env,user));
    case '/admin/setup':return asResponse(setupPage(user));
  }
  if(LEGAL_PATHS.includes(path.slice(1)))return html(legalPage(path.slice(1),user));
  return html(errorPage(404,{user}),404);
}
