/* ==========================================================================
   LIFEFLOW — app.js
   Your Inner Workspace
   ==========================================================================

   TABLE OF CONTENTS
   -----------------
   1.  State & localStorage helpers
   2.  Constants  (colors, months, days)
   3.  Navigation
   4.  Toast notifications
   5.  Dashboard  (refreshDash)
   6.  Notes      (renderNotes, openNoteModal, saveNote, deleteNote …)
   7.  Calendar   (renderCalendar, openCalModal, saveCalEvent …)
   8.  Goals      (renderGoals, openGoalModal, saveGoal …)
   9.  Focus      (Pomodoro timer, sessions)
   10. Reminders  (renderReminders, saveReminder, toggleReminder …)
   11. Overlay close on backdrop click
   12. Init       (called on page load)
   13. Auth_Module  (Firebase Authentication)
   14. Sync_Module  (Firestore cloud persistence)
   ========================================================================== */

// ══════════════════════════════════════════════
//  STATE — localStorage backed
// ══════════════════════════════════════════════
const load = (k,d) => { try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch{return d;} };
const save = (k,v) => { try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} };

let notes     = load('lf_notes',[]);
let calEvents = load('lf_events',[]);
let goals     = load('lf_goals',[]);
let reminders = load('lf_reminders',[]);
let focusSessions = load('lf_sessions',[]);
let weeklyFocus   = load('lf_weekly',{});

const CAL_COLORS = ['#5a8a6a','#c2714f','#4a6fa5','#9b5de5','#b8860b','#c94040'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

let calYear=2026, calMonth=4, calSelColor=CAL_COLORS[0], calEditId=null;
let noteFilter='all', noteSearch='', editNoteId=null, editGoalId=null, editRemId=null;

// ══════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════
function switchTo(id, el){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('panel-'+id).classList.add('active');
  el.classList.add('active');
  document.getElementById('main-scroll').scrollTop=0;
  if(id==='calendar') renderCalendar();
  if(id==='dashboard') refreshDash();
}

// ══════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2400);
}

// ══════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════
function refreshDash(){
  const now=new Date();
  const greetings=['Good morning','Good afternoon','Good evening'];
  const hr=now.getHours();
  const g=hr<12?greetings[0]:hr<18?greetings[1]:greetings[2];
  const name=document.getElementById('user-name-display').textContent;
  document.getElementById('dash-greeting').textContent=`${g}, ${name}`;
  const opts={weekday:'long',month:'long',day:'numeric'};
  document.getElementById('dash-date-label').textContent=now.toLocaleDateString('en-US',opts).toUpperCase();

  // stats
  const todayStr=now.toISOString().slice(0,10);
  const upcomingEvts=calEvents.filter(e=>e.date>=todayStr);
  document.getElementById('stat-notes').textContent=notes.length;
  document.getElementById('stat-goals').textContent=goals.length;
  document.getElementById('stat-events').textContent=upcomingEvts.length;
  document.getElementById('notes-badge').textContent=notes.length;

  // focus today
  const todaySessions=focusSessions.filter(s=>s.date===todayStr);
  const todayMins=todaySessions.reduce((a,s)=>a+s.duration,0);
  document.getElementById('stat-focus').innerHTML=todayMins+'<span class="stat-unit">min</span>';
  document.getElementById('stat-focus-sessions').textContent=todaySessions.length+' sessions';

  // mini chart (last 7 days)
  const chart=document.getElementById('mini-chart');
  const chartLabels=document.getElementById('mini-chart-labels');
  chart.innerHTML=''; chartLabels.innerHTML='';
  let totalWeek=0, totalSessions=0;
  const bars=[];
  for(let i=6;i>=0;i--){
    const d=new Date(now); d.setDate(d.getDate()-i);
    const ds=d.toISOString().slice(0,10);
    const mins=focusSessions.filter(s=>s.date===ds).reduce((a,s)=>a+s.duration,0);
    const sess=focusSessions.filter(s=>s.date===ds).length;
    totalWeek+=mins; totalSessions+=sess;
    bars.push({mins,ds,label:DAYS[d.getDay()].slice(0,3)});
  }
  document.getElementById('weekly-focus-total').textContent=totalWeek+' min';
  document.getElementById('sessions-count-label').textContent=totalSessions+' sessions';
  const max=Math.max(...bars.map(b=>b.mins),1);
  bars.forEach(b=>{
    const wrap=document.createElement('div'); wrap.className='chart-bar-wrap';
    const bar=document.createElement('div'); bar.className='chart-bar'+(b.mins>0?' filled':'');
    bar.style.height=Math.max((b.mins/max)*60,4)+'px';
    bar.title=b.mins+'min';
    const label=document.createElement('div'); label.className='chart-label'; label.textContent=b.label;
    wrap.appendChild(bar); wrap.appendChild(label);
    chart.appendChild(wrap);
  });

  // upcoming reminders on dash
  const upRem=reminders.filter(r=>!r.done).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
  const dashUp=document.getElementById('dash-upcoming');
  if(!upRem.length){ dashUp.innerHTML='<div style="font-size:13px;color:var(--text-muted);padding:8px 0;">No upcoming reminders.</div>'; }
  else{
    dashUp.innerHTML=upRem.map(r=>{
      const pColor={high:'#c94040',medium:'#b8860b',low:'#5a8a6a'}[r.priority];
      const d=new Date(r.date+'T00:00:00');
      const label=d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
      return `<div class="upcoming-item">
        <div class="upcoming-dot" style="background:${pColor}"></div>
        <div><div class="upcoming-name">${r.title}</div><div class="upcoming-when">${label}${r.time?' · '+r.time:''}</div></div>
      </div>`;
    }).join('');
  }

  // goals preview
  const dashGoals=document.getElementById('dash-goals-preview');
  if(!goals.length){ dashGoals.innerHTML='<div style="font-size:13px;color:var(--text-muted);">No goals yet.</div>'; }
  else{
    dashGoals.innerHTML=goals.slice(0,3).map(g=>`
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <span style="font-size:13.5px;color:var(--text-primary);">${g.title}</span>
            <span style="font-size:12px;color:var(--accent);font-weight:600;">${g.progress}%</span>
          </div>
          <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${g.progress}%"></div></div>
        </div>
      </div>
    `).join('');
  }

  // reminders badge
  const pending=reminders.filter(r=>!r.done).length;
  const badge=document.getElementById('rem-badge');
  badge.textContent=pending;
  badge.style.display=pending>0?'':'none';
}

