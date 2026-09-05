import json, os, time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

BASE=os.environ.get('WORK_BASE_URL','http://127.0.0.1:4173').rstrip('/')
results=[]
def progress(msg): print('E2E',msg,flush=True)
def check(name, condition, detail=''):
    results.append((name,bool(condition),detail));print(('PASS' if condition else 'FAIL'),name,detail,flush=True)
    if not condition: raise AssertionError(name+((': '+detail) if detail else ''))
def js(driver, code, *args): return driver.execute_script(code,*args)
def async_js(driver, code): return driver.execute_async_script(code)
def wait(driver, seconds=6): return WebDriverWait(driver,seconds)
def open_page(driver,path):
    progress('open '+path);driver.get(BASE+path)
    wait(driver).until(lambda d: js(d,'return document.readyState') in ['interactive','complete'])
    wait(driver).until(lambda d: js(d,'return !!document.querySelector(".workLangButton")'))
def no_overflow(driver,name):
    data=js(driver,'return {sw:document.documentElement.scrollWidth,iw:window.innerWidth,bw:document.body.scrollWidth}')
    check(name+' no horizontal overflow',data['sw']<=data['iw']+2 and data['bw']<=data['iw']+2,str(data))
def click(driver,selector):
    el=wait(driver).until(EC.presence_of_element_located((By.CSS_SELECTOR,selector)))
    driver.execute_script('arguments[0].click()',el);return el

opts=Options();opts.page_load_strategy='eager';opts.add_argument('--headless=new');opts.add_argument('--no-sandbox');opts.add_argument('--disable-dev-shm-usage');opts.add_argument('--disable-gpu');opts.add_argument('--window-size=390,844');opts.set_capability('goog:loggingPrefs',{'browser':'ALL'})
driver=webdriver.Chrome(options=opts);driver.set_page_load_timeout(15);driver.set_script_timeout(8)
try:
    driver.set_window_size(390,844);open_page(driver,'/index.html')
    js(driver,"localStorage.clear(); location.reload()")
    wait(driver).until(lambda d: js(d,'return !!document.querySelector(".workLangButton")'))
    check('default theme present',js(driver,'return document.documentElement.dataset.workTheme') in ['dark','light'])
    check('current language flag English',driver.find_element(By.CSS_SELECTOR,'.workLangButton').text=='🇬🇧')
    top_h=js(driver,'return document.querySelector(".top").getBoundingClientRect().height');bottom_h=js(driver,'return document.querySelector(".appWindowNav").getBoundingClientRect().height')
    check('top bar substantial',top_h>=64,f'{top_h}px');check('bottom bar substantial',bottom_h>=78,f'{bottom_h}px');no_overflow(driver,'390px index')

    click(driver,'.workLangButton');click(driver,'.workLanguageOption[data-lang="pl"]')
    check('selected flag is current language',driver.find_element(By.CSS_SELECTOR,'.workLangButton').text=='🇵🇱');check('language persisted',js(driver,'return localStorage.getItem("nosmo-work:v1:language")')=='pl')
    open_page(driver,'/screen.html?screen=documents');check('language survives navigation',driver.find_element(By.CSS_SELECTOR,'.workLangButton').text=='🇵🇱');no_overflow(driver,'390px documents')

    click(driver,'.workLangButton');click(driver,'.workLanguageOption[data-lang="en"]')
    click(driver,'#workThemeButton')
    check('theme toggles',js(driver,'return document.documentElement.dataset.workTheme')=='light')
    open_page(driver,'/screen.html?screen=work');check('theme survives navigation',js(driver,'return document.documentElement.dataset.workTheme')=='light')
    bg=js(driver,'return getComputedStyle(document.querySelector(".appWindowNav")).backgroundColor');check('light nav is not dark orphan','0, 5, 13' not in bg,bg)

    open_page(driver,'/index.html');click(driver,'#workAvailabilityCompact');click(driver,'.workAvailabilityChoice[data-state="busy"]');click(driver,'.workAvailabilityDone')
    avail=json.loads(js(driver,'return localStorage.getItem("nosmo-work:v1:availability")'));check('Busy availability saved',avail['state']=='busy',str(avail));check('Busy compact visible','Busy' in driver.find_element(By.ID,'workAvailabilityCompact').text)
    click(driver,'#workAvailabilityCompact');click(driver,'.workAvailabilityChoice[data-state="from-date"]')
    js(driver,"const d=document.querySelector('#workReadyDateInput');d.value='2026-09-15';d.dispatchEvent(new Event('change',{bubbles:true}))");click(driver,'.workAvailabilityDone')
    avail=json.loads(js(driver,'return localStorage.getItem("nosmo-work:v1:availability")'));check('Ready on date saved',avail['state']=='from-date' and avail['date']=='2026-09-15',str(avail))

    click(driver,'.top .brand');ask_open=js(driver,'return !!document.querySelector("#workOverlay.open") || location.hash==="#ask-nexus" || !!document.querySelector("#workTitle")?.textContent?.includes("Nexus")');check('N logo opens Ask Nexus route/panel',ask_open)

    open_page(driver,'/screen.html?screen=work');search=wait(driver).until(EC.presence_of_element_located((By.ID,'jobSearchInput')));search.clear();search.send_keys('carpenter')
    wait(driver).until(lambda d: 'carpenter' in (js(d,'return localStorage.getItem("nosmo-work:v1:job-search")') or ''))
    open_page(driver,'/screen.html?screen=documents');open_page(driver,'/screen.html?screen=work');check('Find Work query survives navigation',driver.find_element(By.ID,'jobSearchInput').get_attribute('value')=='carpenter')

    manifest=async_js(driver,"const done=arguments[0];fetch('./manifest.webmanifest').then(r=>r.json()).then(done).catch(e=>done({error:String(e)}));")
    check('browser can fetch manifest',manifest.get('name')=='NOSMO Work' and manifest.get('display')=='standalone',str(manifest))
    reg=async_js(driver,"const done=arguments[0];navigator.serviceWorker.getRegistration('./').then(r=>done(!!r)).catch(()=>done(false));");check('service worker registers in browser',reg)
    driver.refresh();wait(driver).until(lambda d: js(d,'return document.readyState') in ['interactive','complete']);time.sleep(.3);check('service worker controls reopened app',js(driver,'return !!navigator.serviceWorker.controller'))

    for width,height,label in [(320,720,'Fold narrow'),(360,800,'small Android'),(673,841,'Fold wide'),(768,1024,'tablet')]:
        driver.set_window_size(width,height);open_page(driver,'/screen.html?screen=work-mode');no_overflow(driver,label);nav=js(driver,'return document.querySelector(".appWindowNav").getBoundingClientRect()');check(label+' nav visible',nav['bottom']<=height+2 and nav['width']<=width+2,str(nav))

    driver.set_window_size(390,844);open_page(driver,'/onboarding.html');check('onboarding language control',bool(driver.find_elements(By.CSS_SELECTOR,'.workLangButton')));no_overflow(driver,'onboarding')
    severe=[x for x in driver.get_log('browser') if x.get('level')=='SEVERE' and 'favicon' not in x.get('message','').lower()];check('no severe browser console errors',len(severe)==0,json.dumps(severe[:4]))
finally:
    driver.quit()

print('\nNOSMO WORK V1 BROWSER E2E',flush=True)
for name,ok,detail in results: print(('PASS' if ok else 'FAIL'),name,detail,flush=True)
print(f'\n{sum(1 for _,ok,_ in results if ok)} passed; {sum(1 for _,ok,_ in results if not ok)} failed.',flush=True)
