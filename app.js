const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = "score-analyzer-data-v1";
const MAX_STUDENTS = 110;
const sampleScores = [1,3,4,5,6,7,8,9,10,10,11,12,12,13,14,15,16,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,38,40,42,45,47];
let scores = [];
let mode = "distribution";

for (let i = 0; i < MAX_STUDENTS; i++) {
  const item = document.createElement("label");
  item.className = "score-item";
  item.innerHTML = `<span>${i + 1}</span><input class="score-input" type="number" min="0" step="0.1" inputmode="decimal" aria-label="${i + 1}人目の点数">`;
  $("#score-grid").appendChild(item);
}
const scoreInputs = [...document.querySelectorAll(".score-input")];
const topSlider = $("#top-slider");
const bottomSlider = $("#bottom-slider");
const canvas = $("#chart");
const ctx = canvas.getContext("2d");

function subjectName() {
  return $("#subject").value === "other" ? ($("#other-subject").value.trim() || "その他") : $("#subject").value;
}
function enteredScores() {
  return scoreInputs.map(input => input.value.trim() === "" ? null : Number(input.value)).filter(value => value !== null);
}
function saveForm() {
  const data = {subject:$("#subject").value, other:$("#other-subject").value, testName:$("#test-name").value, maxScore:$("#max-score").value, scores:scoreInputs.map(input=>input.value)};
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function loadForm() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data) return;
    $("#subject").value=data.subject || "社会"; $("#other-subject").value=data.other || ""; $("#test-name").value=data.testName || ""; $("#max-score").value=data.maxScore || 50;
    (data.scores || []).slice(0,MAX_STUDENTS).forEach((value,i)=>scoreInputs[i].value=value);
  } catch (_) {}
  toggleOtherSubject(); updateEnteredCount();
}
function toggleOtherSubject() { $("#other-subject-wrap").classList.toggle("hidden", $("#subject").value !== "other"); }
function updateEnteredCount() { $("#entered-count").textContent=enteredScores().length; saveForm(); }
function clearInvalid() { scoreInputs.forEach(input=>input.classList.remove("invalid")); $("#form-error").textContent=""; }
function validate() {
  clearInvalid();
  const max=Number($("#max-score").value); let invalid=false;
  scoreInputs.forEach(input=>{if(input.value!=="" && (!Number.isFinite(Number(input.value)) || Number(input.value)<0 || Number(input.value)>max)){input.classList.add("invalid");invalid=true;}});
  if (!max || max<=0) return "満点は1点以上で入力してください。";
  if (invalid) return `0点から${max}点までの範囲で入力してください。`;
  if (enteredScores().length<2) return "分析するには、2人分以上の点数を入力してください。";
  return "";
}
function mean(values){return values.reduce((a,b)=>a+b,0)/values.length}
function median(values){const n=values.length,m=Math.floor(n/2);return n%2?values[m]:(values[m-1]+values[m])/2}
function standardDeviation(values){const avg=mean(values);return Math.sqrt(mean(values.map(v=>(v-avg)**2)))}
function stats(){return {avg:mean(scores),med:median(scores),sd:standardDeviation(scores),min:scores[0],max:scores.at(-1)}}
function groups(){const bc=Number(bottomSlider.value),tc=Number(topSlider.value);return {bottom:scores.slice(0,bc),top:scores.slice(-tc),bottomCount:bc,topCount:tc}}
function format(value){return `${value.toFixed(1)}点`}

