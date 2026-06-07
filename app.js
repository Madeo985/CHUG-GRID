const $=id=>document.getElementById(id);
const state={bpm:120,num:4,den:4,bars:4,step:0,playing:false,timer:null,grid:[],group:[6,6,6],mode:'cycle',audio:null,dice:[],detected:[]};
const symbols=['-','x','X','A','U'];
function barSteps(){return state.num*(16/state.den)}
function displaySteps(){return Math.max(1,Math.round(barSteps()*state.bars))}
function riffLen(){return state.group.reduce((a,b)=>a+b,0)||1}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a||1}
function lcm(a,b){return Math.abs(a*b)/gcd(a,b)}
function setStatus(t){$('status').textContent=t}
function initGrid(){
  const n=displaySteps();
  const oldGrid=state.grid&&state.grid.length?state.grid.slice():[];
  if(!oldGrid.length){
    state.grid=Array(n).fill('-');
  } else if(n===oldGrid.length){
    state.grid=oldGrid;
  } else if(n>oldGrid.length){
    // When the user extends Riff Length/Bars, repeat the existing riff instead of adding silent bars.
    state.grid=Array.from({length:n},(_,i)=>oldGrid[i%oldGrid.length]||'-');
  } else {
    state.grid=oldGrid.slice(0,n);
  }
  state.step=state.step % Math.max(1,n);
  renderAll();
}
function parseGroup(){const g=$('grouping').value.split(/[+\s,]+/).map(x=>parseInt(x,10)).filter(x=>Number.isFinite(x)&&x>0&&x<=64);state.group=g.length?g:[4,4,4,4];$('grouping').value=state.group.join('+')}
function groupHits(limit,cycle=false){const hits=[];let pos=0;const len=riffLen();while(pos<limit){hits.push(pos);let acc=0;for(const g of state.group){acc+=g;const p=pos+acc;if(p<limit)hits.push(p)}pos+= cycle?len:len}return [...new Set(hits)].filter(x=>x<limit)}
function generateFromGroup(){parseGroup();const n=displaySteps();state.grid=Array(n).fill('-'); if(state.mode==='linear'){let p=0;while(p<n){state.grid[p]='A';for(const g of state.group){p+=g;if(p<n)state.grid[p]='A'} }} else {for(const p of groupHits(n,true))state.grid[p]='A'} state.step=0;renderAll();setStatus('Grouping generated')}
function rollDice(){const rolls=parseInt($('rolls').value,10);state.dice=Array.from({length:rolls},()=>1+Math.floor(Math.random()*6));$('diceOut').textContent=state.dice.join(' + '); return state.dice}
function applyDice(){if(!state.dice.length)rollDice();$('grouping').value=state.dice.join('+');generateFromGroup()}
function renderGrid(){const n=displaySteps(),bs=barSteps();const grid=$('grid');grid.innerHTML='';grid.style.gridTemplateColumns=`repeat(${Math.min(16,n)}, minmax(34px,1fr))`;for(let i=0;i<n;i++){const d=document.createElement('button');d.className='cell';const v=state.grid[i]||'-';if(v==='x')d.classList.add('ghost'); if(v==='X')d.classList.add('chug'); if(v==='A')d.classList.add('accent'); if(v==='U')d.classList.add('up'); if(i===state.step%n)d.classList.add('playhead'); if(i%bs===0)d.classList.add('bar-start'); d.innerHTML=`<small>${labelFor(i,bs)}</small>${v}`; d.onclick=()=>{const idx=symbols.indexOf(state.grid[i]||'-');state.grid[i]=symbols[(idx+1)%symbols.length];renderAll();playCell(state.grid[i])}; grid.appendChild(d)} }
function labelFor(i,bs){const within=i%bs; const beat=Math.floor(within/4)+1; return ['','e','&','a'][within%4] || beat}

