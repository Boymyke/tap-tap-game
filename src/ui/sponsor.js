// Sponsor pages: home (profile + numbers), pools, ads (create, preview, home-slot request), leads.
// The ad form and list are shared with the super admin.
import { appPage, esc, naira, nairaShort, short, lagos, poolCard, field, select, choice, form, postBtn, upload, stateBadge, pager } from './kit.js';
import { ICONS } from './theme.js';

export const AD_CSS = `.adrow{display:grid;grid-template-columns:96px 1fr;gap:12px;align-items:start}
.adthumb{width:96px;height:72px;border-radius:var(--r-in);object-fit:cover;background:var(--cloud);display:grid;place-items:center;color:var(--ink);font:800 13px var(--display)}
@media (min-width:700px){.adrow{grid-template-columns:140px 1fr}.adthumb{width:140px;height:96px}}
.adrow .actions{margin-top:8px}
.how{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.how li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.45}
.how b.n{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--ink);color:var(--green);font:900 13px var(--display)}
.guide{margin:0;padding-left:20px;display:grid;gap:6px;font-size:14.5px;line-height:1.45}
.rejbox{margin-top:8px;padding:10px 12px;border-radius:var(--r-in);background:#FFE8EB;color:#A3122A;font:700 13.5px/1.4 var(--body)}
.rejform{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start;margin-top:8px}
.rejform .ta-field{flex:1;min-width:200px;margin:0}
.rejform .btn{flex:none}`;
// What sponsors must follow. Shown on the ads page and checked by Tap Am before an ad goes live.
export const AD_GUIDE = [
  'Your ad must be for your own brand, product or event, and the link must go to your own site or page.',
  'No betting, gambling, loans with hidden fees, crypto schemes, adult content, weapons, drugs, alcohol to under-18s, or anything illegal in Nigeria.',
  'No fake promises: say clearly what people get. No “guaranteed money”.',
  'No hate, insults, politics or religion fights. No pictures of other people without their permission.',
  'Pictures: clear, not blurry, PNG/JPG/WebP/GIF up to 3 MB. Text must be easy to read on a phone.',
  'YouTube: your own video, safe for everyone, no loud shock at the start (it plays muted first).',
  'Pick how long players must see it: 5, 10 or 30 seconds. After that they can close it.',
  'Tap Am can reject or remove any ad. If we reject one, we tell you why so you can fix it.'
];
export const adGuide = () => `<details class="panel" style="margin-bottom:14px"><summary style="cursor:pointer;font:900 18px var(--display)">Ad guidelines (read before you post)</summary><ol class="guide" style="margin-top:10px">${AD_GUIDE.map(g => `<li>${esc(g)}</li>`).join('')}</ol></details>`;
export const AD_JS = `
document.querySelectorAll('[data-preview-ad]').forEach(function(b){b.addEventListener('click',function(){var id=b.getAttribute('data-preview-ad');b.classList.add('is-loading');
 TA.api('/api/promo?preview='+encodeURIComponent(id),undefined,'GET').then(function(j){b.classList.remove('is-loading');var p=j.promo;if(!p){TA.toast('Ad not found','err');return;}
  var media='';if(p.kind==='YOUTUBE'&&/^[A-Za-z0-9_-]{11}$/.test(p.video_id||''))media='<div style="border-radius:var(--r-sm);overflow:hidden;background:#000"><iframe src="https://www.youtube-nocookie.com/embed/'+p.video_id+'?autoplay=1&mute=1&rel=0&playsinline=1&loop=1&playlist='+p.video_id+'" style="display:block;width:100%;aspect-ratio:16/9;border:0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';
  else if(p.image_url)media='<img src="'+p.image_url.replace(/"/g,'')+'" alt="" style="display:block;width:100%;border-radius:var(--r-sm);max-height:50vh;object-fit:contain;background:#000">';
  var d=TA.dialog('<div style="display:flex;justify-content:space-between;font:800 12px var(--body);color:var(--ink-soft);text-transform:uppercase;margin-bottom:8px"><span>Preview · how players see it</span><span>Close shows after '+(p.duration_seconds||5)+'s</span></div>'+media+'<h3 style="margin:10px 0 8px"></h3>'+(p.lead_capture?'<p class="small" style="margin:0 0 8px">Lead form shows here: name, email, phone + consent tick.</p>':'')+'<div class="actions">'+(p.target_url?'<span class="btn btn--green btn--sm">Check am out</span>':'')+'<button type="button" class="btn btn--soft btn--sm" data-close>Close preview</button></div>',function(e,close){if(e&&e.target.closest('[data-close]'))close();});
  d.querySelector('h3').textContent=p.title;});});});`;

