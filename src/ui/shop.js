// Store (boosters + tap skins), bag, wallet and the Lapo / Mapo / Nepo plans page.
import { appPage, esc, naira, nairaShort, short, lagos, lagosDate, field, moneyField, select, check, form, postBtn, upgradeAttrs, pager, icon } from './kit.js';
import { ICONS } from './theme.js';
import { padLook } from './skins.js';
import { STICKERS } from './avatar.js';
import { comparison, tierName } from '../tiers.js';

// ── Store ───────────────────────────────────────────────────────────────────
const STORE_CSS = `
.sgroup{margin:22px 0 10px}
.sgroup h2{margin:0;font:900 21px/1.1 var(--display);color:#fff;text-shadow:var(--ts)}
.sgroup p{margin:4px 0 0;color:var(--muted);font-size:14px}
.sgrid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.bcard{position:relative;display:flex;flex-direction:column;border-radius:var(--r);background:#fff;color:var(--ink);box-shadow:var(--sh);overflow:hidden}
.bcard .top{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px;background:var(--c,#2E8BFF);color:#fff;text-shadow:var(--ts)}
.bcard .mult{font:900 italic 52px/.9 var(--display);text-shadow:var(--ts-big)}
.bcard .dur{display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:999px;background:rgba(0,0,0,.3);font:800 13px var(--body);text-shadow:none}
.bcard .in{display:flex;flex-direction:column;gap:6px;padding:14px 16px 16px;flex:1}
.bcard .nm{font:900 20px/1.1 var(--display)}
.bcard .ds{font-size:14px;color:var(--ink-soft);line-height:1.4}
.bcard .chips{display:flex;flex-wrap:wrap;gap:6px}
.bcard .chips span{padding:4px 9px;border-radius:999px;background:var(--cloud);font:800 12px var(--body)}
.bcard .chips .own{background:#E3FFEF;color:#0B6B37}
.bcard .buy{margin-top:auto;display:grid;gap:10px;padding-top:6px}
.bcard .total{display:flex;justify-content:space-between;align-items:baseline;font:700 14px var(--body);color:var(--ink-soft)}
.bcard .total b{font:900 22px var(--display);color:var(--ink)}
.bcard .locked-overlay{border-radius:0}
.bcard.is-locked .top,.bcard.is-locked .in{filter:grayscale(.6);opacity:.75}
.skin-prev{position:relative;height:130px;display:grid;place-items:center;overflow:hidden;border-radius:18px;border:3px solid #fff;box-shadow:0 5px 0 rgba(0,0,0,.25)}
.skin-prev span{position:relative;font:900 italic 36px var(--display);color:#fff;text-shadow:var(--ts-big)}
.skin-prev .pad-art{position:absolute;inset:0;display:grid;place-items:center;opacity:.6}.skin-prev .pad-art svg{height:88%}
.skin-prev.glow{box-shadow:0 0 0 3px #5dff4a,0 0 26px rgba(93,255,74,.6)}
`;
const groupOf = i => (i.audience === 'NEPO' ? 'NEPO' : i.audience === 'MAPO' ? 'MAPO' : i.min_rank > 1 ? 'RANK' : 'ALL');
const GROUPS = [['ALL', 'For everybody', 'Every player fit buy these.'], ['MAPO', 'Mapo & Nepo babies', 'Paid tiers only.'], ['NEPO', 'Nepo babies only', 'The big ones. Some na one per game, some need a high rank.'], ['RANK', 'Unlock with rank', 'For everybody — climb the ranks to open these.']];

