(function(){
  "use strict";
  const PROFILE_URL="./data/person-work-profile-kamil.json";
  const ACTIVITY_KEY="nosmo-person-card-freeware:agency-desk/activity/v1";
  const q=id=>document.getElementById(id);

  function escText(value){return String(value??"").trim()}
  function displayName(personId){
    return escText(personId).replace(/^person-/,"").split("-").filter(Boolean).map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(" ")||"Worker";
  }
  function readActivity(){
    try{
      const value=JSON.parse(localStorage.getItem(ACTIVITY_KEY)||"[]");
      return Array.isArray(value)?value:[];
    }catch(_){return []}
  }
  function saveActivity(items){localStorage.setItem(ACTIVITY_KEY,JSON.stringify(items.slice(0,20)))}
  function addActivity(type,detail){
    const items=readActivity();
    items.unshift({id:"activity-"+Date.now(),type,detail,at:new Date().toISOString()});
    saveActivity(items);
    renderActivity();
    renderSummary(window.NOSMO_AGENCY_PROFILE);
  }
  function shortlistKey(profile){return "nexus-recruiter-shortlist:"+profile.personId}
  function isShortlisted(profile){
    try{return localStorage.getItem(shortlistKey(profile))==="true"}catch(_){return false}
  }
  function renderSummary(profile){
    const activity=readActivity();
    q("candidateCount").textContent=profile?1:0;
    q("shortlistCount").textContent=profile&&isShortlisted(profile)?1:0;
    q("requestCount").textContent=activity.filter(item=>item.type==="REQUEST_DRAFT_OPENED").length;
    q("offerCount").textContent=activity.filter(item=>item.type==="OFFER_DRAFT_OPENED").length;
  }
  function renderActivity(){
    const host=q("agencyActivity");
    const items=readActivity();
    host.innerHTML=items.length?items.map(item=>{
      const when=new Date(item.at).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
      return '<div class="activityRow"><strong>'+escText(item.type).replaceAll("_"," ")+'</strong><span>'+escText(item.detail)+' · '+when+'</span></div>';
    }).join(""):'<div class="empty">No local agency activity yet.</div>';
  }
  function renderCandidate(profile){
    window.NOSMO_AGENCY_PROFILE=profile;
    q("candidateName").textContent=displayName(profile.personId);
    q("candidateTrade").textContent=profile.preferences?.primaryTrade||"Trade not set";
    q("candidateLocation").textContent=(profile.preferences?.locations||[]).join(" · ")||"Location not set";
    q("candidateStatus").textContent=(profile.availability?.label||profile.availability?.status||"Unknown").toUpperCase();
    q("candidateEmployment").textContent=(profile.preferences?.employmentTypes||[]).join(" / ")||"Not set";
    q("candidateRate").textContent=profile.preferences?.rate?.display||"Not set";
    q("candidateCv").textContent=(profile.readiness?.cv?.state||"unknown").toUpperCase();
    q("candidateCerts").textContent=(profile.readiness?.certificates?.state||"unknown").toUpperCase();
    renderShortlist(profile);
    renderSummary(profile);
  }
  function renderShortlist(profile){
    const button=q("toggleShortlist");
    const badge=q("candidateStatus");
    const shortlisted=isShortlisted(profile);
    button.textContent=shortlisted?"Remove shortlist":"Shortlist";
    if(shortlisted){
      badge.classList.add("shortlisted");
      badge.textContent=(profile.availability?.label||"Available").toUpperCase()+" · SHORTLISTED";
    }else{
      badge.classList.remove("shortlisted");
      badge.textContent=(profile.availability?.label||profile.availability?.status||"Unknown").toUpperCase();
    }
  }
  function bind(profile){
    q("toggleShortlist").addEventListener("click",()=>{
      const next=!isShortlisted(profile);
      localStorage.setItem(shortlistKey(profile),String(next));
      addActivity(next?"SHORTLISTED":"REMOVED_FROM_SHORTLIST",displayName(profile.personId));
      renderShortlist(profile);
      renderSummary(profile);
    });
    q("requestPack").addEventListener("click",()=>addActivity("REQUEST_DRAFT_OPENED","Request Pack opened for "+displayName(profile.personId)));
    q("offerWork").addEventListener("click",()=>addActivity("OFFER_DRAFT_OPENED","Offer Work opened for "+displayName(profile.personId)));
    q("openRecruiter").addEventListener("click",()=>addActivity("RECRUITER_VIEW_OPENED",displayName(profile.personId)));
  }
  async function init(){
    renderActivity();
    try{
      const response=await fetch(PROFILE_URL,{cache:"no-store"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const profile=await response.json();
      renderCandidate(profile);
      bind(profile);
    }catch(error){
      q("candidateName").textContent="Worker profile unavailable";
      q("candidateTrade").textContent="Agency Desk could not load the existing Work Profile.";
      q("candidateLocation").textContent=error&&error.message?error.message:"Unknown error";
      renderSummary(null);
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();