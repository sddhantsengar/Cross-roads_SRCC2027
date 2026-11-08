const SHEET_URL = "https://script.google.com/macros/s/AKfycbzlfUOdxa-ig1yNTLuvXNrlQXvlSVvR5yA0BqRgZ2W7KbfwiI0eJxV3Gf6Yo0Xcu_rm/exec";
/* ---------- DATA ---------- */
const DOMAINS = [
  {id:"core",  label:"Core",   desc:"Run the backbone of the event"},
  {id:"event", label:"Events", desc:"Plan and execute on the ground"},
  {id:"tech",  label:"Tech",   desc:"Design, build and create"}
];
const SUBS = {
  core:  {title:"Core team: your role preference", note:"Rank all four. Your top pick is your first choice.",
          items:["Marketing & Media","Sponsorship","Outreach","Logistics & Operations"]},
  event: {title:"Events team: your role preference", note:"Rank the two options.",
          items:["Sponsorship","Outreach"]},
  tech:  {title:"Tech team: rank by your strongest skills", note:"Put your strongest skill first, and your second strongest next.",
          items:["Graphic Designing / Digital Art","Video Editing","Web Development"]}
};
const order = {
  domain: DOMAINS.map(d=>d.id),
  core: [...SUBS.core.items], event: [...SUBS.event.items], tech: [...SUBS.tech.items]
};
const ORD = ["1st","2nd","3rd"];
const LABEL = {core:"Core", event:"Events", tech:"Tech"};
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---------- DRAFT: keeps answers while the person visits the roles page and comes back ---------- */
const DRAFT="cr27-draft";
const TEXT_IDS=["name","roll","phone","email","drive","contrib","commit"];
function saveDraft(){
  try{
    const f={}; TEXT_IDS.forEach(id=>f[id]=$("#"+id).value); f.year=$("#year").checked;
    sessionStorage.setItem(DRAFT,JSON.stringify({f,order}));
  }catch(e){}
}
function loadDraft(){
  try{
    const d=JSON.parse(sessionStorage.getItem(DRAFT)||"null"); if(!d) return;
    TEXT_IDS.forEach(id=>{if(typeof d.f[id]==="string") $("#"+id).value=d.f[id];});
    $("#year").checked=!!d.f.year;
    ["domain","core","event","tech"].forEach(k=>{
      const saved=d.order&&d.order[k];
      if(Array.isArray(saved)&&saved.length===order[k].length&&order[k].every(x=>saved.includes(x))) order[k]=saved;
    });
    $("#c1").textContent=$("#contrib").value.length;
    $("#c2").textContent=$("#commit").value.length;
  }catch(e){}
}
loadDraft();

/* ---------- RANKER ---------- */
function move(list,i,dir){
  const j=i+dir; if(j<0||j>=list.length) return;
  [list[i],list[j]]=[list[j],list[i]];
}
function rankHTML(list,key,labelOf,descOf,tags){
  return list.map((v,i)=>`
    <li>
      <span class="n">${i+1}</span>
      <div class="t"><b>${esc(labelOf(v))}${tags&&tags(i)?`<span class="tag">${tags(i)}</span>`:""}</b>${descOf?`<span>${esc(descOf(v))}</span>`:""}</div>
      <div class="mv">
        <button type="button" data-k="${key}" data-i="${i}" data-d="-1" aria-label="Move ${esc(labelOf(v))} up" ${i===0?"disabled":""}>▲</button>
        <button type="button" data-k="${key}" data-i="${i}" data-d="1" aria-label="Move ${esc(labelOf(v))} down" ${i===list.length-1?"disabled":""}>▼</button>
      </div>
    </li>`).join("");
}
function render(){
  const dm=Object.fromEntries(DOMAINS.map(d=>[d.id,d]));
  $("#rank-domain").innerHTML=rankHTML(order.domain,"domain",id=>dm[id].label,id=>dm[id].desc,i=>i===0?"Top choice":"");
  $("#subs").innerHTML=order.domain.map((id,idx)=>`
    <div class="sub">
      <h3>${SUBS[id].title}<span class="pill">${ORD[idx]} priority team</span></h3>
      <p>${SUBS[id].note}</p>
      <ul class="rank">${rankHTML(order[id],id,v=>v,null,i=>(id==="tech"&&i<2)?(i===0?"First priority":"Second priority"):"")}</ul>
    </div>`).join("");
}
document.addEventListener("click",e=>{
  const b=e.target.closest(".mv button"); if(!b) return;
  const k=b.dataset.k,i=+b.dataset.i,d=+b.dataset.d;
  move(k==="domain"?order.domain:order[k],i,d);
  render();
  syncWork();
  saveDraft();
  const nb=document.querySelector(`.mv button[data-k="${k}"][data-i="${i+d}"][data-d="${d}"]:not(:disabled)`)||
           document.querySelector(`.mv button[data-k="${k}"][data-i="${i+d}"]:not(:disabled)`);
  if(nb) nb.focus();
});
render();