export function storePage(ctx) {
  const { user, items, tab, wallet, theme, bgCss } = ctx;
  const shown = items.filter(i => i.kind === tab);
  const bcard = i => {
    const cfg = JSON.parse(i.config || '{}'), lock = i.lock;
    const price = i.price_kobo;
    return `<article class="bcard ${lock ? 'is-locked' : ''}" style="--c:${esc(cfg.color || '#2E8BFF')}" data-item="${esc(i.id)}" data-price="${price}">
      <div class="top"><span class="mult">${esc(String(i.multiplier).replace(/\.0$/, ''))}×</span><span class="dur">⏱ ${i.duration_seconds}s</span></div>
      <div class="in"><div class="nm">${esc(i.name)}</div><div class="ds">${esc(i.description)}</div>
        <div class="chips">${i.per_game_limit ? `<span>${i.per_game_limit} per game</span>` : '<span>Use many per game</span>'}${i.owned ? `<span class="own">You have ${short(i.owned)}</span>` : ''}${i.min_rank > 1 ? `<span>Rank ${i.min_rank}+</span>` : ''}</div>
        ${lock ? '' : `<div class="buy"><div class="stepper" role="group" aria-label="How many"><button type="button" data-step="-1" aria-label="One less">−</button><input class="ta-input" type="number" inputmode="numeric" min="1" max="100" value="1" aria-label="Quantity" data-qty><button type="button" data-step="1" aria-label="One more">+</button></div>
        <div class="total"><span>${price ? esc(naira(price)) + ' each' : 'Free'}</span><b data-total>${price ? esc(naira(price)) : 'Free'}</b></div>
        <button type="button" class="btn btn--green btn--block" data-buy>${price ? 'Buy' : 'Get free'}</button></div>`}
      </div>${lock ? `<button type="button" class="locked-overlay" style="border:0;cursor:pointer" ${upgradeAttrs(lock.need || 'MAPO', i.name)}>${ICONS.lock}<span>${esc(lock.why)}</span><span class="btn btn--white btn--sm" style="margin-top:4px">${lock.need === 'RANK' ? 'See ranks' : 'Upgrade'}</span></button>` : ''}</article>`;
  };
  const scard = i => {
    const cfg = JSON.parse(i.config || '{}'), lock = i.lock, look = padLook(cfg, {});
    const btn = lock ? '' : i.equipped ? '<span class="badge live" style="align-self:flex-start">✓ In use</span>'
      : (i.owned || i.price_kobo === 0) ? postBtn('/api/equip', 'Use this skin', { body: { item: i.id }, cls: 'btn--green btn--sm' })
      : postBtn('/api/store/buy', `Buy ${naira(i.price_kobo)}`, { body: { item: i.id, qty: 1 }, cls: 'btn--green btn--sm', confirm: `Buy ${i.name} for ${naira(i.price_kobo)} from your wallet?`, ok: 'reload' });
    return `<article class="bcard ${lock ? 'is-locked' : ''}" style="padding:14px;gap:10px"><div class="skin-prev ${look.cls}" style="${look.style}">${look.art}<span>TAP</span></div>
      <div class="nm">${esc(i.name)}</div><div class="ds">${esc(i.description)}</div>${btn}
      ${lock ? `<button type="button" class="locked-overlay" style="border:0;cursor:pointer" ${upgradeAttrs(lock.need || 'NEPO', i.name)}>${ICONS.lock}<span>${esc(lock.why)}</span></button>` : ''}</article>`;
  };
  const groups = GROUPS.map(([k, title, sub]) => {
    const list = shown.filter(i => groupOf(i) === k);
    return list.length ? `<section class="sgroup"><h2>${title}</h2><p>${sub}</p></section><div class="sgrid">${list.map(tab === 'BOOSTER' ? bcard : scard).join('')}</div>` : '';
  }).join('');
  const body = `<div class="headrow"><h1 class="h1">Store</h1><a class="btn btn--white btn--sm" href="/bag">My bag</a></div>
<p class="sub">Pay from your wallet (${esc(naira(wallet.balance_kobo))}). Boosters multiply every tap for some seconds — you fit use as many as you like in a game, one after the other.</p>
<nav class="tabs">${[['BOOSTER', '⚡ Boosters'], ['SKIN', '🎨 Tap skins']].map(([k, l]) => `<a href="/store?tab=${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
${groups || '<div class="empty">Nothing here yet.</div>'}
<div class="actions"><a class="btn btn--white btn--sm" href="/wallet">Fund wallet</a><a class="btn btn--ghost btn--sm" href="/plans">Compare plans</a></div>`;
  const script = `
document.querySelectorAll('.bcard[data-item]').forEach(function(c){var q=c.querySelector('[data-qty]');if(!q)return;var price=+c.getAttribute('data-price'),tot=c.querySelector('[data-total]'),buy=c.querySelector('[data-buy]');
 function fix(){var n=Math.max(1,Math.min(100,parseInt(q.value,10)||1));return n;}
 function paint(){var n=fix();tot.textContent=price?TA.naira(price*n):'Free';buy.textContent=price?('Buy '+n+' for '+TA.naira(price*n)):'Get free';}
 c.querySelectorAll('[data-step]').forEach(function(b){b.addEventListener('click',function(){q.value=Math.max(1,Math.min(100,fix()+(+b.getAttribute('data-step'))));paint();});});
 q.addEventListener('input',paint);q.addEventListener('blur',function(){q.value=fix();paint();});
 function go(extra){var n=fix(),body={item:c.getAttribute('data-item'),qty:n};if(extra)for(var k in extra)body[k]=extra[k];buy.classList.add('is-loading');
  TA.api('/api/store/buy',body).then(function(j){buy.classList.remove('is-loading');if(j._ok){TA.toast(j.message);var own=c.querySelector('.own');if(j.owned){if(!own){own=document.createElement('span');own.className='own';c.querySelector('.chips').appendChild(own);}own.textContent='You have '+TA.short(j.owned);}q.value=1;paint();}
   else if(j.code==='ADULT')TA.askAdult(function(){go({adult:true});});else TA.fail(j);});}
 buy.addEventListener('click',function(){var n=fix();if(!price)return go();TA.confirm('Buy '+n+'× '+c.querySelector('.nm').textContent+' for '+TA.naira(price*n)+' from your wallet?','Buy now').then(function(y){if(y)go();});});
 paint();});`;
  return appPage({ user, title: 'Store', active: '/store', body, wallet, css: STORE_CSS, script, theme, bgCss });
}

// ── Bag (inventory, gifting) ────────────────────────────────────────────────
export function bagPage(ctx) {
  const { user, inv, nepo, wallet, theme, bgCss } = ctx;
  const boosters = inv.filter(i => i.kind === 'BOOSTER' && i.quantity > 0);
  const skins = inv.filter(i => i.kind === 'SKIN');
  const body = `<div class="headrow"><h1 class="h1">My bag</h1><a class="btn btn--green btn--sm" href="/store">Store</a></div>
<h2 class="h2">Boosters</h2>${boosters.length ? `<div class="list">${boosters.map(b => { const c = JSON.parse(b.config || '{}'); return `<div class="item"><span style="display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:${esc(c.color || '#2E8BFF')};color:#fff;font:900 italic 20px var(--display);text-shadow:var(--ts);flex:none">${esc(String(b.multiplier).replace(/\.0$/, ''))}×</span><div class="grow"><div class="t">${esc(b.name)}</div><div class="s">${b.multiplier}× for ${b.duration_seconds}s${b.per_game_limit ? ` · ${b.per_game_limit} per game` : ''}</div></div><b class="amt">×${short(b.quantity)}</b></div>`; }).join('')}</div>` : '<div class="empty">No boosters. <a href="/store">Get some</a>.</div>'}
${nepo ? `<h2 class="h2">Gift a booster</h2><div class="panel">${form('/api/gift', `
  ${field({ label: 'Player nickname', name: 'to', placeholder: 'Their nickname', attrs: 'autocapitalize="none" autocomplete="off" maxlength="24" required' })}
  <div class="two">${select({ label: 'Booster', name: 'item', options: boosters.map(b => [b.item_id, `${b.name} (you have ${b.quantity})`]) })}${field({ label: 'How many', name: 'qty', type: 'number', value: '1', attrs: 'min="1" max="50" inputmode="numeric"' })}</div>
  <p class="small muted" style="margin:0">Nepo boosters only go to Nepo babies. Mapo boosters go to Mapo and Nepo babies.</p>`, { submit: 'Send gift' })}</div>`
    : `<button type="button" class="btn btn--white btn--block" style="margin-top:14px" ${upgradeAttrs('NEPO', 'Gifting boosters')}>${ICONS.lock} Gift boosters (Nepo)</button>`}
<h2 class="h2">Tap skins <a href="/store?tab=SKIN">More skins</a></h2>
<div class="grid g3">${skins.map(i => { const look = padLook(JSON.parse(i.config || '{}'), {}); return `<div class="panel"><div class="skin-prev ${look.cls}" style="${look.style};height:110px">${look.art}<span>TAP</span></div><div class="row" style="margin-top:10px"><b style="font:900 18px var(--display)">${esc(i.name)}</b>${i.equipped ? '<span class="badge live">✓ In use</span>' : postBtn('/api/equip', 'Use', { body: { item: i.item_id }, cls: 'btn--green btn--sm' })}</div></div>`; }).join('')}</div>`;
  return appPage({ user, title: 'My bag', active: '/me', body, wallet, css: STORE_CSS, theme, bgCss });
}

// ── Wallet ──────────────────────────────────────────────────────────────────
const TX = { FUND: 'Added money', ENTRY_FEE: 'Pool entry', PRIZE: 'Prize won', STORE: 'Store', NEPO: 'Nepo subscription', PLAN: 'Plan', WITHDRAW: 'Withdrawal', WITHDRAW_REFUND: 'Withdrawal refund', REFUND: 'Refund', POOL_PRIZE: 'Pool prize funding', ADMIN_ADJUST: 'Adjustment' };
export const txLabel = t => TX[t] || t;
export function walletPage(ctx) {
  const { user, wallet, tx, page, hasNext, withdrawals, minWithdraw, banks, payMode, flash, perDay, theme, bgCss, tierKey } = ctx;
  const sponsor = user.role === 'SPONSOR';
  const body = `<h1 class="h1">Wallet</h1>
${flash ? `<div class="panel" style="margin-bottom:12px;box-shadow:0 0 0 3px var(--green)">${esc(flash)}</div>` : ''}
${payMode === 'test' ? '<div class="panel" style="margin-bottom:12px;background:var(--sunny)"><b>Test mode:</b> payments are simulated. No real money moves until Paystack is connected.</div>' : ''}
<div class="grid ${sponsor ? '' : 'g2'}">
  <div class="tcard card c-sky"><div class="stat"><span class="k">Wallet${sponsor ? ' (for prizes)' : ''}</span><span class="v">${esc(nairaShort(wallet.balance_kobo))}</span><span class="small">Money you add. Spend only — e no dey withdraw.</span></div></div>
  ${sponsor ? '' : `<div class="tcard card c-green"><div class="stat"><span class="k">Winnings</span><span class="v">${esc(nairaShort(wallet.winnings_kobo))}</span><span class="small">Money you win. Withdraw from ${esc(naira(minWithdraw))}.</span></div></div>`}
</div>
<h2 class="h2">Add money</h2><div class="panel">${form('/api/wallet/fund', `
  ${moneyField({ label: 'Amount (₦)', name: 'amount', placeholder: '2,000', attrs: 'required' })}
  <div class="note"><b>Important:</b> money you add to your wallet <b>can’t be withdrawn</b>. You spend it inside Tap Am — on pool entries, boosters, skins${sponsor ? ' and sponsored prizes' : ' and plans'}. Only winnings can be withdrawn.</div>
  ${check({ name: 'ack', label: 'I understand money I add can’t be withdrawn.' })}`, { submit: payMode === 'off' ? 'Payments open soon' : 'Add money', shine: true })}</div>
${sponsor ? '' : `<h2 class="h2">Withdraw winnings</h2><div class="panel">
  <div class="note" style="margin-bottom:12px">You can withdraw <b>${perDay === 1 ? 'once a day' : perDay + ' times a day'}</b>. Minimum for ${esc(tierName(tierKey))}: <b>${esc(naira(minWithdraw))}</b>. We check every withdrawal before paying, to keep everyone safe.</div>
  ${form('/api/withdraw', `
  ${moneyField({ label: 'Amount (₦)', name: 'amount', placeholder: (minWithdraw / 100).toLocaleString('en-NG'), attrs: 'required' })}
  ${select({ label: 'Bank', name: 'bank_code', options: [['', 'Pick your bank'], ...banks] })}
  <div class="two">${field({ label: 'Account number', name: 'account_number', attrs: 'inputmode="numeric" maxlength="10" pattern="[0-9]{10}" autocomplete="off" required' })}${field({ label: 'Account name', name: 'account_name', attrs: 'maxlength="80" required' })}</div>`, { submit: 'Request withdrawal' })}</div>
${withdrawals.length ? `<h2 class="h2">Withdrawals</h2><div class="list">${withdrawals.map(w => `<div class="item"><div class="grow"><div class="t" style="font-size:16px">${esc(naira(w.amount_kobo))} → ${esc(w.bank_name || w.bank_code)} ••${esc(String(w.account_number).slice(-4))}</div><div class="s">${esc(lagos(w.created_at))}${w.admin_note ? ' · ' + esc(w.admin_note) : ''}</div></div><span class="badge ${w.status === 'PAID' ? 'live' : w.status === 'REJECTED' || w.status === 'FAILED' ? 'red' : 'soon'}">${w.status.toLowerCase()}</span></div>`).join('')}</div>` : ''}`}
<h2 class="h2">History <a href="/wallet/history.csv" data-no-swap download>⬇ Download CSV</a></h2>${tx.length ? `<div class="list">${tx.map(t => `<div class="item"><div class="grow"><div class="t" style="font-size:15px">${esc(txLabel(t.type))}</div><div class="s">${esc(t.note || '')}${t.note ? ' · ' : ''}${t.balance === 'WINNINGS' ? 'Winnings' : t.balance === 'CARD' ? 'Card' : 'Wallet'} · ${esc(lagos(t.created_at))}</div></div><b class="amt ${t.amount_kobo >= 0 ? 'pos' : 'neg'}">${t.amount_kobo >= 0 ? '+' : '−'}${esc(naira(Math.abs(t.amount_kobo)))}</b></div>`).join('')}</div>${pager('/wallet', page, hasNext)}` : '<div class="empty">No money movement yet.</div>'}`;
  return appPage({ user, title: 'Wallet', active: '/wallet', body, wallet, theme, bgCss });
}

// ── Plans: Lapo / Mapo / Nepo ───────────────────────────────────────────────
const PLANS_CSS = `
.plans{display:grid;gap:16px;grid-template-columns:minmax(0,1fr)}
@media (min-width:860px){.plans{grid-template-columns:repeat(3,1fr)}}
.plan{display:flex;flex-direction:column;gap:10px;padding:20px 18px 18px}
.plan h2{margin:0;font:900 30px/1 var(--display)}
.plan .price{font:900 38px/1 var(--display)}
.plan .price small{font:700 15px var(--body)}
.plan ul{margin:0;padding:0;list-style:none;display:grid;gap:7px;font-weight:600;font-size:15px}
.plan li{display:flex;gap:8px;align-items:flex-start}
.plan li::before{content:"✓";flex:none;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.28);font:900 12px var(--body);text-shadow:none}
.plan .cur{align-self:flex-start}
.plan .acts{margin-top:auto;display:grid;gap:8px}
.billing{display:inline-flex;margin:0 0 14px}
.cmp{min-width:0!important}.cmp td,.cmp th{padding:10px 8px;font-size:13.5px}
.cmp td:first-child{font-weight:700}
.cmp td{text-align:center}.cmp td:first-child,.cmp th:first-child{text-align:left}
.yes{color:#0A9B4A;font-weight:900}.no{color:#B8AEDB;font-weight:900}
`;
export function plansPage(ctx) {
  const { user, tierKey, until, settings: s, plans, payMode, wallet, theme, bgCss, standalone } = ctx;
  const n = k => naira(k);
  const tiers = [
    { key: 'LAPO', name: 'Lapo baby', c: 'c-sky', month: 0, year: 0, line: 'Play free. Win real prizes.', perks: ['1 finger at a time', 'Tap in 1 pool at once', 'Free + paid pools', 'Everybody boosters', 'Boy + girl tap skins'] },
    { key: 'MAPO', name: 'Mapo baby', c: 'c-teal', month: plans.MAPO.month.kobo, year: plans.MAPO.year.kobo, line: 'More fingers, more pools.', perks: ['3 fingers at once', `Tap in ${plans.MAPO_pools} pools at once`, 'Create your own pools', 'Booster calculator + live tips', 'Tap sounds', `${plans.MAPO.bonus} bonus boosters`] },
    { key: 'NEPO', name: 'Nepo baby', c: 'c-pink', month: plans.NEPO.month.kobo, year: plans.NEPO.year.kobo, line: 'Everything. No limits.', perks: ['Unlimited fingers', `Tap in ${plans.NEPO_pools} pools at once`, 'Every booster + big one-use boosters', '10 app themes + backgrounds', 'Gift boosters', 'Talk live in games', `${plans.NEPO.bonus} bonus boosters`] }
  ];
  const btns = t => {
    if (!user) return t.key === 'LAPO' ? '<a class="btn btn--white btn--block" href="/signup">Start free</a>' : `<a class="btn btn--block" href="/signup">Sign up first</a>`;
    if (user.role !== 'USER') return '';
    if (t.key === 'LAPO') return tierKey === 'LAPO' ? '<span class="badge lapo cur">Your plan</span>' : '';
    if (tierKey === 'NEPO' && t.key === 'MAPO') return '<p class="small" style="margin:0;font-weight:700">You are on Nepo.</p>';
    const label = tierKey === t.key ? 'Add more time' : tierKey === 'MAPO' && t.key === 'NEPO' ? 'Upgrade to Nepo' : `Go ${t.key === 'NEPO' ? 'Nepo' : 'Mapo'}`;
    return `<div data-bill="month">${postBtn('/api/plans/subscribe', `${label} · ${n(t.month)}/month`, { body: { tier: t.key, plan: 'month', method: 'wallet' }, cls: 'btn--white btn--block', confirm: `Pay ${n(t.month)} from your wallet for ${t.name} (1 month)?` })}</div>
      <div data-bill="year" hidden>${postBtn('/api/plans/subscribe', `${label} · ${n(t.year)}/year`, { body: { tier: t.key, plan: 'year', method: 'wallet' }, cls: 'btn--white btn--block', confirm: `Pay ${n(t.year)} from your wallet for ${t.name} (1 year)?` })}</div>
      ${payMode !== 'off' ? `<div data-bill="month">${postBtn('/api/plans/subscribe', 'Pay with card', { body: { tier: t.key, plan: 'month', method: 'card' }, cls: 'btn--block' })}</div><div data-bill="year" hidden>${postBtn('/api/plans/subscribe', 'Pay with card', { body: { tier: t.key, plan: 'year', method: 'card' }, cls: 'btn--block' })}</div>` : ''}`;
  };
  const rows = comparison(s);
  const cell = v => (v === true ? '<span class="yes" aria-label="Yes">✓</span>' : v === false ? '<span class="no" aria-label="No">—</span>' : esc(v));
  const body = `<h1 class="h1">Lapo, Mapo or Nepo?</h1><p class="sub">${user && tierKey !== 'LAPO' && until ? `You are a ${esc(tierName(tierKey))} till <b style="color:#fff">${esc(lagosDate(until))}</b>. Paying again adds more time.` : 'Everybody starts as a Lapo baby — free. Upgrade any time. Plans don’t renew by themselves; we remind you before yours ends.'}</p>
<div class="seg-choice billing" role="radiogroup" aria-label="Billing" id="billing"><label><input type="radio" name="bill" value="month" checked><span>Monthly</span></label><label><input type="radio" name="bill" value="year"><span>Yearly · 2 months free</span></label></div>
<div class="plans">${tiers.map(t => `<section class="tcard plan ${t.c}">
  <div class="row"><h2>${t.name}</h2>${tierKey === t.key ? '<span class="badge live">Your plan</span>' : ''}</div>
  <div class="price" data-bill="month">${t.month ? esc(n(t.month)) + '<small> /month</small>' : 'Free'}</div><div class="price" data-bill="year" hidden>${t.year ? esc(n(t.year)) + `<small> /year · ${esc(n(Math.round(t.year / 12)))}/mo</small>` : 'Free'}</div>
  <p style="margin:0;font-weight:700">${t.line}</p><ul>${t.perks.map(x => `<li>${esc(x)}</li>`).join('')}</ul><div class="acts">${btns(t)}</div></section>`).join('')}</div>
<h2 class="h2">Compare everything</h2>
<div class="tbl-wrap"><table class="tbl cmp"><thead><tr><th>Feature</th><th>Lapo</th><th>Mapo</th><th>Nepo</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td>${cell(r[1])}</td><td>${cell(r[2])}</td><td>${cell(r[3])}</td></tr>`).join('')}</tbody></table></div>
${user ? `<p class="small" style="margin-top:12px;color:var(--muted)">Your wallet has ${esc(naira(wallet?.balance_kobo || 0))}. <a href="/wallet" style="color:var(--green)">Fund wallet</a></p>` : ''}`;
  const script = `var b=document.getElementById('billing');function p(){var v=b.querySelector('input:checked').value;document.querySelectorAll('[data-bill]').forEach(function(e){e.hidden=e.getAttribute('data-bill')!==v;});}b.addEventListener('change',p);p();`;
  return { body, css: PLANS_CSS, script, title: 'Plans' };
}