function configureAnalysis() {
  scores=enteredScores().sort((a,b)=>a-b);
  const maxGroup=Math.max(1,Math.floor((scores.length-1)/2)),initial=Math.max(1,Math.round(scores.length*.25));
  [topSlider,bottomSlider].forEach(slider=>{slider.min=1;slider.max=maxGroup;slider.value=Math.min(initial,maxGroup)});
  $("#top-limit").textContent=`${maxGroup}人`; $("#bottom-limit").textContent=`${maxGroup}人`;
  $("#result-eyebrow").textContent=`${subjectName()} ${$("#test-name").value.trim() || "テスト"}`;
  $("#result-summary").textContent=`受験者数 ${scores.length}名 / ${Number($("#max-score").value)}点満点`;
  $("#analysis-title").textContent=`${subjectName()} ${$("#test-name").value.trim() || "テスト"}`;
  $("#analysis-screen").classList.remove("hidden"); $("#input-screen").classList.add("hidden"); window.scrollTo(0,0); updateAnalysis();
}
function updateAnalysis() {
  const maxScore=Number($("#max-score").value),s=stats(),g=groups(),topAvg=mean(g.top),bottomAvg=mean(g.bottom);
  $("#top-count").textContent=g.topCount; $("#bottom-count").textContent=g.bottomCount;
  $("#top-average").textContent=topAvg.toFixed(1); $("#bottom-average").textContent=bottomAvg.toFixed(1);
  $("#top-rate").textContent=Math.round(topAvg/maxScore*100); $("#bottom-rate").textContent=Math.round(bottomAvg/maxScore*100);
  $("#overall-label").textContent=`全体平均点（${scores.length}名）`; $("#overall-average").textContent=format(s.avg);
  $("#median").textContent=format(s.med); $("#stddev").textContent=format(s.sd); $("#highest").textContent=format(s.max); $("#lowest").textContent=format(s.min);
  generateNarrative(s,g,maxScore); draw();
}
function generateNarrative(s,g,maxScore) {
  const normalizedSd=s.sd/maxScore, gap=(mean(g.top)-mean(g.bottom))/maxScore;
  const center=scores.filter(v=>v>=maxScore*.35&&v<=maxScore*.65).length/scores.length;
  const low=scores.filter(v=>v<maxScore*.4).length/scores.length, high=scores.filter(v=>v>=maxScore*.8).length/scores.length;
  let level="明確ではありません";
  if(normalizedSd>=.24 && center<.45 && gap>=.4) level="強く見られます"; else if(normalizedSd>=.18 || gap>=.32) level="やや見られます";
  $("#polarization-level").textContent=level;
  $("#stat-insight").innerHTML=`<strong>統計から言えること:</strong><br>平均点は${format(s.avg)}（得点率${Math.round(s.avg/maxScore*100)}%）、標準偏差は${format(s.sd)}です。${normalizedSd>=.2?"得点のばらつきが大きく、理解度に差があります。":"得点のばらつきは比較的小さく、集団内の差は限定的です。"}`;
  const findings=[
    ["全体の到達状況",s.avg/maxScore<.5?`平均得点率は${Math.round(s.avg/maxScore*100)}%で、基礎事項を含めた定着状況を確認する必要があります。`:`平均得点率は${Math.round(s.avg/maxScore*100)}%で、全体として一定の到達が見られます。`],
    ["得点差と分布",`上位・下位グループの平均差は${format(mean(g.top)-mean(g.bottom))}です。二極化は「${level}」と判定されます。`],
    ["低得点層の状況",low>=.35?`満点の40%未満が${Math.round(low*100)}%を占めています。基本問題への取り組み方や前提知識を確認する余地があります。`:`満点の40%未満は${Math.round(low*100)}%で、低得点層は比較的限定されています。`]
  ];
  const actions=[
    ["基礎事項の確認",low>=.25?"重要事項を少数に絞った確認問題を用意し、短い間隔で再確認することが有効です。":"基礎問題は短時間で確認し、応用課題へ進む時間を確保できます。"],
    ["習熟度に応じた課題",normalizedSd>=.18?"基礎・標準・発展の複数課題を用意し、現在の理解度に合う課題から取り組めるようにします。":"共通課題を中心に進めつつ、早く終えた生徒向けの発展課題を用意します。"],
    ["次回テストへの改善",high>=.3?"高得点層が多いため、思考力を測る問題を加えると理解度をさらに詳しく確認できます。":"誤答が多かった問題を特定し、類題による再確認を行うと改善につながります。"]
  ];
  $("#analysis-findings").innerHTML=findings.map(([h,p],i)=>`<h4>${i+1}. ${h}</h4><p>${p}</p>`).join("");
  $("#analysis-actions").innerHTML=actions.map(([h,p],i)=>`<h4>${i+1}. ${h}</h4><p>${p}</p>`).join("");
}
function sizeCanvas(){const dpr=devicePixelRatio||1,r=canvas.getBoundingClientRect();canvas.width=r.width*dpr;canvas.height=r.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);return r}
function axes(w,h,maxY,labels){const p={l:62,r:10,t:10,b:52},cw=w-p.l-p.r,ch=h-p.t-p.b,step=maxY<=10?1:Math.ceil(maxY/10);ctx.strokeStyle="#dfe2e6";ctx.lineWidth=1;for(let y=0;y<=maxY;y+=step){const py=p.t+ch-y/maxY*ch;ctx.beginPath();ctx.moveTo(p.l,py);ctx.lineTo(w-p.r,py);ctx.stroke();ctx.fillStyle="#666";ctx.textAlign="right";ctx.fillText(y,p.l-12,py+5)}ctx.textAlign="center";labels.forEach((v,i)=>ctx.fillText(v,p.l+(i+.5)*cw/labels.length,h-22));return {...p,cw,ch}}
function draw(){const r=sizeCanvas();ctx.clearRect(0,0,r.width,r.height);ctx.font="13px Segoe UI";mode==="distribution"?drawDistribution(r.width,r.height):drawRanking(r.width,r.height)}
function drawDistribution(w,h){const maxScore=Number($("#max-score").value),bins=10,width=maxScore/bins,labels=Array.from({length:bins},(_,i)=>`${Math.round(i*width)}-${Math.round((i+1)*width)}`),g=groups(),counts=labels.map(()=>({bottom:0,middle:0,top:0}));scores.forEach((score,index)=>{const bin=Math.min(bins-1,Math.floor(score/width));const key=index<g.bottomCount?"bottom":index>=scores.length-g.topCount?"top":"middle";counts[bin][key]++});const maxY=Math.max(2,...counts.map(c=>c.bottom+c.middle+c.top)),p=axes(w,h,maxY,labels),bw=p.cw/bins*.7;counts.forEach((count,i)=>{let y=p.t+p.ch;[["bottom","#3e82e8"],["middle","#cfd3da"],["top","#ed4d50"]].forEach(([key,color])=>{const bh=count[key]/maxY*p.ch;y-=bh;ctx.fillStyle=color;ctx.fillRect(p.l+i*p.cw/bins+(p.cw/bins-bw)/2,y,bw,bh)})});ctx.fillStyle="#666";ctx.fillText("得点帯",p.l+p.cw/2,h-2)}
function drawRanking(w,h){const maxScore=Number($("#max-score").value),labels=Array.from({length:10},(_,i)=>i===0?"1位":i===9?`${scores.length}位`:""),p=axes(w,h,maxScore,labels),g=groups(),bw=p.cw/scores.length;[...scores].reverse().forEach((score,i)=>{ctx.fillStyle=i<g.topCount?"#ed4d50":i>=scores.length-g.bottomCount?"#3e82e8":"#cfd3da";ctx.fillRect(p.l+i*bw,p.t+p.ch-score/maxScore*p.ch,Math.max(2,bw-.5),score/maxScore*p.ch)})}

