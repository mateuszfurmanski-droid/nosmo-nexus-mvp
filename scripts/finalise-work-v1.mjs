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
  fs.writeFileSync(p,s);
}

// Keep old availability persistence compatible while exposing exactly the V1 states.
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

// Persist Find Work controls across navigation without changing the existing search engine.
const workHub=path.join(root,'js/work-hub.js');
if(fs.existsSync(workHub)){
  let s=fs.readFileSync(workHub,'utf8');
  s=s.replace('function bind(){STATUSES.forEach',`function restoreSearchState(){try{const s=JSON.parse(localStorage.getItem("nosmo-work:v1:job-search")||"{}");[["jobSearchInput","input"],["jobStatusFilter","change"],["constructionTradeFilter","change"]].forEach(([id,type])=>{const el=q("#"+id);if(el&&s[id]!=null)el.value=s[id]})}catch(_){}}\n  function bind(){restoreSearchState();STATUSES.forEach`);
  fs.writeFileSync(workHub,s);
}

// Generate deterministic PNG launcher icons using only Node stdlib.
function crc32(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function chunk(type,data){const t=Buffer.from(type);const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc])}
function png(size,maskable=false){
  const zlib=require('node:zlib');
  const raw=Buffer.alloc((size*4+1)*size);const cx=size/2,cy=size/2;
  for(let y=0;y<size;y++){const row=y*(size*4+1);raw[row]=0;for(let x=0;x<size;x++){
    const i=row+1+x*4;const r=Math.hypot(x-cx,y-cy);let R=2,G=7,B=19,A=255;
    if(maskable&&r>size*.48){R=0;G=0;B=0}
    if(r<size*.38){R=5;G=20;B=34}
    if(r<size*.29&&r>size*.25){R=47;G=134;B=255}
    const nx=(x-cx)/size,ny=(y-cy)/size;
    const nShape=Math.abs(nx)<.035&&Math.abs(ny)<.13 || (nx<0&&nx>-.13&&Math.abs(ny)<.13) || (nx>0&&nx<.13&&Math.abs(ny)<.13) || Math.abs(ny-nx*.9)<.035&&Math.abs(nx)<.13;
    if(nShape){R=214;G=179;B=95}
    raw[i]=R;raw[i+1]=G;raw[i+2]=B;raw[i+3]=A;
  }}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
const iconDir=path.join(root,'assets/pwa');fs.mkdirSync(iconDir,{recursive:true});
fs.writeFileSync(path.join(iconDir,'icon-192.png'),png(192));
fs.writeFileSync(path.join(iconDir,'icon-512.png'),png(512));
fs.writeFileSync(path.join(iconDir,'icon-512-maskable.png'),png(512,true));

console.log('NOSMO Work V1 finalisation patch applied.');
