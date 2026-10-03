const K="ders-v1";
let a=JSON.parse(localStorage.getItem(K)||"[]"),d=new Date(),ocrDrafts=[];
const $=s=>document.querySelector(s);
const key=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
const save=()=>localStorage.setItem(K,JSON.stringify(a));
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

function toast(msg){
  const t=$("#toast");t.textContent=msg;t.hidden=false;
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,2600);
}

function r(){
  let k=key(d),x=a.filter(t=>t.date===k),n=x.filter(t=>t.done).length,p=x.length?Math.round(n/x.length*100):0;
  $("#date").value=k;$("#taskDate").value=k;$("#ocrBaseDate").value=k;
  $("#title").textContent=new Intl.DateTimeFormat("tr-TR",{weekday:"long",day:"numeric",month:"long"}).format(d);
  $("#count").textContent=`${n} / ${x.length} tamamlandı`;$("#pct").textContent=p+"%";$("#bar").value=p;$("#empty").hidden=!!x.length;
  $("#list").innerHTML=x.map(t=>`<div class="task ${t.done?"done":""}" data-id="${esc(t.id)}"><button class="check">✓</button><div><div class="subject">${esc(t.subject)}</div><div class="detail">${esc(t.detail)}</div></div><button class="delete">×</button></div>`).join("");
}

function mv(n){d.setDate(d.getDate()+n);r()}
$("#prev").onclick=()=>mv(-1);$("#next").onclick=()=>mv(1);$("#today").onclick=()=>{d=new Date();r()};
$("#date").onchange=e=>{d=new Date(e.target.value+"T12:00:00");r()};
$("#add").onclick=()=>$("#dlg").showModal();$("#cancel").onclick=()=>$("#dlg").close();
$("#form").onsubmit=e=>{e.preventDefault();a.push({id:uid(),subject:$("#subject").value.trim(),detail:$("#detail").value.trim(),date:$("#taskDate").value,done:false});save();$("#subject").value="";$("#detail").value="";$("#dlg").close();r()};
$("#list").onclick=e=>{let c=e.target.closest(".task");if(!c)return;if(e.target.closest(".check"))a=a.map(t=>t.id===c.dataset.id?{...t,done:!t.done}:t);if(e.target.closest(".delete"))a=a.filter(t=>t.id!==c.dataset.id);save();r()};

