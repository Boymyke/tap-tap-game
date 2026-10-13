// Tap-offs page: challenge a player, answer challenges sent to you, see past tap-offs.
import { appPage, esc, naira, lagos, form, field, moneyField, choice, check, playerPicker, postBtn, nameTag, fmtDur } from './kit.js';

const CSS = `
.chal .item{flex-wrap:wrap}
.chal .who{font:900 18px/1.15 var(--display);color:var(--ink)}
.chal .stake{display:inline-flex;align-items:center;gap:6px;margin-top:4px;padding:4px 10px;border-radius:999px;background:var(--sunny);color:var(--ink);font:800 13px var(--body)}
.chal .acts{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
.chal .acts .form{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}
.chal .acts .ta-field{margin:0}
.chal .acts .ta-input{max-width:190px}
.chal .res{font:800 14px var(--body)}
.chal .opts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.chal .opts span{padding:3px 9px;border-radius:999px;background:var(--cloud);color:var(--ink);font:800 12px var(--body)}
.chal .optrow{display:flex;gap:8px;align-items:flex-start}
`;
const len = s => fmtDur(s);

export function challengesPage(ctx) {
  const { user, wallet, lists, stakesOn, to = '', theme, bgCss } = ctx;
  const { incoming, outgoing, past } = lists;
  const optsLine = c => { const o = [c.time_topup ? 'Players can buy time' : '', c.lapo_rules ? 'Lapo baby rules' : '', c.boosters_allowed === 0 ? 'No boosters' : 'Boosters on'].filter(Boolean); return `<div class="opts">${o.map(x => `<span>${esc(x)}</span>`).join('')}</div>`; };
  const stakeLine = c => (c.stake_kobo ? `<span class="stake">₦ ${esc(naira(c.stake_kobo))} each · winner takes ${esc(naira(c.stake_kobo * 2))}</span>` : '');
  const inc = incoming.map(c => `<div class="item"><div class="grow"><div class="who">${nameTag(c.from_name, c.from_emoji)} challenged you</div><div class="s">${esc(len(c.duration_seconds))} tap-off · expires ${esc(lagos(c.expires_at))}</div>${stakeLine(c)}${optsLine(c)}</div>
    <div class="acts">${c.stake_kobo ? form(`/api/challenges/${c.id}/accept`, field({ label: 'Your password', name: 'password', type: 'password', id: 'pw-' + c.id, attrs: 'autocomplete="current-password" required maxlength="128"' }), { submit: `Accept (${naira(c.stake_kobo)})`, btn: 'btn--green' }) : postBtn(`/api/challenges/${c.id}/accept`, 'Accept', { cls: 'btn--green btn--sm' })}${postBtn(`/api/challenges/${c.id}/decline`, 'Decline', { cls: 'btn--soft btn--sm', confirm: 'Decline this tap-off?' })}</div></div>`).join('');
  const out = outgoing.map(c => `<div class="item"><div class="grow"><div class="who">You challenged ${nameTag(c.to_name, c.to_emoji)}</div><div class="s">${esc(len(c.duration_seconds))} tap-off · waiting for an answer until ${esc(lagos(c.expires_at))}</div>${stakeLine(c)}${optsLine(c)}</div><div class="acts">${postBtn(`/api/challenges/${c.id}/cancel`, 'Cancel', { cls: 'btn--soft btn--sm', confirm: c.stake_kobo ? 'Cancel this tap-off? Your stake comes back.' : 'Cancel this tap-off?' })}</div></div>`).join('');
  const word = { ACCEPTED: 'Played', DECLINED: 'Declined', CANCELLED: 'Cancelled', EXPIRED: 'Expired' };
  const pastRows = past.map(c => {
    const mine = c.from_id === user.id, other = mine ? c.to_name : c.from_name;
    const result = c.status === 'ACCEPTED' ? (c.settled_at ? (c.final_rank === 1 ? `<span class="res pos">You won${c.my_prize ? ' ' + esc(naira(c.my_prize)) : ''}</span>` : '<span class="res">You lost</span>') : '<span class="res">In play</span>') : `<span class="res muted">${word[c.status] || c.status}</span>`;
    return `<${c.pool_id ? `a href="/pool/${esc(c.pool_id)}"` : 'div'} class="item"><div class="grow"><div class="who" style="font-size:16px">${mine ? 'You vs' : 'vs'} ${esc(other)}</div><div class="s">${esc(len(c.duration_seconds))}${c.stake_kobo ? ' · ' + esc(naira(c.stake_kobo)) + ' each' : ''} · ${esc(lagos(c.responded_at || c.created_at))}</div></div>${result}</${c.pool_id ? 'a' : 'div'}>`;
  }).join('');
  const body = `<h1 class="h1">Tap-off</h1><p class="sub">Challenge another player to a 1-on-1. They accept or decline; the fastest finger wins. You can also challenge anybody from their profile.</p>
<div class="chal">
${inc ? `<h2 class="h2">Challenges for you</h2><div class="list">${inc}</div>` : ''}
<h2 class="h2">Challenge a player</h2><div class="panel">${form('/api/challenges', `
  ${playerPicker({ name: 'to', label: 'Who you dey challenge?', id: 'ch-to', hint: 'Search their nickname and pick one player.' })}
  ${choice({ label: 'How long', name: 'duration', options: [['60', '1 min'], ['300', '5 min'], ['900', '15 min'], ['1800', '30 min'], ['3600', '1 hour']], value: '60' })}
  ${stakesOn ? `${moneyField({ label: 'Stake (₦, optional)', name: 'stake', placeholder: 'No stake', tip: 'You both put this amount from your wallets. Tap Am holds it, and the winner takes both. If they decline or don’t answer in 24 hours, yours comes back.' })}
  <div data-show-stake hidden>${field({ label: 'Your password', name: 'password', type: 'password', id: 'ch-pw', attrs: 'autocomplete="current-password" maxlength="128"', hint: 'Needed when you put money on it.' })}</div>` : ''}
  <div class="optrow">${check({ name: 'time_topup', id: 'ch-time', label: '<b>Let players buy more time during the game</b> (₦10,000 = +10 seconds)', checked: true })}<button type="button" class="tip" data-tip="During the game, a button lets either player buy more time: every ₦10,000 adds 10 seconds to the clock." aria-label="More info">i</button></div>
  <div class="optrow">${check({ name: 'lapo_rules', id: 'ch-lapo', label: '<b>Use Lapo baby rules</b> (level the game)' })}<button type="button" class="tip" data-tip="Both players play like Lapo babies: one finger at a time, the Lapo tap speed, and only the boosters every player can use. Mapo and Nepo perks are switched off, so it is a fair fight." aria-label="More info">i</button></div>
  ${check({ name: 'boosters_allowed', id: 'ch-boost', label: 'Allow boosters', checked: true })}`, { submit: 'Send challenge', shine: true })}</div>
${out ? `<h2 class="h2">Waiting for an answer</h2><div class="list">${out}</div>` : ''}
${pastRows ? `<h2 class="h2">Past tap-offs</h2><div class="list">${pastRows}</div>` : ''}
</div>`;
  // one name only in the picker: a second pick replaces the first
  const script = `
var f=document.querySelector('form[data-api="/api/challenges"]');if(f){var v=f.querySelector('[data-picker-val]'),pre=${JSON.stringify(to)};
 if(pre&&v&&!v.value){v.value=pre;var box=f.querySelector('[data-picked]');var c=document.createElement('span');c.className='pchip';var t=document.createElement('span');t.textContent=pre;var x=document.createElement('button');x.type='button';x.textContent='×';x.setAttribute('data-unpick',pre);c.appendChild(t);c.appendChild(x);box.appendChild(c);}
 new MutationObserver(function(){var l=v.value?v.value.split(','):[];if(l.length>1){var last=l[l.length-1];v.value=last;var chips=f.querySelectorAll('.pchip');for(var i=0;i<chips.length-1;i++)chips[i].remove();}}).observe(f.querySelector('[data-picked]'),{childList:true});
 var st=f.querySelector('[name=stake]'),pw=f.querySelector('[data-show-stake]');if(st&&pw){var sync=function(){pw.hidden=!(parseFloat(st.value.replace(/[^0-9.]/g,''))>0);};st.addEventListener('input',sync);sync();}}`;
  return appPage({ user, title: 'Tap-offs', active: '/pools', body, wallet, css: CSS, script, theme, bgCss });
}