// ══════════════════════════════════════════════
//  NOTES
// ══════════════════════════════════════════════
function filterNotes(f,btn){
  noteFilter=f; document.getElementById('note-search').value=''; noteSearch='';
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderNotes();
}

function searchNotes(val){ noteSearch=val; renderNotes(); }

function renderNotes(){
  const grid=document.getElementById('notes-grid');
  const empty=document.getElementById('empty-notes');
  let filtered=noteFilter==='all'?notes:notes.filter(n=>n.type===noteFilter);
  if(noteSearch) filtered=filtered.filter(n=>n.title.toLowerCase().includes(noteSearch.toLowerCase())||n.body.toLowerCase().includes(noteSearch.toLowerCase()));
  grid.innerHTML='';
  if(!filtered.length){ empty.style.display=''; return; }
  empty.style.display='none';
  const labels={idea:'💡 Idea',recipe:'🍴 Recipe',schedule:'📅 Schedule',list:'✓ List'};
  filtered.forEach(n=>{
    const c=document.createElement('div'); c.className='note-card';
    c.innerHTML=`<button class="note-del" onclick="deleteNote(${n.id},event)">✕</button>
      <div class="note-tag tag-${n.type}">${labels[n.type]}</div>
      <div class="note-title">${n.title}</div>
      <div class="note-preview">${n.body}</div>
      <div class="note-date">${n.date}</div>`;
    c.addEventListener('click',()=>openNoteEdit(n.id));
    grid.appendChild(c);
  });
  document.getElementById('notes-badge').textContent=notes.length;
}

function openNoteModal(){
  editNoteId=null;
  document.getElementById('note-modal-title').textContent='New note';
  document.getElementById('note-title').value='';
  document.getElementById('note-body').value='';
  document.getElementById('note-type').value='idea';
  document.getElementById('overlay-note').classList.add('open');
  setTimeout(()=>document.getElementById('note-title').focus(),150);
}

function openNoteEdit(id){
  const n=notes.find(x=>x.id===id); if(!n) return;
  editNoteId=id;
  document.getElementById('note-modal-title').textContent='Edit note';
  document.getElementById('note-type').value=n.type;
  document.getElementById('note-title').value=n.title;
  document.getElementById('note-body').value=n.body;
  document.getElementById('overlay-note').classList.add('open');
}

function closeNoteModal(){ document.getElementById('overlay-note').classList.remove('open'); }

function saveNote(){
  const title=document.getElementById('note-title').value.trim()||'Untitled';
  const body=document.getElementById('note-body').value.trim();
  const type=document.getElementById('note-type').value;
  const date=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  if(editNoteId){ const n=notes.find(x=>x.id===editNoteId); n.title=title;n.body=body;n.type=type;n.date=date; }
  else { notes.unshift({id:Date.now(),type,title,body,date}); }
  saveCollection('lf_notes',notes);
  closeNoteModal(); renderNotes(); refreshDash();
  showToast(editNoteId?'Note updated ✓':'Note saved ✓');
}

function deleteNote(id,e){
  e.stopPropagation();
  notes=notes.filter(n=>n.id!==id);
  saveCollection('lf_notes',notes); renderNotes(); refreshDash();
  showToast('Note deleted');
}

// ══════════════════════════════════════════════
//  CALENDAR
// ══════════════════════════════════════════════
function changeMonth(d){ calMonth+=d; if(calMonth>11){calMonth=0;calYear++;}else if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); }
function goToday(){ const t=new Date(); calYear=t.getFullYear(); calMonth=t.getMonth(); renderCalendar(); }