export function adForm(pools) {
  return form('/api/promos', `
  ${field({ label: 'Ad title', name: 'title', placeholder: 'Chop Life Drinks — cold one dey', attrs: 'maxlength="60" required' })}
  ${choice({ label: 'Ad type', name: 'kind', options: [['IMAGE', 'Picture'], ['YOUTUBE', 'YouTube video']], value: 'YOUTUBE' })}
  <div data-show="kind=IMAGE">${upload({ label: 'Ad picture (PNG, JPG, WebP or GIF, max 3 MB)', name: 'image_url' })}</div>
  <div data-show="kind=YOUTUBE">${field({ label: 'YouTube link', name: 'video_url', type: 'url', placeholder: 'https://youtu.be/…', attrs: 'inputmode="url"' })}</div>
  ${field({ label: 'Link when people tap the ad (optional)', name: 'target_url', type: 'url', placeholder: 'https://yourbrand.com', attrs: 'inputmode="url"' })}
  ${choice({ label: 'How long players see it before they can close it', name: 'duration_seconds', options: [['5', '5 seconds'], ['10', '10 seconds'], ['30', '30 seconds']], value: '5' })}
  ${pools.length ? select({ label: 'Only in one of your pools (optional)', name: 'pool_id', options: [['', 'Any pool'], ...pools.map(p => [p.id, p.name])] }) : ''}
  <p class="small muted" style="margin:0">Your ad pops up when players open a game, while they wait in the lobby and when the game ends (before results). YouTube videos start playing by themselves (muted). Ads go live after a quick Tap Am check against the guidelines.</p>`, { submit: 'Save ad', shine: true });
}

export function adList(ads, { admin = false, slides = {} } = {}) {
  if (!ads.length) return '<div class="empty">No ads yet.</div>';
  return `<div class="list">${ads.map(a => `<div class="item adrow">
    ${a.kind === 'YOUTUBE' ? `<img class="adthumb" src="https://i.ytimg.com/vi/${esc(a.video_id)}/mqdefault.jpg" alt="" loading="lazy">` : a.image_url ? `<img class="adthumb" src="${esc(a.image_url)}" alt="" loading="lazy">` : '<span class="adthumb">AD</span>'}
    <div style="min-width:0"><div class="row wrap"><div class="t" style="font-size:17px">${esc(a.title)}</div><span class="row" style="gap:6px">${a.approved ? (a.active ? '<span class="badge live">Live</span>' : '<span class="badge">Paused</span>') : a.reject_reason ? '<span class="badge red">Rejected</span>' : '<span class="badge soon">Waiting approval</span>'}${slides[a.id] ? `<span class="badge ${slides[a.id] === 'LIVE' ? 'nepo' : ''}">Home: ${esc(slides[a.id].toLowerCase())}</span>` : ''}</span></div>
      <div class="s">${a.pool_name ? 'Only in ' + esc(a.pool_name) + ' · ' : ''}${admin && a.owner ? 'by ' + esc(a.owner) + ' · ' : ''}${Number(a.duration_seconds) || 5}s · ${short(a.views)} view${a.views == 1 ? '' : 's'} · ${short(a.clicks)} click${a.clicks == 1 ? '' : 's'}${a.leads ? ` · ${a.leads} lead${a.leads == 1 ? '' : 's'}` : ''}</div>
      ${a.reject_reason && !a.approved ? `<div class="rejbox">Not approved: ${esc(a.reject_reason)}${admin ? '' : ' Fix it and post a new ad.'}</div>` : ''}
      <div class="actions"><button type="button" class="btn btn--soft btn--sm" data-preview-ad="${esc(a.id)}">Preview</button>${admin ? (a.approved ? postBtn(`/api/admin/promos/${a.id}/hide`, 'Unapprove') : postBtn(`/api/admin/promos/${a.id}/approve`, 'Approve', { cls: 'btn--green btn--sm' })) : ''}
        ${!admin && a.approved && !slides[a.id] ? postBtn(`/api/promos/${a.id}/home`, 'Ask for home page slot', { cls: 'btn--gold btn--sm', confirm: 'Ask Tap Am to show this ad in the home page slideshow?' }) : ''}
        ${postBtn(`/api/promos/${a.id}/toggle`, a.active ? 'Pause' : 'Resume')}${postBtn(admin ? `/api/admin/promos/${a.id}/delete` : `/api/promos/${a.id}/delete`, 'Delete', { confirm: `Delete the ad “${a.title}”?`, cls: 'btn--danger btn--sm' })}</div>
      ${admin && !a.approved && !a.reject_reason ? `<form class="rejform" data-api="/api/admin/promos/${esc(a.id)}/reject" novalidate><div class="ta-field"><input class="ta-input" name="reason" maxlength="200" placeholder="Reason for the sponsor (required to reject)" aria-label="Reason for rejecting"><p class="ta-error" data-err="reason"></p></div><button class="btn btn--danger btn--sm" type="submit">Reject</button></form>` : ''}</div></div>`).join('')}</div>`;
}

