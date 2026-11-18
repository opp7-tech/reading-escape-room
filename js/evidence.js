(() => {
  'use strict';
  const KEY = 'reading-escape-session-v4';
  const content = window.ESCAPE_CONTENT;
  const stages = content.stages;
  const arabicNum = n => String(n).replace(/\d/g, c => '٠١٢٣٤٥٦٧٨٩'[Number(c)]);
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state=null;
  try {state = JSON.parse(sessionStorage.getItem(KEY) || 'null');} catch (_) { }
  const isDone = state && typeof state.name === 'string' && state.name.trim().length>1 && state.gate === 5 && Array.isArray(state.record) && state.record.length===25;
  if (!isDone) {
    document.getElementById('intro').hidden=true;
    document.getElementById('blocked').hidden=false;
    document.getElementById('saveImage').disabled=true;
    document.getElementById('printEvidence').disabled=true;
    return;
  }
  const printDate = new Date(Math.max(...state.record.map(x=>Number(x.at)||0))).toLocaleDateString('ar-SA');
  function taskPrompt(stage, q) {
    if(stage.mechanic==='sound'||stage.mechanic==='detective')return q.prompt;
    if(stage.mechanic==='builder')return 'تركيب كلمة الصورة '+q.icon;
    if(stage.mechanic==='sentence')return 'ترتيب جملة تبدأ بكلمة '+q.words[0];
    return 'إكمال الكلمة الناقصة '+q.icon;
  }
  const pages=document.getElementById('pages');
  stages.forEach((stage, si) => {
    const records=stage.questions.map((_,qi)=>state.record.find(r=>r.gate===si&&r.question===qi));
    const allVerified=records.every(Boolean);
    const sheet=document.createElement('section');sheet.className='sheet';
    sheet.innerHTML=`<div class="masthead"><span>الابتدائية الثانية • لغتي • الثاني الابتدائي</span><span class="tag">📚 ملف شواهد إنجازي</span></div>
      <h2 class="page-title">${escape(stage.icon)} البوابة ${arabicNum(si+1)}: ${escape(stage.title)}</h2>
      <p class="page-subtitle">${escape(stage.subtitle)}</p>
      <div class="student-band">الطالبة: <strong>${escape(state.name)}</strong><br>تاريخ إكمال المغامرة: ${escape(printDate)}</div>
      <div class="badges"><div class="badge">حالة البوابة<strong>${allVerified?'✓ مكتملة':'غير موثقة'}</strong></div><div class="badge">مهام أنجزتها الطالبة<strong>${arabicNum(records.filter(Boolean).length)} / ٥</strong></div><div class="badge">طريقة التوثيق<strong>إلكتروني</strong></div></div>
      <ol class="task-list">${stage.questions.map((q,qi)=>{
        const r=records[qi];
        return `<li class="task-line"><div class="task-label"><b>المهمة ${arabicNum(qi+1)}</b><span>${r?'✓ تم حلّها':'لم تكتمل'}</span></div><div class="task-q">${escape(taskPrompt(stage,q))}</div><div class="task-answer"><strong>الإجابة التي اجتازت بها المهمة:</strong> ${r?escape(r.answer):'—'}</div></li>`;
      }).join('')}</ol>
      <div class="warning">هذه الصفحة توثّق إكمال مهام اللعبة فقط؛ ولا تحلّ محل تقييم المعلمة للقراءة الجهرية أو القياس القبلي والبعدي.</div>
      <div class="sheet-footer"><span>إعداد المعلمة: عزيزة العنزي</span><span>مديرة المدرسة: ريم العنزي</span><span>صفحة ${arabicNum(si+1)} من ٥</span></div>`;
    pages.appendChild(sheet);
  });
  document.getElementById('printEvidence').addEventListener('click',()=>window.print());
  document.getElementById('saveImage').addEventListener('click',()=>{
    const canvas=document.createElement('canvas'); canvas.width=1600;canvas.height=2400;
    const ctx=canvas.getContext('2d'); if(!ctx)return;
    const bg=ctx.createLinearGradient(0,0,1600,2400);bg.addColorStop(0,'#fff8f4');bg.addColorStop(1,'#f3eafd');ctx.fillStyle=bg;ctx.fillRect(0,0,1600,2400);
    ctx.strokeStyle='#694a91';ctx.lineWidth=17;ctx.strokeRect(35,35,1530,2330);
    ctx.textAlign='center';ctx.direction='rtl';ctx.textBaseline='middle';ctx.fillStyle='#60428f';
    ctx.font='bold 62px Tahoma,Arial,sans-serif';ctx.fillText('سجل الشواهد الإلكترونية',800,155);
    ctx.font='bold 47px Tahoma,Arial,sans-serif';ctx.fillText('غرفة الهروب من التعثّر القرائي',800,236);
    ctx.fillStyle='#725c83';ctx.font='35px Tahoma,Arial,sans-serif';ctx.fillText('الابتدائية الثانية • لغتي • الثاني الابتدائي',800,307);
    ctx.fillStyle='#50366c';ctx.font='bold 52px Tahoma,Arial,sans-serif';ctx.fillText(state.name,800,400);
    const wrapLines=(text,maxWidth,firstX,y,step)=>{
      const words=String(text).split(/\s+/);let line='';let lines=[];
      for(const word of words){const proposal=line?line+' '+word:word;if(ctx.measureText(proposal).width>maxWidth&&line){lines.push(line);line=word;}else line=proposal;}
      if(line)lines.push(line);
      lines.slice(0,2).forEach((ln,i)=>ctx.fillText(ln,firstX,y+i*step));
    };
    stages.forEach((stage,i)=>{
      const y=490+i*360;
      ctx.fillStyle=['#fff2e7','#eef3ff','#f3edff','#e8f8f1','#fff5df'][i];
      ctx.beginPath();ctx.roundRect(105,y,1390,326,28);ctx.fill();
      ctx.strokeStyle='#e7d8f0';ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle='#61418b';ctx.textAlign='right';ctx.font='bold 36px Tahoma,Arial,sans-serif';ctx.fillText('✓ البوابة '+arabicNum(i+1)+': '+stage.title,1430,y+48);
      ctx.font='24px Tahoma,Arial,sans-serif';ctx.fillStyle='#655478';
      stage.questions.forEach((q,j)=>{
        const r=state.record.find(x=>x.gate===i&&x.question===j);
        const txt=(j+1)+'. '+(r?.answer||'—');
        wrapLines(txt,1150,1430,y+100+j*40,24);
      });
    });
    ctx.textAlign='center';ctx.fillStyle='#534068';ctx.font='28px Tahoma,Arial,sans-serif';
    ctx.fillText('تم إكمال ٢٥ مهمة إلكترونية • '+printDate,800,2310);
    const a=document.createElement('a');a.download='شواهد_إنجاز_'+state.name.replace(/[^\p{L}\p{N}_-]/gu,'_')+'.png';a.href=canvas.toDataURL('image/png');document.body.appendChild(a);a.click();a.remove();
  });
})();
