// Login + Sign up screen (one page) built from the Tap Am Figma reference.
// Views: login, signup, verify (email code), forgot (ask for reset code), reset (new password).
import { themeShell, logoBlock, poweredBy } from './theme.js';
import { COMMON_PASSWORDS, RESERVED_NICKNAMES, PASSWORD_MIN, PASSWORD_MAX, EMAIL_MAX, GENDERS, COUNTRIES } from '../auth-rules.js';

const eyeButton = (target) => `<button type="button" class="ta-eye" data-toggle="${target}" aria-label="Show password" aria-pressed="false">
<svg class="ta-eye-closed" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.6 2.6A7.3 7.3 0 0 1 8 2.5c3.6 0 6 3.1 6.8 4.5a11 11 0 0 1-1.9 2.5M4.1 3.9A11.4 11.4 0 0 0 1.2 7c.8 1.4 3.2 4.5 6.8 4.5a6.9 6.9 0 0 0 3.4-.9"/><path d="M6.6 5.7a2 2 0 0 0 2.7 2.8"/><path d="M1.5 1l13 12"/></svg>
<svg class="ta-eye-open" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.2 7C2 5.6 4.4 2.5 8 2.5s6 3.1 6.8 4.5c-.8 1.4-3.2 4.5-6.8 4.5S2 8.4 1.2 7z"/><circle cx="8" cy="7" r="2"/></svg>
</button>`;

const err = id => `<p class="ta-error" id="${id}" aria-live="polite"></p>`;
const back = (label, to) => `<button type="button" class="ta-back" data-go="${to}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg> ${label}</button>`;