export function sponsorHome(ctx) {
  const { user, profile, wallet, stats, pools, flash } = ctx;
  const body = `<h1 class="h1">${esc(profile?.company || user.username)}</h1><p class="sub">Sponsor dashboard. Put your brand in front of players with sponsored pools and ads.</p>
${flash ? `<div class="panel" style="margin-bottom:12px;box-shadow:0 0 0 3px var(--green)">${esc(flash)}</div>` : ''}
<div class="grid g2 g4">
  <div class="tcard card c-orange"><div class="stat"><span class="k">Pools</span><span class="v">${short(stats.pools)}</span></div></div>
  <div class="tcard card c-sky"><div class="stat"><span class="k">Players reached</span><span class="v">${short(stats.players)}</span></div></div>
  <div class="tcard card c-pink"><div class="stat"><span class="k">Ad views</span><span class="v">${short(stats.views)}</span></div></div>
  <div class="tcard card c-teal"><div class="stat"><span class="k">Ad clicks · leads</span><span class="v">${short(stats.clicks)} · ${short(stats.leads)}</span></div></div>
</div>
<div class="grid g2" style="margin-top:12px"><a class="btn btn--green btn--block" href="/pools/new">+ New sponsored pool</a><a class="btn btn--white btn--block" href="/sponsor/ads">+ New ad</a><a class="btn btn--white btn--block" href="/invite">Invite people</a></div>
<h2 class="h2">Your live pools <a href="/sponsor/pools">All</a></h2>
${pools.length ? `<div class="pgrid">${pools.map(poolCard).join('')}</div>` : '<div class="empty">No live pools. <a href="/pools/new">Create one</a>.</div>'}
<h2 class="h2">Wallet</h2><div class="panel row wrap"><div class="stat"><span class="k">For prizes</span><span class="v">${esc(naira(wallet.balance_kobo))}</span></div><a class="btn btn--green btn--sm" href="/wallet">Add money</a></div>
<h2 class="h2">Brand profile</h2><div class="panel">${form('/api/sponsor/profile', `
  ${field({ label: 'Company or brand name', name: 'company', value: profile?.company || '', attrs: 'maxlength="60" required' })}
  ${field({ label: 'Website (optional)', name: 'website', type: 'url', value: profile?.website || '', placeholder: 'https://yourbrand.com' })}
  ${upload({ label: 'Logo (optional)', name: 'logo_url', value: profile?.logo_url || '' })}`, { submit: 'Save profile' })}
  <p class="small muted" style="margin:10px 0 0">Lead capture on your ads is ${profile?.lead_capture ? '<b>ON</b> — players can send you their name, email and phone (only with their consent).' : 'off. Ask Tap Am to switch it on for your brand.'}</p></div>`;
  return appPage({ user, title: 'Sponsor', active: '/sponsor', body, wallet });
}

