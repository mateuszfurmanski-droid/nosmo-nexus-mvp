import fs from 'node:fs';
import path from 'node:path';

const root='modules/person-card-freeware';
const htmlFiles=['index.html','screen.html','onboarding.html','section.html','about.html','directory.html'];
const runtimeTag='<script src="./js/work-v1-runtime.js?v=1"></script>';
const styleTag='<link rel="stylesheet" href="./css/work-v1-final.css?v=1">';
const manifestTag='<link rel="manifest" href="./manifest.webmanifest">';
const earlyTheme=`<script>(function(){try{var t=localStorage.getItem('nosmo-work:v1:theme');if(!t&&matchMedia('(prefers-color-scheme: light)').matches)t='light';document.documentElement.dataset.workTheme=t||'dark'}catch(_){document.documentElement.dataset.workTheme='dark'}})();</script>`;

function insertOnce(text,needle,value,before=true){
  if(text.includes(value))return text;
  const at=text.indexOf(needle);if(at<0)return text;
  return before?text.slice(0,at)+value+'\n'+text.slice(at):text.slice(0,at+needle.length)+'\n'+value+text.slice(at+needle.length);
}

for(const file of htmlFiles){
  const p=path.join(root,file);if(!fs.existsSync(p))continue;
  let s=fs.readFileSync(p,'utf8');
  s=insertOnce(s,'</head>',manifestTag,true);
  s=insertOnce(s,'</head>',styleTag,true);
  s=insertOnce(s,'</head>',earlyTheme,true);
  s=insertOnce(s,'</body>',runtimeTag,true);
  s=s.replaceAll('#9a64ff','#d6b35f').replaceAll('#9A64FF','#D6B35F');
  s=s.replace(/<option value="not-looking">Not looking<\/option>/g,'<option value="busy">Busy</option>');
  s=s.replace(/<title>[^<]*<\/title>/i,'<title>NOSMO Work</title>');
  fs.writeFileSync(p,s);
}

const profileJs=path.join(root,'js/person-work-profile.js');
if(fs.existsSync(profileJs)){
  let s=fs.readFileSync(profileJs,'utf8');
  s=s.replaceAll('a.status==="not-looking"','a.status==="busy"');
  s=s.replaceAll('state&&state.value==="not-looking"?"Not Looking":state&&state.value==="from-date"?"From Date":"Available"','state&&state.value==="busy"?"Busy":state&&state.value==="from-date"?"Ready on date":"Available"');
  s=s.replaceAll('return "Not Looking";','return "Busy";');
  s=s.replaceAll('return a.availableFrom ? "From "+a.availableFrom : "From Date";','return a.availableFrom ? "Ready on "+a.availableFrom : "Ready on date";');
  fs.writeFileSync(profileJs,s);
}

const onboardingJs=path.join(root,'js/person-onboarding-v47.js');
if(fs.existsSync(onboardingJs)){
  let s=fs.readFileSync(onboardingJs,'utf8');
  s=s.replaceAll('not-looking','busy').replaceAll('Not looking','Busy').replaceAll('Not Looking','Busy');
  fs.writeFileSync(onboardingJs,s);
}

const workHub=path.join(root,'js/work-hub.js');
if(fs.existsSync(workHub)){
  let s=fs.readFileSync(workHub,'utf8');
  s=s.replace('function bind(){STATUSES.forEach',`function restoreSearchState(){try{const s=JSON.parse(localStorage.getItem("nosmo-work:v1:job-search")||"{}");[["jobSearchInput","input"],["jobStatusFilter","change"],["constructionTradeFilter","change"]].forEach(([id,type])=>{const el=q("#"+id);if(el&&s[id]!=null)el.value=s[id]})}catch(_){}}\n  function bind(){restoreSearchState();STATUSES.forEach`);
  fs.writeFileSync(workHub,s);
}

const runtimeJs=path.join(root,'js/work-v1-runtime.js');
if(fs.existsSync(runtimeJs)){
  let s=fs.readFileSync(runtimeJs,'utf8');
  s=s.replace("root.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(get(key))el.textContent=get(key)});","root.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.dataset.i18n,value=get(key);if(value&&el.textContent!==value)el.textContent=value});");
  s=s.replace("Array.from(select.options).forEach(opt=>{if(opt.value==='available')opt.textContent=get('available');if(opt.value==='busy'||opt.value==='not-looking')opt.textContent=get('busy');if(opt.value==='from-date')opt.textContent=get('ready')});","Array.from(select.options).forEach(opt=>{const value=opt.value==='available'?get('available'):(opt.value==='busy'||opt.value==='not-looking')?get('busy'):opt.value==='from-date'?get('ready'):null;if(value&&opt.textContent!==value)opt.textContent=value});");
  fs.writeFileSync(runtimeJs,s);
}

console.log('NOSMO Work V1 finalisation patch applied.');