function genderChoice() {
  return `<div class="seg-choice" role="radiogroup" aria-labelledby="su-gender-label" id="su-gender">${GENDERS.map(([v, l]) => `<label><input type="radio" name="gender" value="${v}"><span>${l}</span></label>`).join('')}</div>`;
}
function countrySelect() {
  return `<select class="ta-input" id="su-country" name="country" required aria-describedby="e-su-country">${COUNTRIES.map(([v, l]) => `<option value="${v}" ${v === 'NG' ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
}

export function authPage(mode = 'login', { ref = '', sponsor = false } = {}) {
  const signup = mode === 'signup';
  const refCode = /^[A-Za-z0-9]{4,12}$/.test(ref) ? ref.toUpperCase() : '';
  const body = `<main class="ta-page">
${logoBlock()}
<section class="ta-card" aria-label="Sign up or log in">
  <div class="ta-tabs" role="tablist" id="tabs">
    <a class="ta-tab" role="tab" id="tab-signup" href="/signup" aria-controls="v-signup" aria-selected="${signup}">Sign up</a>
    <a class="ta-tab" role="tab" id="tab-login" href="/login" aria-controls="v-login" aria-selected="${!signup}">Login</a>
  </div>

  <form class="ta-form" id="v-login" role="tabpanel" aria-labelledby="tab-login" novalidate ${signup ? 'hidden' : ''}>
    <div class="ta-field">
      <label class="ta-label" for="login-id">Nickname or Email</label>
      <input class="ta-input" id="login-id" name="identifier" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="254" placeholder="your nickname or email" required aria-describedby="e-login-id">
      ${err('e-login-id')}
    </div>
    <div class="ta-field">
      <label class="ta-label" for="login-pw">Password</label>
      <div class="ta-pw"><input class="ta-input" id="login-pw" name="password" type="password" autocomplete="current-password" maxlength="${PASSWORD_MAX}" placeholder="wetin be your password?" required aria-describedby="e-login-pw">${eyeButton('login-pw')}</div>
      ${err('e-login-pw')}
      <div class="ta-forgot-row"><button type="button" class="ta-forgot" data-go="forgot">I don forget my password!</button></div>
    </div>
    <div class="ta-msg" role="alert"></div>
    <button class="ta-btn" type="submit" data-label="Oyaaaa Enterr">Oyaaaa Enterr</button>
  </form>

  <form class="ta-form" id="v-signup" role="tabpanel" aria-labelledby="tab-signup" novalidate ${signup ? '' : 'hidden'} data-type="${sponsor ? 'SPONSOR' : 'USER'}" data-ref="${refCode}">
    ${sponsor ? `<p class="ta-note" style="margin:0 0 4px">Sponsor account: create sponsored pools and run ads. <a href="/signup">Sign up as a player instead</a></p>
    <div class="ta-field">
      <label class="ta-label" for="su-company">Company or brand</label>
      <input class="ta-input" id="su-company" name="company" autocomplete="organization" maxlength="60" placeholder="Your brand name" required aria-describedby="e-su-company">
      ${err('e-su-company')}
    </div>` : refCode ? `<p class="ta-note" style="margin:0 0 4px">Your friend invited you. You both get boosters as more people join.</p>` : ''}
    <div class="ta-field">
      <label class="ta-label" for="su-name">Nickname</label>
      <input class="ta-input" id="su-name" name="nickname" autocomplete="nickname" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="24" placeholder="Wetin dem dey call you?" required aria-describedby="e-su-name">
      ${err('e-su-name')}
    </div>
    <div class="ta-field">
      <label class="ta-label" for="su-email">Email</label>
      <input class="ta-input" id="su-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="${EMAIL_MAX}" placeholder="you@example.com" required aria-describedby="e-su-email">
      ${err('e-su-email')}
    </div>
    <div class="ta-field">
      <label class="ta-label" for="su-pw">Password</label>
      <div class="ta-pw"><input class="ta-input" id="su-pw" name="password" type="password" autocomplete="new-password" minlength="${PASSWORD_MIN}" maxlength="${PASSWORD_MAX}" placeholder="make am strong o" required aria-describedby="e-su-pw">${eyeButton('su-pw')}</div>
      ${err('e-su-pw')}
    </div>
    ${sponsor ? '' : `<div class="ta-field">
      <span class="ta-label" id="su-gender-label">You be</span>
      ${genderChoice()}
      ${err('e-su-gender')}
    </div>`}
    <div class="ta-field">
      <label class="ta-label" for="su-country">Country</label>
      ${countrySelect()}
      ${err('e-su-country')}
    </div>
    <label class="ta-check"><input type="checkbox" id="su-agree" name="agree" required aria-describedby="e-su-agree">
      <span>I agree to the <a href="/terms" target="_blank" rel="noopener">Terms</a>, <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a> and <a href="/rules" target="_blank" rel="noopener">Game Rules</a>. Tap Am stores my nickname, email, gender and country and game activity to run my account. If I’m under 18, a parent or guardian agrees.</span>
    </label>
    ${err('e-su-agree')}
    <div class="ta-msg" role="alert"></div>
    <button class="ta-btn ta-btn--shine" type="submit" data-label="Oya, create my account">Oya, create my account</button>
    ${sponsor ? '' : '<p class="ta-note" style="margin:10px 0 0;text-align:center">Be a brand? <a href="/signup?type=sponsor">Sign up as a sponsor</a></p>'}
  </form>

  <form class="ta-form ta-step" id="v-verify" novalidate hidden>
    ${back('Change my details', 'signup')}
    <h2>Check your email</h2>
    <p class="ta-sub">We don send 6-digit code to <b data-email></b>. E go expire in 10 minutes.</p>
    <p class="ta-testcode" data-test hidden></p>
    <div class="ta-field">
      <label class="ta-label" for="vf-code">Code</label>
      <input class="ta-input ta-otp" id="vf-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="••••••" required aria-describedby="e-vf-code">
      ${err('e-vf-code')}
    </div>
    <div class="ta-msg" role="alert"></div>
    <button class="ta-btn ta-btn--shine" type="submit" data-label="Confirm code">Confirm code</button>
    <button class="ta-btn-ghost" type="button" data-resend="signup">Send new code</button>
  </form>

  <form class="ta-form ta-step" id="v-forgot" novalidate hidden>
    ${back('Back to login', 'login')}
    <h2>You don forget password?</h2>
    <p class="ta-sub">No wahala. Enter the email wey you take sign up and we go send you code.</p>
    <div class="ta-field">
      <label class="ta-label" for="fg-email">Email</label>
      <input class="ta-input" id="fg-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" maxlength="${EMAIL_MAX}" placeholder="you@example.com" required aria-describedby="e-fg-email">
      ${err('e-fg-email')}
    </div>
    <div class="ta-msg" role="alert"></div>
    <button class="ta-btn ta-btn--shine" type="submit" data-label="Send me code">Send me code</button>
  </form>

  <form class="ta-form ta-step" id="v-reset" novalidate hidden>
    ${back('Use another email', 'forgot')}
    <h2>Set new password</h2>
    <p class="ta-sub">If account dey for <b data-email></b>, we don send 6-digit code there. Enter am with your new password.</p>
    <p class="ta-testcode" data-test hidden></p>
    <div class="ta-field">
      <label class="ta-label" for="rs-code">Code</label>
      <input class="ta-input ta-otp" id="rs-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="••••••" required aria-describedby="e-rs-code">
      ${err('e-rs-code')}
    </div>
    <div class="ta-field">
      <label class="ta-label" for="rs-pw">New password</label>
      <div class="ta-pw"><input class="ta-input" id="rs-pw" name="password" type="password" autocomplete="new-password" minlength="${PASSWORD_MIN}" maxlength="${PASSWORD_MAX}" placeholder="make am strong o" required aria-describedby="e-rs-pw">${eyeButton('rs-pw')}</div>
      ${err('e-rs-pw')}
    </div>
    <div class="ta-msg" role="alert"></div>
    <button class="ta-btn ta-btn--shine" type="submit" data-label="Save new password">Save new password</button>
    <button class="ta-btn-ghost" type="button" data-resend="reset">Send new code</button>
  </form>
</section>
${poweredBy()}
</main>`;

  // Client-side checks mirror src/auth-rules.js. The server re-checks everything.
  const script = `
(function(){
'use strict';
var COMMON=${JSON.stringify(COMMON_PASSWORDS)},RESERVED=${JSON.stringify(RESERVED_NICKNAMES)},PMIN=${PASSWORD_MIN},PMAX=${PASSWORD_MAX},EMAX=${EMAIL_MAX};
var EMAIL_RE=/^[^\\s@<>()[\\]\\\\,;:"]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\\.[A-Za-z]{2,}$/;
var $=function(id){return document.getElementById(id)};
var views={login:$('v-login'),signup:$('v-signup'),verify:$('v-verify'),forgot:$('v-forgot'),reset:$('v-reset')};
var tabs={login:$('tab-login'),signup:$('tab-signup')},tabBar=$('tabs');
var state={email:'',purpose:'signup',timer:null};

function show(name){
  for(var k in views)views[k].hidden=k!==name;
  var isTab=name==='login'||name==='signup';
  tabBar.hidden=!isTab;
  if(isTab){for(var t in tabs)tabs[t].setAttribute('aria-selected',t===name);if(location.pathname!=='/'+name)history.replaceState(null,'','/'+name);}
  document.title=({login:'Login',signup:'Sign up',verify:'Confirm email',forgot:'Forgot password',reset:'New password'})[name]+' | Tap Am';
  var first=views[name].querySelector('input:not([type=checkbox])');if(first&&name!=='login'&&name!=='signup')setTimeout(function(){first.focus()},30);
}
tabs.login.addEventListener('click',function(e){e.preventDefault();show('login')});
tabs.signup.addEventListener('click',function(e){e.preventDefault();show('signup')});
document.querySelectorAll('[data-go]').forEach(function(b){b.addEventListener('click',function(){show(b.getAttribute('data-go'))})});

document.querySelectorAll('.ta-eye').forEach(function(b){b.addEventListener('click',function(){
  var input=$(b.getAttribute('data-toggle')),showing=input.type==='text';
  input.type=showing?'password':'text';b.setAttribute('aria-pressed',String(!showing));b.setAttribute('aria-label',showing?'Show password':'Hide password');
})});

// ── field errors ──
function setErr(input,errId,text){
  var e=$(errId);e.textContent=text||'';
  var list=input.length?input:[input];
  for(var i=0;i<list.length;i++){list[i].classList.toggle('is-invalid',!!text);if(text)list[i].setAttribute('aria-invalid','true');else list[i].removeAttribute('aria-invalid');}
  return !text;
}
function msg(form,kind,text){var m=form.querySelector('.ta-msg');m.className='ta-msg '+(text?kind:'');m.textContent=text||'';}

// ── rules (same as server) ──
function nickProblem(n){n=n.trim();
  if(!n)return'Enter your nickname.';if(n.length<3)return'Nickname must be at least 3 characters.';if(n.length>24)return'Nickname fit only be 24 characters max.';
  if(!/^[A-Za-z0-9_]+$/.test(n))return'Nickname fit only get letters, numbers and _ (no space).';
  if(/^\\d+$/.test(n))return'Nickname no fit be only numbers.';if(RESERVED.indexOf(n.toLowerCase())>-1)return'That nickname no dey available. Try another one.';return'';}
function emailProblem(e){e=e.trim();if(!e)return'Enter your email.';if(e.length>EMAX||!EMAIL_RE.test(e))return'That email no look correct.';return'';}
function pwProblem(p,nick){
  if(!p)return'Enter a password.';if(p.length<PMIN)return'Password must be at least '+PMIN+' characters.';if(p.length>PMAX)return'Password too long.';
  var miss=[];if(!/[a-z]/.test(p))miss.push('one small letter');if(!/[A-Z]/.test(p))miss.push('one capital letter');if(!/[0-9]/.test(p))miss.push('one number');
  if(miss.length)return'Password still need '+miss.join(', ')+'.';
  var low=p.toLowerCase();if(COMMON.indexOf(low)>-1||/^(.)\\1+$/.test(p))return'That password too common. Make am stronger.';
  if(nick&&nick.length>=3&&low.indexOf(nick.toLowerCase())>-1)return'No put your nickname inside your password.';return'';}
// ── sign up ──
var su=views.signup;
function genderVal(){var c=su.querySelector('input[name=gender]:checked');return c?c.value:'';}
var suChecks={
  nickname:function(){return setErr($('su-name'),'e-su-name',nickProblem($('su-name').value))},
  email:function(){return setErr($('su-email'),'e-su-email',emailProblem($('su-email').value))},
  password:function(){return setErr($('su-pw'),'e-su-pw',pwProblem($('su-pw').value,$('su-name').value.trim()))},
  gender:function(){if(!$('su-gender'))return true;return setErr(su.querySelectorAll('input[name=gender]'),'e-su-gender',genderVal()?'':'Pick one.')},
  country:function(){return setErr($('su-country'),'e-su-country',$('su-country').value?'':'Pick your country.')},
  agree:function(){return setErr($('su-agree'),'e-su-agree',$('su-agree').checked?'':'Tick the box to agree before you continue.')},
  company:function(){var c=$('su-company');if(!c)return true;var v=c.value.trim();return setErr(c,'e-su-company',v.length<2?'Enter your company or brand name.':'')}
};
var suFieldEl={nickname:$('su-name'),email:$('su-email'),password:$('su-pw'),gender:su.querySelector('input[name=gender]'),country:$('su-country'),agree:$('su-agree'),company:$('su-company')};
var touched={};
$('su-name').addEventListener('blur',function(){if(this.value)touched.nickname=1;if(touched.nickname)suChecks.nickname()});
$('su-email').addEventListener('blur',function(){if(this.value)touched.email=1;if(touched.email)suChecks.email()});
$('su-pw').addEventListener('blur',function(){if(this.value)touched.password=1;if(touched.password)suChecks.password()});
$('su-name').addEventListener('input',function(){if(touched.nickname)suChecks.nickname();if(touched.password)suChecks.password()});
$('su-email').addEventListener('input',function(){if(touched.email)suChecks.email()});
$('su-pw').addEventListener('input',function(){if(touched.password)suChecks.password()});
su.querySelectorAll('input[name=gender]').forEach(function(r){r.addEventListener('change',function(){suChecks.gender()})});
$('su-agree').addEventListener('change',function(){suChecks.agree()});

su.addEventListener('submit',function(e){e.preventDefault();msg(su);
  var order=($('su-company')?['company']:[]).concat(['nickname','email','password','gender','country','agree']),firstBad=null;
  order.forEach(function(k){touched[k]=1;if(!suChecks[k]()&&!firstBad)firstBad=k});
  if(firstBad){suFieldEl[firstBad].focus();return;}
  var email=$('su-email').value.trim().toLowerCase();
  post(su,'/api/signup/start',{nickname:$('su-name').value.trim(),email:email,password:$('su-pw').value,
    gender:genderVal(),country:$('su-country').value,agree:true,accountType:su.getAttribute('data-type'),company:$('su-company')?$('su-company').value.trim():'',ref:su.getAttribute('data-ref')},function(j){
      state.email=email;state.purpose='signup';openCodeView('verify',j);
    },function(j){var ids={nickname:'e-su-name',email:'e-su-email',password:'e-su-pw',gender:'e-su-gender',country:'e-su-country',agree:'e-su-agree',company:'e-su-company'};
      if(j.field&&ids[j.field]&&suFieldEl[j.field]){setErr(j.field==='gender'?su.querySelectorAll('input[name=gender]'):suFieldEl[j.field],ids[j.field],j.error);suFieldEl[j.field].focus();return true;}});
});

// ── email code views ──
function openCodeView(name,j){
  var v=views[name];v.querySelectorAll('[data-email]').forEach(function(b){b.textContent=j.email||state.email});
  var tc=v.querySelector('[data-test]');
  if(j.testCode){tc.hidden=false;tc.innerHTML='';tc.appendChild(document.createTextNode('Test mode (no email is sent yet). Your code: '));var b=document.createElement('b');b.textContent=j.testCode;tc.appendChild(b);}else{tc.hidden=true;}
  v.querySelector('.ta-otp').value='';setErr(v.querySelector('.ta-otp'),v.querySelector('.ta-otp').getAttribute('aria-describedby'),'');msg(v);
  show(name);startCooldown(v,j.resendIn||60);
}
function startCooldown(v,secs){
  var b=v.querySelector('[data-resend]');clearInterval(state.timer);var left=secs;state.cooling=true;
  function tick(){if(left>0){b.disabled=true;b.textContent='Send new code ('+left+'s)';left--;}else{state.cooling=false;b.disabled=false;b.textContent='Send new code';clearInterval(state.timer);}}
  tick();state.timer=setInterval(tick,1000);
}
document.querySelectorAll('.ta-otp').forEach(function(i){i.addEventListener('input',function(){
  var d=i.value.replace(/\\D/g,'').slice(0,6);if(i.value!==d)i.value=d;setErr(i,i.getAttribute('aria-describedby'),'');
  if(d.length===6&&i.form.id==='v-verify'&&i.form.requestSubmit)i.form.requestSubmit();
})});
document.querySelectorAll('[data-resend]').forEach(function(b){b.addEventListener('click',function(){
  var v=b.form;msg(v);
  post(v,'/api/code/resend',{email:state.email,purpose:b.getAttribute('data-resend')},function(j){
    msg(v,'ok','New code don go your email.');
    var tc=v.querySelector('[data-test]'),tb=tc.querySelector('b');if(j.testCode&&tb){tc.hidden=false;tb.textContent=j.testCode;}
    startCooldown(v,j.resendIn||60);
  },function(j){if(j.retryAfter){startCooldown(v,j.retryAfter);}},b);
})});

views.verify.addEventListener('submit',function(e){e.preventDefault();var v=views.verify,c=$('vf-code');msg(v);
  if(!/^\\d{6}$/.test(c.value)){setErr(c,'e-vf-code','Enter the 6-digit code from your email.');c.focus();return;}
  post(v,'/api/signup/verify',{email:state.email,code:c.value},function(j){msg(v,'ok','Account don ready! Taking you in…');setTimeout(function(){location.href=j.redirect||'/dashboard'},500)},
    function(j){if(j.field==='code'){setErr(c,'e-vf-code',j.error);c.select();return true;}});
});

// ── forgot / reset ──
views.forgot.addEventListener('submit',function(e){e.preventDefault();var v=views.forgot,i=$('fg-email');msg(v);
  if(!setErr(i,'e-fg-email',emailProblem(i.value))){i.focus();return;}
  var email=i.value.trim().toLowerCase();
  post(v,'/api/password/forgot',{email:email},function(j){state.email=email;state.purpose='reset';openCodeView('reset',j)},
    function(j){if(j.field==='email'){setErr(i,'e-fg-email',j.error);return true;}});
});
$('rs-pw').addEventListener('input',function(){if(this.value.length>=PMIN)setErr(this,'e-rs-pw',pwProblem(this.value,''))});
views.reset.addEventListener('submit',function(e){e.preventDefault();var v=views.reset,c=$('rs-code'),p=$('rs-pw');msg(v);
  var ok1=setErr(c,'e-rs-code',/^\\d{6}$/.test(c.value)?'':'Enter the 6-digit code from your email.');
  var ok2=setErr(p,'e-rs-pw',pwProblem(p.value,''));
  if(!ok1){c.focus();return}if(!ok2){p.focus();return}
  post(v,'/api/password/reset',{email:state.email,code:c.value,password:p.value},function(){msg(v,'ok','Password don change! Taking you in…');setTimeout(function(){location.href='/dashboard'},500)},
    function(j){if(j.field==='code'){setErr(c,'e-rs-code',j.error);c.focus();return true;}if(j.field==='password'){setErr(p,'e-rs-pw',j.error);p.focus();return true;}});
});

// ── login ──
views.login.addEventListener('submit',function(e){e.preventDefault();var v=views.login,id=$('login-id'),pw=$('login-pw');msg(v);
  var ok1=setErr(id,'e-login-id',id.value.trim()?'':'Enter your nickname or email.');
  var ok2=setErr(pw,'e-login-pw',pw.value?'':'Enter your password.');
  if(!ok1){id.focus();return}if(!ok2){pw.focus();return}
  post(v,'/api/login',{identifier:id.value.trim(),password:pw.value},function(j){msg(v,'ok',j.restored?'Welcome back! Your account is active again.':'Correct! Taking you in…');setTimeout(function(){var n=new URLSearchParams(location.search).get('next');location.href=(n&&n.charAt(0)==='/'&&/^[a-z]/.test(n.charAt(1))&&n.indexOf('//')<0)?n:(j.redirect||(j.role==='ADMIN'?'/admin':'/dashboard'))},300)},
    function(j){if(j.field==='identifier'){setErr(id,'e-login-id',j.error);return true;}if(j.field==='password'){setErr(pw,'e-login-pw',j.error);return true;}});
});
[$('login-id'),$('login-pw')].forEach(function(i){i.addEventListener('input',function(){setErr(i,i.getAttribute('aria-describedby'),'')})});

// ── network ──
async function post(form,url,payload,onOk,onErr,button){
  var btn=button||form.querySelector('button[type=submit]');var label=btn.getAttribute('data-label')||btn.textContent;btn.disabled=true;if(!button)btn.textContent='Small wait…';
  try{
    var r=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    var j={};try{j=await r.json()}catch(_){}
    if(r.ok){onOk(j);if(!button){btn.textContent=label;btn.disabled=false;}return;}
    var handled=onErr&&onErr(j);
    if(!handled)msg(form,'err',j.error||'Something no work. Try again.');
  }catch(_){msg(form,'err','Network wahala. Check your connection and try again.');}
  if(button){if(!state.cooling)btn.disabled=false;}else{btn.disabled=false;btn.textContent=label;}
}
})();`;

  return themeShell({ title: signup ? 'Sign up' : 'Login', body: body + (signup ? '<div data-winners hidden></div>' : ''), script, bodyClass: 'bg-anim' });
}
