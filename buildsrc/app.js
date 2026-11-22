/* مِعْراب — منطق التطبيق */
(function(){
  "use strict";
  var D = window.MIRAB_DATA;
  var S = loadState();

  var CASE_LABEL = { raf:"مرفوع (أو محلّ رفع)", nasb:"منصوب (أو محلّ نصب)", jarr:"مجرور (أو محلّ جرّ)", jazm:"مجزوم", mabni:"مبنيّ / حرف لا محلّ له" };
  var CASE_COLOR = { raf:"#2e8b57", nasb:"#c0392b", jarr:"#2563c9", jazm:"#d98318", mabni:"#6b7280" };

  // ---------- term colorizing (يُلوّن المصطلحات النحوية داخل النصوص) ----------
  var TERMMAP = {};
  (function(){
    function add(cls, words){ words.forEach(function(w){ TERMMAP[w]=cls; }); }
    add("t-name", ["اسم","الاسم","اسمًا","أسماء","الأسماء"]);
    add("t-verb", ["فعل","الفعل","فعلًا","أفعال","الأفعال","ماضٍ","مضارع","أمر"]);
    add("t-harf", ["حرف","الحرف","حرفًا","حروف","الحروف"]);
    add("t-raf",  ["مرفوع","مرفوعة","المرفوع","المرفوعات","الرفع","رفع","رفعًا","الفاعل","فاعل","المبتدأ","مبتدأ","الخبر","خبر"]);
    add("t-nasb", ["منصوب","منصوبة","المنصوب","المنصوبات","النصب","نصب","نصبًا","المفعول","مفعول","الحال","حال","التمييز","تمييز","الاستثناء"]);
    add("t-jarr", ["مجرور","مجرورة","المجرور","المجرورات","الجرّ","جرّ","جرًّا","الإضافة","مضاف"]);
    add("t-jazm", ["مجزوم","مجزومة","المجزوم","الجزم","جزم","جزمًا"]);
    add("t-mabni",["مبنيّ","مبني","مبنية","المبنيّ","البناء"]);
  })();
  function colorize(text){
    if(text==null) return text;
    return String(text).replace(/[ء-ي]+/g, function(w){
      var c = TERMMAP[w];
      return c ? "<span class='t "+c+"'>"+w+"</span>" : w;
    });
  }

  // ---------- state ----------
  function loadState(){
    try{ var s = JSON.parse(localStorage.getItem("mirab_state")||"{}");
      return { points:s.points||0, done:s.done||{}, mistakes:s.mistakes||[], streakDay:s.streakDay||null, streak:s.streak||0, ex:s.ex||{}, exScore:s.exScore||{}, gmistakes:s.gmistakes||[], lessons:s.lessons||{} };
    }catch(e){ return {points:0,done:{},mistakes:[],streakDay:null,streak:0,ex:{},exScore:{},gmistakes:[],lessons:{}}; }
  }
  function save(){ try{ localStorage.setItem("mirab_state", JSON.stringify(S)); }catch(e){} }
  function touchStreak(){
    var today = new Date().toISOString().slice(0,10);
    if(S.streakDay===today) return;
    var y = new Date(Date.now()-86400000).toISOString().slice(0,10);
    S.streak = (S.streakDay===y) ? (S.streak+1) : 1;
    S.streakDay = today; save();
  }

  // ---------- helpers ----------
  function el(tag, cls, html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
  function ar(n){ return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[+d];}); }
  function $(s){ return document.querySelector(s); }
  // بديل داخلي عن confirm() لأنّ WebView لا يُظهر نوافذ المتصفّح
  function appConfirm(msg, onYes){
    var ov=el("div","app-dialog-ov");
    var m=el("div","app-dialog");
    m.appendChild(el("div","ad-msg",msg));
    var row=el("div","ad-row");
    var no=el("button","btn ghost","إلغاء");
    var yes=el("button","btn","نعم");
    no.onclick=function(){ document.body.removeChild(ov); };
    yes.onclick=function(){ document.body.removeChild(ov); onYes(); };
    row.appendChild(no); row.appendChild(yes); m.appendChild(row); ov.appendChild(m);
    ov.onclick=function(e){ if(e.target===ov) document.body.removeChild(ov); };
    document.body.appendChild(ov);
  }
  // بديل داخلي عن alert() — يفتح/يغلق بطاقة معلومات أسفل العنصر
  function toggleInfo(hostEl, html){
    var existing=hostEl.parentNode.querySelector(".inline-info[data-for='"+(hostEl.__iid||"")+"']");
    if(existing){ existing.remove(); return; }
    var old=hostEl.parentNode.querySelectorAll(".inline-info");
    for(var i=0;i<old.length;i++) old[i].remove();
    if(!hostEl.__iid) hostEl.__iid = "ii"+(Math.random().toString(36).slice(2));
    var d=el("div","inline-info"); d.setAttribute("data-for",hostEl.__iid); d.innerHTML=html;
    hostEl.parentNode.insertBefore(d, hostEl.nextSibling);
  }
  function totalWords(){ var n=0; D.surahs.forEach(function(s){ s.verses.forEach(function(v){ n+=v.words.length; }); }); return n; }
  function doneCount(){ return Object.keys(S.done).length; }

  // ---------- header ----------
  function renderStats(){
    $("#stat-points").textContent = S.points;
    $("#stat-streak").textContent = S.streak;
    $("#stat-prog").textContent = doneCount()+"/"+totalWords();
  }

  // ---------- home ----------
  function renderHome(){
    var leg = $("#legend"); leg.innerHTML="";
    D.legend.forEach(function(l){
      var c = el("div","chip");
      c.appendChild(el("span","dot")).style.background=l.color;
      c.appendChild(el("span",null,"<b>"+l.label+"</b> — "+l.hint));
      leg.appendChild(c);
    });
    // overall combined stats (القواعد + الإعراب)
    var gs=gramStats(), is=irabStats();
    var totalItems=gs.tot+is.tot, doneItems=gs.dn+is.dn;
    var overall = totalItems? Math.round(doneItems/totalItems*100):0;
    var ov=$("#home-overall");
    if(ov){
      ov.innerHTML="<div class='sec-stats'>"
        +"<div class='st'><b>"+S.points+"</b><span>مجموع النقاط</span></div>"
        +"<div class='st'><b>"+S.streak+"</b><span>أيام متتابعة</span></div>"
        +"<div class='st'><b>"+overall+"%</b><span>الإنجاز العام</span></div>"
        +"</div><div class='lv-bar light'><span style='width:"+overall+"%'></span></div>"
        +"<div class='home-split'>"
        +"<div class='sp'><span>القواعد</span><b>"+gs.pct+"%</b> <small>"+gs.lcomp+"/"+gs.lessons+" درس</small></div>"
        +"<div class='sp'><span>الإعراب</span><b>"+is.pct+"%</b> <small>"+is.scomp+"/"+is.surahs+" سورة</small></div>"
        +"</div>";
    }
  }

  // ---------- grammar course ----------
  var L = window.MIRAB_LESSONS || {levels:[],lessons:[]};
  function lessonExCount(ls){ return (ls.exercises||[]).length; }
  function lessonExDone(ls){ var n=0; (ls.exercises||[]).forEach(function(_,i){ if(S.ex[ls.id+"-"+i]) n++; }); return n; }
  function lessonComplete(ls){ return lessonExCount(ls)>0 && lessonExDone(ls)===lessonExCount(ls); }

  function gramStats(){
    var tot=0,dn=0,lessons=L.lessons.length,lcomp=0;
    L.lessons.forEach(function(ls){ tot+=lessonExCount(ls); dn+=lessonExDone(ls); if(lessonComplete(ls)) lcomp++; });
    return { tot:tot, dn:dn, pct: tot?Math.round(dn/tot*100):0, lessons:lessons, lcomp:lcomp };
  }
  function renderGrammarList(){
    // stats header
    var gs=gramStats();
    $("#grammar-intro").innerHTML="<h2>دورة القواعد المتدرّجة</h2>"
      +"<div class='sec-stats'>"
      +"<div class='st'><b>"+gs.lcomp+"/"+gs.lessons+"</b><span>دروس مكتملة</span></div>"
      +"<div class='st'><b>"+gs.dn+"/"+gs.tot+"</b><span>تمارين منجزة</span></div>"
      +"<div class='st'><b>"+gs.pct+"%</b><span>نسبة الإنجاز</span></div>"
      +"</div><div class='lv-bar light'><span style='width:"+gs.pct+"%'></span></div>"
      +"<p class='muted' style='margin-top:10px'>ابدأ من المستوى التمهيدي صعودًا. كل درس: قاعدة + مثالان + ١٥ تمرينًا متنوّعًا.</p>";

    var box=$("#grammar-list"); box.innerHTML=""; box.style.display="block";
    // grammar review (أخطاء القواعد)
    if(S.gmistakes.length){
      var rv=el("div","card review-inline");
      rv.innerHTML="<h3>مراجعة أخطاء القواعد ("+S.gmistakes.length+")</h3>";
      S.gmistakes.forEach(function(m){
        var it=el("div","rev-item");
        it.innerHTML="<div style='flex:1'><div style='font-size:15px'>"+colorize(m.q)+"</div>"
          +"<div class='muted' style='font-size:12px'>"+m.lesson+"</div></div>";
        var btn=el("button","btn ghost","الإجابة"); btn.style.cssText="padding:6px 12px;font-size:13px";
        (function(mm,item){ btn.onclick=function(){ toggleInfo(item, "<b>السؤال:</b> "+colorize(mm.q)+"<br><b>الإجابة:</b> "+colorize(mm.explain||"—")); }; })(m,it);
        it.appendChild(btn); rv.appendChild(it);
      });
      var clr=el("button","btn ghost","مسح المراجعة"); clr.style.marginTop="8px";
      clr.onclick=function(){ appConfirm("مسح كل أخطاء القواعد من المراجعة؟", function(){ S.gmistakes=[]; save(); renderGrammarList(); }); };
      rv.appendChild(clr); box.appendChild(rv);
    }
    L.levels.forEach(function(lvl){
      var list=L.lessons.filter(function(x){return x.level===lvl.id;}).sort(function(a,b){return a.order-b.order;});
      var band=el("div","level-band");
      var tot=0,dn=0; list.forEach(function(ls){ tot+=lessonExCount(ls); dn+=lessonExDone(ls); });
      var pct=tot?Math.round(dn/tot*100):0;
      band.innerHTML="<div class='lv-head'><div class='lv-name'>"+lvl.name+"</div>"
        +"<div class='lv-count'>"+list.length+" دروس · "+pct+"%</div></div>"
        +(lvl.desc?"<div class='lv-desc'>"+lvl.desc+"</div>":"")
        +"<div class='lv-bar'><span style='width:"+pct+"%'></span></div>";
      box.appendChild(band);
      if(!list.length){ box.appendChild(el("div","empty","دروس هذا المستوى قريبًا بإذن الله.")); return; }
      var grid=el("div","lesson-grid");
      list.forEach(function(ls){
        var comp=lessonComplete(ls);
        var c=el("div","lesson-card"+(comp?" complete":""));
        c.innerHTML="<div class='ln'>"+(comp?"✓ ":"")+ls.title+"</div>"
          +"<div class='lo'>"+lessonExDone(ls)+"/"+lessonExCount(ls)+" تمرين</div>";
        c.onclick=function(){ openLesson(ls.id); };
        grid.appendChild(c);
      });
      box.appendChild(grid);
    });
    $("#lesson-view").style.display="none";
    $("#grammar-intro").style.display="block";
  }

  function orderedLessons(){
    var out=[];
    L.levels.forEach(function(lvl){
      L.lessons.filter(function(x){return x.level===lvl.id;}).sort(function(a,b){return a.order-b.order;})
        .forEach(function(ls){ out.push(ls); });
    });
    return out;
  }
  var curLesson=null;
  function openLesson(id){
    var ls=L.lessons.filter(function(x){return x.id===id;})[0];
    $("#grammar-list").style.display="none";
    $("#grammar-intro").style.display="none";
    window.scrollTo(0,0);
    var v=$("#lesson-view"); v.style.display="block"; v.innerHTML="";

    var top=el("div","toolbar");
    var back=el("button","btn ghost","→ كل الدروس"); back.onclick=renderGrammarList; top.appendChild(back);
    v.appendChild(top);

    var head=el("div","card");
    head.innerHTML="<h2>"+ls.title+"</h2><div class='rule'>"+colorize(ls.rule)+"</div>";
    v.appendChild(head);

    // examples (نُبقي نصّ المثال كما هو، ونلوّن الشرح أسفله)
    var exBox=el("div","card");
    var html="<h3>أمثلة</h3>";
    (ls.examples||[]).forEach(function(ex){
      var cls = ex.type==="قرآني" ? "ex quran" : "ex normal";
      html+="<div class='"+cls+"'><span class='ex-tag'>"+(ex.type==="قرآني"?"مثال قرآني":"مثال عادي")+"</span>"
        +"<div class='ex-text'>"+ex.text+"</div>"
        +(ex.note?"<div class='ex-note'>"+colorize(ex.note)+"</div>":"")+"</div>";
    });
    exBox.innerHTML=html;
    v.appendChild(exBox);

    // exercises
    var qBox=el("div","card");
    qBox.appendChild(el("h3",null,"تمارين — قِس فهمك ("+lessonExCount(ls)+" أسئلة)"));
    (ls.exercises||[]).forEach(function(q,qi){
      qBox.appendChild(renderExercise(ls,q,qi));
    });
    v.appendChild(qBox);

    // result + redo (يظهر بعد إتمام كل الأسئلة)
    var resultBox=el("div","card result-card"); resultBox.style.display="none";
    v.appendChild(resultBox);
    curLesson={ ls:ls, resultBox:resultBox };
    updateLessonResult();

    // next-lesson button
    var ord=orderedLessons();
    var idx=-1; for(var i=0;i<ord.length;i++){ if(ord[i].id===ls.id){ idx=i; break; } }
    var navBox=el("div","lesson-nav");
    if(idx>0){ var pb=el("button","btn ghost","→ الدرس السابق"); pb.onclick=function(){ openLesson(ord[idx-1].id); window.scrollTo(0,0); }; navBox.appendChild(pb); }
    if(idx>-1 && idx<ord.length-1){ var nb=el("button","btn","الدرس التالي ←"); nb.onclick=function(){ openLesson(ord[idx+1].id); window.scrollTo(0,0); }; navBox.appendChild(nb); }
    else { var fin=el("button","btn ghost","أنهيتَ الدروس — عُد للقائمة"); fin.onclick=renderGrammarList; navBox.appendChild(fin); }
    v.appendChild(navBox);
  }

  function completeEx(ls,q,key,wrap,hadWrong){
    if(!S.ex[key]){
      S.ex[key]=true; S.exScore[key]=hadWrong?0:1; S.points+=3; touchStreak(); save(); renderStats();
    }
    showExFeedback(wrap,true,q.explain);
    updateLessonResult();
  }
  function pushGMistake(ls,q,qi){
    var key=ls.id+"-"+qi;
    for(var i=0;i<S.gmistakes.length;i++){ if(S.gmistakes[i].key===key) return; }
    S.gmistakes.push({key:key, q:q.q, explain:q.explain, lesson:ls.title}); save();
  }
  function renderExercise(ls,q,qi){
    var key=ls.id+"-"+qi;
    var type=q.type||"mc";
    var wrap=el("div","exq");
    var tag = type==="tf"?"صح أو خطأ":(type==="order"?"رتّب":"اختيار");
    wrap.appendChild(el("div","exq-q","<span class='q-type'>"+tag+"</span><b>"+(qi+1)+".</b> "+colorize(q.q)));
    var answered=!!S.ex[key];
    var hadWrong=false;

    if(type==="tf"){
      var row=el("div","exq-opts tf");
      [["صح",true],["خطأ",false]].forEach(function(pair){
        var b=el("button","exq-opt",pair[0]);
        if(answered && pair[1]===q.answer) b.classList.add("correct");
        if(answered) b.disabled=true;
        b.onclick=function(){
          if(S.ex[key]) return;
          if(pair[1]===q.answer){ b.classList.add("correct"); lockEx(row); completeEx(ls,q,key,wrap,hadWrong); }
          else { b.classList.add("wrong"); b.disabled=true; hadWrong=true; pushGMistake(ls,q,qi); showExFeedback(wrap,false,null); }
        };
        row.appendChild(b);
      });
      wrap.appendChild(row);
      if(answered) showExFeedback(wrap,true,q.explain);
      return wrap;
    }

    if(type==="order"){
      var ansRow=el("div","order-ans");
      var pool=el("div","exq-opts");
      var picked=[];
      function refresh(){
        ansRow.innerHTML=""; picked.forEach(function(pi){ ansRow.appendChild(el("span","order-chip",q.items[pi])); });
      }
      if(answered){
        q.answer.forEach(function(pi){ ansRow.appendChild(el("span","order-chip",q.items[pi])); });
        showExFeedback(wrap,true,q.explain);
        wrap.appendChild(ansRow); return wrap;
      }
      q.items.forEach(function(it,ii){
        var b=el("button","exq-opt",it);
        b.onclick=function(){
          if(S.ex[key]||b.disabled) return;
          b.disabled=true; b.classList.add("used"); picked.push(ii); refresh();
          if(picked.length===q.items.length){
            var ok = picked.join(",")===q.answer.join(",");
            if(ok){ lockEx(pool); completeEx(ls,q,key,wrap,hadWrong); }
            else {
              hadWrong=true; pushGMistake(ls,q,qi);
              showExFeedback(wrap,false,"الترتيب غير صحيح — أعد المحاولة.");
              picked=[]; refresh();
              var bs=pool.querySelectorAll("button"); for(var k=0;k<bs.length;k++){bs[k].disabled=false;bs[k].classList.remove("used");}
            }
          }
        };
        pool.appendChild(b);
      });
      wrap.appendChild(ansRow); wrap.appendChild(pool);
      return wrap;
    }

    // default: multiple choice
    var opts=el("div","exq-opts");
    q.options.forEach(function(opt,oi){
      var b=el("button","exq-opt",opt);
      if(answered){ b.disabled=true; if(oi===q.answer) b.classList.add("correct"); }
      b.onclick=function(){
        if(S.ex[key]) return;
        if(oi===q.answer){ b.classList.add("correct"); lockEx(opts); completeEx(ls,q,key,wrap,hadWrong); }
        else { b.classList.add("wrong"); b.disabled=true; hadWrong=true; pushGMistake(ls,q,qi); showExFeedback(wrap,false,null); }
      };
      opts.appendChild(b);
    });
    wrap.appendChild(opts);
    if(answered){ showExFeedback(wrap,true,q.explain); }
    return wrap;
  }

  function updateLessonResult(){
    if(!curLesson) return;
    var ls=curLesson.ls, box=curLesson.resultBox;
    var tot=lessonExCount(ls), done=lessonExDone(ls);
    if(done<tot || tot===0){ box.style.display="none"; return; }
    var correct=0; (ls.exercises||[]).forEach(function(_,i){ if(S.exScore[ls.id+"-"+i]) correct++; });
    var pct=Math.round(correct/tot*100);
    box.style.display="block";
    box.innerHTML="<h3>نتيجة التمارين</h3>"
      +"<div class='result-score'>"+correct+" / "+tot+" <span>صحيحة من أول محاولة</span></div>"
      +"<div class='result-bar'><span style='width:"+pct+"%'></span></div>"
      +"<div class='muted' style='margin:8px 0 12px'>"+pct+"% — "+(pct===100?"ممتاز! إتقان كامل.":(pct>=60?"جيد، راجِع ما أخطأتَ فيه.":"أعِد المحاولة لترسيخ القاعدة."))+"</div>";
    var redo=el("button","btn","إعادة التمارين ↺");
    redo.onclick=function(){
      (ls.exercises||[]).forEach(function(_,i){ delete S.ex[ls.id+"-"+i]; delete S.exScore[ls.id+"-"+i]; });
      save(); renderStats(); openLesson(ls.id);
    };
    box.appendChild(redo);
  }
  function lockEx(opts){ var b=opts.querySelectorAll("button"); for(var i=0;i<b.length;i++)b[i].disabled=true; }
  function showExFeedback(wrap,ok,explain){
    var old=wrap.querySelector(".exq-fb"); if(old) old.remove();
    var fb=el("div","exq-fb "+(ok?"ok":"no"));
    fb.innerHTML = ok ? ("<b>أحسنت!</b> "+colorize(explain||"")) : ("<b>ليست هذه،</b> حاول مرة أخرى.");
    wrap.appendChild(fb);
  }

  // ---------- practice: surah list (grouped by level) ----------
  function surahStats(s){
    var tot=0,dn=0;
    s.verses.forEach(function(v,vi){ v.words.forEach(function(_,wi){ tot++; if(S.done[s.id+"-"+vi+"-"+wi]) dn++; }); });
    return {tot:tot,dn:dn};
  }
  function levelDone(lvlId){
    var tot=0,dn=0;
    D.surahs.filter(function(s){return s.level===lvlId;}).forEach(function(s){ var st=surahStats(s); tot+=st.tot; dn+=st.dn; });
    return {tot:tot,dn:dn};
  }
  function irabStats(){
    var tot=totalWords(), dn=doneCount(), scomp=0;
    D.surahs.forEach(function(s){ var st=surahStats(s); if(st.tot&&st.dn===st.tot) scomp++; });
    return { tot:tot, dn:dn, pct: tot?Math.round(dn/tot*100):0, surahs:D.surahs.length, scomp:scomp };
  }
  function renderSurahList(){
    var is=irabStats();
    $("#practice-intro").innerHTML="<h2>إعراب القرآن</h2>"
      +"<div class='sec-stats'>"
      +"<div class='st'><b>"+is.scomp+"/"+is.surahs+"</b><span>سور مكتملة</span></div>"
      +"<div class='st'><b>"+is.dn+"/"+is.tot+"</b><span>كلمات مُعرَبة</span></div>"
      +"<div class='st'><b>"+is.pct+"%</b><span>نسبة الإنجاز</span></div>"
      +"</div><div class='lv-bar light'><span style='width:"+is.pct+"%'></span></div>"
      +"<p class='muted' style='margin-top:10px'>اضغط أي كلمة لتُعربها بـ«السؤال الثلاثي»، واقرأ جسر المعنى والتفسير الميسّر تحت كل آية.</p>";

    var g=$("#surah-grid"); g.innerHTML=""; g.className="level-wrap";
    // i'rab review (أخطاء الإعراب)
    if(S.mistakes.length){
      var rv=el("div","card review-inline");
      rv.innerHTML="<h3>مراجعة أخطاء الإعراب ("+S.mistakes.length+")</h3>";
      S.mistakes.forEach(function(m){
        var it=el("div","rev-item");
        var tag="<span class='tag' style='background:"+CASE_COLOR[m.cat]+";color:#fff;padding:2px 10px;border-radius:20px;font-size:12px'>"+({raf:"مرفوع",nasb:"منصوب",jarr:"مجرور",jazm:"مجزوم",mabni:"مبنيّ/حرف"}[m.cat])+"</span>";
        it.innerHTML="<div style='flex:1'><span class='wtxt'>"+m.w+"</span> <span class='muted' style='font-size:12px'>سورة "+m.surah+"</span></div>"+tag;
        var btn=el("button","btn ghost","الإعراب"); btn.style.cssText="padding:6px 12px;font-size:13px;margin-right:8px";
        (function(mm,item){ btn.onclick=function(){ toggleInfo(item, "<span class='wtxt'>"+mm.w+"</span><div style='margin-top:6px'>"+colorize(mm.full)+"</div>"); }; })(m,it);
        it.appendChild(btn); rv.appendChild(it);
      });
      var clr=el("button","btn ghost","مسح المراجعة"); clr.style.marginTop="8px";
      clr.onclick=function(){ appConfirm("مسح كل أخطاء الإعراب من المراجعة؟", function(){ S.mistakes=[]; save(); renderSurahList(); }); };
      rv.appendChild(clr); g.appendChild(rv);
    }
    // قائمة واحدة بترتيب المصحف (النبأ ٧٨ ← الناس ١١٤) — كتطبيق قرآن
    var band=el("div","level-band");
    band.innerHTML="<div class='lv-head'><div class='lv-name'>جزء عمّ — بترتيب المصحف</div>"
      +"<div class='lv-count'>"+ar(D.surahs.length)+" سورة</div></div>"
      +"<div class='lv-desc'>اضغط اسم السورة لتبدأ إعرابها كلمة‑كلمة. استخدم خانة البحث للوصول السريع لأي سورة.</div>";
    g.appendChild(band);

    // خانة بحث (تسهّل الوصول عند كثرة السور)
    var searchBox=el("div","surah-search");
    var inp=el("input"); inp.type="search"; inp.placeholder="🔎 ابحث باسم السورة أو رقمها…";
    inp.setAttribute("inputmode","search"); inp.autocomplete="off";
    var count=el("div","search-count");
    searchBox.appendChild(inp); searchBox.appendChild(count);
    g.appendChild(searchBox);

    var grid=el("div","surah-sub-grid");
    g.appendChild(grid);
    var ordered=D.surahs.slice().sort(function(a,b){return a.order-b.order;});
    function norm(s){ return String(s).replace(/[أإآ]/g,"ا").replace(/[ةه]/g,"ه").replace(/ـ/g,"").replace(/[ًٌٍَُِّْ]/g,"").trim(); }
    function buildGrid(q){
      grid.innerHTML="";
      var qn=norm(q||"");
      var qnum = q ? q.replace(/[٠-٩]/g,function(d){return "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)];}) : "";
      var shown=0;
      ordered.forEach(function(s){
        if(qn){
          var nameMatch = norm("سورة "+s.name).indexOf(qn)>-1 || norm(s.name).indexOf(qn)>-1;
          var numMatch = qnum && /^[0-9]+$/.test(qnum) && String(s.order)===qnum;
          if(!nameMatch && !numMatch) return;
        }
        shown++;
        var st=surahStats(s);
        var complete = st.tot && st.dn===st.tot;
        var c=el("div","surah-card"+(complete?" complete":""));
        c.innerHTML="<div class='n'><span class='snum'>"+ar(s.order)+"</span> "+(complete?"✓ ":"")+"سورة "+s.name+"</div>"
          +"<div class='o'>"+ar(s.verseCount||s.verses.length)+" آية · "+ar(st.dn)+"/"+ar(st.tot)+" كلمة</div>";
        c.onclick=function(){ openSurah(s.id); };
        grid.appendChild(c);
      });
      count.textContent = q ? (shown? ("نتائج: "+ar(shown)+" سورة") : "لا سورة بهذا الاسم") : "";
      if(q && !shown){ grid.appendChild(el("div","empty","لم نجد سورة مطابقة — جرّب اسمًا آخر.")); }
    }
    inp.oninput=function(){ buildGrid(inp.value); };
    buildGrid("");
    $("#surah-view").style.display="none";
    $("#surah-grid").style.display="block";
    $("#practice-intro").style.display="block";
  }

  var curSurah=null;
  function openSurah(id){
    curSurah = D.surahs.filter(function(s){return s.id===id;})[0];
    $("#surah-grid").style.display="none";
    $("#practice-intro").style.display="none";
    window.scrollTo(0,0);
    var v=$("#surah-view"); v.style.display="block"; v.innerHTML="";

    var top=el("div","toolbar");
    var back=el("button","btn ghost","→ كل السور"); back.onclick=renderSurahList; top.appendChild(back);
    var tgl=el("button","btn nav","إظهار الألوان");
    tgl.onclick=function(){ var w=$("#ayat-wrap"); w.classList.toggle("colors-on"); tgl.textContent=w.classList.contains("colors-on")?"إخفاء الألوان":"إظهار الألوان"; };
    top.appendChild(tgl);
    v.appendChild(top);

    var head=el("div","card"); head.innerHTML="<h2>سورة "+curSurah.name+"</h2><p class='muted'>"+curSurah.intro+"</p><p class='muted'>اضغط أي كلمة لتُعربها بـ«السؤال الثلاثي».</p>";
    v.appendChild(head);

    var wrap=el("div"); wrap.id="ayat-wrap";
    curSurah.verses.forEach(function(verse,vi){
      var vc=el("div","verse");
      var ay=el("div","ayah");
      verse.words.forEach(function(word,wi){
        var key=curSurah.id+"-"+vi+"-"+wi;
        var sp=el("span","word"+(S.done[key]?" done":""));
        sp.setAttribute("data-cat",word.cat);
        sp.textContent=word.w;
        sp.onclick=function(){ openQuiz(curSurah,vi,wi,sp); };
        ay.appendChild(sp);
      });
      vc.appendChild(ay);
      if(verse.bridge){
        var br=el("div","bridge"); br.innerHTML="<b>جسر المعنى:</b> "+verse.bridge;
        vc.appendChild(br);
      }
      var tafArr = window.MIRAB_TAFSIR && MIRAB_TAFSIR.bySurah[curSurah.id];
      var taf = tafArr && tafArr[vi];
      if(taf && taf !== (tafArr[vi-1]||"")){
        var tc=el("div","tafsir"); tc.innerHTML="<b>المعنى الإجمالي:</b> "+taf;
        vc.appendChild(tc);
      } else if(taf){
        var tc2=el("div","tafsir tafsir-cont"); tc2.innerHTML="<span class='muted'>﴿المعنى مع الآية السابقة﴾</span>";
        vc.appendChild(tc2);
      }
      wrap.appendChild(vc);
    });
    v.appendChild(wrap);

    // تنقّل بين السور (السابقة يمينًا، التالية يسارًا) — بترتيب المصحف
    var ord=D.surahs.slice().sort(function(a,b){return a.order-b.order;});
    var idx=-1; for(var i=0;i<ord.length;i++){ if(ord[i].id===curSurah.id){ idx=i; break; } }
    var nav=el("div","surah-nav");
    // يمين: السورة السابقة
    if(idx>0){
      var pv=ord[idx-1];
      var pb=el("button","btn ghost surah-nav-btn");
      pb.innerHTML="<span class='sn-dir'>→ السابقة</span><span class='sn-name'>"+pv.name+"</span>";
      pb.onclick=function(){ openSurah(pv.id); };
      nav.appendChild(pb);
    } else { nav.appendChild(el("span","sn-spacer")); }
    // يسار: السورة التالية
    if(idx>-1 && idx<ord.length-1){
      var nx=ord[idx+1];
      var nb=el("button","btn nav surah-nav-btn");
      nb.innerHTML="<span class='sn-dir'>التالية ←</span><span class='sn-name'>"+nx.name+"</span>";
      nb.onclick=function(){ openSurah(nx.id); };
      nav.appendChild(nb);
    } else { nav.appendChild(el("span","sn-spacer")); }
    v.appendChild(nav);
  }

  // ---------- quiz modal ----------
  var quizCtx=null;
  function shuffle(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i];a[i]=a[j];a[j]=t; } return a; }

  function openQuiz(surah,vi,wi,spanEl){
    var word=surah.verses[vi].words[wi];
    quizCtx={surah:surah,vi:vi,wi:wi,word:word,span:spanEl,step:1,errored:false};
    $("#m-target").textContent=word.w;
    $("#m-feedback").textContent=""; $("#m-feedback").className="feedback";
    $("#m-reveal").classList.remove("show");
    renderStep1();
    $("#overlay").classList.add("show");
  }
  function renderStep1(){
    $("#m-qlabel").textContent="السؤال ١: ما نوع هذه الكلمة؟";
    var opts=$("#m-opts"); opts.innerHTML="";
    ["اسم","فعل","حرف"].forEach(function(o){
      var b=el("button","opt",o);
      b.onclick=function(){ answer(b,o===quizCtx.word.type,renderStep2); };
      opts.appendChild(b);
    });
  }
  function renderStep2(){
    $("#m-feedback").textContent=""; $("#m-feedback").className="feedback";
    $("#m-qlabel").textContent="السؤال ٢: ما حالتها الإعرابية؟";
    var opts=$("#m-opts"); opts.innerHTML="";
    var choices = shuffle(["raf","nasb","jarr","jazm","mabni"]);
    choices.forEach(function(cat){
      var b=el("button","opt",CASE_LABEL[cat]);
      b.onclick=function(){ answer(b,cat===quizCtx.word.cat,revealFull); };
      opts.appendChild(b);
    });
  }
  function answer(btn,correct,next){
    var fb=$("#m-feedback");
    if(correct){
      btn.classList.add("correct"); fb.textContent="أحسنت! إجابة صحيحة."; fb.className="feedback ok";
      disableOpts();
      setTimeout(next,650);
    } else {
      btn.classList.add("wrong"); fb.textContent="ليست هذه. حاول مرة أخرى."; fb.className="feedback no";
      quizCtx.errored=true;
      btn.disabled=true;
    }
  }
  function disableOpts(){ var b=$("#m-opts").querySelectorAll("button"); for(var i=0;i<b.length;i++)b[i].disabled=true; }

  function revealFull(){
    var w=quizCtx.word;
    $("#m-qlabel").textContent="الإعراب الكامل:";
    $("#m-opts").innerHTML="";
    var r=$("#m-reveal");
    r.innerHTML="<span class='tag' style='background:"+CASE_COLOR[w.cat]+"'>"+({raf:"مرفوع",nasb:"منصوب",jarr:"مجرور",jazm:"مجزوم",mabni:"مبنيّ/حرف"}[w.cat])+"</span>"
      +"<div class='full'>"+colorize(w.full)+"</div>";
    r.classList.add("show");
    // scoring (once per word)
    var key=quizCtx.surah.id+"-"+quizCtx.vi+"-"+quizCtx.wi;
    if(!S.done[key]){
      S.done[key]=true;
      S.points += quizCtx.errored?3:5;
      touchStreak();
    }
    if(quizCtx.errored){ pushMistake(quizCtx); }
    quizCtx.span.classList.add("done");
    save(); renderStats();
    // add a close/continue button
    var fb=$("#m-feedback"); fb.className="feedback ok"; fb.textContent= quizCtx.errored? "راجِعها لاحقًا في قسم المراجعة." : "ممتاز! +5 نقاط.";
  }
  function pushMistake(ctx){
    var key=ctx.surah.id+"-"+ctx.vi+"-"+ctx.wi;
    for(var i=0;i<S.mistakes.length;i++){ if(S.mistakes[i].key===key) return; }
    S.mistakes.push({key:key,w:ctx.word.w,full:ctx.word.full,surah:ctx.surah.name,cat:ctx.word.cat});
    save();
  }
  function closeModal(){ $("#overlay").classList.remove("show"); if(curSurah){ /* refresh counts */ } }

  // ---------- review ----------
  function renderReview(){
    var box=$("#review-list"); box.innerHTML="";
    if(!S.mistakes.length){ box.appendChild(el("div","empty","لا أخطاء محفوظة بعد — أحسنت! تدرّب أكثر لتظهر هنا الكلمات التي تحتاج مراجعة.")); return; }
    S.mistakes.forEach(function(m){
      var it=el("div","rev-item");
      it.innerHTML="<div><div class='wtxt'>"+m.w+"</div><div class='muted' style='font-size:13px'>سورة "+m.surah+"</div></div>";
      var right=el("div");
      var tag=el("span","tag"); tag.style.background=CASE_COLOR[m.cat]; tag.style.color="#fff"; tag.style.padding="2px 10px"; tag.style.borderRadius="20px"; tag.style.fontSize="12px";
      tag.textContent={raf:"مرفوع",nasb:"منصوب",jarr:"مجرور",jazm:"مجزوم",mabni:"مبنيّ/حرف"}[m.cat];
      var btn=el("button","btn ghost","الإعراب"); btn.style.padding="6px 12px"; btn.style.fontSize="13px"; btn.style.marginLeft="8px";
      (function(mm,item){ btn.onclick=function(){ toggleInfo(item, "<span class='wtxt'>"+mm.w+"</span><div style='margin-top:6px'>"+colorize(mm.full)+"</div>"); }; })(m,it);
      right.appendChild(tag); right.appendChild(btn);
      it.appendChild(right);
      box.appendChild(it);
    });
    var clr=el("button","btn ghost","مسح قائمة المراجعة"); clr.style.marginTop="10px";
    clr.onclick=function(){ appConfirm("مسح كل الكلمات من المراجعة؟", function(){ S.mistakes=[]; save(); renderReview(); }); };
    box.appendChild(clr);
  }

  // ---------- tabs ----------
  function show(view){
    var vs=document.querySelectorAll(".view"); for(var i=0;i<vs.length;i++)vs[i].classList.remove("active");
    $("#view-"+view).classList.add("active");
    var bs=document.querySelectorAll("nav.tabs button"); for(var j=0;j<bs.length;j++)bs[j].classList.toggle("active",bs[j].getAttribute("data-v")===view);
    if(view==="home")renderHome();
    if(view==="grammar")renderGrammarList();
    if(view==="practice")renderSurahList();
    window.scrollTo(0,0);
  }

  // ---------- init ----------
  document.addEventListener("DOMContentLoaded",function(){
    var bs=document.querySelectorAll("nav.tabs button");
    for(var i=0;i<bs.length;i++){ (function(b){ b.onclick=function(){ show(b.getAttribute("data-v")); }; })(bs[i]); }
    $("#go-practice").onclick=function(){ show("practice"); };
    var gg=$("#go-grammar"); if(gg) gg.onclick=function(){ show("grammar"); };
    var ab=document.querySelector(".about-btn"); if(ab) ab.onclick=function(){ show("about"); };
    $("#m-x").onclick=closeModal;
    $("#overlay").onclick=function(e){ if(e.target===$("#overlay")) closeModal(); };
    renderStats(); show("home");
  });
})();
