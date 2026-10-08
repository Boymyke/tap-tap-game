// Login + Sign up screen (one page, two tabs) built from the Tap Am Figma reference.
import { themeShell, logoBlock, poweredBy } from './theme.js';
import { COMMON_PASSWORDS, MIN_AGE } from '../auth-rules.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const eyeButton = (target) => `<button type="button" class="ta-eye" data-toggle="${target}" aria-label="Show password" aria-pressed="false">
<svg class="ta-eye-closed" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.6 2.6A7.3 7.3 0 0 1 8 2.5c3.6 0 6 3.1 6.8 4.5a11 11 0 0 1-1.9 2.5M4.1 3.9A11.4 11.4 0 0 0 1.2 7c.8 1.4 3.2 4.5 6.8 4.5a6.9 6.9 0 0 0 3.4-.9"/><path d="M6.6 5.7a2 2 0 0 0 2.7 2.8"/><path d="M1.5 1l13 12"/></svg>
<svg class="ta-eye-open" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.2 7C2 5.6 4.4 2.5 8 2.5s6 3.1 6.8 4.5c-.8 1.4-3.2 4.5-6.8 4.5S2 8.4 1.2 7z"/><circle cx="8" cy="7" r="2"/></svg>
</button>`;

function dobSelects() {
  const thisYear = new Date().getUTCFullYear();
  const days = Array.from({ length: 31 }, (_, i) => `<option value="${String(i + 1).padStart(2, '0')}">${i + 1}</option>`).join('');
  const months = MONTHS.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}">${m}</option>`).join('');
  const years = Array.from({ length: 100 }, (_, i) => thisYear - i).map(y => `<option value="${y}">${y}</option>`).join('');
  return `<div class="ta-dob">
<select class="ta-input" name="dob_day" aria-label="Day" required><option value="" disabled selected>Day</option>${days}</select>
<select class="ta-input" name="dob_month" aria-label="Month" required><option value="" disabled selected>Month</option>${months}</select>
<select class="ta-input" name="dob_year" aria-label="Year" required><option value="" disabled selected>Year</option>${years}</select>
</div>`;
}

