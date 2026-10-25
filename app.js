(() => {
  "use strict";
  const BIRTH = new Date("2026-10-17T10:53:00+03:00");
  const $ = (id) => document.getElementById(id);
  const config = window.UMAY_SUPABASE_CONFIG || {};
  const configured = !!(config.url && config.anonKey && !config.url.includes("YOUR-PROJECT") && !config.anonKey.includes("YOUR-ANON-KEY"));
  const supabase = configured && window.supabase ? window.supabase.createClient(config.url, config.anonKey) : null;
  let currentUser = null, toastTimer, photoUrls = [];
  const toast = (message) => { const el = $("toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2800); };
  const dateFmt = (date, options = {}) => new Intl.DateTimeFormat("tr-TR", options).format(date);
  const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const errorText = (e) => e?.message || "Bir hata oluştu. Supabase ayarlarını ve erişim kurallarını kontrol et.";
  function ageParts(from, to) {
    let years = to.getFullYear() - from.getFullYear();
    let anchor = new Date(from); anchor.setFullYear(from.getFullYear() + years);
    if (anchor > to) { years--; anchor = new Date(from); anchor.setFullYear(from.getFullYear() + years); }
    let months = (to.getFullYear() - anchor.getFullYear()) * 12 + to.getMonth() - anchor.getMonth();
    let monthAnchor = new Date(anchor); monthAnchor.setMonth(anchor.getMonth() + months);
    if (monthAnchor > to) { months--; monthAnchor = new Date(anchor); monthAnchor.setMonth(anchor.getMonth() + months); }
    let cursor = new Date(monthAnchor);
    const days = Math.floor((to - cursor) / 86400000); cursor.setDate(cursor.getDate() + days);
    const hours = Math.floor((to - cursor) / 3600000); cursor.setHours(cursor.getHours() + hours);
    const minutes = Math.floor((to - cursor) / 60000); cursor.setMinutes(cursor.getMinutes() + minutes);
    const seconds = Math.floor((to - cursor) / 1000);
    return {years, months, days, hours, minutes, seconds};
  }
  function updateCounter() {
    const now = new Date();
    if (now < BIRTH) {
      const total = Math.floor((BIRTH-now)/1000), days = Math.floor(total/86400);
      $("years").textContent="0"; $("months").textContent="0"; $("days").textContent=days;
      $("hours").textContent=Math.floor(total%86400/3600); $("minutes").textContent=Math.floor(total%3600/60); $("seconds").textContent=total%60;
      $("countdownHint").textContent="Umay’ın hikâyesine kalan süre"; return;
    }
    const a=ageParts(BIRTH,now);
    ["years","months","days","hours","minutes","seconds"].forEach(k=>$ (k).textContent=a[k]);
    $("countdownHint").textContent="Her saniye yeni bir hatıra";
  }
  $("birthLocal").textContent = dateFmt(BIRTH,{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Istanbul"});

  async function showSite(user) {
    currentUser = user; $("gate").classList.add("hidden"); $("site").classList.remove("hidden");
    await Promise.all([renderGallery(),renderLetters(),renderMilestones(),renderCapsule()]);
  }
  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    currentUser=null; $("site").classList.add("hidden"); $("gate").classList.remove("hidden"); $("accessCode").value=""; window.scrollTo(0,0);
  }
  $("lockButton").addEventListener("click",signOut);
  $("gateForm").addEventListener("submit",async e=>{
    e.preventDefault(); $("gateError").textContent="";
    if(!supabase){$("gateError").textContent="Supabase ayarları tamamlanmamış. supabase-config.js dosyasını ve README adımlarını kontrol et.";return;}
    const email=$("loginEmail").value.trim(), password=$("accessCode").value;
    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    if(error){$("gateError").textContent="Giriş yapılamadı. E-posta/şifreyi ve Supabase kullanıcı ayarlarını kontrol et.";return;}
    await showSite(data.user);
  });
  if(supabase){
    supabase.auth.getSession().then(async({data})=>{if(data.session) await showSite(data.session.user);});
    supabase.auth.onAuthStateChange(async(event,session)=>{
      if(event==="SIGNED_OUT"){ $("site").classList.add("hidden"); $("gate").classList.remove("hidden"); }
      else if(session && $("site").classList.contains("hidden")) await showSite(session.user);
    });
  } else {
    $("gateError").textContent="Kurulum bekleniyor: supabase-config.js içine proje URL’si ve anon/publishable key eklenmeli.";
  }
  $("menuToggle").addEventListener("click",()=>{const nav=$("mobileNav");nav.classList.toggle("hidden");$("menuToggle").setAttribute("aria-expanded",String(!nav.classList.contains("hidden")));});
  $("mobileNav").querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>$("mobileNav").classList.add("hidden")));

  // Photo files live in a private Supabase Storage bucket; metadata is shared in the database.
  async function renderGallery(){
    const grid=$("galleryGrid");
    if(!supabase||!currentUser){grid.innerHTML='<div class="gallery-empty"><span>✳</span><h3>Aile albümü</h3><p>Güvenli bağlantı kurulunca aile fotoğrafları burada görünecek.</p></div>';return;}
    const {data:rows,error}=await supabase.from("umay_photos").select("*").order("created_at",{ascending:false});
    if(error){grid.innerHTML=`<div class="gallery-empty"><h3>Albüm yüklenemedi.</h3><p>${escapeHtml(error.message)}</p></div>`;return;}
    photoUrls=[];
    if(!rows?.length){grid.innerHTML='<div class="gallery-empty"><span>✳</span><h3>İlk anınız burada başlasın.</h3><p>Umay’ın ilk fotoğrafını ekleyerek aile albümünü oluşturmaya başlayın.</p><label class="text-link" for="photoInput">İlk fotoğrafı ekle ↗</label></div>';return;}
    const cards=await Promise.all(rows.map(async p=>{
      const {data}=await supabase.storage.from("umay-photos").createSignedUrl(p.storage_path,3600);
      return {...p,url:data?.signedUrl||""};
    }));
    grid.innerHTML=cards.map((p,i)=>`<article class="photo-card"><img src="${p.url}" alt="${escapeHtml(p.caption||"Umay'ın anısı")}" loading="lazy"><div class="photo-meta"><span>${escapeHtml(p.caption||"Umay’ın anısı")}<br><small>${escapeHtml(dateFmt(new Date(p.created_at),{day:"2-digit",month:"short",year:"numeric"}))}</small></span><button class="photo-delete" data-photo="${p.id}" aria-label="Fotoğrafı sil">Sil ×</button></div></article>`).join("");
    grid.querySelectorAll("[data-photo]").forEach(btn=>btn.addEventListener("click",async()=>{
      if(!confirm("Bu fotoğrafı aile albümünden silmek istiyor musun?"))return;
      const row=rows.find(r=>r.id===btn.dataset.photo); if(!row)return;
      const {error:storageError}=await supabase.storage.from("umay-photos").remove([row.storage_path]);
      const {error}=await supabase.from("umay_photos").delete().eq("id",row.id);
      if(error||storageError){toast("Silinemedi: "+errorText(error||storageError));return;}
      await renderGallery();toast("Fotoğraf albümden kaldırıldı.");
    }));
  }
  $("photoInput").addEventListener("change",async e=>{
    if(!supabase||!currentUser){toast("Önce aile hesabıyla giriş yap.");return;}
    for(const file of [...e.target.files]){
      if(!file.type.startsWith("image/"))continue;
      if(file.size>8*1024*1024){toast("Her fotoğraf 8 MB altında olmalı.");continue;}
      const caption=prompt("Bu anıya kısa bir not ekle (isteğe bağlı):",file.name.replace(/\.[^.]+$/,""))||"Umay’ın anısı";
      const path=`${currentUser.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
      const {error:uploadError}=await supabase.storage.from("umay-photos").upload(path,file,{contentType:file.type,upsert:false});
      if(uploadError){toast("Fotoğraf yüklenemedi: "+errorText(uploadError));continue;}
      const {error}=await supabase.from("umay_photos").insert({storage_path:path,caption,uploaded_by:currentUser.id});
      if(error){await supabase.storage.from("umay-photos").remove([path]);toast("Kayıt eklenemedi: "+errorText(error));continue;}
    }
    await renderGallery();e.target.value="";toast("Albüm güncellendi.");
  });

  async function renderLetters(){
    const list=$("letterList");if(!supabase||!currentUser){list.innerHTML="";return;}
    const {data,error}=await supabase.from("umay_letters").select("*").order("created_at",{ascending:false});
    if(error){list.innerHTML=`<p class="tiny">${escapeHtml(error.message)}</p>`;return;}
    list.innerHTML=(data||[]).map(l=>`<article class="saved-letter"><small>${escapeHtml(l.author_name)} · ${escapeHtml(dateFmt(new Date(l.created_at),{day:"numeric",month:"long",year:"numeric"}))}</small><h3>${escapeHtml(l.title)}</h3><p>${escapeHtml(l.body)}</p>${l.created_by===currentUser.id?`<button data-letter="${l.id}">Bu mektubu sil ×</button>`:""}</article>`).join("");
    list.querySelectorAll("[data-letter]").forEach(btn=>btn.addEventListener("click",async()=>{if(!confirm("Mektup silinsin mi?"))return;const {error}=await supabase.from("umay_letters").delete().eq("id",btn.dataset.letter);if(error)toast(errorText(error));else{await renderLetters();toast("Mektup silindi.");}}));
  }
  $("letterBody").addEventListener("input",()=>$("letterCount").textContent=`${$("letterBody").value.length} / 3000`);
  $("saveLetter").addEventListener("click",async()=>{
    if(!supabase||!currentUser){toast("Önce giriş yap.");return;}
    const body=$("letterBody").value.trim();if(!body){toast("Önce mektubunu yaz.");return;}
    const {error}=await supabase.from("umay_letters").insert({author_name:$("letterAuthor").value.trim()||"Ailenden biri",title:$("letterTitle").value.trim()||"Sana bir not",body,created_by:currentUser.id});
    if(error){toast("Mektup kaydedilemedi: "+errorText(error));return;}
    $("letterAuthor").value="";$("letterTitle").value="";$("letterBody").value="";$("letterCount").textContent="0 / 3000";await renderLetters();toast("Mektup aile arşivine eklendi.");
  });

  const milestoneDefs=[{days:40,title:"İlk 40 gün",desc:"Küçük bir başlangıç, kocaman bir sevgi."},{days:100,title:"100. gün",desc:"Birlikte geçen ilk yüz gün."},{days:365,title:"İlk yaşın",desc:"İlk yılın, ilk büyük kutlaman."},{days:1000,title:"1000 gün",desc:"Bin günlük kocaman bir hikâye."}];
  function addDays(d,n){const out=new Date(d);out.setDate(out.getDate()+n);return out;}
  function renderMilestones(){const now=new Date();$("milestoneGrid").innerHTML=milestoneDefs.map(m=>{const date=addDays(BIRTH,m.days),diff=Math.ceil((date-now)/86400000),label=diff>0?`${diff.toLocaleString("tr-TR")} gün kaldı`:diff===0?"Bugün kutluyoruz ♡":`${Math.abs(diff).toLocaleString("tr-TR")} gün önce`;return `<article class="milestone-card"><span class="milestone-num">${m.days===365?"01":m.days.toLocaleString("tr-TR")}</span><div><h3>${m.title}</h3><p>${m.desc}</p></div><div class="milestone-date">${dateFmt(date,{day:"numeric",month:"long",year:"numeric"})} · ${label}</div></article>`;}).join("");}

  async function renderCapsule(){
    const status=$("capsuleStatus");if(!supabase||!currentUser){status.textContent="Güvenli bağlantı kurulunca zaman kapsülü burada görünecek.";return;}
    const {data,error}=await supabase.from("umay_capsules").select("*").order("created_at",{ascending:false});
    if(error){status.textContent="Kapsül yüklenemedi: "+errorText(error);return;}
    if(!data?.length){status.textContent="Henüz mühürlenmiş bir mesaj yok.";return;}
    const now=new Date();
    status.innerHTML=data.map(c=>{const date=new Date(c.unlock_at);const opened=now>=date;return `<div class="saved-letter"><small>${opened?"🔓 KAPSÜL AÇILDI":"🔒 KİLİTLİ"} · ${escapeHtml(dateFmt(date,{day:"numeric",month:"long",year:"numeric"}))}</small><p>${opened?escapeHtml(c.message):"Bu mesaj seçilen tarihe kadar kilitli kalacak."}</p>${c.created_by===currentUser.id?`<button data-capsule="${c.id}">Kapsülü sil ×</button>`:""}</div>`;}).join("");
    status.querySelectorAll("[data-capsule]").forEach(btn=>btn.addEventListener("click",async()=>{if(!confirm("Bu kapsül silinsin mi?"))return;const {error}=await supabase.from("umay_capsules").delete().eq("id",btn.dataset.capsule);if(error)toast(errorText(error));else renderCapsule();}));
  }
  $("saveCapsule").addEventListener("click",async()=>{
    if(!supabase||!currentUser){toast("Önce giriş yap.");return;}
    const date=$("capsuleDate").value,message=$("capsuleMessage").value.trim();
    if(!date||!message){toast("Açılma tarihini ve mesajını doldur.");return;}
    const unlockAt=new Date(date+"T00:00:00+03:00");
    if(unlockAt<new Date()){toast("Geçmiş bir tarih seçemezsin.");return;}
    const {error}=await supabase.from("umay_capsules").insert({unlock_at:unlockAt.toISOString(),message,created_by:currentUser.id});
    if(error){toast("Kapsül kaydedilemedi: "+errorText(error));return;}
    $("capsuleMessage").value="";await renderCapsule();toast("Zaman kapsülü mühürlendi.");
  });

  async function shareSite(){
    const text="Bir ömürlük hikâye, Umay. ♡ 17 Ekim 2026, 10:53’te başlayan bu güzel hikâyenin anılarını birlikte biriktirelim.";
    const url=location.href;
    if(navigator.share){try{await navigator.share({title:"Umay — Bir Ömürlük Hikâye",text,url});}catch(e){if(e.name!=="AbortError")toast("Paylaşım açılamadı.");}}
    else{try{await navigator.clipboard.writeText(`${text}\n${url}`);toast("Paylaşım mesajı kopyalandı.");}catch{prompt("Aileye göndermek için kopyala:",`${text}\n${url}`);}}
  }
  $("shareHero").addEventListener("click",shareSite);$("shareLink").addEventListener("click",shareSite);
  $("makeCard").addEventListener("click",()=>{
    const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext("2d");
    const g=ctx.createLinearGradient(0,0,1080,1350);g.addColorStop(0,"#775b68");g.addColorStop(1,"#40313c");ctx.fillStyle=g;ctx.fillRect(0,0,1080,1350);
    ctx.strokeStyle="#d9bfc2";ctx.lineWidth=2;ctx.beginPath();ctx.arc(540,590,300,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(540,590,345,0,Math.PI*2);ctx.stroke();
    ctx.textAlign="center";ctx.fillStyle="#f4e6de";ctx.font="22px Arial";ctx.fillText("A LITTLE MIRACLE",540,150);ctx.font="150px Georgia";ctx.fillText("☾",540,510);ctx.font="100px Georgia";ctx.fillText("Umay",540,680);ctx.font="32px Georgia";ctx.fillText("Bir ömürlük hikâye",540,760);ctx.font="26px Arial";ctx.fillText("17 · 10 · 2026  /  10:53",540,820);ctx.font="20px Arial";ctx.fillText("SEVGİYLE, AİLESİNDEN ♡",540,1200);
    const a=document.createElement("a");a.download="umay-hatira-karti.png";a.href=canvas.toDataURL("image/png");a.click();toast("Hatıra kartı hazırlandı.");
  });
  updateCounter();setInterval(updateCounter,1000);
})();