/* ---------- WORK SAMPLES: required only if Tech is the 1st or 2nd team ---------- */
const techOpted=()=>order.domain.indexOf("tech")<2;
function syncWork(){
  const on=techOpted();
  $("#workBadge").textContent=on?"Required":"Optional";
  $("#workBadge").classList.toggle("req",on);
  $("#workWarn").classList.toggle("on",on);
  $("#driveErr").textContent=on&&!$("#drive").value.trim()?"Tech is in your top two, so a Drive link is compulsory.":"Enter a valid link starting with https://";
  if(!on&&!$("#drive").value.trim()) $("#driveField").classList.remove("invalid");
}
syncWork();

$("#year").addEventListener("change",e=>$("#yearField").classList.toggle("invalid",!e.target.checked));

document.addEventListener("input",saveDraft);
document.addEventListener("change",saveDraft);

/* ---------- COUNTERS ---------- */
[["#contrib","#c1"],["#commit","#c2"]].forEach(([a,b])=>$(a).addEventListener("input",e=>$(b).textContent=e.target.value.length));

/* ---------- VALIDATION ---------- */
const rules={
  name:v=>v.trim().split(/\s+/).filter(Boolean).length>=2,
  roll:v=>v.trim().length>=2,
  phone:v=>{let d=v.replace(/\D/g,"");if(d.length===12&&d.startsWith("91"))d=d.slice(2);return /^[6-9]\d{9}$/.test(d);},
  email:v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
  drive:v=>{const t=v.trim();return t===""?!techOpted():/^https?:\/\/\S+\.\S+/.test(t);}
};
function check(id){
  const el=document.getElementById(id),ok=rules[id](el.value);
  el.closest("[data-field]").classList.toggle("invalid",!ok);
  return ok;
}
Object.keys(rules).forEach(id=>{
  const el=document.getElementById(id);
  el.addEventListener("blur",()=>check(id));
  el.addEventListener("input",()=>{syncWork();if(el.closest("[data-field]").classList.contains("invalid"))check(id);});
});

/* ---------- BUILD THE ROW FOR GOOGLE SHEETS ----------
   Every ranking is sent as separate numbered fields (team1, core1, tech1 …),
   so each rank gets its own column in the sheet. */
function buildPayload(){
  const p={
    fullName:$("#name").value.trim(),
    year:"Second year",
    rollNumber:$("#roll").value.trim(),
    email:$("#email").value.trim(),
    contact:$("#phone").value.replace(/\D/g,"").slice(-10),
    teamSummary:order.domain.map((id,i)=>`${i+1}. ${LABEL[id]}`).join("  >  "),
    driveLink:$("#drive").value.trim(),
    contribution:$("#contrib").value.trim(),
    commitments:$("#commit").value.trim(),
    submittedAt:new Date().toISOString()
  };
  order.domain.forEach((id,i)=>p["team"+(i+1)]=LABEL[id]);
  order.core.forEach((v,i)=>p["core"+(i+1)]=v);
  order.event.forEach((v,i)=>p["event"+(i+1)]=v);
  order.tech.forEach((v,i)=>p["tech"+(i+1)]=v);
  return p;
}

/* ---------- SUBMIT ---------- */
$("#form").addEventListener("submit",async e=>{
  e.preventDefault();
  const yearOk=$("#year").checked;
  $("#yearField").classList.toggle("invalid",!yearOk);
  const results=[...Object.keys(rules).map(check),yearOk];
  if(results.includes(false)){
    document.querySelector(".invalid")?.scrollIntoView({behavior:"smooth",block:"center"});
    return;
  }
   const btn=$("#submit");
  btn.disabled=true; btn.textContent="Submitting…";
  try{
    const payload=buildPayload();
    const r=await fetch(SHEET_URL,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload)
    });
    const out=await r.json();
    if(!out.ok) throw new Error(out.error||"Could not save your application");
    try{sessionStorage.removeItem(DRAFT);}catch(e){}
    showDone(payload);
  }catch(err){
    btn.disabled=false; btn.textContent="Submit application";
    alert("Couldn't submit: "+err.message+". Please try again.");
  }
});

function showDone(p){
  $("#form").style.display="none";
  const d=$("#done");
  d.innerHTML=`
    <h2>Application received, ${esc(p.fullName.split(" ")[0])}.</h2>
    <p>We'll email <b>${esc(p.email)}</b> after shortlisting. Here's what you sent:</p>
    <dl>
      <dt>Team priority</dt><dd>${esc(p.teamSummary)}</dd>
      <dt>Core roles</dt><dd>${order.core.map(esc).join(" → ")}</dd>
      <dt>Events roles</dt><dd>${order.event.map(esc).join(" → ")}</dd>
      <dt>Tech skills</dt><dd>${order.tech.map(esc).join(" → ")}</dd>
      <dt>Work samples</dt><dd>${p.driveLink?esc(p.driveLink):"Not added"}</dd>
    </dl>`;
  d.style.display="block";
  d.scrollIntoView({behavior:"smooth",block:"start"});
}
