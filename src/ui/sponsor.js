// Sponsor pages: home (profile + numbers), pools, ads. Also the shared ad form used by the admin.
import { appPage, esc, naira, lagos, poolCard, field, select, choice, form, postBtn, upload, stateBadge } from './kit.js';

const AD_CSS = `.adrow{display:grid;grid-template-columns:96px 1fr;gap:12px;align-items:start}
.adthumb{width:96px;height:72px;border-radius:10px;object-fit:cover;background:#000;display:grid;place-items:center;color:#fff;font:800 14px var(--display)}
@media (min-width:700px){.adrow{grid-template-columns:140px 1fr}.adthumb{width:140px;height:96px}}
.kind-fields [data-for]{display:none}.kind-fields[data-kind="IMAGE"] [data-for="IMAGE"],.kind-fields[data-kind="YOUTUBE"] [data-for="YOUTUBE"]{display:grid}`;
const AD_JS = `document.querySelectorAll('.kind-fields').forEach(function(w){function s(){var c=w.querySelector('input[name=kind]:checked');w.setAttribute('data-kind',c?c.value:'IMAGE');}w.addEventListener('change',s);s();});`;

export function adForm(pools) {
  return form('/api/promos', `
  ${field({ label: 'Ad title', name: 'title', placeholder: 'Chop Life Drinks — cold one dey', attrs: 'maxlength="60" required' })}
  <div class="kind-fields" data-kind="IMAGE" style="display:grid;gap:14px">
    ${choice({ label: 'Ad type', name: 'kind', options: [['IMAGE', 'Picture'], ['YOUTUBE', 'YouTube video']], value: 'IMAGE' })}
    <div data-for="IMAGE">${upload({ label: 'Ad picture (PNG, JPG, WebP or GIF, max 3 MB)', name: 'image_url' })}</div>
    <div data-for="YOUTUBE">${field({ label: 'YouTube link', name: 'video_url', type: 'url', placeholder: 'https://youtu.be/…', attrs: 'inputmode="url"' })}</div>
  </div>
  ${field({ label: 'Link when people tap the ad (optional)', name: 'target_url', type: 'url', placeholder: 'https://yourbrand.com', attrs: 'inputmode="url"' })}
  <div class="two">${select({ label: 'Show it', name: 'placement', options: [['ALL', 'Everywhere'], ['PRE', 'Before games'], ['LOBBY', 'In the lobby'], ['POST', 'After games']], value: 'ALL' })}
  ${select({ label: 'Only in this pool (optional)', name: 'pool_id', options: [['', 'All pools'], ...pools.map(p => [p.id, p.name])] })}</div>
  <p class="small muted" style="margin:0">Players can always close ads. Sponsor ads go live after a quick Tap Am check.</p>`, { submit: 'Save ad', shine: true });
}

export function adList(ads, { admin = false } = {}) {
  if (!ads.length) return '<div class="empty">No ads yet.</div>';
  return `<div class="list">${ads.map(a => `<div class="item adrow">
    ${a.kind === 'YOUTUBE' ? `<img class="adthumb" src="https://i.ytimg.com/vi/${esc(a.video_id)}/mqdefault.jpg" alt="" loading="lazy">` : `<img class="adthumb" src="${esc(a.image_url || '')}" alt="" loading="lazy">`}
    <div style="min-width:0"><div class="row wrap"><div class="t" style="font-size:18px">${esc(a.title)}</div><span class="row" style="gap:6px">${a.approved ? (a.active ? '<span class="badge live">Live</span>' : '<span class="badge">Paused</span>') : '<span class="badge soon">Waiting approval</span>'}</span></div>
      <div class="s">${{ ALL: 'Everywhere', PRE: 'Before games', LOBBY: 'Lobby', POST: 'After games' }[a.placement] || a.placement}${a.pool_name ? ' · ' + esc(a.pool_name) : ''}${admin && a.owner ? ' · by ' + esc(a.owner) : ''} · ${Number(a.views).toLocaleString('en-NG')} views · ${Number(a.clicks).toLocaleString('en-NG')} clicks</div>
      <div class="actions" style="margin-top:8px">${admin ? (a.approved ? postBtn(`/api/admin/promos/${a.id}/hide`, 'Unapprove') : postBtn(`/api/admin/promos/${a.id}/approve`, 'Approve', { cls: 'btn--sm' })) : ''}
        ${postBtn(`/api/promos/${a.id}/toggle`, a.active ? 'Pause' : 'Resume')}${postBtn(admin ? `/api/admin/promos/${a.id}/delete` : `/api/promos/${a.id}/delete`, 'Delete', { confirm: `Delete the ad “${a.title}”?`, cls: 'btn--danger btn--sm' })}</div></div></div>`).join('')}</div>`;
}

