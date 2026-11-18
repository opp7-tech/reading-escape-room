/*
 * غرفة الهروب القرائي | تطبيق محلي بلا قاعدة بيانات ولا اتصال بخدمات طرف ثالث.
 * قواعد التقدم: لا يُحتسب السؤال إلا بعد الحل الصحيح. لا انتقال للباب التالي
 * قبل إكمال 5 أسئلة في الباب الحالي. لا شهادة قبل إكمال جميع الأسئلة الـ25.
 */
(() => {
  'use strict';
  const content = window.ESCAPE_CONTENT;
  const stages = content.stages;
  const STORAGE_KEY = 'reading-escape-session-v3';
  const TOTAL = stages.reduce((n, stage) => n + stage.questions.length, 0);
  const byId = id => document.getElementById(id);
  const numerals = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
  let state = {name:'', gate:0, question:0};
  let solved = false;
  let chosenTiles = [];
  let sessionFails = 0;
  let pendingReveal = false;

  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = str => String(str).replace(/[\u064B-\u065F\u0670ـ\s]/g,'').trim();

  function saveState() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* no storage required to play */ }
  }
  function loadState() {
    try {
      const candidate = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!candidate || typeof candidate.name !== 'string') return;
      if (!Number.isInteger(candidate.gate) || candidate.gate < 0 || candidate.gate > stages.length) return;
      if (!Number.isInteger(candidate.question) || candidate.question < 0 || candidate.question > 4) return;
      if (candidate.gate === stages.length && candidate.question !== 0) return;
      state = {name: candidate.name.trim().slice(0,45), gate:candidate.gate, question:candidate.question};
    } catch (_) { /* ignore malformed session */ }
  }
  function show(view) {
    ['Welcome','World','Game','Victory'].forEach(id => byId('view'+id).classList.toggle('hidden',id!==view));
    const home = byId('homeLink');
    home.classList.toggle('hidden', !(view === 'World' || view === 'Game'));
    window.scrollTo({top:0,behavior:'instant'});
  }
  function celebrate() {
    // Small success sound without external resources or music. Browser may block audio.
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const now = context.currentTime;
      [660,880].forEach((hz,i)=>{
        const osc = context.createOscillator(); const volume = context.createGain();
        osc.type = 'sine'; osc.frequency.value = hz;
        volume.gain.setValueAtTime(.0001,now+i*.12);
        volume.gain.exponentialRampToValueAtTime(.045,now+i*.12+.02);
        volume.gain.exponentialRampToValueAtTime(.0001,now+i*.12+.18);
        osc.connect(volume);volume.connect(context.destination);osc.start(now+i*.12);osc.stop(now+i*.12+.2);
      });
      setTimeout(() => context.close().catch(()=>{}),800);
    } catch (_) { /* silent mode is fine */ }
  }
  function start(event) {
    event.preventDefault();
    const input = byId('studentName');
    const name = input.value.replace(/\s+/g,' ').trim();
    if (name.length < 2) { input.setCustomValidity('اكتبي اسمًا من حرفين على الأقل.');input.reportValidity();return; }
    input.setCustomValidity('');
    state = {name:name.slice(0,45),gate:0,question:0};
    sessionFails = 0;saveState();renderWorld();
  }
  function renderWorld() {
    if (!state.name) { show('Welcome'); return; }
    if (state.gate === stages.length) { renderVictory();return; }
    byId('worldHello').textContent = `أهلًا يا ${state.name}! أمامكِ ${numerals(stages.length - state.gate)} بوابات متبقية. افتحيها واحدة تلو الأخرى!`;
    byId('doorsDone').textContent = `${numerals(state.gate)} / ${numerals(stages.length)}`;
    byId('overallProgress').style.width = (state.gate / stages.length * 100) + '%';
    const grid = byId('doorsGrid');grid.innerHTML='';
    const colors=['#f9a5c1','#9dccff','#c8b1ff','#9addc3','#f5d59c'];
    stages.forEach((stage,index)=>{
      const status = index < state.gate ? 'done' : index === state.gate ? 'current':'locked';
      const button = document.createElement('button');
      button.type='button';button.className='door-card '+status;button.disabled=status!=='current';
      button.style.setProperty('--door-color',colors[index]);
      const mark=status==='done'?'✓':status==='locked'?'🔒':stage.icon;
      button.innerHTML = `<span class="door-icon" aria-hidden="true">${mark}${status==='locked'?'<span class="door-locked-icon">🔒</span>':''}</span><span class="door-text"><small>البوابة ${numerals(index+1)}</small><strong>${escapeHtml(stage.title)}</strong><p>${escapeHtml(stage.subtitle)}</p><span class="door-status">${status==='done'?'✓ تم فتح الباب':status==='current'?'✦ اضغطي لبدء اللعبة':'مغلقة حتى تنجزي ما قبلها'}</span></span>`;
      if(status==='current') button.addEventListener('click',renderGame);
      grid.appendChild(button);
    });
    show('World');
  }
  function renderGame() {
    if (!state.name) { show('Welcome');return; }
    if(state.gate===stages.length){renderVictory();return;}
    solved=false;chosenTiles=[];sessionFails=0;pendingReveal=false;
    const stage = stages[state.gate];
    byId('gameBadge').textContent='البوابة '+numerals(state.gate+1)+' / ٥';
    byId('gameTitle').textContent=stage.icon+' '+stage.title;
    byId('gameIntro').textContent=stage.subtitle;
    byId('gameCounter').textContent=`المهمة ${numerals(state.question+1)} من ${numerals(stage.questions.length)}`;
    byId('stageLabel').textContent=stage.short;
    byId('taskDots').innerHTML=stage.questions.map((_,i)=>`<span class="task-dot ${i<state.question?'solved':i===state.question?'active':''}" aria-label="المهمة ${numerals(i+1)}">${i<state.question?'✓':numerals(i+1)}</span>`).join('');
    byId('feedback').className='feedback hidden';byId('feedback').textContent='';
    byId('nextTask').classList.add('hidden');byId('retryButton').classList.add('hidden');
    const puzzle = byId('puzzleArea');puzzle.innerHTML='';
    switch (stage.mechanic) {
      case 'sound': renderSound(stage,puzzle);break;
      case 'builder':renderBuilder(stage,puzzle);break;
      case 'sentence':renderSentence(stage,puzzle);break;
      case 'detective':renderDetective(stage,puzzle);break;
      case 'spelling':renderSpelling(stage,puzzle);break;
      default:throw new Error('Unknown game mechanic');
    }
    show('Game');
  }
  function wrapper(puzzle,title,kicker='مهمتك الآن'){
    const inner=document.createElement('div');inner.className='puzzle-inner';
    const over=document.createElement('span');over.className='puzzle-intro';over.textContent=kicker;
    const h=document.createElement('h3');h.className='puzzle-title';h.textContent=title;
    inner.append(over,h);puzzle.appendChild(inner);return inner;
  }
  function sequenceOrder(count,index){
    const arr=Array.from({length:count},(_,i)=>i);
    // Rotate/shuffle without losing item identities (also supports repeated letters).
    for(let j=count-1;j>0;j--){const k=(j*3+index*7+count)% (j+1);[arr[j],arr[k]]=[arr[k],arr[j]];}
    if(arr.every((n,i)=>n===i)&&count>1) arr.reverse();
    return arr;
  }
  function showFeedback(text,kind) {
    const feedback=byId('feedback');feedback.className='feedback '+(kind==='success'?'success':'error');
    feedback.textContent=(kind==='success'?'✨ ':'💡 ')+text;
    if(kind==='error')sessionFails++;
  }
  function success() {
    if(solved)return;
    solved=true;celebrate();
    showFeedback('رائعة يا بطلة! حللتِ هذه المهمة. يمكنكِ التقدم الآن.','success');
    byId('puzzleArea').querySelectorAll('button,input').forEach(b=>b.disabled=true);
    const next=byId('nextTask');next.textContent=state.question===stages[state.gate].questions.length-1?'🔑 افتحي الباب التالي':'المهمة التالية ←';next.classList.remove('hidden');
    byId('retryButton').classList.add('hidden');
  }
  function fail(target,message='قريبة جدًا! أعيدي التفكير ثم جرّبي مرة أخرى.') {
    if (solved)return;
    if(target){target.classList.add('wrong');setTimeout(()=>target.classList.remove('wrong'),450);}
    showFeedback(message,'error');
  }
  function renderSound(stage,root){
    const q=stage.questions[state.question];
    const inner=wrapper(root,q.prompt,'🎵 صيد الصوت الصحيح • اقرئي الكلمات ثم اختاري');
    const grid=document.createElement('div');grid.className='answer-grid';
    // Shuffle answer positions: the correct answer is NOT always the first choice.
    const order=sequenceOrder(q.choices.length,state.question+1);
    order.forEach(i=>{
      const [icon,text]=q.choices[i];const btn=document.createElement('button');btn.type='button';btn.className='answer-card';
      btn.innerHTML=`<span class="answer-emoji" aria-hidden="true">${icon}</span><span>${escapeHtml(text)}</span>`;
      btn.addEventListener('click',()=>{if(solved)return;if(i===q.correct){btn.classList.add('correct');success();}else fail(btn,'ابحثي عن الصوت أو المدّ المطلوب في الكلمة، ثم حاولي مرة أخرى.');});
      grid.appendChild(btn);
    });
    inner.appendChild(grid);
  }
  function setupTiles({root,words,title,hint,isSentence}){
    const inner=wrapper(root,title,isSentence?'🧱 رتبي الكلمات':'🧩 ركّبي الحروف');
    if(!isSentence){const picture=document.createElement('div');picture.className='builder-icon';picture.textContent=hint.icon;inner.appendChild(picture);}
    const description=document.createElement('p');description.className='puzzle-hint';description.textContent=hint.text;inner.appendChild(description);
    const assembled=document.createElement('div');assembled.className=isSentence?'sentence-strip':'built-slots';inner.appendChild(assembled);
    const pool=document.createElement('div');pool.className='tile-row'+(isSentence?' sentence-pool':'');inner.appendChild(pool);
    const retry=byId('retryButton');retry.classList.remove('hidden');
    retry.onclick=()=>{if(solved)return;chosenTiles=[];drawTiles();byId('feedback').className='feedback hidden';};
    const order=sequenceOrder(words.length,state.question+state.gate);
    const buttons=new Map();
    const redrawOutput=()=>{
      assembled.innerHTML='';
      if(isSentence){
        if(!chosenTiles.length){const p=document.createElement('span');p.className='placeholder';p.textContent='اضغطي على الكلمات بالترتيب لتظهر جملتكِ هنا';assembled.appendChild(p);}
        chosenTiles.forEach(i=>{const el=document.createElement('span');el.className='selected-word';el.textContent=words[i];assembled.appendChild(el);});
      } else {
        words.forEach((_,slot)=>{const el=document.createElement('div');el.className='letter-slot'+(slot<chosenTiles.length?' filled':'');el.textContent=slot<chosenTiles.length?words[chosenTiles[slot]]:'؟';assembled.appendChild(el);});
      }
    };
    function drawTiles(){
      pool.innerHTML='';buttons.clear();order.forEach(index=>{
        const btn=document.createElement('button');btn.type='button';btn.className='word-tile';btn.textContent=words[index];btn.dataset.tileIndex=String(index);
        const used=chosenTiles.includes(index);btn.disabled=used||solved;if(used)btn.classList.add('used');
        btn.addEventListener('click',()=>{
          if(solved||chosenTiles.includes(index)||pendingReveal)return;
          chosenTiles.push(index);drawTiles();
          if(chosenTiles.length===words.length){
            if(chosenTiles.map(i=>words[i]).join('')===words.join('')) success();
            else {fail(null,isSentence?'ترتيب الجملة يحتاج مراجعة. اضغطي «أعيدي المحاولة» ثم جرّبي ترتيبًا جديدًا.':'الحروف لا تكوّن كلمة الصورة. أعيدي المحاولة وجربي ترتيبًا آخر.');}
          }
        });pool.appendChild(btn);buttons.set(index,btn);
      });redrawOutput();
    }
    drawTiles();
  }
  function renderBuilder(stage,root){const q=stage.questions[state.question];
    setupTiles({root,words:q.letters,title:'ما الكلمة التي تدلّ عليها الصورة؟',hint:{icon:q.icon,text:q.hint},isSentence:false});
  }
  function renderSentence(stage,root){const q=stage.questions[state.question];
    setupTiles({root,words:q.words,title:'أعيدي ترتيب الكلمات لتكوين جملة مفيدة',hint:{text:q.hint},isSentence:true});
  }
  function renderDetective(stage,root){
    const q=stage.questions[state.question];
    const inner=wrapper(root,q.prompt,'🔍 ابحثي عن الجملة الدليل، وليس عن جواب تخمين');
    const title=document.createElement('p');title.className='story-heading';title.textContent='📖 '+stage.storyTitle;inner.appendChild(title);
    const rows=document.createElement('div');rows.className='clues-grid';
    stage.story.forEach((sentence,index)=>{
      const line=document.createElement('button');line.type='button';line.className='clue-line';line.textContent=sentence;
      line.addEventListener('click',()=>{if(solved)return;if(index===q.evidence){line.classList.add('correct');success();}else fail(line,'هذه الجملة ليست الدليل على الإجابة. أعيدي قراءة النص واختاري جملة أخرى.');});
      rows.appendChild(line);
    });inner.appendChild(rows);
    const note=document.createElement('p');note.className='puzzle-hint';note.textContent='اضغطي على الجملة التي تحمل معلومة تجيب عن سؤال المحققة.';inner.appendChild(note);
  }
  function renderSpelling(stage,root){
    const q=stage.questions[state.question];const inner=wrapper(root,'اكشفي الحرف الناقص وأكملي الكلمة','✍️ شفرة الكنز الإملائي');
    const card=document.createElement('div');card.className='spelling-card';
    const icon=document.createElement('span');icon.className='spelling-emoji';icon.textContent=q.icon;card.appendChild(icon);
    const hint=document.createElement('p');hint.className='puzzle-hint';hint.textContent=q.hint;card.appendChild(hint);
    const spelling=document.createElement('div');spelling.className='spelling-word';
    const before=document.createElement('span');before.textContent=q.before;
    const blank=document.createElement('span');blank.className='blank-letter';blank.textContent='؟';
    const after=document.createElement('span');after.textContent=q.after;
    spelling.append(before,blank,after);card.appendChild(spelling);
    const label=document.createElement('label');label.setAttribute('for','missingLetter');label.className='puzzle-hint';label.textContent='اكتبي حرفًا واحدًا في المربع';card.appendChild(label);
    const input=document.createElement('input');input.type='text';input.id='missingLetter';input.className='spelling-answer';input.maxLength=2;input.autocomplete='off';input.autocorrect='off';input.spellcheck=false;input.setAttribute('inputmode','text');input.setAttribute('aria-label','الحرف الناقص');card.appendChild(input);
    const btn=document.createElement('button');btn.type='button';btn.className='primary-btn spell-btn';btn.textContent='افتحي القفل 🔓';card.appendChild(btn);
    function check(){if(solved)return;const typed=norm(input.value);if(typed===norm(q.answer)){blank.textContent=q.answer;success();}else{fail(input,'الحرف غير صحيح بعد. راجعي الكلمة والصورة ثم حاولي مجددًا.');input.select();}}
    btn.addEventListener('click',check);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
    inner.appendChild(card);
  }
  function nextTask(){
    if(!solved||!state.name||state.gate>=stages.length)return;
    const questions=stages[state.gate].questions.length;
    if(state.question+1<questions){state.question++;saveState();renderGame();}
    else{state.gate++;state.question=0;saveState();if(state.gate===stages.length)renderVictory();else renderWorld();}
  }

  function drawCertificate() {
    if(state.gate!==stages.length||!state.name)return null;
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1130;
    const ctx=canvas.getContext('2d');if(!ctx)return null;
    const bg=ctx.createLinearGradient(0,0,1600,1130);bg.addColorStop(0,'#fff6ee');bg.addColorStop(.54,'#fffafc');bg.addColorStop(1,'#f2eaff');ctx.fillStyle=bg;ctx.fillRect(0,0,1600,1130);
    ctx.strokeStyle='#614598';ctx.lineWidth=20;ctx.strokeRect(35,35,1530,1060);
    ctx.strokeStyle='#e4afd0';ctx.lineWidth=4;ctx.strokeRect(64,64,1472,1002);
    const deco=ctx.createLinearGradient(100,0,1500,0);deco.addColorStop(0,'#b8a0e9');deco.addColorStop(.5,'#f2b9c8');deco.addColorStop(1,'#efd0a9');ctx.fillStyle=deco;
    ctx.beginPath();ctx.moveTo(650,66);ctx.lineTo(950,66);ctx.lineTo(914,118);ctx.lineTo(686,118);ctx.closePath();ctx.fill();
    for(let i=0;i<8;i++){
      const angle=(i/8)*Math.PI*2;const x=800+Math.cos(angle)*125,y=256+Math.sin(angle)*106;
      ctx.fillStyle=i%2?'#e7b4d6':'#c4abed';ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#f5dba8';ctx.beginPath();ctx.arc(800,250,74,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e7b377';ctx.lineWidth=8;ctx.stroke();
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction='rtl';
    ctx.fillStyle='#745298';ctx.font='bold 85px Tahoma, Arial, sans-serif';ctx.fillText('★',800,245);
    ctx.fillStyle='#5b3b87';ctx.font='bold 61px Tahoma, Arial, sans-serif';ctx.fillText('شهادة إنجاز قرائي',800,386);
    ctx.fillStyle='#7a6388';ctx.font='31px Tahoma, Arial, sans-serif';ctx.fillText('تُمنح للطالبة المتألقة',800,458);
    let size=70;ctx.font=`bold ${size}px Tahoma, Arial, sans-serif`;
    while(ctx.measureText(state.name).width>1280&&size>30){size-=2;ctx.font=`bold ${size}px Tahoma, Arial, sans-serif`;}
    ctx.fillStyle='#7143a0';ctx.fillText(state.name,800,544);
    ctx.strokeStyle='#e9b6ce';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(460,600);ctx.lineTo(1140,600);ctx.stroke();
    ctx.fillStyle='#54426d';ctx.font='33px Tahoma, Arial, sans-serif';ctx.fillText('لاجتيازها جميع البوابات الخمس بنجاح في مشروع',800,680);
    ctx.font='bold 43px Tahoma, Arial, sans-serif';ctx.fillText('«غرفة الهروب من التعثّر القرائي»',800,755);
    ctx.fillStyle='#816d93';ctx.font='28px Tahoma, Arial, sans-serif';ctx.fillText(`وأكملت جميع المهام التعليمية ${numerals(TOTAL)} من ${numerals(TOTAL)}`,800,816);
    ctx.fillStyle='#49356a';ctx.font='bold 29px Tahoma, Arial, sans-serif';
    ctx.fillText('إعداد المعلمة: '+content.teacher,1200,941);
    ctx.fillText('مديرة المدرسة: '+content.principal,390,941);
    const date=new Date().toLocaleDateString('ar-SA');
    ctx.fillStyle='#8b7599';ctx.font='26px Tahoma, Arial, sans-serif';
    ctx.fillText(content.school+' • '+content.subject+' • '+content.grade+' • '+date,800,1021);
    return canvas;
  }
  function certificateUrl(){const canvas=drawCertificate();return canvas?canvas.toDataURL('image/png'):null;}
  function downloadCertificate(){const data=certificateUrl();if(!data)return;
    const a=document.createElement('a');a.href=data;a.download='شهادة_الهروب_القرائي_'+state.name.replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,25)+'.png';document.body.appendChild(a);a.click();a.remove();
  }
  function viewCertificate(){const src=certificateUrl();if(!src)return;byId('certificatePreview').src=src;byId('certificateDialog').showModal();}
  function printCertificate(){const src=certificateUrl();if(!src)return;const target=byId('printOnly');target.innerHTML='';const img=document.createElement('img');img.src=src;img.alt='شهادة إنجاز';target.appendChild(img);if(img.complete)window.print();else img.onload=()=>window.print();}
  function renderVictory(){
    if(state.gate!==stages.length)return renderWorld();
    byId('victoryName').textContent='يا '+state.name+'، أبدعتِ! 🌸';
    byId('victoryChecks').innerHTML=stages.map(s=>'<span>✓ '+escapeHtml(s.short)+'</span>').join('');
    show('Victory');
  }
  function restart(){if(!confirm('هل تريدين بدء مغامرة جديدة؟ ستُمسح نتيجة هذه المغامرة من هذا التبويب. احفظي الشهادة أولًا.'))return;
    state={name:'',gate:0,question:0};saveState();byId('studentName').value='';show('Welcome');
  }
  function initialize(){
    if(!content||!Array.isArray(stages)||stages.length!==5)throw new Error('Game content is missing');
    byId('startForm').addEventListener('submit',start);
    byId('studentName').addEventListener('input',e=>e.target.setCustomValidity(''));
    byId('nextTask').addEventListener('click',nextTask);
    byId('homeLink').addEventListener('click',renderWorld);
    byId('downloadCertificate').addEventListener('click',downloadCertificate);
    byId('viewCertificate').addEventListener('click',viewCertificate);
    byId('printCertificate').addEventListener('click',printCertificate);
    byId('closeDialog').addEventListener('click',()=>byId('certificateDialog').close());
    byId('restartGame').addEventListener('click',restart);
    loadState();
    if(state.name){if(state.gate===stages.length)renderVictory();else renderWorld();}else show('Welcome');
  }
  initialize();
})();
