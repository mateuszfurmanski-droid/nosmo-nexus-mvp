(function(){
  "use strict";
  const KEY="nosmo-person-card-freeware:file-registry/v1";
  const $=id=>document.getElementById(id);
  let selected=[];

  function esc(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));}
  function fmtBytes(n){if(n<1024)return n+" B";if(n<1024*1024)return (n/1024).toFixed(1)+" KB";return (n/1024/1024).toFixed(1)+" MB";}
  function registry(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch(_){return []}}
  function save(rows){localStorage.setItem(KEY,JSON.stringify(rows));}
  function message(text,kind){const el=$("message");if(!el)return;el.textContent=text;el.dataset.kind=kind||"info";}
  function renderQueue(){
    const q=$("queue"); if(!q)return;
    $("queueTitle").textContent=selected.length?selected.length+" file(s) selected":"No files selected";
    q.innerHTML=selected.length?selected.map((f,i)=>'<div class="file-row"><strong>'+esc(f.name)+'</strong><small>'+fmtBytes(f.size)+' · '+esc(f.type||"unknown")+'</small><button data-remove="'+i+'" type="button">×</button></div>').join(""):'';
    q.querySelectorAll("[data-remove]").forEach(btn=>btn.addEventListener("click",()=>{selected.splice(Number(btn.dataset.remove),1);renderQueue();}));
  }
  function renderRegistry(){
    const rows=registry();
    const el=$("registry"); if(!el)return;
    $("summary").textContent=rows.length?rows.length+" file record(s) attached to this local profile draft":"No profile files added yet.";
    el.innerHTML=rows.length?rows.map(r=>'<div class="registry-row"><strong>'+esc(r.name)+'</strong><small>'+fmtBytes(r.size)+' · '+esc(r.type||"unknown")+' · '+new Date(r.addedAt).toLocaleString()+'</small></div>').join(""):'<div class="empty">No profile files yet.</div>';
  }
  function addSelected(){
    if(!selected.length){message("Choose one or more files first.","warn");return;}
    const rows=registry();
    const now=new Date().toISOString();
    for(const f of selected){
      rows.push({id:(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random()),name:f.name,size:f.size,type:f.type||"",lastModified:f.lastModified,addedAt:now,storage:"metadata-only-local"});
    }
    save(rows);
    selected=[];
    renderQueue();renderRegistry();
    message("File metadata added to this Person Card draft. File contents were not uploaded.","ok");
  }
  function downloadManifest(){
    const payload={schema:"nexus-person-card-data-fetcher-manifest/v1",createdAt:new Date().toISOString(),files:registry()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="person-card-file-manifest.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  function init(){
    $("serviceStatus").textContent="standalone · local";
    $("projectKey").value="person-work-profile";
    $("projectKey").disabled=true;
    $("fileInput").addEventListener("change",e=>{selected=[...e.target.files];renderQueue();});
    $("dropzone").addEventListener("click",()=> $("fileInput").click());
    $("dropzone").addEventListener("dragover",e=>e.preventDefault());
    $("dropzone").addEventListener("drop",e=>{e.preventDefault();selected=[...e.dataTransfer.files];renderQueue();});
    $("clearBtn").addEventListener("click",()=>{selected=[];$("fileInput").value="";renderQueue();});
    $("uploadBtn").addEventListener("click",addSelected);
    $("refreshBtn").addEventListener("click",renderRegistry);
    $("confirmBtn").addEventListener("click",()=>message("Current local profile-file metadata is confirmed on this device.","ok"));
    $("manifestBtn").addEventListener("click",downloadManifest);
    renderQueue();renderRegistry();
    message("Standalone mode: metadata stays on this device until server-backed document storage is connected.","info");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();