export function sponsorHome(ctx) {
  const { user, profile, wallet, unread, stats, pools } = ctx;
  const body = `<h1 class="h1">${esc(profile?.company || user.username)}</h1><p class="sub">Sponsor dashboard. Put your brand in front of players with sponsored pools and ads.</p>
<div class="grid g2 g4">
  <div class="panel stat"><span class="k">Pools</span><span class="v">${stats.pools}</span></div>
  <div class="panel stat"><span class="k">Players reached</span><span class="v">${Number(stats.players).toLocaleString('en-NG')}</span></div>
  <div class="panel stat"><span class="k">Ad views</span><span class="v">${Number(stats.views).toLocaleString('en-NG')}</span></div>
  <div class="panel stat"><span class="k">Ad clicks</span><span class="v">${Number(stats.clicks).toLocaleString('en-NG')}</span></div>
</div>
<div class="grid g2" style="margin-top:12px"><a class="tcard card tcard--orange" href="/pools/new" style="text-decoration:none"><h3>New sponsored pool</h3><p>You fund the prize, players play free.</p></a><a class="tcard card tcard--gold" href="/sponsor/ads" style="text-decoration:none"><h3>New ad</h3><p>Picture or YouTube, before and after games.</p></a></div>
<h2 class="h2">Your live pools <a href="/sponsor/pools">All</a></h2>
${pools.length ? `<div class="pgrid">${pools.map(poolCard).join('')}</div>` : '<div class="empty">No live pools. <a href="/pools/new">Create one</a>.</div>'}
<h2 class="h2">Wallet</h2><div class="panel row wrap"><div class="stat"><span class="k">For prizes</span><span class="v">${naira(wallet.balance_kobo)}</span></div><a class="btn btn--sm" href="/wallet">Add money</a></div>
<h2 class="h2">Brand profile</h2><div class="panel">${form('/api/sponsor/profile', `
  ${field({ label: 'Company or brand name', name: 'company', value: profile?.company || '', attrs: 'maxlength="60" required' })}
  ${field({ label: 'Website (optional)', name: 'website', type: 'url', value: profile?.website || '', placeholder: 'https://yourbrand.com' })}
  ${upload({ label: 'Logo (optional)', name: 'logo_url', value: profile?.logo_url || '' })}`, { submit: 'Save profile' })}</div>`;
  return appPage({ user, title: 'Sponsor', active: '/sponsor', body, wallet, unread });
}

export function sponsorPools(ctx) {
  const { user, pools, wallet, unread } = ctx;
  const body = `<h1 class="h1">Your pools</h1><p class="sub">A pool can’t be deleted until it ends. Every pool shows how many players joined.</p>
<div class="actions" style="margin:0 0 14px"><a class="btn btn--sm" href="/pools/new">+ New sponsored pool</a></div>
${pools.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pool</th><th>State</th><th>Players</th><th>Prize</th><th>Starts</th><th>Ends</th></tr></thead><tbody>
${pools.map(p => `<tr><td><a href="/pool/${esc(p.id)}">${esc(p.name)}</a>${p.private ? ' <span class="badge">Private</span>' : ''}</td><td>${stateBadge(p.state)}</td><td><b>${Number(p.players).toLocaleString('en-NG')}</b></td><td>${naira(p.prize)}</td><td>${lagos(p.startsAt)}</td><td>${lagos(p.endsAt)}</td></tr>`).join('')}
</tbody></table></div>` : '<div class="empty">No pools yet. <a href="/pools/new">Create your first sponsored pool</a>.</div>'}`;
  return appPage({ user, title: 'Your pools', active: '/sponsor/pools', body, wallet, unread });
}

export function sponsorAds(ctx) {
  const { user, ads, pools, wallet, unread } = ctx;
  const body = `<h1 class="h1">Ads</h1><p class="sub">Ads pop up before games, in the lobby and after games. Players can close them anytime.</p>
<div class="panel">${adForm(pools)}</div>
<h2 class="h2">Your ads</h2>${adList(ads)}`;
  return appPage({ user, title: 'Ads', active: '/sponsor/ads', body, wallet, unread, css: AD_CSS, script: AD_JS, narrow: true });
}

export { AD_CSS, AD_JS };