function renderCalendar(){
  document.getElementById('cal-month-label').textContent=MONTHS[calMonth]+' '+calYear;
  const head=document.getElementById('cal-head');
  head.innerHTML=DAYS.map(d=>`<div class="cal-head-cell">${d}</div>`).join('');
  const body=document.getElementById('cal-body');
  body.innerHTML='';
  const first=new Date(calYear,calMonth,1).getDay();
  const total=new Date(calYear,calMonth+1,0).getDate();
  const prevTotal=new Date(calYear,calMonth,0).getDate();
  const today=new Date();
  const rows=Math.ceil((first+total)/7);
  let count=0;
  for(let r=0;r<rows;r++){
    for(let d=0;d<7;d++){
      count++;
      const cell=document.createElement('div'); cell.className='cal-day';
      let dayNum,om=false,y=calYear,m=calMonth;
      if(count<=first){dayNum=prevTotal-first+count;om=true;m=calMonth-1;if(m<0){m=11;y--;}}
      else if(count-first>total){dayNum=count-first-total;om=true;m=calMonth+1;if(m>11){m=0;y++;}}
      else{dayNum=count-first;}
      if(om) cell.classList.add('other-month');
      const isToday=!om&&dayNum===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
      if(isToday) cell.classList.add('today');
      const numEl=document.createElement('div'); numEl.className='day-num'; numEl.textContent=dayNum;
      cell.appendChild(numEl);
      const dateStr=`${y}-${String(m+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      calEvents.filter(e=>e.date===dateStr).slice(0,2).forEach(ev=>{
        const pill=document.createElement('div'); pill.className='cal-event-pill';
        pill.style.background=ev.color+'22'; pill.style.color=ev.color;
        pill.textContent=(ev.time?ev.time+' ':'')+ev.name;
        pill.addEventListener('click',e=>{e.stopPropagation();openCalModal(dateStr,ev.id);});
        cell.appendChild(pill);
      });
      cell.addEventListener('click',()=>openCalModal(dateStr));
      body.appendChild(cell);
    }
  }
  renderEventList();
}

function renderEventList(){
  const list=document.getElementById('event-list');
  const now=new Date().toISOString().slice(0,10);
  const up=calEvents.filter(e=>e.date>=now).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8);
  if(!up.length){list.innerHTML='<div style="font-size:13px;color:var(--text-muted);padding:8px 0;">No upcoming events.</div>';return;}
  list.innerHTML=up.map(ev=>{
    const d=new Date(ev.date+'T00:00:00');
    const label=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    return `<div class="event-item">
      <div class="event-color-bar" style="background:${ev.color}"></div>
      <div class="event-info"><div class="event-name">${ev.name}</div><div class="event-time-label">${label}${ev.time?' · '+ev.time:''}</div></div>
      <button class="event-del-btn" onclick="deleteCalEvent(${ev.id})">✕</button>
    </div>`;
  }).join('');
}

function openCalModal(dateStr,editId){
  calEditId=editId||null;
  document.getElementById('cal-modal-title').textContent=editId?'Edit event':'Add event';
  const ev=editId?calEvents.find(e=>e.id===editId):null;
  document.getElementById('cal-name').value=ev?ev.name:'';
  document.getElementById('cal-date').value=ev?ev.date:(dateStr||new Date().toISOString().slice(0,10));
  document.getElementById('cal-time').value=ev?ev.time||'':'';
  calSelColor=ev?ev.color:CAL_COLORS[0];
  renderColorRow('cal-colors',CAL_COLORS);
  document.getElementById('overlay-cal').classList.add('open');
}

function renderColorRow(id,colors){
  document.getElementById(id).innerHTML=colors.map(c=>`<div class="color-dot${c===calSelColor?' sel':''}" style="background:${c}" onclick="pickCalColor('${c}','${id}')"></div>`).join('');
}

function pickCalColor(c,rowId){ calSelColor=c; renderColorRow(rowId,CAL_COLORS); }
function closeCalModal(){ document.getElementById('overlay-cal').classList.remove('open'); }

function saveCalEvent(){
  const name=document.getElementById('cal-name').value.trim();
  const date=document.getElementById('cal-date').value;
  const time=document.getElementById('cal-time').value;
  if(!name||!date) return;
  if(calEditId){ const ev=calEvents.find(e=>e.id===calEditId); ev.name=name;ev.date=date;ev.time=time;ev.color=calSelColor; }
  else{ calEvents.push({id:Date.now(),name,date,time,color:calSelColor}); }
  saveCollection('lf_events',calEvents);
  closeCalModal(); renderCalendar(); refreshDash();
  showToast(calEditId?'Event updated ✓':'Event added ✓');
}

function deleteCalEvent(id){
  calEvents=calEvents.filter(e=>e.id!==id);
  saveCollection('lf_events',calEvents); renderCalendar(); refreshDash();
  showToast('Event deleted');
}

// ══════════════════════════════════════════════
//  GOALS
// ══════════════════════════════════════════════
const GOAL_CATS={
  health:{emoji:'🏃',color:'#5a8a6a',bg:'#e8f2ec'},
  learning:{emoji:'📚',color:'#4a6fa5',bg:'#e8eef8'},
  career:{emoji:'💼',color:'#b8860b',bg:'#fdf6e3'},
  personal:{emoji:'✨',color:'#9b5de5',bg:'#f0e8fc'},
  finance:{emoji:'💰',color:'#5a8a6a',bg:'#e8f2ec'},
  creative:{emoji:'🎨',color:'#c2714f',bg:'#f0e0d6'},
};

function renderGoals(){
  const grid=document.getElementById('goals-grid');
  const empty=document.getElementById('empty-goals');
  if(!goals.length){grid.innerHTML='';empty.style.display='';return;}
  empty.style.display='none';
  grid.innerHTML=goals.map(g=>{
    const cat=GOAL_CATS[g.category]||GOAL_CATS.personal;
    const dl=g.deadline?new Date(g.deadline+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'No deadline';
    return `<div class="goal-card" onclick="openGoalEdit(${g.id})">
      <div class="goal-header">
        <span class="goal-icon">${cat.emoji}</span>
        <button class="goal-menu" onclick="deleteGoal(${g.id},event)">✕</button>
      </div>
      <div class="goal-category" style="background:${cat.bg};color:${cat.color};">${g.category.charAt(0).toUpperCase()+g.category.slice(1)}</div>
      <div class="goal-title">${g.title}</div>
      <div class="goal-desc">${g.desc}</div>
      <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${g.progress}%;background:${cat.color};"></div></div>
      <div class="goal-progress-row">
        <span class="goal-pct" style="color:${cat.color};">${g.progress}%</span>
        <span class="goal-deadline">📅 ${dl}</span>
      </div>
    </div>`;
  }).join('');
}

function openGoalModal(){
  editGoalId=null;
  document.getElementById('goal-modal-title').textContent='New goal';
  document.getElementById('goal-title').value='';
  document.getElementById('goal-desc').value='';
  document.getElementById('goal-category').value='health';
  document.getElementById('goal-deadline').value='';
  document.getElementById('goal-progress').value=0;
  document.getElementById('goal-pct-label').textContent='0%';
  document.getElementById('overlay-goal').classList.add('open');
}

function openGoalEdit(id){
  const g=goals.find(x=>x.id===id); if(!g) return;
  editGoalId=id;
  document.getElementById('goal-modal-title').textContent='Edit goal';
  document.getElementById('goal-title').value=g.title;
  document.getElementById('goal-desc').value=g.desc;
  document.getElementById('goal-category').value=g.category;
  document.getElementById('goal-deadline').value=g.deadline||'';
  document.getElementById('goal-progress').value=g.progress;
  document.getElementById('goal-pct-label').textContent=g.progress+'%';
  document.getElementById('overlay-goal').classList.add('open');
}

function closeGoalModal(){ document.getElementById('overlay-goal').classList.remove('open'); }

function saveGoal(){
  const title=document.getElementById('goal-title').value.trim(); if(!title) return;
  const desc=document.getElementById('goal-desc').value.trim();
  const category=document.getElementById('goal-category').value;
  const deadline=document.getElementById('goal-deadline').value;
  const progress=parseInt(document.getElementById('goal-progress').value);
  if(editGoalId){ const g=goals.find(x=>x.id===editGoalId); g.title=title;g.desc=desc;g.category=category;g.deadline=deadline;g.progress=progress; }
  else{ goals.push({id:Date.now(),title,desc,category,deadline,progress}); }
  saveCollection('lf_goals',goals);
  closeGoalModal(); renderGoals(); refreshDash();
  showToast(editGoalId?'Goal updated ✓':'Goal saved ✓');
}

function deleteGoal(id,e){
  e.stopPropagation();
  goals=goals.filter(g=>g.id!==id);
  saveCollection('lf_goals',goals); renderGoals(); refreshDash();
  showToast('Goal removed');
}

// ══════════════════════════════════════════════
//  FOCUS / POMODORO
// ══════════════════════════════════════════════
const MODES={focus:25,short:5,long:15};
let focusMode='focus', timerDuration=25, timerLeft=25*60, timerRunning=false, timerInterval=null;
const circumference=2*Math.PI*126; // r=126

function setMode(m,btn){
  if(timerRunning) return;
  focusMode=m;
  document.querySelectorAll('.focus-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  timerDuration=MODES[m];
  timerLeft=timerDuration*60;
  document.getElementById('duration-slider').value=timerDuration;
  document.getElementById('duration-label').textContent=timerDuration+' minutes';
  updateTimerDisplay(); updateRing(0);
}

function setDuration(v){
  if(timerRunning) return;
  timerDuration=parseInt(v); timerLeft=timerDuration*60;
  document.getElementById('duration-label').textContent=v+' minutes';
  updateTimerDisplay(); updateRing(0);
}

function updateTimerDisplay(){
  const m=Math.floor(timerLeft/60), s=timerLeft%60;
  document.getElementById('timer-display').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

function updateRing(elapsed){
  const total=timerDuration*60;
  const pct=total>0?elapsed/total:0;
  const offset=circumference*(1-pct);
  document.getElementById('ring-fill').style.strokeDasharray=circumference;
  document.getElementById('ring-fill').style.strokeDashoffset=offset;
}

function toggleTimer(){
  if(timerRunning){ pauseTimer(); }
  else{ startTimer(); }
}

function startTimer(){
  timerRunning=true;
  const btn=document.getElementById('btn-start');
  btn.innerHTML='⏸ Pause'; btn.classList.add('running');
  document.getElementById('duration-slider').disabled=true;
  timerInterval=setInterval(()=>{
    timerLeft--;
    const elapsed=timerDuration*60-timerLeft;
    updateTimerDisplay(); updateRing(elapsed);
    if(timerLeft<=0){ completeSession(); }
  },1000);
}

function pauseTimer(){
  timerRunning=false;
  clearInterval(timerInterval);
  const btn=document.getElementById('btn-start');
  btn.innerHTML='▶ Resume'; btn.classList.remove('running');
}

function resetTimer(){
  clearInterval(timerInterval); timerRunning=false;
  timerLeft=timerDuration*60;
  const btn=document.getElementById('btn-start');
  btn.innerHTML='▶ Start'; btn.classList.remove('running');
  document.getElementById('duration-slider').disabled=false;
  updateTimerDisplay(); updateRing(0);
}

function completeSession(){
  clearInterval(timerInterval); timerRunning=false;
  const btn=document.getElementById('btn-start');
  btn.innerHTML='▶ Start'; btn.classList.remove('running');
  document.getElementById('duration-slider').disabled=false;

  const task=document.getElementById('timer-task').value.trim()||'Focus session';
  const todayStr=new Date().toISOString().slice(0,10);
  const session={
    id:Date.now(),
    task,
    duration:timerDuration,
    date:todayStr,
    time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
  };
  focusSessions.unshift(session);
  if(focusSessions.length>50) focusSessions.length=50;
  saveCollection('lf_sessions',focusSessions);

  timerLeft=timerDuration*60; updateTimerDisplay(); updateRing(0);
  renderSessions(); refreshDash();
  showToast('🎉 Session complete! '+timerDuration+' min logged.');

  if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
    new Notification('Lifeflow — Session complete!',{body:timerDuration+'min of "'+task+'" done. Take a break!'});
  }
}

function renderSessions(){
  const list=document.getElementById('sessions-list');
  const empty=document.getElementById('empty-sessions');
  const today=new Date().toISOString().slice(0,10);
  const todaySess=focusSessions.filter(s=>s.date===today);
  if(!todaySess.length){list.innerHTML='';empty.style.display='';return;}
  empty.style.display='none';
  list.innerHTML=todaySess.map(s=>`
    <div class="session-item">
      <span style="font-size:18px;">⏱</span>
      <span class="session-task">${s.task}</span>
      <span class="session-duration">${s.duration}min</span>
      <span class="session-time">${s.time}</span>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════
//  REMINDERS
// ══════════════════════════════════════════════
function renderReminders(){
  const list=document.getElementById('reminders-list');
  const empty=document.getElementById('empty-reminders');
  const sorted=[...reminders].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  if(!sorted.length){list.innerHTML='';empty.style.display='';return;}
  empty.style.display='none';
  const pColors={high:'#c94040',medium:'#b8860b',low:'#5a8a6a'};
  list.innerHTML=sorted.map(r=>{
    const d=new Date(r.date+'T00:00:00');
    const label=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    return `<div class="reminder-item">
      <div class="reminder-check${r.done?' done':''}" onclick="toggleReminder(${r.id})">${r.done?'✓':''}</div>
      <div class="reminder-info">
        <div class="reminder-title${r.done?' done':''}">${r.title}</div>
        <div class="reminder-when">
          <div class="reminder-priority" style="background:${pColors[r.priority]}"></div>
          ${label}${r.time?' · '+r.time:''}
        </div>
      </div>
      <button class="reminder-del" onclick="deleteReminder(${r.id})">✕</button>
    </div>`;
  }).join('');

  // sidebar stats
  const total=reminders.length;
  const done=reminders.filter(r=>r.done).length;
  document.getElementById('rem-total').textContent=total;
  document.getElementById('rem-done-count').textContent=done;
  document.getElementById('rem-pending').textContent=total-done;

  // today
  const today=new Date().toISOString().slice(0,10);
  const todayRem=reminders.filter(r=>r.date===today&&!r.done);
  const todayList=document.getElementById('rem-today-list');
  if(!todayRem.length){ todayList.innerHTML='<div style="font-size:12px;color:var(--text-muted);">Nothing due today. 🎉</div>'; }
  else{
    todayList.innerHTML=todayRem.map(r=>`<div style="font-size:13px;color:var(--text-primary);padding:6px 0;border-bottom:1px solid var(--border);">${r.title}</div>`).join('');
  }

  // badge
  const pending=reminders.filter(r=>!r.done).length;
  const badge=document.getElementById('rem-badge');
  badge.textContent=pending;
  badge.style.display=pending>0?'':'none';
}

function toggleReminder(id){
  const r=reminders.find(x=>x.id===id); if(!r) return;
  r.done=!r.done;
  saveCollection('lf_reminders',reminders); renderReminders(); refreshDash();
}

function openReminderModal(){
  editRemId=null;
  document.getElementById('rem-modal-title').textContent='New reminder';
  document.getElementById('rem-title').value='';
  document.getElementById('rem-date').value=new Date().toISOString().slice(0,10);
  document.getElementById('rem-time').value='';
  document.getElementById('rem-priority').value='medium';
  document.getElementById('overlay-reminder').classList.add('open');
}

function closeRemModal(){ document.getElementById('overlay-reminder').classList.remove('open'); }

function saveReminder(){
  const title=document.getElementById('rem-title').value.trim(); if(!title) return;
  const date=document.getElementById('rem-date').value;
  const time=document.getElementById('rem-time').value;
  const priority=document.getElementById('rem-priority').value;
  if(editRemId){ const r=reminders.find(x=>x.id===editRemId); r.title=title;r.date=date;r.time=time;r.priority=priority; }
  else{ reminders.push({id:Date.now(),title,date,time,priority,done:false}); }
  saveCollection('lf_reminders',reminders);
  closeRemModal(); renderReminders(); refreshDash();
  showToast('Reminder saved ✓');
}

function deleteReminder(id){
  reminders=reminders.filter(r=>r.id!==id);
  saveCollection('lf_reminders',reminders); renderReminders(); refreshDash();
  showToast('Reminder deleted');
}

// ══════════════════════════════════════════════
//  AUTH_MODULE — Firebase Authentication
// ══════════════════════════════════════════════

// Firebase error code → user-facing message
const AUTH_ERRORS = {
  'auth/email-already-in-use':  'An account with this email already exists.',
  'auth/weak-password':         'Password must be at least 6 characters.',
  'auth/invalid-email':         'Please enter a valid email address.',
  'auth/user-not-found':        'Incorrect email or password.',
  'auth/wrong-password':        'Incorrect email or password.',
  'auth/invalid-credential':    'Incorrect email or password.',
};

function showAuthError(msg){
  const el=document.getElementById('auth-error');
  el.textContent=msg; el.style.display='';
}
function clearAuthError(){
  const el=document.getElementById('auth-error');
  el.textContent=''; el.style.display='none';
}

// Toggle between sign-in and sign-up forms
let _authFormMode='signin';
function toggleAuthForm(){
  clearAuthError();
  _authFormMode=_authFormMode==='signin'?'signup':'signin';
  document.getElementById('form-signin').style.display=_authFormMode==='signin'?'':'none';
  document.getElementById('form-signup').style.display=_authFormMode==='signup'?'':'none';
  const link=document.getElementById('auth-toggle-link');
  link.innerHTML=_authFormMode==='signin'
    ? 'Don\'t have an account? <span class="auth-toggle-action">Sign up</span>'
    : 'Already have an account? <span class="auth-toggle-action">Sign in</span>';
}

// Called when sign-in form is submitted
function handleSignIn(e){
  e.preventDefault();
  clearAuthError();
  const email=document.getElementById('signin-email').value.trim();
  const pass=document.getElementById('signin-password').value;
  if(!email||!pass.trim()){ showAuthError('Please fill in all fields.'); return; }
  if(window.firebaseUnavailable){ showAuthError('Cloud features are unavailable. Please try again later.'); return; }
  window._firebaseAuth.signInWithEmailAndPassword(email,pass)
    .catch(err=>{ showAuthError(AUTH_ERRORS[err.code]||'Sign-in failed. Please try again.'); });
}

// Called when sign-up form is submitted
function handleSignUp(e){
  e.preventDefault();
  clearAuthError();
  const name=document.getElementById('signup-name').value.trim();
  const email=document.getElementById('signup-email').value.trim();
  const pass=document.getElementById('signup-password').value;
  if(!name||!email||!pass.trim()){ showAuthError('Please fill in all fields.'); return; }
  if(window.firebaseUnavailable){ showAuthError('Cloud features are unavailable. Please try again later.'); return; }
  window._firebaseAuth.createUserWithEmailAndPassword(email,pass)
    .then(cred=>{
      return cred.user.updateProfile({displayName:name}).then(()=>initUserDoc(cred.user.uid));
    })
    .catch(err=>{ showAuthError(AUTH_ERRORS[err.code]||'Registration failed. Please try again.'); });
}

// Called when sign-out button is clicked
function handleSignOut(){
  if(window.firebaseUnavailable) return;
  window._firebaseAuth.signOut().catch(err=>console.error('Sign-out error:',err));
}

// Update sidebar + dashboard with authenticated user's identity
function updateIdentity(user){
  const name=user.displayName||user.email||'User';
  document.getElementById('user-avatar').textContent=name[0].toUpperCase();
  document.getElementById('user-name-display').textContent=name;
  const hr=new Date().getHours();
  const g=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
  document.getElementById('dash-greeting').textContent=g+', '+name;
}

// Clear identity elements on sign-out
function clearIdentity(){
  document.getElementById('user-avatar').textContent='';
  document.getElementById('user-name-display').textContent='';
  document.getElementById('dash-greeting').textContent='';
}

// Show/hide workspace vs auth overlay
function showWorkspace(){ document.getElementById('overlay-auth').classList.remove('open'); }
function hideWorkspace(){ document.getElementById('overlay-auth').classList.add('open'); }

// Register onAuthStateChanged listener — called once during init
function initAuth(){
  if(window.firebaseUnavailable){
    showToast('Cloud features are unavailable. Data will be saved locally.');
    // Still show the workspace in localStorage-only mode
    showWorkspace();
    return;
  }
  window._firebaseAuth.onAuthStateChanged(user=>{
    if(user){
      updateIdentity(user);
      showWorkspace();
      loadUserData(user.uid);
    } else {
      clearIdentity();
      clearLocalState();
      hideWorkspace();
      // Re-render to show empty state
      renderNotes(); renderGoals(); renderSessions(); renderReminders(); refreshDash();
    }
  });
}

// ══════════════════════════════════════════════
//  SYNC_MODULE — Firestore cloud persistence
// ══════════════════════════════════════════════

// Maps localStorage keys to Firestore document field names
const LS_TO_FS = {
  'lf_notes':    'notes',
  'lf_events':   'events',
  'lf_goals':    'goals',
  'lf_reminders':'reminders',
  'lf_sessions': 'sessions',
  'lf_weekly':   'weekly',
};

// Per-collection debounce timer handles
const _debounceTimers = {};

// Create initial empty user document on first registration
function initUserDoc(uid){
  if(window.firebaseUnavailable||!window._firebaseDb) return Promise.resolve();
  return window._firebaseDb.collection('users').doc(uid).set(
    {notes:[],events:[],goals:[],reminders:[],sessions:[],weekly:{}},
    {merge:true}
  ).catch(err=>console.error('[sync] initUserDoc failed:',err));
}

// Load all user data from Firestore and populate Local_State
async function loadUserData(uid){
  if(window.firebaseUnavailable||!window._firebaseDb) return;
  try {
    const snap=await window._firebaseDb.collection('users').doc(uid).get();
    if(snap.exists){
      const d=snap.data();
      notes         = Array.isArray(d.notes)     ? d.notes     : [];
      calEvents     = Array.isArray(d.events)    ? d.events    : [];
      goals         = Array.isArray(d.goals)     ? d.goals     : [];
      reminders     = Array.isArray(d.reminders) ? d.reminders : [];
      focusSessions = Array.isArray(d.sessions)  ? d.sessions  : [];
      weeklyFocus   = (d.weekly&&typeof d.weekly==='object') ? d.weekly : {};
    } else {
      // First sign-in — no document yet; start with empty state
      notes=[]; calEvents=[]; goals=[]; reminders=[]; focusSessions=[]; weeklyFocus={};
    }
    // Mirror to localStorage
    save('lf_notes',notes); save('lf_events',calEvents); save('lf_goals',goals);
    save('lf_reminders',reminders); save('lf_sessions',focusSessions); save('lf_weekly',weeklyFocus);
  } catch(err){
    console.error('[sync] loadUserData failed:',err);
    showToast('Could not load your data. Please refresh.');
    notes=[]; calEvents=[]; goals=[]; reminders=[]; focusSessions=[]; weeklyFocus={};
  }
  // Re-render all panels with loaded data
  renderNotes(); renderGoals(); renderSessions(); renderReminders(); renderCalendar(); refreshDash();
}

// Debounced save to Firestore — also always writes to localStorage immediately
function saveCollection(lsKey, data){
  // Always persist to localStorage immediately
  save(lsKey, data);
  // If not authenticated or Firebase unavailable, stop here
  const user=window._firebaseAuth&&window._firebaseAuth.currentUser;
  if(!user||window.firebaseUnavailable||!window._firebaseDb) return;
  // Debounce the Firestore write (500 ms per collection)
  if(_debounceTimers[lsKey]) clearTimeout(_debounceTimers[lsKey]);
  _debounceTimers[lsKey]=setTimeout(()=>{
    const fsField=LS_TO_FS[lsKey];
    if(!fsField) return;
    window._firebaseDb.collection('users').doc(user.uid).set(
      {[fsField]:data},
      {merge:true}
    ).catch(err=>{
      console.error('[sync] saveCollection failed:',err);
      showToast('Sync failed. Your changes are saved locally.');
    });
  },500);
}

// Clear all Local_State and localStorage on sign-out
function clearLocalState(){
  notes=[]; calEvents=[]; goals=[]; reminders=[]; focusSessions=[]; weeklyFocus={};
  ['lf_notes','lf_events','lf_goals','lf_reminders','lf_sessions','lf_weekly']
    .forEach(k=>localStorage.removeItem(k));
}

// ══════════════════════════════════════════════
//  OVERLAY CLOSE ON BACKDROP CLICK
// ══════════════════════════════════════════════
document.querySelectorAll('.overlay').forEach(o=>{
  if(o.id==='overlay-auth') return; // auth overlay must not be dismissible by backdrop click
  o.addEventListener('click',e=>{if(e.target===o){o.classList.remove('open');}});
});

// ══════════════════════════════════════════════
//  GREETING BY TIME
// ══════════════════════════════════════════════
function initGreeting(){
  const now=new Date();
  const opts={weekday:'long',month:'long',day:'numeric'};
  document.getElementById('dash-date-label').textContent=now.toLocaleDateString('en-US',opts).toUpperCase();
  const hr=now.getHours();
  const g=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
  const name=document.getElementById('user-name-display').textContent;
  document.getElementById('dash-greeting').textContent=`${g}, ${name}`;
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
initGreeting();
renderNotes();
renderGoals();
renderSessions();
renderReminders();
refreshDash();
updateTimerDisplay();
updateRing(0);
initAuth();

// ===== SMOOTH BUTTON INTERACTION SYSTEM =====
document.querySelectorAll("button, .btn").forEach(btn => {
  btn.addEventListener("mouseenter", () => {
    btn.style.transition = "0.2s ease";
  });

  btn.addEventListener("mousedown", () => {
    btn.style.transform = "scale(0.96)";
  });

  btn.addEventListener("mouseup", () => {
    btn.style.transform = "scale(1.02)";
  });

  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "scale(1)";
  });
});

const elements = document.querySelectorAll("section, .card, .hero");

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
    }
  });
}, {
  threshold: 0.15
});