function updateBarsDropdown(){
  const sel=$('bars');
  if(!sel) return;
  const bs=Math.max(1, Math.round(barSteps()));
  const rl=Math.max(1, riffLen());
  const alignBars=Math.max(1, Math.min(128, Math.round(lcm(bs,rl)/bs)));
  const riffBars=Math.max(1, Math.min(128, Math.ceil(rl/bs)));
  const current=Math.max(1, Math.min(128, Math.round(state.bars || 4)));
  const base=[1,2,3,4,5,6,7,8,12,16,24,32,64,128];
  const options=[...new Set([...base, riffBars, alignBars, current])].filter(n=>n>=1&&n<=128).sort((a,b)=>a-b);
  const old=sel.value;
  sel.innerHTML='';
  for(const n of options){
    const opt=document.createElement('option');
    opt.value=String(n);
    let label=`${n} bar${n>1?'s':''}`;
    if(n===alignBars) label+=` — realignment`;
    else if(n===riffBars) label+=` — riff cycle`;
    opt.textContent=label;
    sel.appendChild(opt);
  }
  sel.value=String(current);
  if(sel.value!==String(current)){
    const opt=document.createElement('option');
    opt.value=String(current);
    opt.textContent=`${current} bar${current>1?'s':''} — custom`;
    sel.appendChild(opt);
    sel.value=String(current);
  }
}

function renderMesh(){const bs=Math.round(barSteps()), rl=riffLen(); const align=lcm(bs,rl); updateBarsDropdown(); $('riffCycle').textContent=`${rl}/16`; $('barCycle').textContent=`${bs}/16`; $('realign').textContent=`${align/bs} bars`; setStatus(`Bars to cycle: ${align/bs}`); $('totalSteps').textContent=align; const track=$('alignTrack'); track.innerHTML=''; const hits=groupHits(align,true); for(let i=0;i<align;i++){const c=document.createElement('div');c.className='align-cell'; if(i%bs===0)c.classList.add('bar'); if(hits.includes(i))c.classList.add('hit'); if(i===0||i===align)c.classList.add('realign'); if(i===state.step%align)c.classList.add('active'); track.appendChild(c)} }

function fitGridToRealignment(){
  parseGroup();
  const bs=Math.round(barSteps());
  const rl=riffLen();
  const bars=Math.max(1, Math.min(128, Math.round(lcm(bs,rl)/bs)));
  state.bars=bars;
  $('bars').value=bars;
  generateFromGroup();
  setStatus(`Grid fitted to realignment: ${bars} bars`);
}
function fitGridToRiffCycle(){
  parseGroup();
  const bs=Math.round(barSteps());
  const rl=riffLen();
  const bars=Math.max(1, Math.min(128, Math.ceil(rl/bs)));
  state.bars=bars;
  $('bars').value=bars;
  generateFromGroup();
  setStatus(`Grid fitted to riff cycle: ${bars} bar${bars>1?'s':''}`);
}