export function sponsorPools(ctx) {
  const { user, pools, wallet } = ctx;
  const body = `<div class="headrow"><h1 class="h1">Your pools</h1><a class="btn btn--green btn--sm" href="/pools/new">+ New pool</a></div><p class="sub">A pool can’t be deleted until it ends. Every pool shows how many players joined.</p>
${pools.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pool</th><th>State</th><th>Players</th><th>Prize</th><th>Ad</th><th>Starts</th><th>Ends</th></tr></thead><tbody>
${pools.map(p => `<tr><td><a href="/pool/${esc(p.id)}">${esc(p.name)}</a>${p.private ? ' <span class="badge">Private</span>' : ''}</td><td>${stateBadge(p.state)}</td><td><b>${short(p.players)}</b></td><td>${esc(naira(p.prize))}</td><td>${p.promoId ? 'With ad' : '—'}</td><td>${esc(lagos(p.startsAt))}</td><td>${esc(lagos(p.endsAt))}</td></tr>`).join('')}
</tbody></table></div>` : '<div class="empty">No pools yet. <a href="/pools/new">Create your first sponsored pool</a>.</div>'}`;
  return appPage({ user, title: 'Your pools', active: '/sponsor/pools', body, wallet });
}

export function sponsorAds(ctx) {
  const { user, ads, pools, wallet, slides, leadsOn } = ctx;
  const body = `<div class="headrow"><h1 class="h1">Ads</h1>${leadsOn ? '<a class="btn btn--white btn--sm" href="/sponsor/leads">Leads</a>' : ''}</div>
<div class="panel" style="margin-bottom:14px"><ul class="how">
  <li><b class="n">1</b><span>Make an ad: a picture or a YouTube video, with a link to your site.</span></li>
  <li><b class="n">2</b><span>Tap Am checks it against the guidelines (usually same day). If it’s rejected, you see why. Preview it any time.</span></li>
  <li><b class="n">3</b><span>It pops up when players open a game, in the lobby and before results. Pick “With ad” when you create a pool to always show it there.</span></li>
  <li><b class="n">4</b><span>Want the home page slideshow? Tap “Ask for home page slot” on an approved ad.</span></li></ul></div>
${adGuide()}
<div class="panel">${adForm(pools)}</div>
<h2 class="h2">Your ads</h2>${adList(ads, { slides })}`;
  return appPage({ user, title: 'Ads', active: '/sponsor/ads', body, wallet, css: AD_CSS, script: AD_JS, narrow: true });
}

export function sponsorLeads(ctx) {
  const { user, leads, wallet, page, hasNext, on } = ctx;
  const body = `<div class="headrow"><h1 class="h1">Leads</h1><a class="btn btn--white btn--sm" href="/sponsor/leads.csv" data-no-swap download>Download CSV</a></div>
<p class="sub">${on ? 'Players who tapped “send my details” on your ads, with their consent. Only contact them about the offer they asked for, and delete their details when they ask.' : 'Lead capture is off for your brand. Ask Tap Am to switch it on.'}</p>
${leads.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Ad</th><th>When</th></tr></thead><tbody>${leads.map(l => `<tr><td>${esc(l.name)}</td><td>${esc(l.email || '—')}</td><td>${esc(l.phone || '—')}</td><td>${esc(l.title || '')}</td><td>${esc(lagos(l.created_at))}</td></tr>`).join('')}</tbody></table></div>${pager('/sponsor/leads', page, hasNext)}` : '<div class="empty">No leads yet.</div>'}`;
  return appPage({ user, title: 'Leads', active: '/sponsor/ads', body, wallet });
}