export function authPage(mode = 'login') {
  const signup = mode === 'signup';
  const body = `<main class="ta-page">
${logoBlock()}
<section class="ta-card" aria-label="Sign up or log in">
  <div class="ta-tabs" role="tablist">
    <a class="ta-tab" role="tab" id="tab-signup" href="/signup" aria-controls="panel-signup" aria-selected="${signup}">Sign up</a>
    <a class="ta-tab" role="tab" id="tab-login" href="/login" aria-controls="panel-login" aria-selected="${!signup}">Login</a>
  </div>

  <form class="ta-form" id="panel-login" role="tabpanel" aria-labelledby="tab-login" novalidate ${signup ? 'hidden' : ''}>
    <div class="ta-field">
      <label class="ta-label" for="login-id">Username or Email</label>
      <input class="ta-input" id="login-id" name="identifier" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="name or email wey you take sign up" required>
    </div>
    <div class="ta-field">
      <label class="ta-label" for="login-pw">Password</label>
      <div class="ta-pw"><input class="ta-input" id="login-pw" name="password" type="password" autocomplete="current-password" placeholder="wetin be your password?" required>${eyeButton('login-pw')}</div>
      <div class="ta-forgot-row"><button type="button" class="ta-forgot" id="forgot">I don forget my password!</button></div>
    </div>
    <div class="ta-msg" role="alert" aria-live="polite"></div>
    <button class="ta-btn" type="submit" data-label="Oyaaaa Enterr">Oyaaaa Enterr</button>
  </form>

  <form class="ta-form" id="panel-signup" role="tabpanel" aria-labelledby="tab-signup" novalidate ${signup ? '' : 'hidden'}>
    <div class="ta-field">
      <label class="ta-label" for="su-name">Your name</label>
      <input class="ta-input" id="su-name" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" placeholder="Username" required aria-describedby="su-name-hint">
      <p class="ta-hint" id="su-name-hint">This is your player name on Tap Am. Letters, numbers and _ only.</p>
    </div>
    <div class="ta-field">
      <label class="ta-label" for="su-pw">Password</label>
      <div class="ta-pw"><input class="ta-input" id="su-pw" name="password" type="password" autocomplete="new-password" minlength="8" placeholder="make am strong o" required aria-describedby="su-pw-hint">${eyeButton('su-pw')}</div>
      <p class="ta-hint" id="su-pw-hint">At least 8 characters. Not 123456 😅</p>
    </div>
    <div class="ta-field">
      <label class="ta-label" for="su-email">Email <small>(optional)</small></label>
      <input class="ta-input" id="su-email" name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="you@example.com" aria-describedby="su-email-hint">
      <p class="ta-hint" id="su-email-hint">You can log in with it too. We never send you codes.</p>
    </div>
    <div class="ta-field">
      <span class="ta-label" id="su-dob-label">Date of birth</span>
      <div role="group" aria-labelledby="su-dob-label">${dobSelects()}</div>
    </div>
    <label class="ta-check"><input type="checkbox" name="agree" required>
      <span>I'm ${MIN_AGE}+ and I agree to the <a href="/terms" target="_blank" rel="noopener">Terms</a>, <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a> and <a href="/disclaimer" target="_blank" rel="noopener">Disclaimer</a>.</span>
    </label>
    <div class="ta-msg" role="alert" aria-live="polite"></div>
    <button class="ta-btn" type="submit" data-label="Oya, create my account">Oya, create my account</button>
  </form>
</section>
${poweredBy()}
</main>`;

  const script = `
(function(){
var COMMON=${JSON.stringify(COMMON_PASSWORDS)},MIN_AGE=${MIN_AGE};
var tabs={login:document.getElementById('tab-login'),signup:document.getElementById('tab-signup')};
var panels={login:document.getElementById('panel-login'),signup:document.getElementById('panel-signup')};
function show(mode,push){
  for(var k in tabs){var on=k===mode;tabs[k].setAttribute('aria-selected',on);panels[k].hidden=!on;}
  if(push&&location.pathname!=='/'+mode)history.replaceState(null,'','/'+mode+location.search);
  document.title=(mode==='signup'?'Sign up':'Login')+' | Tap Am';
}
for(var k in tabs)(function(mode){tabs[mode].addEventListener('click',function(e){e.preventDefault();show(mode,true);});})(k);

document.querySelectorAll('.ta-eye').forEach(function(b){b.addEventListener('click',function(){
  var input=document.getElementById(b.dataset.toggle),showing=input.type==='text';
  input.type=showing?'password':'text';b.setAttribute('aria-pressed',!showing);b.setAttribute('aria-label',showing?'Show password':'Hide password');
});});

document.getElementById('forgot').addEventListener('click',function(){
  msg(panels.login,'ok','No wahala. Password reset never ready yet, so send us your username through the <a href="/suggest">Suggest page</a> and we go help you sort am.');
});

function msg(form,kind,html){var m=form.querySelector('.ta-msg');m.className='ta-msg '+(html?kind:'');m.innerHTML=html||'';}
function bad(el,text,form){el.classList.add('is-invalid');el.focus();msg(form,'err',text);return false;}
function clearBad(form){form.querySelectorAll('.is-invalid').forEach(function(el){el.classList.remove('is-invalid')});msg(form,'','');}
document.querySelectorAll('.ta-form').forEach(function(f){f.addEventListener('input',function(e){e.target.classList.remove('is-invalid')});f.addEventListener('change',function(e){e.target.classList.remove('is-invalid')});});

function age(y,m,d){var t=new Date(),a=t.getFullYear()-y;if(t.getMonth()+1<m||(t.getMonth()+1===m&&t.getDate()<d))a--;return a;}
function realDate(y,m,d){var dt=new Date(y,m-1,d);return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d;}

function validateSignup(f){
  var u=f.username.value.trim(),p=f.password.value,e=f.email.value.trim();
  if(!/^[A-Za-z0-9_]{3,24}$/.test(u))return bad(f.username,'Your name must be 3–24 letters, numbers or _ (no spaces).',f);
  if(p.length<8)return bad(f.password,'Password must be at least 8 characters.',f);
  if(COMMON.indexOf(p.toLowerCase())>-1||/^(.)\\1+$/.test(p)||/^(0123456789|1234567890|9876543210)/.test(p))return bad(f.password,'That password too common. Not 123456 😅',f);
  if(p.toLowerCase()===u.toLowerCase())return bad(f.password,'Password no fit be the same as your name.',f);
  if(e&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(e))return bad(f.email,'That email no look correct.',f);
  var d=+f.dob_day.value,m=+f.dob_month.value,y=+f.dob_year.value;
  if(!d)return bad(f.dob_day,'Pick the day you were born.',f);
  if(!m)return bad(f.dob_month,'Pick the month you were born.',f);
  if(!y)return bad(f.dob_year,'Pick the year you were born.',f);
  if(!realDate(y,m,d))return bad(f.dob_day,'That date no exist. Check the day and month.',f);
  if(age(y,m,d)<MIN_AGE)return bad(f.dob_year,'Sorry, Tap Am is for '+MIN_AGE+'+ only.',f);
  if(!f.agree.checked)return bad(f.agree,'Tick the box to agree to the Terms, Privacy Policy and Disclaimer.',f);
  return true;
}
function validateLogin(f){
  if(!f.identifier.value.trim())return bad(f.identifier,'Enter your name or email.',f);
  if(!f.password.value)return bad(f.password,'Enter your password.',f);
  return true;
}

async function submit(f,url,payload){
  var btn=f.querySelector('.ta-btn');btn.disabled=true;btn.textContent='Small wait…';
  try{
    var r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    var j={};try{j=await r.json()}catch(_){}
    if(r.ok){msg(f,'ok',(j.message||'Done')+'. Taking you in…');setTimeout(function(){location.href='/dashboard'},350);return;}
    msg(f,'err',(j.error||'Something no work. Try again.').replace(/</g,'&lt;'));
  }catch(_){msg(f,'err','Network wahala. Check your connection and try again.');}
  btn.disabled=false;btn.textContent=btn.dataset.label;
}

panels.login.addEventListener('submit',function(e){e.preventDefault();var f=e.target;clearBad(f);if(!validateLogin(f))return;
  submit(f,'/api/login',{identifier:f.identifier.value.trim(),password:f.password.value});});
panels.signup.addEventListener('submit',function(e){e.preventDefault();var f=e.target;clearBad(f);if(!validateSignup(f))return;
  submit(f,'/api/signup',{username:f.username.value.trim(),password:f.password.value,email:f.email.value.trim(),dob:f.dob_year.value+'-'+f.dob_month.value+'-'+f.dob_day.value,agree:f.agree.checked});});
})();`;

  return themeShell({ title: signup ? 'Sign up' : 'Login', body, script });
}