const dayMap={"pazar":0,"pazartesi":1,"salı":2,"sali":2,"çarşamba":3,"carsamba":3,"perşembe":4,"persembe":4,"cuma":5,"cumartesi":6};
function nextWeekday(baseKey,weekday){
  const base=new Date(baseKey+"T12:00:00");
  const diff=(weekday-base.getDay()+7)%7;
  base.setDate(base.getDate()+diff);
  return key(base);
}
function explicitDate(line,baseKey){
  const iso=line.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if(iso)return `${iso[1]}-${String(iso[2]).padStart(2,"0")}-${String(iso[3]).padStart(2,"0")}`;
  const m=line.match(/\b(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?\b/);
  if(!m)return null;
  let year=m[3]?Number(m[3]):new Date(baseKey+"T12:00:00").getFullYear();if(year<100)year+=2000;
  const dt=new Date(year,Number(m[2])-1,Number(m[1]),12);
  return Number.isNaN(dt.getTime())?null:key(dt);
}
function splitTask(text,time){
  let subject="Program",detail=text.trim();
  const parts=detail.split(/\s+(?:-|–|—|:)\s+/);
  if(parts.length>1&&parts[0].length<=40){subject=parts.shift().trim()||"Program";detail=parts.join(" - ").trim()||subject}
  else if(detail.length<=36){subject=detail;detail="Fotoğraftan eklendi"}
  if(time)detail=`${time} · ${detail}`;
  return {subject,detail};
}
function parseOcr(){
  const raw=$("#ocrText").value.replace(/\r/g,"");
  const base=$("#ocrBaseDate").value||key(d);
  const lines=raw.split("\n").map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean);
  let currentDate=base;const out=[];
  for(let original of lines){
    let line=original;
    if(/^(ders program[ıi]|program|tarih|gün|gun)$/i.test(line))continue;
    const lower=line.toLocaleLowerCase("tr-TR");
    const day=Object.keys(dayMap).find(x=>new RegExp(`^${x}(?:\\b|\\s|:|-)`,"i").test(lower));
    if(day){currentDate=nextWeekday(base,dayMap[day]);line=line.replace(new RegExp(`^${day}\\s*[:\\-]?\\s*`,`i`),"").trim();if(!line)continue;}
    const foundDate=explicitDate(line,base);if(foundDate)currentDate=foundDate;
    line=line.replace(/\b(?:20\d{2}-\d{1,2}-\d{1,2}|\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{2,4})?)\b/g,"").trim();
    const tm=line.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);const time=tm?`${String(tm[1]).padStart(2,"0")}:${tm[2]}`:"";
    if(tm)line=line.replace(tm[0],"").replace(/^[-–—:·\s]+|[-–—:·\s]+$/g,"").trim();
    if(line.length<2)continue;
    const task=splitTask(line,time);out.push({date:currentDate,subject:task.subject,detail:task.detail,selected:true});
  }
  ocrDrafts=out;renderOcrDrafts();
}
function renderOcrDrafts(){
  const wrap=$("#ocrTasks");
  if(!ocrDrafts.length){wrap.innerHTML='<div class="ocr-empty">Göreve dönüştürülebilecek satır bulunamadı. Metni düzeltip “Tekrar ayır”a basabilirsin.</div>';return}
  wrap.innerHTML=`<div class="ocr-summary">${ocrDrafts.length} görev taslağı bulundu</div>`+ocrDrafts.map((t,i)=>`<div class="ocr-task" data-i="${i}"><label class="pick"><input class="ocr-check" type="checkbox" ${t.selected?"checked":""}> Ekle</label><input class="ocr-date" type="date" value="${esc(t.date)}"><input class="ocr-subject" value="${esc(t.subject)}" placeholder="Ders"><textarea class="ocr-detail" rows="2" placeholder="Görev">${esc(t.detail)}</textarea></div>`).join("");
}
function readDraftsFromUi(){
  return [...document.querySelectorAll(".ocr-task")].map(el=>({selected:el.querySelector(".ocr-check").checked,date:el.querySelector(".ocr-date").value,subject:el.querySelector(".ocr-subject").value.trim()||"Program",detail:el.querySelector(".ocr-detail").value.trim()}));
}

$("#photo").onclick=()=>{
  if(globalThis.AndroidOCR?.pickImage){toast("Fotoğrafı seç…");AndroidOCR.pickImage()}
  else toast("Fotoğraftan ekleme Android uygulamasında çalışır.");
};
window.onOcrResult=text=>{
  if(!text?.trim()){toast("Fotoğrafta okunabilir metin bulunamadı.");return}
  $("#ocrText").value=text;$("#ocrBaseDate").value=key(d);parseOcr();$("#ocrDlg").showModal();
};
window.onOcrError=msg=>toast("Fotoğraf okunamadı: "+(msg||"Bilinmeyen hata"));
$("#ocrParse").onclick=parseOcr;
$("#ocrClose").onclick=$("#ocrCancel").onclick=()=>$("#ocrDlg").close();
$("#ocrSave").onclick=()=>{
  const rows=readDraftsFromUi().filter(x=>x.selected&&x.date&&x.detail);
  if(!rows.length){toast("Eklenecek görev seçilmedi.");return}
  rows.forEach(x=>a.push({id:uid(),subject:x.subject,detail:x.detail,date:x.date,done:false}));
  save();$("#ocrDlg").close();if(rows[0]?.date)d=new Date(rows[0].date+"T12:00:00");r();toast(`${rows.length} görev programa eklendi.`);
};
r();