$("#subject").addEventListener("change",()=>{toggleOtherSubject();saveForm()});
[$("#other-subject"),$("#test-name"),$("#max-score")].forEach(el=>el.addEventListener("input",saveForm));
scoreInputs.forEach(input=>input.addEventListener("input",()=>{input.classList.remove("invalid");updateEnteredCount()}));
$("#apply-bulk").addEventListener("click",()=>{const values=$("#bulk-scores").value.split(/[\s,、]+/).filter(Boolean).slice(0,MAX_STUDENTS);scoreInputs.forEach((input,i)=>input.value=values[i]??"");updateEnteredCount()});
$("#load-sample").addEventListener("click",()=>{$("#subject").value="社会";$("#test-name").value="サンプル確認テスト";$("#max-score").value=50;scoreInputs.forEach((input,i)=>input.value=sampleScores[i]??"");toggleOtherSubject();updateEnteredCount()});
$("#clear-data").addEventListener("click",()=>{if(!confirm("入力した内容をすべて消去しますか？"))return;scoreInputs.forEach(input=>input.value="");$("#test-name").value="";$("#bulk-scores").value="";clearInvalid();updateEnteredCount()});
$("#analyze").addEventListener("click",()=>{const error=validate();$("#form-error").textContent=error;if(!error)configureAnalysis()});
$("#back-to-input").addEventListener("click",()=>{$("#analysis-screen").classList.add("hidden");$("#input-screen").classList.remove("hidden");window.scrollTo(0,0)});
$("#print-result").addEventListener("click",()=>window.print());
[topSlider,bottomSlider].forEach(slider=>slider.addEventListener("input",updateAnalysis));
document.querySelectorAll(".tabs button").forEach(button=>button.addEventListener("click",()=>{document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));button.classList.add("active");mode=button.dataset.mode;draw()}));
window.addEventListener("resize",()=>{if(!$("#analysis-screen").classList.contains("hidden"))draw()});
loadForm();