function drawOrbit(){
  const canvas=$('orbit'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,cx=w/2,cy=h/2;
  ctx.clearRect(0,0,w,h);ctx.lineCap='round';
  const bs=Math.max(1,Math.round(barSteps())), rl=Math.max(1,riffLen());
  const align=Math.max(1,lcm(bs,rl));
  const alignBars=Math.max(1,Math.round(align/bs));
  const stepInAlign=((state.step%align)+align)%align;
  const currentBar=Math.floor(stepInAlign/bs)+1;
  const stepInBar=stepInAlign%bs;

  const outerR=238, barR=214, riffR=164;
  drawCircle(outerR,'#20304f',2);
  drawCircle(barR,'#254067',2);
  drawCircle(riffR,'#3a244d',3);

  // Realignment bar markers around the outside: this is the new "bar count" orbit.
  const showEvery = alignBars>48 ? Math.ceil(alignBars/24) : 1;
  for(let b=0;b<alignBars;b++){
    const a=-Math.PI/2+(b/alignBars)*2*Math.PI;
    const major=(b===0 || b===alignBars-1 || (b+1)%showEvery===0);
    const x1=cx+Math.cos(a)*(outerR-8), y1=cy+Math.sin(a)*(outerR-8);
    const x2=cx+Math.cos(a)*(outerR+(major?8:3)), y2=cy+Math.sin(a)*(outerR+(major?8:3));
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
    ctx.strokeStyle=b===0?'#75ff66':(b+1===currentBar?'#ffb13b':'#46577a');
    ctx.lineWidth=major?2.2:1;
    ctx.stroke();
    if(alignBars<=32 || major){
      const tx=cx+Math.cos(a)*(outerR+24), ty=cy+Math.sin(a)*(outerR+24);
      ctx.fillStyle=(b+1===currentBar)?'#ffb13b':'#8fa0bd';
      ctx.font=(b+1===currentBar)?'900 13px system-ui':'700 10px system-ui';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(String(b+1),tx,ty);
    }
  }

  // Inner pulse markers: beat labels 1,2,3,4 when denominator is 4-ish.
  const beats=Math.max(1,state.num);
  for(let i=0;i<bs;i++){
    const a=-Math.PI/2+i/bs*2*Math.PI;
    const isBeat = i % Math.max(1,Math.round(bs/beats)) === 0;
    dot(cx+Math.cos(a)*barR,cy+Math.sin(a)*barR,isBeat?6:2,isBeat?'#34e8ff':'#415273');
    if(isBeat && beats<=16){
      const beatNum=Math.floor(i/Math.max(1,Math.round(bs/beats)))+1;
      ctx.fillStyle='#e8f3ff';ctx.font='900 14px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(String(beatNum),cx+Math.cos(a)*(barR-24),cy+Math.sin(a)*(barR-24));
    }
  }

  // Riff/chug markers around the riff cycle.
  const hits=groupHits(rl,true).filter(x=>x<rl);
  for(const p of hits){const a=-Math.PI/2+p/rl*2*Math.PI;dot(cx+Math.cos(a)*riffR,cy+Math.sin(a)*riffR,7,'#75ff66')}

  // Hands: cyan = pulse within the bar, magenta = riff cycle, amber = current bar through the full realignment cycle.
  const pa=-Math.PI/2+stepInBar/bs*2*Math.PI;
  const ra=-Math.PI/2+(state.step%rl)/rl*2*Math.PI;
  const ba=-Math.PI/2+((currentBar-1)/alignBars)*2*Math.PI;
  hand(ba,outerR,'#ffb13b',3,.75);
  hand(pa,barR,'#34e8ff',5,1);
  hand(ra,riffR,'#ff4fd8',5,1);
  dot(cx,cy,9,'#ffb13b');

  // Center readout: current bar count is the hero.
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#ffffff';ctx.font='900 38px system-ui';
  ctx.fillText(`BAR ${currentBar}/${alignBars}`,cx,cy-22);
  ctx.fillStyle='#91a0b8';ctx.font='800 15px system-ui';
  ctx.fillText(`riff ${rl}/16  •  bar ${bs}/16`,cx,cy+16);
  ctx.fillStyle='#75ff66';ctx.font='800 13px system-ui';
  ctx.fillText(`realigns after ${alignBars} bar${alignBars>1?'s':''}`,cx,cy+40);

  // Flash the 1 when both cycles align.
  if(stepInAlign===0){
    ctx.beginPath();ctx.arc(cx,cy,outerR+42,0,Math.PI*2);
    ctx.strokeStyle='rgba(117,255,102,.55)';ctx.lineWidth=8;ctx.shadowColor='#75ff66';ctx.shadowBlur=25;ctx.stroke();ctx.shadowBlur=0;
  }

  function drawCircle(r,col,lw=3){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.stroke()}
  function hand(a,r,col,lw,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.shadowColor=col;ctx.shadowBlur=18;ctx.stroke();ctx.restore()}
  function dot(x,y,r,col){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=12;ctx.fill();ctx.shadowBlur=0}
}

function exactCycleCandidates(targetBars){
  const bs=Math.max(1,Math.round(barSteps()));
  const total=bs*Math.max(1,Math.round(targetBars));
  const out=[];
  for(let rl=2; rl<=Math.min(total,512); rl++){
    if(Math.round(lcm(bs,rl)/bs)===Math.round(targetBars)) out.push(rl);
  }
  return out;
}
function chooseCycleLengthForTarget(targetBars){
  const bs=Math.max(1,Math.round(barSteps()));
  const candidates=exactCycleCandidates(targetBars);
  if(!candidates.length) return bs*Math.max(1,Math.round(targetBars));
  const sweet=candidates.filter(x=>x>bs && x<=bs*3.5);
  if(sweet.length){
    // avoid always picking the same length: choose one of the most guitar-friendly candidates.
    return sweet[Math.floor(Math.random()*sweet.length)];
  }
  const notTiny=candidates.filter(x=>x>=Math.max(5,Math.floor(bs/2)));
  if(notTiny.length) return notTiny[Math.floor(notTiny.length/2)];
  return candidates[candidates.length-1];
}
function randomGroupingForLength(total){
  total=Math.max(1,Math.round(total));
  if(total<=8) return [total];
  const chunks=[];
  let rem=total;
  const choices=[3,4,5,6,7,8,5,6,4];
  while(rem>0){
    if(rem<=8){ chunks.push(rem); break; }
    let c=choices[Math.floor(Math.random()*choices.length)];
    // avoid leaving a final 1 when possible
    if(rem-c===1) c=Math.max(2,c-1);
    if(c>=rem) c=Math.max(2,rem-2);
    chunks.push(c); rem-=c;
    if(chunks.length>64){ chunks.push(rem); break; }
  }
  return chunks.filter(x=>x>0);
}
function generateTargetRealignment(){
  const target=Math.max(1,Math.min(64,parseInt($('targetBars').value,10)||1));
  const bs=Math.max(1,Math.round(barSteps()));
  const rl=chooseCycleLengthForTarget(target);
  const group=randomGroupingForLength(rl);
  state.group=group;
  $('grouping').value=group.join('+');
  state.bars=target;
  updateBarsDropdown();
  $('bars').value=String(target);
  generateFromGroup();
  const actual=Math.round(lcm(bs,rl)/bs);
  $('targetOut').innerHTML=`Requested return: <b>${target} bars</b><br>Generated riff cycle: <b>${rl}/16</b><br>Actual return: <b>${actual} bars</b><br>Grouping: <b>${group.join('+')}</b>`;
  setStatus(`Random riff generated: returns after ${actual} bars`);
}
function fitCurrentToTargetBars(){
  parseGroup();
  const bs=Math.max(1,Math.round(barSteps()));
  const rl=riffLen();
  const actual=Math.round(lcm(bs,rl)/bs);
  state.bars=Math.max(1,Math.min(128,actual));
  updateBarsDropdown();
  $('bars').value=String(state.bars);
  generateFromGroup();
  if($('targetBars')) $('targetBars').value=String(state.bars);
  if($('targetOut')) $('targetOut').innerHTML=`Current riff realigns after <b>${actual} bars</b>. Grid fitted to full cycle.`;
  setStatus(`Grid fitted: ${actual} bars`);
}

function renderAll(){renderGrid();renderMesh();drawOrbit()}
function ensureAudio(){if(!state.audio){state.audio=new (window.AudioContext||window.webkitAudioContext)()} if(state.audio.state==='suspended')state.audio.resume();}
function tone(freq,dur=0.045,type='square',gain=.06){if(!state.audio)return;const ctx=state.audio,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=gain;o.connect(g);g.connect(ctx.destination);o.start();g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+dur);o.stop(ctx.currentTime+dur)}
function playCell(v){if(v==='A')tone(1200,.06,'square',.08);else if(v==='X')tone(95,.055,'sawtooth',.08);else if(v==='x')tone(120,.035,'triangle',.035);else if(v==='U')tone(650,.04,'square',.045)}
function tick(){const bs=barSteps(); if(state.step%bs===0)tone(880,.035,'square',.04); else if(state.step%4===0)tone(440,.025,'square',.025); playCell(state.grid[state.step%state.grid.length]); state.step+=1; renderAll()}
function play(){ensureAudio(); if(state.playing)return; state.playing=true; const interval=60000/state.bpm/4; state.timer=setInterval(tick,interval); setStatus('Playing')}
function stop(){state.playing=false;clearInterval(state.timer);state.timer=null;setStatus('Stopped')}
let taps=[];function tap(){const now=performance.now();taps=taps.filter(t=>now-t<2500);taps.push(now);if(taps.length>=2){const diffs=taps.slice(1).map((t,i)=>t-taps[i]);const avg=diffs.reduce((a,b)=>a+b,0)/diffs.length;state.bpm=Math.round(60000/avg);$('bpm').value=state.bpm;setStatus(`Tap ${state.bpm} BPM`)}}
function median(arr){if(!arr.length)return 0; const a=[...arr].sort((x,y)=>x-y); const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2}
function estimateFromHits(hits){
  if(hits.length<2) return {bpm:null, group:[]};
  const gaps=hits.slice(1).map((t,i)=>t-hits[i]).filter(x=>x>0.03);
  const unit=median(gaps.filter(x=>x<median(gaps)*1.8)) || median(gaps) || 0.125;
  const sixteenth=unit; // rough: shortest repeated gap becomes one grid step
  const bpm=Math.max(40,Math.min(260,Math.round(60/(sixteenth*4))));
  const group=gaps.map(g=>Math.max(1,Math.min(32,Math.round(g/sixteenth))));
  return {bpm, group};
}
async function analyzeAudio(){const f=$('file').files[0]; if(!f){setStatus('Choose audio first');return} setStatus('Analyzing audio...'); const arr=await f.arrayBuffer(); const ctx=new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(1,1,44100); const buf=await ctx.decodeAudioData(arr.slice(0)); const data=buf.getChannelData(0); const sr=buf.sampleRate; const win=Math.floor(sr*0.018), hop=Math.floor(sr*0.009); let env=[]; for(let i=0;i<data.length-win;i+=hop){let sum=0; for(let j=0;j<win;j++){sum+=Math.abs(data[i+j])} env.push(sum/win)} let flux=[]; for(let i=1;i<env.length;i++)flux.push(Math.max(0,env[i]-env[i-1])); const mean=flux.reduce((a,b)=>a+b,0)/Math.max(1,flux.length); const sorted=[...flux].sort((a,b)=>a-b); const p85=sorted[Math.floor(sorted.length*.85)]||mean; const thresh=Math.max(mean*2.6,p85); let hits=[]; let last=-999; for(let i=1;i<flux.length-1;i++){if(flux[i]>thresh && flux[i]>flux[i-1] && flux[i]>=flux[i+1] && i-last>3){hits.push(i*hop/sr);last=i}} state.detected=hits; const est=estimateFromHits(hits); if(est.bpm){state.bpm=est.bpm;$('bpm').value=est.bpm} if(est.group.length){$('grouping').value=est.group.slice(0,24).join('+');state.group=est.group.slice(0,24)} $('detected').textContent = hits.length? `${hits.length} hits detected. Estimated BPM: ${est.bpm||'—'}. Suggested grouping: ${est.group.slice(0,16).join('+')||'—'}
Hits: `+hits.slice(0,20).map(x=>x.toFixed(2)+'s').join(', ')+(hits.length>20?'...':'') : 'No clear hits found.'; renderAll(); setStatus('Audio analyzed')}
function useDetected(){if(!state.detected.length){setStatus('No detected hits');return} const n=displaySteps(); state.grid=Array(n).fill('-'); const first=state.detected[0], dur=Math.max(0.1,(state.detected[state.detected.length-1]-first)); for(const t of state.detected){const idx=Math.round(((t-first)/dur)*(n-1)); if(idx>=0&&idx<n)state.grid[idx]='A'} const est=estimateFromHits(state.detected); if(est.group.length){state.group=est.group.slice(0,24);$('grouping').value=state.group.join('+')} renderAll(); setStatus('Detected hits applied to grid + grouping')}