elements.forEach(el => {
  el.classList.add("hidden");
  observer.observe(el);
});

document.querySelectorAll('.stat-card,.dash-card,.note-card,.goal-card').forEach(card=>{

  card.addEventListener('mousemove',(e)=>{
    const rect = card.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateY = ((x / rect.width) - 0.5) * 12;
    const rotateX = ((y / rect.height) - 0.5) * -12;

    card.style.transform = `
      perspective(1000px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      translateY(-6px)
    `;
  });

  card.addEventListener('mouseleave',()=>{
    card.style.transform = '';
  });

}); 

  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item=>{

    item.addEventListener('mouseenter',()=>{
      item.style.transform = 'translateX(6px)';
    });

    item.addEventListener('mouseleave',()=>{
      item.style.transform = '';
    });

  });


  // Button pulse effect
  const buttons = document.querySelectorAll(
    '.btn-primary,.quick-btn,.btn-start'
  );

  buttons.forEach(btn=>{

    btn.addEventListener('mouseenter',()=>{
      btn.animate([
        { transform:'scale(1)' },
        { transform:'scale(1.03)' },
        { transform:'scale(1)' }
      ],{
        duration:400,
        easing:'ease-out'
      });
    });

  });


  // Smooth appearance animation
  const animated = document.querySelectorAll(
    '.stat-card,.dash-card,.note-card,.goal-card'
  );

  animated.forEach((el,i)=>{

    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';

    setTimeout(()=>{

      el.style.transition = 'all .5s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';

    }, i * 80);

  });


