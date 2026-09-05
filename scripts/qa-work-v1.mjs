import fs from 'node:fs';
import path from 'node:path';

const root='modules/person-card-freeware';
const fail=[];const pass=[];
const check=(name,ok,detail='')=>{(ok?pass:fail).push(name+(detail?' — '+detail:''))};
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const manifest=JSON.parse(read('manifest.webmanifest'));
check('manifest name',manifest.name==='NOSMO Work');
check('manifest start_url',manifest.start_url==='./index.html');
check('manifest standalone',['standalone','fullscreen','minimal-ui'].includes(manifest.display));
check('manifest scope',manifest.scope==='./');
check('manifest 192 icon',manifest.icons.some(i=>i.sizes==='192x192'&&i.type==='image/png'));
check('manifest 512 icon',manifest.icons.some(i=>i.sizes==='512x512'&&i.type==='image/png'));
check('manifest maskable icon',manifest.icons.some(i=>String(i.purpose).includes('maskable')));

for(const file of ['index.html','screen.html','onboarding.html','section.html']){
  const s=read(file);
  check(file+' manifest link',s.includes('rel="manifest"')&&s.includes('manifest.webmanifest'));
  check(file+' V1 css',s.includes('work-v1-final.css'));
  check(file+' V1 runtime',s.includes('work-v1-runtime.js'));
  check(file+' no legacy purple',!/#9a64ff/i.test(s));
  check(file+' no old availability option',!s.includes('value="not-looking"'));
}

const runtime=read('js/work-v1-runtime.js');
check('runtime install prompt',runtime.includes('beforeinstallprompt'));
check('runtime service worker',runtime.includes("register('./sw.js'"));
check('runtime state persistence',runtime.includes('nosmo-work:v1:theme')&&runtime.includes('nosmo-work:v1:language')&&runtime.includes('nosmo-work:v1:availability'));
check('runtime three availability states',runtime.includes("['available','busy','from-date']"));
check('runtime current flag control',runtime.includes('workLangButton')&&runtime.includes('langInfo'));
check('runtime Ask Nexus logo entry',runtime.includes('bindAskNexus'));
check('runtime search persistence',runtime.includes('nosmo-work:v1:job-search'));
const languageCodes=[...runtime.matchAll(/\['([a-z]{2})','/g)].map(m=>m[1]);
check('17 language layer',new Set(languageCodes).size>=17,'found '+new Set(languageCodes).size);

const css=read('css/work-v1-final.css');
check('responsive narrow breakpoint',css.includes('@media (max-width:380px)'));
check('tablet breakpoint',css.includes('@media (min-width:600px)'));
check('larger bottom nav',css.includes('height:82px!important'));
check('larger top controls',css.includes('height:48px!important'));
check('light theme coverage',css.includes('data-work-theme="light"'));
check('no purple literal',!/#9a64ff/i.test(css));
check('overflow protection',css.includes('overflow-x:hidden')&&css.includes('overflow-wrap:anywhere'));

const sw=read('sw.js');
check('service worker versioned cache',sw.includes('nosmo-work-v1-'));
check('service worker update cleanup',sw.includes('caches.delete'));
check('API bypass',sw.includes("url.pathname.includes('/api/')"));
check('navigation fallback',sw.includes("caches.match('./index.html')"));

for(const icon of ['assets/pwa/icon-192.png','assets/pwa/icon-512.png','assets/pwa/icon-512-maskable.png']){
  const p=path.join(root,icon);const exists=fs.existsSync(p);check(icon+' exists',exists);
  if(exists){const b=fs.readFileSync(p);check(icon+' PNG signature',b.length>32&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));}
}

const profile=read('js/person-work-profile.js');
check('profile uses Busy state',profile.includes('"Busy"')&&!profile.includes('return "Not Looking";'));
const workHub=read('js/work-hub.js');
check('Find Work restore hook',workHub.includes('restoreSearchState'));

console.log('\nNOSMO WORK V1 QA');
for(const p of pass)console.log('PASS',p);
for(const f of fail)console.error('FAIL',f);
console.log(`\n${pass.length} passed; ${fail.length} failed.`);
if(fail.length)process.exit(1);