function downloadBlob(name, type, bytes){const blob=new Blob([bytes],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function varLen(value){let buffer=value&0x7F; const bytes=[]; while(value>>=7){buffer<<=8; buffer|=((value&0x7F)|0x80)} while(true){bytes.push(buffer&0xFF); if(buffer&0x80) buffer>>=8; else break} return bytes}
function strBytes(s){return Array.from(s).map(c=>c.charCodeAt(0))}
function midiExport(){
  const ppq=480, stepTicks=ppq/4, tempo=Math.round(60000000/state.bpm); const track=[];
  function meta(dt,type,data){track.push(...varLen(dt),0xFF,type,data.length,...data)}
  function ev(dt,bytes){track.push(...varLen(dt),...bytes)}
  meta(0,0x51,[(tempo>>16)&255,(tempo>>8)&255,tempo&255]); meta(0,0x58,[state.num,Math.round(Math.log2(state.den)),24,8]);
  let pending=0; const note=40; // low E-ish
  for(let i=0;i<state.grid.length;i++){
    const v=state.grid[i]||'-';
    if(v==='-' ){pending+=stepTicks; continue}
    const vel=v==='A'?118:v==='X'?105:v==='U'?92:55;
    ev(pending,[0x90,note,vel]); ev(Math.max(30,Math.floor(stepTicks*.7)),[0x80,note,0]); pending=Math.max(0,stepTicks-Math.floor(stepTicks*.7));
  }
  meta(pending,0x2F,[]);
  const header=[...strBytes('MThd'),0,0,0,6,0,0,0,1,(ppq>>8)&255,ppq&255];
  const len=track.length; const trk=[...strBytes('MTrk'),(len>>24)&255,(len>>16)&255,(len>>8)&255,len&255,...track];
  downloadBlob('chug-grid-guitarpro-ready.mid','audio/midi',new Uint8Array([...header,...trk])); setStatus('MIDI exported');
}
function xmlEscape(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function musicXmlExport(){
  const divisions=4, bs=Math.round(barSteps()), measures=Math.ceil(state.grid.length/bs); let xml=`<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>CHUG GRID Guitar</part-name></score-part></part-list><part id="P1">`;
  for(let m=0;m<measures;m++){
    xml+=`<measure number="${m+1}">`;
    if(m===0) xml+=`<attributes><divisions>${divisions}</divisions><key><fifths>0</fifths></key><time><beats>${state.num}</beats><beat-type>${state.den}</beat-type></time><clef><sign>TAB</sign><line>5</line></clef></attributes><direction placement="above"><direction-type><words>CHUG GRID ${xmlEscape($('grouping').value)}</words></direction-type></direction>`;
    for(let i=0;i<bs;i++){
      const idx=m*bs+i, v=state.grid[idx]||'-';
      if(v==='-') xml+=`<note><rest/><duration>1</duration><type>16th</type></note>`;
      else {const accent=v==='A'?'<notations><technical><string>6</string><fret>0</fret></technical><articulations><accent/></articulations></notations>':'<notations><technical><string>6</string><fret>0</fret></technical></notations>'; xml+=`<note><pitch><step>E</step><octave>2</octave></pitch><duration>1</duration><type>16th</type>${accent}<lyric><text>${xmlEscape(v)}</text></lyric></note>`}
    }
    xml+=`</measure>`;
  }
  xml+=`</part></score-partwise>`; downloadBlob('chug-grid-guitarpro-ready.musicxml','application/vnd.recordare.musicxml+xml',xml); setStatus('MusicXML exported');
}

function bind(){['bpm','num','den','bars'].forEach(id=>$(id).onchange=()=>{state.bpm=+$('bpm').value;state.num=+$('num').value;state.den=+$('den').value;state.bars=+$('bars').value;initGrid()});document.querySelectorAll('input[name=mode]').forEach(r=>r.onchange=()=>{state.mode=r.value;generateFromGroup()});$('audio').onclick=()=>{ensureAudio();tone(660);setStatus('Audio ready')};$('play').onclick=play;$('stop').onclick=stop;$('reset').onclick=()=>{state.step=0;renderAll();setStatus('Reset')};$('step').onclick=()=>{ensureAudio();tick();setStatus('Step')};$('tap').onclick=tap;$('dice').onclick=()=>{rollDice(); applyDice();};$('applyDice').onclick=applyDice;$('applyGroup').onclick=generateFromGroup;$('analyze').onclick=analyzeAudio;$('useDetected').onclick=useDetected;$('exportMidi').onclick=midiExport;$('exportXml').onclick=musicXmlExport; if($('targetGenerate')) $('targetGenerate').onclick=generateTargetRealignment; if($('targetFit')) $('targetFit').onclick=fitCurrentToTargetBars; if($('fitAlign')) $('fitAlign').onclick=fitGridToRealignment; if($('fitOneCycle')) $('fitOneCycle').onclick=fitGridToRiffCycle}
bind();initGrid();generateFromGroup();
