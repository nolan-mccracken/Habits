(function () {
  'use strict';

  var STORAGE_KEY = 'daily-points-github-v4';
  var LEGACY_KEYS = ['daily-points-github-v3', 'daily-points-github-v2', 'daily-points'];
  var CATEGORIES = ['Morning','Hygiene','Fitness','Nutrition','Mind & Spirit','Focus','Home','Relationships','Digital','Evening','Custom'];
  var DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var state;
  var editingId = null;
  var lastReminderMinute = '';

  var STARTERS = [
    ['Morning','Make bed',2,'Should','daily'],
    ['Morning','Drink water after waking',2,'Must','daily'],
    ['Morning','No phone first 15 minutes',3,'Should','daily'],
    ['Morning','Review top priorities',3,'Should','days',[1,2,3,4,5]],
    ['Hygiene','Brush teeth - morning',3,'Must','daily'],
    ['Hygiene','Brush teeth - night',4,'Must','daily'],
    ['Hygiene','Floss',5,'Must','daily'],
    ['Hygiene','Retainer',4,'Must','daily'],
    ['Hygiene','Shower',3,'Should','daily'],
    ['Hygiene','Skincare / grooming',2,'Bonus','daily'],
    ['Fitness','Complete planned workout',15,'Should','weekly',null,4],
    ['Fitness','10+ minute walk',4,'Should','daily'],
    ['Fitness','Hit step goal',6,'Should','daily'],
    ['Fitness','Stretch / mobility',4,'Bonus','daily'],
    ['Nutrition','Protein-forward meal',4,'Should','daily'],
    ['Nutrition','Fruit / vegetables',3,'Should','daily'],
    ['Nutrition','Hydration goal',5,'Must','daily'],
    ['Nutrition','Avoid mindless snacking',3,'Bonus','daily'],
    ['Mind & Spirit','Pray',5,'Must','daily'],
    ['Mind & Spirit','Reflection / journal',5,'Must','daily'],
    ['Mind & Spirit','Read scripture / spiritual text',5,'Should','daily'],
    ['Mind & Spirit','Gratitude - 3 things',4,'Bonus','daily'],
    ['Focus','Complete most important task',10,'Must','days',[1,2,3,4,5]],
    ['Focus','30+ minutes focused work',6,'Should','days',[1,2,3,4,5]],
    ['Focus','Plan tomorrow',4,'Should','daily'],
    ['Home','10-minute room reset',4,'Should','daily'],
    ['Home','Dishes / kitchen reset',4,'Should','daily'],
    ['Home','Laundry',5,'Should','weekly',null,2],
    ['Home','Clean workspace',3,'Bonus','weekly',null,3],
    ['Relationships','Meaningful conversation',4,'Should','daily'],
    ['Relationships','Contact family / friend',3,'Bonus','weekly',null,3],
    ['Relationships','Express appreciation',3,'Bonus','daily'],
    ['Digital','No doomscrolling in bed',5,'Must','daily'],
    ['Digital','Screen-free last 30 minutes',5,'Should','daily'],
    ['Digital','Social media within limit',4,'Should','daily'],
    ['Evening','Prepare tomorrow essentials',3,'Should','daily'],
    ['Evening','Review the day',3,'Should','daily'],
    ['Evening','Bed near target time',6,'Must','daily'],
    ['Evening','7+ hours sleep opportunity',6,'Must','daily']
  ].map(function (x, i) {
    return {
      id: 's' + i,
      category: x[0],
      name: x[1],
      points: x[2],
      tier: x[3],
      schedule: {
        type: x[4],
        days: x[5] || [0,1,2,3,4,5,6],
        target: x[6] || 0
      },
      enabled: true
    };
  });

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function freshState() {
    return {
      version: 4,
      habits: clone(STARTERS),
      days: {},
      goal: 60,
      categoryBonus: 3,
      mvd: {},
      collapsed: {},
      reminders: [
        {id:'r1', label:'Morning reset', time:'08:00', enabled:false},
        {id:'r2', label:'Evening reset', time:'21:00', enabled:false}
      ],
      undo: []
    };
  }

  function sanitize(raw) {
    var base = freshState();
    if (!raw || typeof raw !== 'object') return base;
    if (Array.isArray(raw.habits)) {
      base.habits = raw.habits.map(function (h, i) {
        var schedule = h && h.schedule ? h.schedule : {type:'daily'};
        var type = ['daily','days','weekly'].indexOf(schedule.type) >= 0 ? schedule.type : 'daily';
        return {
          id: String((h && h.id) || ('legacy' + i)),
          category: CATEGORIES.indexOf(h && h.category) >= 0 ? h.category : 'Custom',
          name: String((h && h.name) || 'Habit'),
          points: Math.max(1, Number(h && h.points) || 1),
          tier: ['Must','Should','Bonus'].indexOf(h && h.tier) >= 0 ? h.tier : 'Should',
          schedule: {
            type: type,
            days: Array.isArray(schedule.days) ? schedule.days.filter(function (n) { return n >= 0 && n <= 6; }) : [0,1,2,3,4,5,6],
            target: Math.min(7, Math.max(1, Number(schedule.target) || 2))
          },
          enabled: h && h.enabled === false ? false : true
        };
      });
    }
    if (raw.days && typeof raw.days === 'object') base.days = raw.days;
    if (Number(raw.goal) > 0) base.goal = Number(raw.goal);
    if (Number(raw.categoryBonus) >= 0) base.categoryBonus = Number(raw.categoryBonus);
    if (raw.mvd && typeof raw.mvd === 'object') base.mvd = raw.mvd;
    if (raw.collapsed && typeof raw.collapsed === 'object') base.collapsed = raw.collapsed;
    if (Array.isArray(raw.reminders)) base.reminders = raw.reminders;
    if (Array.isArray(raw.undo)) base.undo = raw.undo.slice(-20);
    return base;
  }

  function loadState() {
    var keys = [STORAGE_KEY].concat(LEGACY_KEYS);
    for (var i = 0; i < keys.length; i++) {
      try {
        var text = localStorage.getItem(keys[i]);
        if (text) {
          var parsed = sanitize(JSON.parse(text));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          return parsed;
        }
      } catch (err) {}
    }
    return freshState();
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (err) { showToast('Could not autosave. Safari storage may be unavailable.', true); }
  }

  function el(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function dayRecord(k) {
    k = k || dateKey();
    if (!state.days[k] || typeof state.days[k] !== 'object') state.days[k] = {done:{}};
    if (!state.days[k].done || typeof state.days[k].done !== 'object') state.days[k].done = {};
    return state.days[k];
  }
  function weekStart(d) {
    var x = new Date(d || new Date());
    var diff = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - diff);
    x.setHours(0,0,0,0);
    return x;
  }
  function sameWeek(a,b) { return weekStart(a).getTime() === weekStart(b || new Date()).getTime(); }
  function weeklyDone(h, now) {
    var count = 0;
    Object.keys(state.days).forEach(function (k) {
      var d = new Date(k + 'T12:00:00');
      var rec = state.days[k];
      if (sameWeek(d, now || new Date()) && rec && rec.done && rec.done[h.id]) count++;
    });
    return count;
  }
  function isScheduledToday(h, d) {
    d = d || new Date();
    if (!h.enabled) return false;
    var s = h.schedule || {type:'daily'};
    if (s.type === 'daily') return true;
    if (s.type === 'days') return (s.days || []).indexOf(d.getDay()) >= 0;
    if (s.type === 'weekly') {
      return weeklyDone(h,d) < (Number(s.target) || 1) || !!(state.days[dateKey(d)] && state.days[dateKey(d)].done && state.days[dateKey(d)].done[h.id]);
    }
    return true;
  }
  function isScheduledForHistory(h,d) {
    if (!h.enabled) return false;
    var s = h.schedule || {type:'daily'};
    if (s.type === 'daily') return true;
    if (s.type === 'days') return (s.days || []).indexOf(d.getDay()) >= 0;
    if (s.type === 'weekly') return true;
    return true;
  }
  function todaysHabits() {
    var onlyMust = !!state.mvd[dateKey()];
    return state.habits.filter(function (h) { return isScheduledToday(h) && (!onlyMust || h.tier === 'Must'); });
  }
  function scoreFor(k) {
    var rec = state.days[k];
    if (!rec || !rec.done) return 0;
    var dt = new Date(k + 'T12:00:00');
    var total = 0;
    var groups = {};
    state.habits.forEach(function (h) {
      if (!isScheduledForHistory(h,dt)) return;
      if (rec.done[h.id]) total += Number(h.points) || 0;
      if (!groups[h.category]) groups[h.category] = [];
      groups[h.category].push(h);
    });
    Object.keys(groups).forEach(function (cat) {
      var hs = groups[cat];
      if (hs.length && hs.every(function (h) { return !!rec.done[h.id]; })) total += Number(state.categoryBonus) || 0;
    });
    return total;
  }
  function toggleHabit(id) {
    var rec = dayRecord();
    var prev = !!rec.done[id];
    state.undo.push({k:dateKey(), id:id, prev:prev});
    if (state.undo.length > 20) state.undo.shift();
    rec.done[id] = !prev;
    saveState();
    renderAll();
  }
  function autoCollapsed(cat) {
    if (Object.prototype.hasOwnProperty.call(state.collapsed,cat)) return !!state.collapsed[cat];
    var hour = new Date().getHours();
    if (cat === 'Morning' && hour >= 13) return true;
    if (cat === 'Evening' && hour < 16) return true;
    return false;
  }

  function renderAll() {
    try {
      el('dateLabel').textContent = new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
      var hs = todaysHabits();
      var rec = dayRecord();
      var score = scoreFor(dateKey());
      var completed = hs.filter(function (h) { return !!rec.done[h.id]; }).length;
      el('score').textContent = score;
      el('doneCount').textContent = completed;
      el('habitCount').textContent = hs.length;
      el('goalText').textContent = state.goal;
      el('scoreBar').style.width = Math.min(100, state.goal ? score/state.goal*100 : 0) + '%';
      el('mvdBtn').textContent = 'Minimum viable day: ' + (state.mvd[dateKey()] ? 'On' : 'Off');
      el('mvdNote').style.display = state.mvd[dateKey()] ? 'block' : 'none';
      renderToday(hs,rec);
      renderStats();
      renderReports();
      renderStreaks();
      renderManage();
      renderSettings();
    } catch (err) {
      showFatal(err);
    }
  }

  function renderToday(hs,rec) {
    var root = el('todayGrid');
    root.innerHTML = '';
    CATEGORIES.forEach(function (cat) {
      var list = hs.filter(function (h) { return h.category === cat; });
      if (!list.length) return;
      var card = document.createElement('div');
      card.className = 'card';
      var allDone = list.every(function (h) { return !!rec.done[h.id]; });
      var collapsed = autoCollapsed(cat);
      card.innerHTML = '<div class="sectionhead clickable"><h2>' + escapeHtml(cat) + '</h2><div><span class="perfect">' + (allDone ? 'PERFECT +' + state.categoryBonus : '') + '</span><button type="button" class="collapseBtn" aria-label="Toggle section">' + (collapsed ? '&#9656;' : '&#8964;') + '</button></div></div><div class="habitbody" style="display:' + (collapsed ? 'none' : 'block') + '"></div>';
      card.querySelector('.sectionhead').addEventListener('click', function () {
        state.collapsed[cat] = !collapsed;
        saveState();
        renderAll();
      });
      var body = card.querySelector('.habitbody');
      list.forEach(function (h) {
        var row = document.createElement('div');
        row.className = 'habit' + (rec.done[h.id] ? ' done' : '');
        var smeta = 'Every day';
        if (h.schedule.type === 'weekly') smeta = weeklyDone(h) + '/' + h.schedule.target + ' this week';
        else if (h.schedule.type === 'days') smeta = (h.schedule.days || []).map(function (i) { return DAY_NAMES[i]; }).join(' · ');
        row.innerHTML = '<button type="button" class="check" aria-label="Toggle ' + escapeHtml(h.name) + '">' + (rec.done[h.id] ? '&#10003;' : '') + '</button><div class="habitText"><button type="button" class="nameButton">' + escapeHtml(h.name) + '</button><div class="meta"><span class="tier ' + h.tier + '">' + h.tier + '</span>' + escapeHtml(smeta) + '</div></div><div class="pts">+' + h.points + '</div>';
        row.querySelector('.check').addEventListener('click', function () { toggleHabit(h.id); });
        row.querySelector('.nameButton').addEventListener('click', function () { toggleHabit(h.id); });
        body.appendChild(row);
      });
      root.appendChild(card);
    });
    if (!root.children.length) root.innerHTML = '<div class="card empty">Nothing is scheduled for today.</div>';
  }

  function renderStats() {
    var goalStreak = 0;
    for (var i=0;i<3650;i++) {
      var d = new Date(); d.setDate(d.getDate()-i);
      var k = dateKey(d);
      if (state.days[k] && scoreFor(k) >= state.goal) goalStreak++; else break;
    }
    el('goalStreak').textContent = goalStreak;
    var ws=0, possible=0, doneN=0;
    var start=weekStart();
    var now=new Date();
    for (var j=0;j<7;j++) {
      var wd=new Date(start); wd.setDate(start.getDate()+j);
      if (wd > now) break;
      var wk=dateKey(wd); ws += scoreFor(wk);
      state.habits.filter(function (h) { return isScheduledForHistory(h,wd); }).forEach(function (h) {
        possible++; if (state.days[wk] && state.days[wk].done && state.days[wk].done[h.id]) doneN++;
      });
    }
    el('weeklyScore').textContent=ws;
    el('weekPct').textContent=(possible ? Math.round(doneN/possible*100) : 0) + '%';
    var hs=todaysHabits(), rec=dayRecord(), pc=0;
    CATEGORIES.forEach(function (c) {
      var a=hs.filter(function (h) { return h.category===c; });
      if (a.length && a.every(function (h) { return !!rec.done[h.id]; })) pc++;
    });
    el('perfectCats').textContent=pc;
    var scores=Object.keys(state.days).map(function(k){return scoreFor(k);});
    el('bestDay').textContent=scores.length ? Math.max.apply(Math,scores) : 0;
  }

  function renderReports() {
    var start=weekStart(), end=new Date(start); end.setDate(end.getDate()+6);
    el('weekRange').textContent=start.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' - '+end.toLocaleDateString(undefined,{month:'short',day:'numeric'});
    var html='';
    for(var i=0;i<7;i++){
      var d=new Date(start); d.setDate(start.getDate()+i);
      var k=dateKey(d), s=scoreFor(k), possible=0, doneN=0;
      state.habits.filter(function(h){return isScheduledForHistory(h,d);}).forEach(function(h){possible++; if(state.days[k]&&state.days[k].done&&state.days[k].done[h.id])doneN++;});
      var pct=possible?Math.round(doneN/possible*100):0;
      html+='<div class="metric"><div class="metricline"><b>'+d.toLocaleDateString(undefined,{weekday:'short'})+'</b><span>'+s+' pts · '+pct+'%</span></div><div class="miniBar"><i style="width:'+pct+'%"></i></div></div>';
    }
    el('weekReport').innerHTML=html;
    var q=state.habits.filter(function(h){return h.enabled&&h.schedule&&h.schedule.type==='weekly';});
    el('quotaReport').innerHTML=q.length?q.map(function(h){var n=weeklyDone(h);return '<div class="metric"><div class="metricline"><span>'+escapeHtml(h.name)+'</span><b>'+n+'/'+h.schedule.target+'</b></div><div class="miniBar"><i style="width:'+Math.min(100,n/h.schedule.target*100)+'%"></i></div></div>';}).join(''):'<div class="sub">No weekly-frequency habits.</div>';
    var now=new Date(); el('monthLabel').textContent=now.toLocaleDateString(undefined,{month:'long',year:'numeric'});
    var count=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(), vals=[];
    for(var day=1;day<=count;day++) vals.push(scoreFor(dateKey(new Date(now.getFullYear(),now.getMonth(),day))));
    var max=Math.max.apply(Math,[state.goal,1].concat(vals));
    el('monthChart').innerHTML=vals.map(function(v,index){return '<div class="col" title="Day '+(index+1)+': '+v+' pts" style="height:'+Math.max(2,v/max*100)+'%"></div>';}).join('');
  }

  function habitStreak(h) {
    var s=0;
    for(var i=0;i<730;i++){
      var d=new Date(); d.setDate(d.getDate()-i);
      if(!isScheduledForHistory(h,d)) continue;
      var rec=state.days[dateKey(d)];
      if(rec&&rec.done&&rec.done[h.id]) s++; else break;
    }
    return s;
  }
  function renderStreaks(){
    var hs=state.habits.filter(function(h){return h.enabled;}).map(function(h){return [h,habitStreak(h)];}).sort(function(a,b){return b[1]-a[1];});
    el('streakList').innerHTML=hs.map(function(pair){var h=pair[0],s=pair[1];return '<div class="streakrow"><div><b>'+escapeHtml(h.name)+'</b><div class="sub">'+escapeHtml(h.category)+' · '+h.tier+'</div></div><div><b>'+s+'</b> <span class="sub">streak</span></div></div>';}).join('');
  }
  function scheduleLabel(h){var s=h.schedule||{};if(s.type==='daily')return'Every day';if(s.type==='weekly')return s.target+'x / week';return(s.days||[]).map(function(i){return DAY_NAMES[i];}).join(', ');}
  function renderManage(){
    var root=el('manageList'); root.innerHTML='';
    state.habits.forEach(function(h){
      var item=document.createElement('div'); item.className='edit';
      item.innerHTML='<div class="editTitle"><b>'+escapeHtml(h.name)+'</b><div class="sub">'+escapeHtml(h.category)+' · '+escapeHtml(scheduleLabel(h))+'</div></div><input class="pointsEdit" type="number" min="1" value="'+h.points+'"><select class="tierEdit"><option '+(h.tier==='Must'?'selected':'')+'>Must</option><option '+(h.tier==='Should'?'selected':'')+'>Should</option><option '+(h.tier==='Bonus'?'selected':'')+'>Bonus</option></select><button type="button" class="btn small toggleEnable">'+(h.enabled?'Enabled':'Hidden')+'</button><button type="button" class="btn small editBtn">Edit</button>';
      item.querySelector('.pointsEdit').addEventListener('change',function(e){h.points=Math.max(1,Number(e.target.value)||1);saveState();renderAll();});
      item.querySelector('.tierEdit').addEventListener('change',function(e){h.tier=e.target.value;saveState();renderAll();});
      item.querySelector('.toggleEnable').addEventListener('click',function(){h.enabled=!h.enabled;saveState();renderAll();});
      item.querySelector('.editBtn').addEventListener('click',function(){openHabit(h.id);});
      root.appendChild(item);
    });
  }
  function renderSettings(){
    el('goalInput').value=state.goal; el('bonusInput').value=state.categoryBonus;
    el('reminderList').innerHTML=state.reminders.map(function(r){return '<div class="reminder"><label><input class="switch reminderToggle" data-id="'+escapeHtml(r.id)+'" type="checkbox" '+(r.enabled?'checked':'')+'> '+escapeHtml(r.label)+'</label><input class="reminderTime" data-id="'+escapeHtml(r.id)+'" type="time" value="'+escapeHtml(r.time)+'"><button type="button" class="btn small red reminderDelete" data-id="'+escapeHtml(r.id)+'">x</button></div>';}).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.reminderToggle'),function(x){x.addEventListener('change',function(){var r=findReminder(x.getAttribute('data-id'));if(r){r.enabled=x.checked;saveState();}});});
    Array.prototype.forEach.call(document.querySelectorAll('.reminderTime'),function(x){x.addEventListener('change',function(){var r=findReminder(x.getAttribute('data-id'));if(r){r.time=x.value;saveState();}});});
    Array.prototype.forEach.call(document.querySelectorAll('.reminderDelete'),function(x){x.addEventListener('click',function(){var id=x.getAttribute('data-id');state.reminders=state.reminders.filter(function(r){return r.id!==id;});saveState();renderSettings();});});
  }
  function findReminder(id){for(var i=0;i<state.reminders.length;i++)if(state.reminders[i].id===id)return state.reminders[i];return null;}

  function renderDayPicker(selected){
    selected=selected||[]; el('dayPicker').innerHTML='';
    DAY_NAMES.forEach(function(name,i){var b=document.createElement('button');b.type='button';b.className='btn daybtn'+(selected.indexOf(i)>=0?' on':'');b.setAttribute('data-day',i);b.textContent=name;b.addEventListener('click',function(){b.classList.toggle('on');});el('dayPicker').appendChild(b);});
  }
  function syncScheduleUI(){var t=el('scheduleType').value;el('weeklyTarget').style.display=t==='weekly'?'block':'none';el('dayPicker').style.display=t==='days'?'flex':'none';}
  function openHabit(id){
    editingId=id||null;
    var h=id?state.habits.find(function(x){return x.id===id;}):null;
    if(!h)h={name:'',points:5,tier:'Should',category:'Custom',schedule:{type:'daily',days:[0,1,2,3,4,5,6],target:2}};
    el('modalTitle').textContent=id?'Edit habit':'Add habit'; el('hName').value=h.name; el('hPoints').value=h.points; el('hTier').value=h.tier; el('hCategory').value=h.category; el('scheduleType').value=h.schedule.type; el('weeklyTarget').value=h.schedule.target||2; renderDayPicker(h.schedule.days||[]); syncScheduleUI(); el('habitModal').classList.add('open');
  }
  function saveHabitFromModal(){
    var name=el('hName').value.trim(); if(!name){showToast('Enter a habit name.',true);return;}
    var type=el('scheduleType').value, days=[];
    Array.prototype.forEach.call(el('dayPicker').querySelectorAll('.on'),function(b){days.push(Number(b.getAttribute('data-day')));});
    if(type==='days'&&!days.length){showToast('Choose at least one day.',true);return;}
    var patch={name:name,points:Math.max(1,Number(el('hPoints').value)||1),tier:el('hTier').value,category:el('hCategory').value,schedule:{type:type,days:days,target:Math.min(7,Math.max(1,Number(el('weeklyTarget').value)||2))}};
    if(editingId){var found=state.habits.find(function(h){return h.id===editingId;});if(found)Object.assign(found,patch);}else{patch.id='c'+Date.now();patch.enabled=true;state.habits.push(patch);}
    saveState(); el('habitModal').classList.remove('open'); renderAll(); showToast('Habit saved.');
  }
  function showToast(text,error){var t=el('toast');if(!t)return;t.textContent=text;t.className='toast show'+(error?' error':'');setTimeout(function(){t.className='toast';},2400);}
  function showFatal(err){var box=el('fatalError');if(box){box.style.display='block';box.textContent='The app hit an error: '+(err&&err.message?err.message:String(err))+'. Try Settings > Reset local data, or reload the latest GitHub version.';}if(window.console)console.error(err);}

  function exportBackup(){
    var blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='daily-points-backup-'+dateKey()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  function importBackup(file){
    if(!file)return;var reader=new FileReader();reader.onload=function(){try{state=sanitize(JSON.parse(reader.result));saveState();renderAll();showToast('Backup restored.');}catch(e){showToast('That backup file could not be read.',true);}};reader.readAsText(file);
  }
  function requestNotifications(){
    if(!('Notification' in window)){showToast('Browser notifications are not supported here.',true);return;}
    try{var result=Notification.requestPermission();if(result&&typeof result.then==='function')result.then(function(p){showToast(p==='granted'?'Notifications enabled.':'Notification permission not granted.',p!=='granted');});}catch(e){showToast('Notification permission is unavailable.',true);}
  }
  function reminderTick(){
    var now=new Date(), hh=String(now.getHours()).padStart(2,'0'), mm=String(now.getMinutes()).padStart(2,'0'), stamp=dateKey(now)+' '+hh+':'+mm;
    if(stamp===lastReminderMinute)return; lastReminderMinute=stamp;
    state.reminders.forEach(function(r){if(!r.enabled||r.time!==hh+':'+mm)return;if('Notification' in window&&Notification.permission==='granted'){try{new Notification('Daily Points',{body:r.label});}catch(e){showToast('Reminder: '+r.label);}}else{showToast('Reminder: '+r.label);}});
  }

  function bindEvents(){
    Array.prototype.forEach.call(document.querySelectorAll('.nav button'),function(b){b.addEventListener('click',function(){Array.prototype.forEach.call(document.querySelectorAll('.nav button'),function(x){x.classList.toggle('active',x===b);});Array.prototype.forEach.call(document.querySelectorAll('.panel'),function(p){p.classList.toggle('active',p.id===b.getAttribute('data-tab'));});});});
    el('mvdBtn').addEventListener('click',function(){state.mvd[dateKey()]=!state.mvd[dateKey()];saveState();renderAll();});
    el('undoBtn').addEventListener('click',function(){var u=state.undo.pop();if(!u){showToast('Nothing to undo.');return;}dayRecord(u.k).done[u.id]=u.prev;saveState();renderAll();});
    el('addQuickBtn').addEventListener('click',function(){openHabit();});
    el('addHabitBtn').addEventListener('click',function(){openHabit();});
    el('closeModal').addEventListener('click',function(){el('habitModal').classList.remove('open');});
    el('habitModal').addEventListener('click',function(e){if(e.target===el('habitModal'))el('habitModal').classList.remove('open');});
    el('scheduleType').addEventListener('change',syncScheduleUI);
    el('saveHabitBtn').addEventListener('click',saveHabitFromModal);
    el('goalInput').addEventListener('change',function(){state.goal=Math.max(1,Number(el('goalInput').value)||60);saveState();renderAll();});
    el('bonusInput').addEventListener('change',function(){state.categoryBonus=Math.max(0,Number(el('bonusInput').value)||0);saveState();renderAll();});
    el('notificationBtn').addEventListener('click',requestNotifications);
    el('addReminderBtn').addEventListener('click',function(){state.reminders.push({id:'r'+Date.now(),label:'Daily reminder',time:'12:00',enabled:true});saveState();renderSettings();});
    el('exportBtn').addEventListener('click',exportBackup);
    el('importBtn').addEventListener('click',function(){el('importFile').click();});
    el('importFile').addEventListener('change',function(){importBackup(el('importFile').files[0]);el('importFile').value='';});
    el('resetBtn').addEventListener('click',function(){if(window.confirm('Erase all Daily Points data stored in this browser?')){state=freshState();saveState();renderAll();showToast('Local data reset.');}});
  }

  function init(){
    try{
      state=loadState();
      el('hCategory').innerHTML=CATEGORIES.map(function(c){return '<option>'+escapeHtml(c)+'</option>';}).join('');
      bindEvents();
      renderAll();
      setInterval(reminderTick,15000);
      if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js?v=4').then(function(reg){if(reg.update)reg.update();}).catch(function(err){if(window.console)console.warn('Service worker registration failed',err);});});}
    }catch(err){showFatal(err);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