window.addEventListener('DOMContentLoaded',()=>{

  // 3D tilt effect on cards
  document.querySelectorAll('.stat-card,.dash-card,.note-card,.goal-card').forEach(card=>{
    card.addEventListener('mousemove',(e)=>{
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateY = ((x / rect.width) - 0.5) * 10;
      const rotateX = ((y / rect.height) - 0.5) * -10;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave',()=>{
      card.style.transform = '';
    });
  });

  // Floating nav effect
  document.querySelectorAll('.nav-item').forEach(item=>{
    item.addEventListener('mouseenter',()=>{ item.style.transform = 'translateX(6px)'; });
    item.addEventListener('mouseleave',()=>{ item.style.transform = ''; });
  });

  // Button pulse effect
  document.querySelectorAll('.btn-primary,.quick-btn,.btn-start').forEach(btn=>{
    btn.addEventListener('mouseenter',()=>{
      btn.animate(
        [{transform:'scale(1)'},{transform:'scale(1.03)'},{transform:'scale(1)'}],
        {duration:400, easing:'ease-out'}
      );
    });
  });

  // Smooth entrance animation on cards
  document.querySelectorAll('.stat-card,.dash-card,.note-card,.goal-card').forEach((el,i)=>{
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    setTimeout(()=>{
      el.style.transition = 'all .5s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, i * 80);
  });

});
