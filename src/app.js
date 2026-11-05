(function(){
'use strict';
/* =================== Helpers =================== */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const ic=(n,c)=>`<svg class="ic${c?' '+c:''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9+#%\s-]/g,' ').replace(/\s+/g,' ').trim();
const STOP=new Set('the a an and or to of in for with on at by from as is are be will their they this that our your you we it its into across through more must should can able ability strong proven responsible responsibility required requirement requirements skills skill years year experience work working role team company about who what other such well using use high level new including include ensure meet stay related field minimum etc plus good excellent'.split(' '));
const stem=w=>w.length>5?w.replace(/(ations|ation|ings|ing|ers|er|ed|es|s)$/,''):w;
const FAM={lead:'LEAD',led:'LEAD',manag:'LEAD',mentor:'LEAD',direct:'LEAD',supervis:'LEAD',collaborat:'COLLAB',partner:'COLLAB','cross-functional':'COLLAB',stakeholder:'COLLAB',align:'COLLAB',quality:'QUAL',standard:'QUAL',governance:'QUAL',approval:'QUAL',software:'TOOL',tool:'TOOL',figma:'TOOL',adobe:'TOOL',strategy:'STRAT',vision:'STRAT',roadmap:'STRAT',research:'RES',usability:'RES',interview:'RES',communicat:'COMM',present:'COMM'};
const toks=s=>norm(s).split(' ').filter(w=>w.length>2&&!STOP.has(w)).map(stem);
const fam=arr=>{const o=new Set();arr.forEach(t=>{o.add(t);for(const k in FAM){if(t.startsWith(k)){o.add(FAM[k]);break}}});return o};
const nums=s=>(String(s).match(/\d[\d,]*(?:\.\d+)?/g)||[]).map(n=>n.replace(/,/g,''));
const words=s=>{const t=String(s).trim();return t?t.split(/\s+/).length:0};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const EMAIL=/[\w.+-]+@[\w-]+\.[\w.]+/, PHONE=/\+?\d[\d\s-]{8,}\d/;
const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const wb=(text,k)=>k.endsWith('*')?new RegExp('\\b'+reEsc(k.slice(0,-1))).test(text):new RegExp('\\b'+reEsc(k)+'\\b').test(text);
const isHeading=l=>{l=l.trim();return l.length>2&&l.length<42&&l===l.toUpperCase()&&/[A-Z]/.test(l)&&!/\d/.test(l)&&!/^[•\-*]/.test(l)};
const YEAR=2026, TODAY='6 Nov 2026';
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(_){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}}};
let toastT=null,toastUndo=null;
function toast(m,undo){const t=$('#toast');$('#toastMsg').textContent=m;toastUndo=undo||null;$('#toastAct').classList.toggle('hide',!undo);t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>{t.classList.remove('show');toastUndo=null},undo?4500:2300)}
$('#toastAct').onclick=()=>{if(toastUndo){toastUndo();toastUndo=null}$('#toast').classList.remove('show')};

/* =================== Example data =================== */
const EX={company:'Keka HR',role:'Design Manager',links:'https://portfolio.example.com',
jd:`Design Manager — Keka HR

Lead and manage the design team in Product Design. Oversee development and execution of design projects. Ensure designs meet company standards and objectives. Collaborate with cross-functional teams to deliver high-quality design solutions. Stay updated on industry trends and best practices.

Qualifications: Bachelor's degree in Design or related field. Minimum 10 years in Product Design. Proven track record leading design teams and successful projects. Strong communication and leadership skills. Proficiency in design software and tools.

Required: Innovation, Visual Communication, Design Strategy, Project Management, Quality Assurance, User Experience Design, Team Leadership, Creative Problem Solving, Collaboration, Time Management.`,
resume:`Anupam Sarkar
Product Design Manager · Bangalore, India
anupam.sarkar@example.com · +91 98765 43210 · portfolio.example.com

PROFESSIONAL SUMMARY
Product Design Manager with 13+ years across enterprise UX, design systems and design leadership.

SKILLS
Figma, FigJam, Miro, Framer, Adobe Creative Suite, Figma AI, Claude, Cursor

EXPERIENCE
Product Design Manager — IBM | Jul 2025 – Present
• Manage and mentor four designers across four squads.
• Lead UX strategy for 10,000+ enterprise users.
• Scaled Carbon Design System adoption, reducing UI drift 20% and developer rework 10%.
• Improved first-pass design approvals 35% through Product, Engineering and Design governance.

Product Design Manager — BT Group | Dec 2024 – Jun 2025
• Directed UX for enterprise billing and provisioning serving 500,000+ users.
• Reduced feature discovery from four weeks to two.
• Achieved 95% cross-functional alignment on complex billing flows.

Lead UX Strategist — Siemens | Sep 2022 – Dec 2024
• Designed sustainability dashboards that improved planning efficiency 30%.
• Reduced design-to-dev handoff time 25%.
• Improved prototype validation success from 60% to 85%.
• Mentored designers and researchers.

EDUCATION
Master of Design — IIT Hyderabad (Gold Medalist)
Bachelor of Architecture — BIT Mesra`,
extra:`Led creative direction for brand and product ad videos and 360 factory tour videos with a team of about 30 visual designers, motion designers, 3D artists and editors.
Built and launched DFD (Digital First Devotional), a live consumer app, as a bootstrapped founder.`};

const EX_REQS=[
 {id:'r1',label:'Lead and manage the design team',priority:'must',status:'proven',match:'direct',kw:['lead and manage'],ev:'Manage and mentor four designers across four squads.'},
 {id:'r2',label:'10+ years in Product Design',priority:'must',status:'proven',match:'direct',gate:'Experience gate',kw:['13+ years'],ev:'Product Design Manager with 13+ years across enterprise UX, design systems and design leadership.'},
 {id:'r3',label:"Bachelor's degree in Design or related field",priority:'must',status:'proven',match:'direct',gate:'Credential gate',kw:['bachelor'],ev:'Bachelor of Architecture — BIT Mesra'},
 {id:'r4',label:'Quality Assurance — designs meet company standards',priority:'must',status:'proven',match:'transferable',kw:['quality assurance'],ev:'Improved first-pass design approvals 35% through Product, Engineering and Design governance.',note:'Governance is QA in practice, but the résumé never names it.'},
 {id:'r5',label:'Collaborate with cross-functional teams',priority:'must',status:'proven',match:'direct',kw:['cross-functional'],ev:'Achieved 95% cross-functional alignment on complex billing flows.'},
 {id:'r6',label:'Track record leading design teams and projects',priority:'must',status:'proven',match:'direct',kw:['design team'],ev:'Lead UX strategy for 10,000+ enterprise users.'},
 {id:'r7',label:'Team Leadership',priority:'must',status:'proven',match:'direct',kw:['team leadership'],ev:'Manage and mentor four designers across four squads.'},
 {id:'r8',label:'User Experience Design',priority:'must',status:'proven',match:'direct',kw:['user experience design'],ev:'Directed UX for enterprise billing and provisioning serving 500,000+ users.'},
 {id:'r9',label:'Proficiency in design software and tools',priority:'must',status:'proven',match:'direct',kw:['figma'],ev:'Figma, FigJam, Miro, Framer, Adobe Creative Suite, Figma AI, Claude, Cursor'},
 {id:'r10',label:'Project Management — oversee execution of design projects',priority:'must',status:'partial',match:'transferable',kw:['project management'],ev:'Reduced feature discovery from four weeks to two.',question:'The role asks you to oversee the development and execution of design projects. Have you owned project plans, timelines or delivery tracking? Describe one example.'},
 {id:'r11',label:'Strong communication and leadership skills',priority:'must',status:'partial',match:'transferable',kw:['communication'],ev:'Achieved 95% cross-functional alignment on complex billing flows.',question:'Communication is a must-have, but your résumé only implies it. Have you presented to executives, run workshops or written strategy documents?'},
 {id:'r12',label:'Design Strategy',priority:'nice',status:'proven',match:'direct',kw:['design strategy'],ev:'Lead UX strategy for 10,000+ enterprise users.'},
 {id:'r13',label:'Visual Communication',priority:'nice',status:'proven',match:'direct',kw:['visual communication'],ev:'Led creative direction for brand and product ad videos and 360 factory tour videos with a team of about 30 visual designers, motion designers, 3D artists and editors.'},
 {id:'r14',label:'Innovation',priority:'nice',status:'partial',match:'transferable',kw:['innovation'],ev:'Built and launched DFD (Digital First Devotional), a live consumer app, as a bootstrapped founder.',question:'Beyond launching DFD, have you introduced a new method, tool or AI workflow that your team adopted? What changed?'},
 {id:'r15',label:'Creative Problem Solving',priority:'nice',status:'partial',match:'transferable',kw:['problem solving'],ev:'Designed sustainability dashboards that improved planning efficiency 30%.',question:'Describe a hard design problem you solved in an unusual way — the constraint and what you did.'},
 {id:'r16',label:'Time Management',priority:'nice',status:'gap',match:null,kw:['time management','deadline'],ev:'',question:'Have you delivered under a fixed deadline or balanced several projects at once? Share one example.'}
];

const SIGNALS=[
 {type:'company',text:'Lists “Collaboration over competition” and “Innovation with impact” among its company values.',src:'Keka — About us',url:'https://keka.com/us/about-keka',conf:'High',use:'Frame collaboration with Product & Engineering, and innovation backed by a measured result.'},
 {type:'company',text:'Describes itself as an HR SaaS platform used by 8,000+ companies and scaling across 29+ countries, with growing product complexity.',src:'Keka design job listing (Arc)',url:'https://arc.dev/remote-jobs/j/keka-hr-senior-product-designer-p4jb901h07',conf:'Medium',use:'Your multi-region enterprise scale (BT Group, 500,000+ users) is directly relevant.'},
 {type:'company',text:'Recent design roles emphasise reusable interaction patterns and governance models so products scale across India, GCC, US and future markets.',src:'Keka Lead Product Designer listing (foundit)',url:'https://www.foundit.in/job/lead-product-designer-keka-hr-hyderabad-secunderabad-telangana-55506079',conf:'Medium',use:'Lead with your Carbon Design System and design-governance results.'},
 {type:'company',text:'Says design is one of its key differentiating factors for the next phase of growth.',src:'Keka Senior Product Designer listing (GrabJobs)',url:'https://grabjobs.co/india/job/full-time/construction/senior-product-designer-47177246',conf:'Medium'},
 {type:'company',text:'Promotes “Keka AI”, with AI woven across every workflow.',src:'keka.com',url:'https://www.keka.com/keka-secures-indias-largest-series-a-saas-funding-with-57m-dollars',conf:'Medium',use:'Your AI-assisted design workflow is a relevant signal — only if you can show a result.'},
 {type:'trend',text:'Design leaders are increasingly asked to show AI-assisted workflow adoption with measurable outcomes.',src:'TruthFit inference — no cited source',conf:'Low',infer:true}
];

/* ---- Role packs (5 in this prototype) ---- */
const FAMILIES=[
 ['spd','Software, data, product & design',['design','designer','ux','ui','product','software','engineer','developer','data','analyst','frontend','backend','devops','machine learning']],
 ['smc','Sales, marketing & customer success',['sales','marketing','account executive','customer success','growth','seo','brand','campaign']],
 ['fin','Finance, accounting & consulting',['finance','accounting','accountant','audit','tax','consultant']],
 ['ops','Operations, supply chain & project management',['operations','supply chain','logistics','project manager','program manager','procurement','delivery manager']],
 ['hr','Human resources & recruitment',['human resources','recruit','talent acquisition','people partner','hrbp','payroll specialist']],
 ['hls','Healthcare & life sciences',['nurse','clinical','patient','pharma','medical','hospital']],
 ['eng','Engineering & manufacturing',['mechanical','electrical','manufacturing','civil engineer','plant','production']],
 ['edu','Education & research',['teacher','lecturer','professor','curriculum','research scientist']],
 ['leg','Legal, compliance & risk',['legal','lawyer','counsel','compliance','risk']],
 ['cre','Creative, media & communications',['copywriter','journalist','video','content','communications','editor']],
 ['pub','Public sector & nonprofit',['government','public sector','nonprofit','ngo','policy']],
 ['fro','Frontline, retail, hospitality & trades',['retail','store','hospitality','chef','technician','electrician','driver']]
];
const PACKS={
 design:{name:'Design leadership & product design',fam:'spd',items:[['User research and usability testing',['research','usability']],['Design systems ownership',['design system']],['Prototyping and validation',['prototyp*','validation']],['Measured design outcomes',['%']]],lead:[['Hiring and growing designers',['hiring','hired','grew the team']],['Design operations and process improvement',['handoff','process','design ops']],['Executive and stakeholder influence',['executive','stakeholder']]],mode:'executive'},
 software:{name:'Software & data',fam:'spd',items:[['Shipping production systems',['shipped','production','deployed']],['Performance or reliability metrics',['latency','uptime','performance']],['Code quality and review',['review','testing','ci']],['Cloud and tooling',['aws','gcp','azure','kubernetes','docker']]],lead:[['Technical leadership and mentoring',['mentor','tech lead']],['Architecture decisions',['architect']]],mode:'technical'},
 sales:{name:'Sales, marketing & customer success',fam:'smc',items:[['Revenue or pipeline outcomes',['revenue','pipeline','quota']],['Customer retention or growth',['retention','churn','upsell']],['Campaign or funnel performance',['conversion','campaign','ctr']],['CRM and tooling',['salesforce','hubspot','crm']]],lead:[['Team targets and coaching',['coach','team target']]],mode:'balanced'},
 ops:{name:'Operations & project management',fam:'ops',items:[['Delivery on time and budget',['on time','budget','schedule']],['Process improvement with metrics',['process','efficiency','%']],['Stakeholder and vendor management',['stakeholder','vendor']],['Risk and dependency management',['risk','dependency']]],lead:[['Running programmes across teams',['program','portfolio']]],mode:'balanced'},
 hr:{name:'Human resources & recruitment',fam:'hr',items:[['Hiring outcomes',['time to hire','hires','offer acceptance']],['Employee experience or retention',['retention','engagement','attrition']],['Policy, compliance and HR systems',['policy','compliance','hris']],['Partnering with leaders',['business partner','leaders']]],lead:[['HR programme ownership',['programme','program']]],mode:'balanced'}
};
const SENIORITY=[['Intern / entry',/\b(intern|trainee|graduate|junior|associate)\b/i],['Mid-level',/\b(designer|engineer|analyst|specialist|executive)\b/i],['Senior',/\b(senior|sr\.?)\b/i],['Lead / principal',/\b(lead|principal|staff)\b/i],['Manager (people leader)',/\b(manager|head of)\b/i],['Director +',/\b(director|vp|vice president|chief|cxo)\b/i]];

/* =================== State =================== */
const S={step:1,maxStep:1,inputs:{},opts:{pages:'2',tone:'balanced'},provider:'auto',shield:true,aiUsed:false,aiModel:'',aiSug:{},aiLetter:null,
 vault:[],reqs:[],bench:[],signals:[],cls:{},pack:null,changes:[],mode:'balanced',decisions:{},edits:{},editing:{},gaps:{},drafts:{},open:{},
 generic:false,before:null,finalText:'',manualFinal:null,filter:'all',rfilter:'all',ftab:'resume',pii:{email:0,phone:0},parse:null};
const STEPS=['Import','Evidence Vault','Role Intelligence','Evidence Map','Strategy','Review','Design & Test'];
const STEP_ICONS=['doc','tray','scope','checklist','sliders','review','viewfinder'];

/* =================== Stepper & nav =================== */
function renderStepper(){
  const html=STEPS.map((s,i)=>{const n=i+1,cls=n===S.step?'active':n<=S.maxStep?'done':'',can=n<=S.maxStep&&n!==S.step;
    return `<button class="st ${cls}" data-go="${n}" ${can?'':'disabled'} ${n===S.step?'aria-current="step"':''}><span class="tile t${n}">${ic(STEP_ICONS[i])}</span><span class="st-l">${s}</span><span class="st-s">${cls==='done'?ic('check'):''}</span></button>`}).join('');
  $('#stepper').innerHTML=html;$('#stepperM').innerHTML=html;
  $('#navStep').textContent=STEPS[S.step-1];$('#navProg').style.width=(S.step/STEPS.length*100)+'%';
  $('#navBack').style.visibility=S.step===1?'hidden':'';$('#navBackLabel').textContent=S.step>1?STEPS[S.step-2]:'';
}
function go(n){
  const back=n<S.step;S.step=n;S.maxStep=Math.max(S.maxStep,n);
  $$('.view').forEach(v=>{v.classList.toggle('hide',+v.dataset.step!==n);v.classList.toggle('back',back)});
  renderStepper();
  ({2:renderVault,3:renderRole,4:renderMap,5:renderModes,6:renderChanges,7:renderFinal}[n]||(()=>{}))();
  renderBar();
  window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});
}
const NEXT={1:'Build Evidence Vault',2:'Review Role Intelligence',3:'Map My Evidence',4:'Choose Strategy',5:'Generate Changes',6:'Design & Test',7:'New Application'};
function renderBar(){
  const b=$('#backBtn'),nx=$('#nextBtn'),m=$('#barMsg');
  b.classList.toggle('hide',S.step===1);nx.textContent=NEXT[S.step];
  let t='';
  if(S.step===1)t=valid()?'Ready — we\'ll extract, classify and research in one pass.':'Add company, role, job description and résumé to continue.';
  if(S.step===2){const u=S.vault.filter(v=>v.type!=='name'&&v.type!=='contact'&&!v.confirmed).length;t=u?`${u} records not yet confirmed — you can continue and confirm later.`:'Every record confirmed. Nice.'}
  if(S.step===3)t=`${S.signals.length} cited insights · ${S.bench.length} benchmark expectations loaded.`;
  if(S.step===4){const o=S.reqs.filter(r=>r.status!=='proven'&&!S.gaps[r.id]).length;t=o?`${o} requirement${o>1?'s':''} still open — answer or skip any time.`:'All requirements handled.'}
  if(S.step===5)t=`${modeObj().name} strategy · ${visibleChanges().length} changes will be proposed.`;
  if(S.step===6){const all=visibleChanges(),p=all.filter(c=>!S.decisions[c.id]).length;t=p?`${p} pending — pending changes won't be applied.`:'Every change reviewed.'}
  if(S.step===7)t='Version saved to this browser when you click “Save this version”.';
  m.textContent=t;
}
$('#stepper').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b&&!b.disabled)go(+b.dataset.go)});
$('#stepperM').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b&&!b.disabled){closeSheets();go(+b.dataset.go)}});
$('#navBack').onclick=()=>go(Math.max(1,S.step-1));
$('#navTitle').onclick=()=>openSheet('#stepsSheet');
$('#backBtn').onclick=()=>go(Math.max(1,S.step-1));
$('#nextBtn').onclick=()=>{
  if(S.step===1)return startAnalysis();
  if(S.step===7){openSheet('#resetSheet');return}
  go(S.step+1);
};

/* =================== Step 1: inputs =================== */
const F=['company','role','jd','resume','extra','links'];
function readInputs(){F.forEach(k=>S.inputs[k]=$('#'+k).value.trim());S.inputs.region=$('#region').value}
function valid(){readInputs();return !!(S.inputs.company&&S.inputs.role&&S.inputs.jd.length>40&&S.inputs.resume.length>80)}
F.forEach(k=>$('#'+k).addEventListener('input',()=>S.step===1&&renderBar()));
$('#loadExample').onclick=()=>{F.forEach(k=>$('#'+k).value=EX[k]||'');renderBar();toast('Keka example loaded')};
$$('.seg[data-opt]').forEach(g=>g.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;g.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));S.opts[g.dataset.opt]=b.dataset.v}));
function setMsg(k,t,err){const m=$(`[data-msg="${k}"]`);m.textContent=t;m.classList.toggle('err',!!err)}
const LIBS={},CDN='https://cdnjs.cloudflare.com/ajax/libs/';
function loadScript(src){return LIBS[src]||(LIBS[src]=new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>{delete LIBS[src];no(new Error('The file reader could not load. Check your connection, or paste the text.'))};document.head.appendChild(s)}))}
async function extract(file,ext){
  if(ext==='pdf'){await loadScript(CDN+'pdf.js/3.11.174/pdf.min.js');await loadScript(CDN+'pdf.js/3.11.174/pdf.worker.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=CDN+'pdf.js/3.11.174/pdf.worker.min.js';
    const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise,out=[];
    for(let i=1;i<=pdf.numPages;i++){const c=await (await pdf.getPage(i)).getTextContent();let line='',y=null;const ls=[];
      c.items.forEach(it=>{const yy=Math.round(it.transform[5]);if(y!==null&&Math.abs(yy-y)>2){ls.push(line);line=''}line+=(line&&!line.endsWith(' ')&&!it.str.startsWith(' ')?' ':'')+it.str;y=yy;if(it.hasEOL){ls.push(line);line='';y=null}});
      ls.push(line);out.push(ls.map(l=>l.replace(/\s+/g,' ').trim()).join('\n'))}
    return out.join('\n\n')}
  if(ext==='docx'){await loadScript(CDN+'mammoth/1.8.0/mammoth.browser.min.js');return (await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value}
  const t=await file.text();return /^html?$/.test(ext)?new DOMParser().parseFromString(t,'text/html').body.innerText:t;
}
function readFile(file,k){
  if(!file)return;const ext=(file.name.split('.').pop()||'').toLowerCase();
  if(file.size>10*1024*1024)return setMsg(k,'File is larger than 10 MB.',true);
  if(!['pdf','docx','txt','md','html','htm'].includes(ext))return setMsg(k,ext==='doc'?'Old .doc files can\'t be read in the browser. Save as .docx or PDF.':'Use a PDF, Word (.docx), .txt or .md file.',true);
  setMsg(k,`Reading ${file.name}…`);
  extract(file,ext).then(t=>{t=(t||'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
    if(!t)throw new Error(ext==='pdf'?'No text found — this looks like a scanned PDF. Paste the text instead.':'No readable text found.');
    $('#'+k).value=t;setMsg(k,`✓ ${file.name} — ${words(t)} words read in your browser. Check the text before continuing.`);renderBar()}).catch(e=>setMsg(k,e.message||'Could not read that file.',true));
}
$$('input[type=file]').forEach(i=>i.addEventListener('change',e=>{readFile(e.target.files[0],i.dataset.for);e.target.value=''}));
$$('.drop').forEach(d=>{const k=d.dataset.target;['dragenter','dragover'].forEach(t=>d.addEventListener(t,e=>{e.preventDefault();d.classList.add('drag')}));['dragleave','drop'].forEach(t=>d.addEventListener(t,e=>{e.preventDefault();d.classList.remove('drag')}));d.addEventListener('drop',e=>readFile(e.dataTransfer.files[0],k))});

/* =================== Vault =================== */
function buildVault(resume,extra,links){
  const V=[],cnt={R:0,E:0,T:0,D:0,S:0,X:0,O:0,C:0},id=k=>k+(++cnt[k]);
  let sec='header',role=null,first=true;
  for(const raw of resume.split('\n')){const l=raw.trim();if(!l)continue;
    if(first){V.push({id:'N1',type:'name',text:l,locked:true,src:'Résumé'});first=false;continue}
    if(isHeading(l)){sec=/summary|profile|about/i.test(l)?'summary':/skill|tool|competenc/i.test(l)?'skills':/experience|employment|work history|career/i.test(l)?'exp':/education|qualification|certif/i.test(l)?'edu':'other';role=null;continue}
    if(sec==='header'){V.push({id:id('C'),type:'contact',text:l,src:'Résumé'});continue}
    const m=!/^[•\-*]/.test(l)&&l.match(/^(.+?)\s+[—–-]\s+(.+?)\s*\|\s*(.+)$/);
    if(m){role={id:id('R'),type:'role',title:m[1].trim(),employer:m[2].trim(),dates:m[3].trim(),text:l,locked:true,src:'Résumé'};V.push(role);continue}
    const t=l.replace(/^[•\-*]\s*/,'');
    if(sec==='summary')V.push({id:id('S'),type:'summary',text:t,src:'Résumé'});
    else if(sec==='skills')V.push({id:id('T'),type:'tools',text:t,src:'Résumé'});
    else if(sec==='edu')V.push({id:id('D'),type:'edu',text:t,locked:true,src:'Résumé'});
    else if(role)V.push({id:id('E'),type:'ach',parent:role.id,text:t,src:'Résumé'});
    else V.push({id:id('O'),type:'other',text:t,src:'Résumé'});
  }
  (extra||'').split(/\n+/).map(s=>s.trim()).filter(Boolean).forEach(t=>V.push({id:id('X'),type:'extra',text:t,src:'Extra evidence'}));
  if(links)V.push({id:'L1',type:'link',text:links,src:'Link (not read)'});
  V.forEach(v=>{v.metrics=nums(v.text).filter(n=>!/^(19|20)\d\d$/.test(n));v.confirmed=false});
  return V;
}
const rec=id=>S.vault.find(v=>v.id===id);
function findRec(text){if(!text)return null;const n=norm(text);return S.vault.find(v=>v.text&&norm(v.text)===n)||S.vault.find(v=>v.text&&(norm(v.text).includes(n)||n.includes(norm(v.text)))&&v.text.length>8)||null}
function roleOf(r){return r?(r.type==='role'?r:rec(r.parent)):null}
function freshness(r){
  if(!r)return null;if(r.src==='Your answer')return {t:'Added today',ok:true};
  const ro=roleOf(r);if(!ro)return r.type==='extra'?{t:'Undated',ok:false}:null;
  if(/present|current|now/i.test(ro.dates))return {t:'Current role',ok:true};
  const ys=(ro.dates.match(/(19|20)\d\d/g)||[]).map(Number),y=ys.length?Math.max(...ys):null;if(!y)return {t:'Undated',ok:false};
  const d=YEAR-y;return d<=1?{t:`Recent · ${y}`,ok:true}:d<=5?{t:`Ended ${y}`,ok:true}:{t:`Older · ${y}`,ok:false};
}
const trusted=r=>r&&(r.confirmed||r.src==='Résumé'||r.src==='Your answer');
function vaultLabel(r){if(!r)return '';const ro=roleOf(r);return ro&&r.type!=='role'?`${ro.employer}`:{summary:'Summary',tools:'Skills',edu:'Education',extra:'Extra evidence',other:'Résumé',answer:'Your answer',link:'Link'}[r.type]||''}
function renderVault(){
  const V=S.vault,ach=V.filter(v=>v.type==='ach'),roles=V.filter(v=>v.type==='role'),met=V.filter(v=>v.metrics&&v.metrics.length&&v.type!=='contact'),conf=V.filter(v=>v.confirmed).length,total=V.filter(v=>v.type!=='name'&&v.type!=='contact').length;
  $('#vaultSum').innerHTML=`<div class="stat"><b>${roles.length}</b><span>Roles · facts locked</span></div><div class="stat"><b>${ach.length+V.filter(v=>v.type==='extra'||v.type==='answer').length}</b><span>Achievement records</span></div><div class="stat g"><b>${met.length}</b><span>Records with metrics</span></div><div class="stat ${conf===total?'g':'a'}"><b>${conf}/${total}</b><span>Confirmed by you</span></div>`;
  const recRow=r=>{const f=freshness(r);return `<div class="rec" id="v-${r.id}"><span class="rid">${r.id}</span><div><p>${esc(r.text)}</p><div class="meta">${r.metrics&&r.metrics.length?`<span class="tag t-ok">${r.metrics.length} metric${r.metrics.length>1?'s':''}</span>`:''}<span class="tag ${r.src==='Résumé'?'t-nice':r.src==='Your answer'?'t-ok':'t-gate'}">${esc(r.src)}</span>${f?`<span class="tag ${f.ok?'t-nice':'t-med'}">${esc(f.t)}</span>`:''}${r.locked?`<span class="tag t-gate">${ic('lock')} Locked</span>`:''}</div></div>${r.type==='link'?'':`<button class="confirm" data-conf="${r.id}" aria-pressed="${!!r.confirmed}">${ic(r.confirmed?'check-fill':'circle')} ${r.confirmed?'Confirmed':'Confirm'}</button>`}</div>`};
  let html='<div class="card-h"><div><h2>Evidence records</h2><p>Grouped as they appear in your résumé.</p></div></div>';
  const head=V.filter(v=>v.type==='name');head.forEach(r=>html+=`<div class="role"><div class="role-h"><div><b>${esc(r.text)}</b><div class="facts"><span class="fact">Name <button class="lock ${r.locked?'on':''}" data-lock="${r.id}" aria-label="${r.locked?'Unlock':'Lock'} name">${ic(r.locked?'lock':'unlock')}</button></span></div></div></div></div>`);
  const grp=(title,items)=>items.length?`<div class="role"><div class="role-h"><b>${title}</b></div>${items.map(recRow).join('')}</div>`:'';
  html+=grp('Summary',V.filter(v=>v.type==='summary'));html+=grp('Skills & tools',V.filter(v=>v.type==='tools'));
  roles.forEach(ro=>{html+=`<div class="role"><div class="role-h"><div><span class="rid cite">${ro.id}</span> <b>${esc(ro.employer)}</b><div class="facts"><span class="fact">${esc(ro.title)}</span><span class="fact">${esc(ro.dates)}</span><span class="fact">${ro.locked?'Facts locked':'Unlocked — editable'} <button class="lock ${ro.locked?'on':''}" data-lock="${ro.id}" aria-label="${ro.locked?'Unlock':'Lock'} ${esc(ro.employer)} facts">${ic(ro.locked?'lock':'unlock')}</button></span></div></div><button class="confirm" data-conf="${ro.id}" aria-pressed="${!!ro.confirmed}">${ic(ro.confirmed?'check-fill':'circle')} ${ro.confirmed?'Confirmed':'Confirm'}</button></div>${V.filter(v=>v.parent===ro.id).map(recRow).join('')}</div>`});
  html+=grp('Education & credentials',V.filter(v=>v.type==='edu'));html+=grp('Extra evidence',V.filter(v=>v.type==='extra'));html+=grp('From your answers',V.filter(v=>v.type==='answer'));html+=grp('Other lines',V.filter(v=>v.type==='other'));html+=grp('Links',V.filter(v=>v.type==='link'));
  $('#vaultList').innerHTML=html;renderBar();
}
$('#vaultList').addEventListener('click',e=>{
  const c=e.target.closest('[data-conf]'),l=e.target.closest('[data-lock]');
  if(c){const r=rec(c.dataset.conf);r.confirmed=!r.confirmed;if(r.type==='role')S.vault.filter(v=>v.parent===r.id).forEach(v=>v.confirmed=r.confirmed);renderVault();const el=$('#v-'+r.id);if(el&&r.confirmed)el.classList.add('flash')}
  if(l){const r=rec(l.dataset.lock);r.locked=!r.locked;renderVault();toast(r.locked?'Locked — the AI can\'t change this fact':'Unlocked — only do this to fix an extraction error',r.locked?null:()=>{r.locked=true;renderVault()})}
});
$('#confirmAll').onclick=()=>{const prev=S.vault.map(v=>v.confirmed);S.vault.forEach(v=>{if(v.src==='Résumé')v.confirmed=true});renderVault();toast('All résumé records confirmed',()=>{S.vault.forEach((v,i)=>v.confirmed=prev[i]);renderVault()})};

/* =================== Analysis =================== */
/* =================== Secure Worker AI =================== */
let MODEL_NAME='TruthFit AI',SAMPLE=null,SAMPLE_CHECKED=false,AI_MODELS=null;
async function workerSample(prompt,opts={}){
  const res=await fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt,provider:S.provider}),signal:opts.signal});
  const data=await res.json().catch(()=>({}));
  if(!res.ok){const e=new Error(data.error||`AI service returned ${res.status}`);e.code=res.status===429?'rate_limited':'service_error';throw e}
  MODEL_NAME=`${data.provider} · ${data.model}`;if(opts.onText)opts.onText({text:data.text});return {text:data.text,modelApplied:data.model,provider:data.provider};
}
fetch('/api/models',{headers:{accept:'application/json'}}).then(async r=>{if(!r.ok)throw new Error('unavailable');AI_MODELS=await r.json();SAMPLE=workerSample;SAMPLE_CHECKED=true;renderAIStatus()}).catch(()=>{SAMPLE_CHECKED=true;renderAIStatus()});
const aiReady=()=>S.provider!=='offline'&&!!SAMPLE;
function renderAIStatus(){
  const live=aiReady(),off=S.provider==='offline';
  const names=AI_MODELS?[AI_MODELS.available.anthropic&&'Anthropic',AI_MODELS.available.openai&&'OpenAI',AI_MODELS.available.workersAi&&'Workers AI'].filter(Boolean):[];
  const msg=off?'Offline engine selected — no AI is used.':live?`Connected securely${names.length?` · ${names.join(', ')}`:''}. TruthFit guardrails re-check every answer.`:SAMPLE_CHECKED?'The AI service is unavailable, so the offline engine will be used.':'Checking the secure AI service…';
  $('#aiStatus').textContent=msg;$('#aiBadgeHint').textContent=msg;
  $('#aiBadge').classList.toggle('off',!live);$('#aiBadgeText').textContent=off?'Offline engine':MODEL_NAME;
  $('#providerLabel').textContent=off?'Offline':live?'Live AI':'Unavailable';
  $('#letterAI').classList.toggle('hide',!live);
  if(AI_MODELS){$$('[data-provider]').forEach(row=>{const ok=!!AI_MODELS.available[row.dataset.provider];row.classList.toggle('disabled',!ok);row.querySelector('input').disabled=!ok})}
}
const EMAILg=/[\w.+-]+@[\w-]+\.[\w.]+/g,PHONEg=/\+?\d[\d\s-]{8,}\d/g;
const shieldT=t=>S.shield?t.replace(EMAILg,'[email hidden]').replace(PHONEg,'[phone hidden]'):t;
function parseJSON(t){try{return JSON.parse(t)}catch(_){}const m=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(m){try{return JSON.parse(m[1])}catch(_){}}const i=t.indexOf('{'),j=t.lastIndexOf('}');if(i>-1&&j>i){try{return JSON.parse(t.slice(i,j+1))}catch(_){}}return null}
function aiPrompt(){
  const I=S.inputs;
  const vault=S.vault.filter(v=>!['contact','link','name'].includes(v.type)).map(v=>`${v.id} [${v.type}${v.parent?' at '+v.parent:''}${v.src!=='Résumé'?' · '+v.src:''}]: ${v.type==='role'?`${v.title} — ${v.employer} | ${v.dates}`:v.text}`).join('\n');
  return `You are the analysis engine of TruthFit, a truth-first résumé tailoring tool. A candidate is applying for "${I.role}" at "${I.company}" (region: ${I.region}; tone: ${S.opts.tone}; target length: ${S.opts.pages} page(s)).

ABSOLUTE RULES
1. Never invent experience, employers, titles, dates, credentials or numbers. Every number you write in an "after" text must already appear in the résumé or vault below.
2. Never change a job title, employer, date or degree. Those are locked facts.
3. A job-description keyword is never evidence. Status comes only from the vault.
4. Write plainly and specifically. Do not use generic phrases (results-driven, passionate, team player, proven track record), AI-sounding words (leverage, foster, spearheaded, robust, seamless, pivotal) or superlatives, and do not copy the job ad word for word.

JOB DESCRIPTION
"""${I.jd.slice(0,14000)}"""

RÉSUMÉ (verbatim; contact details hidden)
"""${shieldT(I.resume).slice(0,18000)}"""

EVIDENCE VAULT (cite these IDs exactly)
${vault}

TASKS
A. classification: family = one of [${FAMILIES.map(f=>'"'+f[1]+'"').join(', ')}]; seniority = one of [${SENIORITY.map(s=>'"'+s[0]+'"').join(', ')}]; function (1–2 words); industry (short, or "").
B. requirements: 10–16 distinct requirements taken ONLY from the job description. For each: label (short, ≤8 words), priority "must"|"nice", gate "Credential gate"|"Experience gate"|"Legal gate"|null, status "proven"|"partial"|"gap" judged only from the vault, match "direct"|"transferable"|null, evidenceId (best vault ID or null), kw (1–2 lowercase exact phrases from the job description an ATS would scan for), note (≤14 words, why it is partial or transferable, else ""), question (for partial/gap: one short interview-style question to close it, else "").
C. changes: 5–9 proposed edits. type "replace" — "before" MUST be copied character-for-character from ONE résumé line (keep its "• " bullet if it has one); or type "add" — a new bullet starting with "• " plus "heading" (an UPPERCASE section name such as "ADDITIONAL EXPERIENCE"). Fields: title (≤8 words), type, before ("" for add), after, heading (add only), targets (indices into requirements), cites (vault IDs used), origin (subset of ["vac","bench"]), basis "direct" (only vault facts) or "inference" (adds any context not in the vault), risk "low"|"med", claim (if inference: one sentence naming exactly what is not in the vault, else ""), why (one sentence). If you rewrite the professional summary, also give variants {"executive": "...", "technical": "..."}.
D. gapSuggestions: for every requirement with status partial or gap, 2 statements the candidate could adapt: {angle (≤6 words), basis (a vault ID or "Template"), text}. Put facts only the candidate knows in [square brackets]. Include the requirement's exact keyword.

Reply with ONLY one JSON object, no prose:
{"classification":{"family":"","seniority":"","function":"","industry":""},"requirements":[{"label":"","priority":"must","gate":null,"status":"proven","match":"direct","evidenceId":"E1","kw":[""],"note":"","question":""}],"changes":[{"title":"","type":"replace","before":"","after":"","heading":"","targets":[0],"cites":["E1"],"origin":["vac"],"basis":"direct","risk":"low","claim":"","why":"","variants":null}],"gapSuggestions":{"3":[{"angle":"","basis":"E2","text":""}]}}`;
}
function applyAI(j){
  if(!j||!Array.isArray(j.requirements)||j.requirements.length<3||!Array.isArray(j.changes))throw new Error('shape');
  const ids=new Set(S.vault.map(v=>v.id)),cl=j.classification||{};
  const fam=FAMILIES.find(f=>f[1]===cl.family)||FAMILIES.find(f=>cl.family&&f[1].toLowerCase().startsWith(String(cl.family).toLowerCase().split(/[ ,]/)[0]));
  if(fam){S.cls.family=fam[0];S.cls.familyName=fam[1];S.cls.pack=fam[0]==='spd'?(/design|ux|ui/i.test(S.inputs.role)?'design':'software'):{smc:'sales',ops:'ops',hr:'hr'}[fam[0]]||null;S.pack=PACKS[S.cls.pack]||null}
  const si=SENIORITY.findIndex(s=>s[0]===cl.seniority);if(si>-1){S.cls.seniorIdx=si;S.cls.seniority=SENIORITY[si][0]}
  if(cl.function)S.cls.fn=String(cl.function);if(cl.industry)S.cls.industry=String(cl.industry);S.cls.conf='AI';
  S.reqs=j.requirements.slice(0,18).map((r,i)=>{const rid=ids.has(r.evidenceId)?r.evidenceId:null,st=['proven','partial','gap'].includes(r.status)?r.status:'gap',x=rid?rec(rid):null;
    return {id:'q'+i,label:String(r.label||'Requirement').slice(0,90),priority:r.priority==='nice'?'nice':'must',status:x?st:'gap',match:x?(r.match==='transferable'?'transferable':'direct'):null,gate:['Credential gate','Experience gate','Legal gate'].includes(r.gate)?r.gate:null,
      kw:(Array.isArray(r.kw)?r.kw:[]).map(k=>norm(k)).filter(Boolean).slice(0,2),ev:x?x.text:'',rec:rid,note:r.note||'',question:r.question||`Do you have direct experience with “${r.label}”? Describe one example — what you did, the scope and the result.`}});
  S.reqs.forEach(r=>{if(!r.kw.length)r.kw=[norm(r.label).split(' ').slice(0,2).join(' ')]});
  const roles=S.vault.filter(v=>v.type==='role');
  S.changes=j.changes.slice(0,10).map((c,i)=>{let type=c.type==='add'?'add':'replace',before=String(c.before||'');
    if(type==='replace'&&!S.inputs.resume.includes(before)){const alt=S.inputs.resume.split('\n').find(l=>l.trim()&&norm(l)===norm(before));if(alt)before=alt.trim();else type='add'}
    const lockRole=type==='replace'?roles.find(r=>before.includes(r.title)&&before.includes(r.employer)):null;
    return {id:'a'+i,title:String(c.title||'Proposed change'),type,before:type==='replace'?before:'',after:type==='add'?polish(String(c.after||'')):String(c.after||''),heading:type==='add'?(String(c.heading||'ADDITIONAL EXPERIENCE').toUpperCase().replace(/[^A-Z &/]/g,'').trim()||'ADDITIONAL EXPERIENCE'):undefined,
      targets:(c.targets||[]).map(t=>'q'+t).filter(t=>S.reqs.some(r=>r.id===t)),cites:(c.cites||[]).filter(x=>ids.has(x)),origin:(c.origin||['vac']).filter(o=>['vac','bench','company'].includes(o)),basis:['direct','inference'].includes(c.basis)?c.basis:'inference',risk:c.risk==='med'||c.basis==='inference'?'med':'low',claim:c.claim||'',why:c.why||'',variants:c.variants&&typeof c.variants==='object'?c.variants:null,lock:lockRole?lockRole.id:undefined}}).filter(c=>c.after.trim());
  S.changes.forEach(c=>{if(!c.origin.length)c.origin=['vac'];if(c.lock)c.basis='mirror'});
  S.aiSug={};Object.entries(j.gapSuggestions||{}).forEach(([k,v])=>{const r=S.reqs[+k];if(r&&Array.isArray(v))S.aiSug[r.id]=v.slice(0,3).map(s=>({angle:String(s.angle||'Suggested'),basis:ids.has(s.basis)?s.basis:'Template',text:String(s.text||'')})).filter(s=>s.text)});
}
async function startAnalysis(){
  if(!valid()){toast('Fill in the required fields first');const f=F.slice(0,4).find(k=>!S.inputs[k]);if(f)$('#'+f).focus();return}
  const I=S.inputs;
  S.generic=!(norm(I.resume)===norm(EX.resume)&&norm(I.jd)===norm(EX.jd));
  Object.assign(S,{decisions:{},edits:{},editing:{},gaps:{},drafts:{},open:{},manualFinal:null,maxStep:1,filter:'all',rfilter:'all',aiUsed:false,aiModel:'',aiSug:{},aiLetter:null});
  S.pii={email:EMAIL.test(I.resume)?1:0,phone:PHONE.test(I.resume)?1:0};
  S.vault=buildVault(I.resume,I.extra,I.links);
  S.cls=classify(I.role,I.jd,I.company);S.pack=PACKS[S.cls.pack]||null;
  S.signals=S.generic?[]:SIGNALS.map(s=>({...s}));
  const offline=()=>{if(S.generic){S.reqs=genericReqs()}else{S.reqs=EX_REQS.map(r=>({...r}))}S.reqs.forEach(r=>{const x=findRec(r.ev);r.rec=x?x.id:null});S.changes=S.generic?genericChanges():EX_CHANGES.map(c=>({...c}))};
  bumpUsage();
  const useAI=aiReady();
  // overlay
  const ov=$('#overlay');ov.classList.remove('hide');$('#pulse').classList.add('run');$('#ovTitle').textContent=useAI?`${MODEL_NAME} is reading your evidence…`:'Assembling your evidence…';$('#ovBar').style.width='0';$('#bridge').classList.remove('live');$('#ovStream').classList.add('hide');$('#ovStream').textContent='';
  const B=S.vault.filter(v=>['ach','extra','summary','tools','edu'].includes(v.type)).slice(0,12);
  $('#cloudB').innerHTML='<span class="k">Your evidence</span>'+B.map(v=>{const l=v.text.split(/[,.]/)[0];return `<span class="frag">${v.id} · ${esc(l.length>26?l.slice(0,24)+'…':l)}</span>`}).join('');
  const stagesDef=[
    ['Privacy shield',()=>S.shield?`${S.pii.email} email, ${S.pii.phone} phone hidden`:'Off'],
    ['Extracting résumé into evidence records',()=>`${S.vault.length} records · ${S.vault.filter(v=>v.locked).length} locked facts`],
    [useAI?`${MODEL_NAME}: reading the vacancy & your vault`:'Classifying role, seniority & industry',()=>`${S.cls.fn} · ${S.cls.seniority}${S.cls.industry?' · '+S.cls.industry:''}`],
    ['Loading role benchmark pack',()=>S.pack?S.pack.name:'No pack yet — vacancy only'],
    ['Company research',()=>S.signals.length?`${S.signals.length} cited insights`:'Live web research runs in the working tool'],
    [useAI?'Running TruthFit guardrails on the AI output':'Mapping requirements to evidence',()=>`${S.reqs.length} requirements · ${S.changes.filter(c=>flags(c.after).length||c.lock).length} changes flagged`]
  ];
  $('#stages').innerHTML=stagesDef.map((s,i)=>`<li class="stage" data-i="${i}"><span class="ico2">${ic('circle')}</span><span>${esc(s[0])}</span><small></small></li>`).join('');
  $('#ovNote').textContent=useAI?'Running securely through the TruthFit Worker. This usually takes 15–90 seconds.':SAMPLE_CHECKED&&S.provider!=='offline'?'Live AI is unavailable, so the offline engine is running.':'Offline engine — no AI is used.';
  const d=reduce?0:1,done=(i)=>{const li=$(`.stage[data-i="${i}"]`);li.classList.remove('active');li.classList.add('done');li.querySelector('.ico2').innerHTML=ic('check-fill');li.querySelector('small').textContent=stagesDef[i][1]();$('#ovBar').style.width=((i+1)/stagesDef.length*100)+'%'};
  const act=i=>$(`.stage[data-i="${i}"]`).classList.add('active');
  for(const i of [0,1]){act(i);if(i===1)$$('#cloudB .frag').forEach((f,j)=>setTimeout(()=>f.classList.add('in'),j*50*d));await sleep(reduce?80:500);done(i)}
  act(2);
  if(useAI){
    const ctl=new AbortController();S.aiCtl=ctl;$('#ovStop').classList.remove('hide');$('#ovStream').classList.remove('hide');$('#ovStream').textContent='Thinking…';
    $('#ovStop').onclick=()=>ctl.abort();
    try{
      const res=await SAMPLE(aiPrompt(),{signal:ctl.signal,onText:({text})=>{$('#ovStream').textContent=text.slice(-260);$('#ovTitle').textContent=`TruthFit AI is writing… ${Math.round(text.length/100)/10}k characters`}});
      const j=parseJSON(res.text);applyAI(j);S.aiUsed=true;S.aiModel=`${res.provider} · ${res.modelApplied}`;S.generic=false;
    }catch(e){
      offline();const c=e&&e.code;
      toast(c==='cancelled'?'Stopped — using the offline engine':c==='not_granted'?'Claude access wasn\'t allowed — using the offline engine':c==='rate_limited'?'Claude usage limit reached — using the offline engine for now':'The AI answer couldn\'t be used — falling back to the offline engine');
      if(c==='service_error'){renderAIStatus()}
    }finally{$('#ovStop').classList.add('hide');$('#ovStream').classList.add('hide')}
  }else{offline();await sleep(reduce?80:600)}
  S.bench=buildBench();S.mode=recommendedMode();
  const A=S.reqs.slice(0,10);
  $('#cloudA').innerHTML='<span class="k">Vacancy asks for</span>'+A.map(r=>{const l=r.label.split(' — ')[0];return `<span class="frag" data-r="${r.id}">${esc(l.length>30?l.slice(0,28)+'…':l)}</span>`}).join('');
  $$('#cloudA .frag').forEach((f,j)=>setTimeout(()=>f.classList.add('in'),j*55*d));
  done(2);
  for(const i of [3,4,5]){act(i);if(i===5){$('#bridge').classList.add('live');$$('#cloudA .frag').forEach((f,j)=>setTimeout(()=>{const r=S.reqs.find(x=>x.id===f.dataset.r);f.classList.add(r.status==='proven'?'ok':r.status==='partial'?'part':'no')},j*70*d))}await sleep(reduce?80:480);done(i)}
  $('#pulse').classList.remove('run');$('#ovTitle').textContent=S.aiUsed?`Analysed by ${S.aiModel}`:'Your evidence vault is ready';
  S.before=score(I.resume,'before');
  await sleep(reduce?80:700);ov.classList.add('hide');go(2);
}

/* =================== Role intelligence =================== */
function classify(role,jd,company){
  const t=norm(role),j=norm(jd.slice(0,900));let best=null,bs=0,second=0;
  FAMILIES.forEach(f=>{let s=0;f[2].forEach(k=>{if(wb(t,k))s+=3;if(wb(j,k))s+=1});if(s>bs){second=bs;bs=s;best=f}else if(s>second)second=s});
  best=best||FAMILIES[0];
  let si=1;SENIORITY.forEach((x,i)=>{if(x[1].test(role))si=i});
  const design=/design|ux|ui/i.test(role),pack=best[0]==='spd'?(design?'design':'software'):{smc:'sales',ops:'ops',hr:'hr'}[best[0]]||null;
  const fn=best[0]==='spd'?(design?'Design':/data|analyst/i.test(role)?'Data':/product/i.test(role)?'Product':'Engineering'):best[1].split(',')[0];
  const ind=/\bhr\b|payroll|keka/i.test(company+' '+jd)?'HR tech (B2B SaaS)':/bank|fintech|payment/i.test(jd)?'Financial services':/health|clinic|pharma/i.test(jd)?'Healthcare':'';
  return {family:best[0],familyName:best[1],seniority:SENIORITY[si][0],seniorIdx:si,fn,industry:ind,geo:{IN:'India',UK:'UK / Europe',US:'United States',GCC:'Middle East (GCC)'}[S.inputs.region],conf:bs>=4&&bs-second>=2?'High':bs>=2?'Medium':'Low',pack};
}
function buildBench(){
  if(!S.pack)return [];
  const items=[...S.pack.items,...(S.cls.seniorIdx>=3?S.pack.lead:[])],vac=norm(S.inputs.jd);
  return items.filter(x=>!x[1].some(k=>k!=='%'&&wb(vac,k))).map((x,i)=>{
    const kw=x[1];let ev=null;
    for(const v of S.vault){if(!['ach','extra','summary','answer'].includes(v.type))continue;const n=norm(v.text);if(kw.some(k=>k==='%'?/%/.test(v.text):wb(n,k))){ev=v;break}}
    if(!ev&&/hiring|grow/i.test(x[0]))ev=S.vault.find(v=>/mentor|manage/i.test(v.text)&&v.type==='ach');
    const direct=ev&&kw.some(k=>k==='%'?/%/.test(ev.text):wb(norm(ev.text),k));
    return {id:'b'+i,label:x[0],kw:kw.filter(k=>k!=='%').map(k=>k.replace('*','')),rec:ev?ev.id:null,status:ev?(direct?'proven':'partial'):'gap',match:ev?(direct?'direct':'transferable'):null,priority:'bench'};
  });
}
function renderRole(){
  const c=S.cls;
  const famOpts=FAMILIES.map(f=>`<option value="${f[0]}" ${f[0]===c.family?'selected':''}>${esc(f[1])}${['spd','smc','ops','hr'].includes(f[0])?'':' (pack coming)'}</option>`).join('');
  const senOpts=SENIORITY.map((s,i)=>`<option value="${i}" ${i===c.seniorIdx?'selected':''}>${s[0]}</option>`).join('');
  $('#clsGrid').innerHTML=`
   <div class="cls"><div class="k">Occupation family</div><select id="cFam" aria-label="Occupation family">${famOpts}</select></div>
   <div class="cls"><div class="k">Seniority</div><select id="cSen" aria-label="Seniority">${senOpts}</select></div>
   <div class="cls"><div class="k">Function</div><input type="text" id="cFn" value="${esc(c.fn)}" aria-label="Function"></div>
   <div class="cls"><div class="k">Industry</div><input type="text" id="cInd" value="${esc(c.industry)}" placeholder="Not detected — add it" aria-label="Industry"></div>
   <div class="cls"><div class="k">Geography</div><input type="text" value="${esc(c.geo)}" disabled aria-label="Geography"></div>
   <div class="cls"><div class="k">Benchmark pack</div><input type="text" value="${esc(S.pack?S.pack.name:'None yet — vacancy-only analysis')}" disabled aria-label="Benchmark pack"></div>`;
  $('#clsConf').textContent=c.conf==='AI'?`Classified by ${S.aiModel||'TruthFit AI'}`:`${c.conf} confidence`;$('#clsConf').className='tag '+(c.conf==='High'||c.conf==='AI'?'t-ok':c.conf==='Medium'?'t-med':'t-high');
  $('#packNote').textContent=S.pack?'Role packs are modelled on public occupation frameworks (O*NET, ESCO). This prototype ships 5 packs; the working tool expands to 12 families.':'No benchmark pack for this family yet. TruthFit will rely on the vacancy only — which is always the primary source anyway.';
  const items=[
    ...S.signals.filter(s=>!s.infer).map(s=>({...s,type:s.type})),
    ...S.bench.map(b=>({type:'bench',text:b.label,src:S.pack?`${S.pack.name} pack`:'',conf:'Medium',extra:b.status==='proven'?'You have evidence':b.status==='partial'?'Partial evidence':'No evidence yet'})),
    ...S.signals.filter(s=>s.infer).map(s=>({...s,type:'infer'})),
    ...S.reqs.map(r=>({type:'vac',text:r.label,src:'Job description',conf:'High',extra:r.priority==='must'?'Must-have':'Nice-to-have'}))
  ];
  const TYPES={vac:['Vacancy','s-vac','doc'],bench:['Role benchmark','s-bench','chart'],company:['Company signal','s-company','building'],trend:['Industry trend','s-trend','sparkles'],infer:['Unverified inference','s-infer','info']};
  const cnt=k=>items.filter(i=>i.type===k).length;
  $('#resFilters').innerHTML=[['all','All',items.length],...['company','bench','trend','infer','vac'].map(k=>[k,TYPES[k][0],cnt(k)])].filter(x=>x[2]||x[0]==='all').map(x=>`<button class="fchip" data-rf="${x[0]}" aria-pressed="${S.rfilter===x[0]}">${x[1]} · ${x[2]}</button>`).join('');
  $('#resMeta').textContent=S.signals.length?`Company research checked ${TODAY}. Every insight shows its source and confidence.`:'No company research in this prototype for custom inputs — the working tool researches live, with citations.';
  const list=items.filter(i=>S.rfilter==='all'||i.type===S.rfilter);
  $('#resList').innerHTML=list.map(i=>`<div class="insight"><span class="tag ${TYPES[i.type][1]}" style="justify-self:start">${ic(TYPES[i.type][2])}${TYPES[i.type][0]}</span><div><p>${esc(i.text)}</p><div class="src">${i.url?`<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.src)}${ic('arrow-ur')}</a><span>· checked ${TODAY}</span>`:`<span>${esc(i.src)}</span>`}<span class="tag ${i.conf==='High'?'t-ok':i.conf==='Medium'?'t-med':'t-high'}">${i.conf} confidence</span>${i.extra?`<span class="tag t-nice">${esc(i.extra)}</span>`:''}</div>${i.use?`<div class="use">${ic('arrow-r')}<span>${esc(i.use)}</span></div>`:''}</div></div>`).join('')||'<p class="card-b hint">Nothing in this category.</p>';
}
$('#resFilters').addEventListener('click',e=>{const b=e.target.closest('[data-rf]');if(b){S.rfilter=b.dataset.rf;renderRole()}});
$('#clsGrid').addEventListener('change',e=>{
  const c=S.cls;
  if(e.target.id==='cFam'){const f=FAMILIES.find(x=>x[0]===e.target.value);c.family=f[0];c.familyName=f[1];c.pack=f[0]==='spd'?(/design|ux|ui/i.test(S.inputs.role)?'design':'software'):{smc:'sales',ops:'ops',hr:'hr'}[f[0]]||null;S.pack=PACKS[c.pack]||null;S.bench=buildBench();toast('Classification updated — benchmarks reloaded')}
  if(e.target.id==='cSen'){c.seniorIdx=+e.target.value;c.seniority=SENIORITY[c.seniorIdx][0];S.bench=buildBench();toast('Seniority updated')}
  if(e.target.id==='cFn')c.fn=e.target.value;if(e.target.id==='cInd')c.industry=e.target.value;
  c.conf='You corrected';renderRole();
});

/* =================== Evidence map + gap interview =================== */
function genericReqs(){
  const I=S.inputs;let jd=I.jd;const items=[];
  const listRe=/(required|requirements|skills|key skills|competencies|preferred|nice to have|bonus|desirable)\s*:\s*([^\n.]+)/gi;let m;
  while((m=listRe.exec(jd))){const nice=/prefer|nice|bonus|desir/i.test(m[1]);m[2].split(/[,;•|]/).map(x=>x.replace(/\.$/,'').trim()).filter(x=>x.length>2&&x.length<60).forEach(x=>items.push({text:x,priority:nice?'nice':'must',list:true}))}
  jd=jd.replace(listRe,' ');
  jd.split(/(?<=[.!?])\s+|\n+/).map(s=>s.replace(/^(qualifications|responsibilities|about[^:]*)\s*:\s*/i,'').trim()).filter(s=>s.length>14&&s.length<240&&toks(s).length>=3&&norm(s)!==norm(I.role)&&!norm(s).startsWith(norm(I.role)+' '+norm(I.company)))
    .forEach(s=>items.push({text:s.replace(/\.$/,''),priority:/prefer|nice to have|bonus|desirable|plus/i.test(s)?'nice':'must',list:false}));
  const seen=new Set(),uniq=items.filter(x=>{const k=norm(x.text);if(seen.has(k))return false;seen.add(k);return true}).slice(0,18);
  const pool=S.vault.filter(v=>['ach','extra','summary','tools','edu','other'].includes(v.type)).map(v=>({v,t:fam(toks(v.text))}));
  return uniq.map((x,i)=>{
    const rf=fam(toks(x.text)),rt=[...rf].filter(t=>t===t.toLowerCase());let best=null,bs=0;
    pool.forEach(p=>{let o=0;rf.forEach(t=>{if(p.t.has(t))o++});if(o>bs){bs=o;best=p.v}});
    const ratio=bs/Math.max(rf.size,1),status=(ratio>=.6||bs>=3)?'proven':bs>=1?'partial':'gap';
    const w=x.text.split(/\s+/),label=x.list||w.length<=7?x.text.replace(/^\w/,c=>c.toUpperCase()):w.slice(0,7).join(' ')+'…';
    const kw=x.list?[norm(x.text)]:rt.filter(t=>t.length>3).slice(0,2);
    const gate=/degree|bachelor|master|certif|licen[cs]e|chartered|cpa|pmp/i.test(x.text)?'Credential gate':/\d+\+?\s*years/i.test(x.text)?'Experience gate':/visa|work permit|authori[sz]ed to work|clearance/i.test(x.text)?'Legal gate':null;
    return {id:'g'+i,label,priority:x.priority,status,match:status==='gap'?null:status==='proven'&&ratio>=.6?'direct':'transferable',gate,kw:kw.length?kw:[norm(x.text).slice(0,12)],ev:status==='gap'?'':best.text,
      question:`The role asks for “${label.replace(/…$/,'')}”. Do you have direct experience? Describe one example — what you did, the scope and the result.`};
  });
}
const statusOf=r=>{const g=S.gaps[r.id];return g&&g.status==='answered'?'proven':g&&g.status==='skipped'?'skipped':r.status};
const recOf=r=>{const g=S.gaps[r.id];return g&&g.status==='answered'?rec(g.rec):rec(r.rec)};
function confidence(r){const st=statusOf(r);if(st==='gap'||st==='skipped')return null;const x=recOf(r);let c=st==='proven'&&r.match!=='transferable'?3:2;if(S.gaps[r.id]&&S.gaps[r.id].status==='answered')c=3;if(x&&!trusted(x))c--;if(st==='partial')c--;return ['Low','Low','Medium','High'][Math.max(0,c)]}
const SYM={proven:ic('check-fill'),partial:ic('half'),gap:ic('warn-fill'),skipped:ic('minus-fill')},SL={proven:'Proven',partial:'Partial',gap:'Gap',skipped:'Confirmed gap'};
const count=(s,list)=>(list||S.reqs).filter(r=>statusOf(r)===s).length;
function attrs(r){
  const st=statusOf(r),x=recOf(r),f=freshness(x),c=confidence(r),out=[];
  out.push(`<span class="tag ${r.priority==='must'?'t-must':r.priority==='bench'?'s-bench':'t-nice'}">${r.priority==='must'?'Required':r.priority==='bench'?'Benchmark':'Preferred'}</span>`);
  if(r.gate)out.push(`<span class="tag t-gate">${ic('shield')}${esc(r.gate)}</span>`);
  if(st!=='gap'&&st!=='skipped'){out.push(`<span class="tag ${(S.gaps[r.id]||r.match==='direct')?'t-ok':'t-med'}">${(S.gaps[r.id]&&S.gaps[r.id].status==='answered')||r.match==='direct'?'Direct':'Transferable'}</span>`);if(c)out.push(`<span class="tag ${c==='High'?'t-ok':c==='Medium'?'t-med':'t-high'}">${c} confidence</span>`);if(f)out.push(`<span class="tag ${f.ok?'t-nice':'t-med'}">${esc(f.t)}</span>`);if(x&&!trusted(x))out.push('<span class="tag t-med">Confirm in vault</span>')}
  return out.join('');
}
function renderMap(){
  const must=S.reqs.filter(r=>r.priority==='must'),mp=must.filter(r=>statusOf(r)==='proven').length;
  $('#mapSum').innerHTML=`<div class="stat g"><b>${count('proven')}</b><span>Proven</span></div><div class="stat a"><b>${count('partial')}</b><span>Partial</span></div><div class="stat r"><b>${count('gap')}</b><span>Gaps</span></div><div class="stat"><b>${mp}/${must.length}</b><span>Required proven</span></div>`;
  const fs=[['all','All',S.reqs.length],['must','Required',must.length],['gate','Gates',S.reqs.filter(r=>r.gate).length],['proven','Proven',count('proven')],['partial','Partial',count('partial')],['gap','Gaps',count('gap')]];
  $('#mapFilters').innerHTML=fs.map(f=>`<button class="fchip" data-f="${f[0]}" aria-pressed="${S.filter===f[0]}">${f[1]} · ${f[2]}</button>`).join('');
  const order={gap:0,partial:1,skipped:2,proven:3};
  const list=S.reqs.filter(r=>S.filter==='all'||(S.filter==='must'?r.priority==='must':S.filter==='gate'?!!r.gate:statusOf(r)===S.filter)).sort((a,b)=>(a.priority===b.priority?0:a.priority==='must'?-1:1)||order[statusOf(a)]-order[statusOf(b)]);
  $('#reqList').innerHTML=list.map(reqRow).join('')||'<p class="card-b hint">Nothing matches this filter.</p>';
  $('#benchList').innerHTML=S.bench.length?S.bench.map(b=>{const x=rec(b.rec);return `<div class="req"><span class="sicon x-${b.status}">${SYM[b.status]}</span><div><h4>${esc(b.label)}</h4>${x?`<p class="quote"><q>${esc(x.text)}</q> <button class="cite" data-v="${x.id}">${x.id}</button></p>`:'<p class="quote">No evidence in your vault.</p>'}<div class="attrs">${attrs(b)}</div></div><div class="right"></div></div>`}).join(''):'<p class="card-b hint" style="margin:0">No benchmark pack for this role yet.</p>';
  renderBar();
}
function reqRow(r){
  const s=statusOf(r),g=S.gaps[r.id],x=recOf(r);
  const ev=x?`<p class="quote"><q>${esc(x.text)}</q> <button class="cite" data-v="${x.id}" title="Open in vault">${x.id}</button>${r.note&&!g?` <span style="color:var(--amber)">· ${esc(r.note)}</span>`:''}</p>`:'<p class="quote">No evidence found in your vault.</p>';
  const canAsk=r.status!=='proven';
  const btn=canAsk?(g?`<button class="btn ghost sm" data-act="undo">${g.status==='answered'?'Change answer':'Actually, I have this'}</button>`:`<button class="btn ${S.open[r.id]?'ghost':'primary'} sm" data-act="toggle" aria-expanded="${!!S.open[r.id]}">${S.open[r.id]?'Close':'Close this gap'}</button>`):'';
  return `<div class="req" data-id="${r.id}"><span class="sicon x-${s}" title="${SL[s]}">${SYM[s]}</span><div><h4>${esc(r.label)}</h4>${ev}<div class="attrs">${attrs(r)}</div></div><div class="right">${btn}</div>${canAsk&&S.open[r.id]&&!g?gapBox(r):''}</div>`;
}
const SUG={
 r10:[{angle:'Builds on your BT Group discovery work',basis:'E6',text:'Led project management for [number] design projects at BT Group, owning scope, timelines and milestones, and cut feature discovery from four weeks to two.'},{angle:'Multi-squad delivery at IBM',basis:'E1',text:'Ran design project management across four IBM squads, planning sprints and tracking design delivery in [tool, e.g. Jira], improving sprint predictability by [x%].'},{angle:'Mirrors the job description',basis:'Vacancy',text:'Oversaw the development and execution of [project name] from discovery to engineering handoff, delivering it [on time / ahead of schedule] for [number] users.'}],
 r11:[{angle:'Uses your proven 95% alignment result',basis:'E7',text:'Facilitated co-creation workshops with Product and Engineering leaders, achieving 95% cross-functional alignment on complex billing flows through clear communication.'},{angle:'Executive storytelling',basis:'Template',text:'Presented UX strategy and design roadmaps to [audience, e.g. VP Product], securing approval for [initiative] by communicating its business impact.'}],
 r14:[{angle:'Introducing AI tools to a team',basis:'T1',text:'Introduced AI-assisted design workflows (Figma AI, Claude, Cursor) to [team], an innovation that reduced [task] time by [x%].'},{angle:'Your founder story',basis:'X2',text:'Drove product innovation as founder of DFD, taking a consumer app from idea to live launch and reaching [number] users.'}],
 r15:[{angle:'Siemens dashboards result',basis:'E8',text:'Applied creative problem solving to [constraint] in Siemens sustainability dashboards, designing [solution] that improved planning efficiency 30%.'},{angle:'Validation result',basis:'E10',text:'Solved [problem] with creative problem solving — [unusual approach] — raising prototype validation success from 60% to 85%.'}],
 r16:[{angle:'Parallel workstreams',basis:'E1',text:'Applied strong time management across four IBM squads, delivering [number] concurrent design workstreams on schedule.'},{angle:'Fixed deadline',basis:'Template',text:'Delivered [project] under a fixed [x-week] deadline by [how you prioritised], meeting the launch date with [outcome].'}]
};
function suggestionsFor(r){
  if(S.aiSug[r.id]&&S.aiSug[r.id].length)return S.aiSug[r.id];
  if(!S.aiUsed&&!S.generic&&SUG[r.id])return SUG[r.id];
  const low=r.label.replace(/…$/,'').split(' — ')[0].toLowerCase(),x=rec(r.rec),out=[];
  if(x)out.push({angle:'Builds on your closest evidence',basis:x.id,text:`${x.text.replace(/[.\s]+$/,'')}, applying ${low} to [how you did it] and achieving [measurable result].`});
  out.push({angle:'Action + scope + result',basis:'Template',text:`Applied ${low} to [project or scope] at [company], [action you took], resulting in [measurable outcome].`});
  return out;
}
const VERBS=/^(led|lead|managed|manage|ran|drove|built|created|designed|delivered|launched|founded|introduced|established|oversaw|owned|directed|facilitated|presented|authored|applied|solved|improved|reduced|scaled|achieved|mentored|planned|shipped|developed|defined|coordinated|increased|cut|streamlined|negotiated|partnered)\b/i;
function strength(r,t){t=t.trim();const n=norm(t),core=norm(r.label.split(' — ')[0].replace(/…$/,''));const a=authCheck(t).length;
  const c=[['Uses the job\'s exact wording',r.kw.some(k=>n.includes(k))||n.includes(core)],['Starts with a strong action verb',VERBS.test(t.replace(/^[•\-*]\s*/,''))],['Shows scope (team, projects, users)',/\d|team|squad|project|user|client|stakeholder|engineer|product/i.test(t)],['Has a measurable result',/\d+\s*%|\d[\d,]*\+?\s*(users|people|teams|projects|weeks|days|months|designers|customers)|from .+ to |\b(cut|reduc|increas|improv|rais|grew|saved)\w*/i.test(t)],['All [blanks] filled in',!/\[[^\]]*\]/.test(t)],['Sounds like you, not a template',a===0&&words(t)>=12&&words(t)<=45]];
  return {c,ok:c.filter(x=>x[1]).length}}
function meterHTML(r,t){if(!t.trim())return '<p class="hint" style="margin:0">Start typing, or use a recommended statement. We check six ATS, impact and authenticity criteria.</p>';
  const s=strength(r,t),lv=s.ok>=6?['Strong','t-ok','var(--green)']:s.ok>=4?['Good — almost there','t-med','var(--amber)']:['Needs work','t-high','var(--red)'];
  return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px"><b>Answer strength</b><span class="tag ${lv[1]}">${lv[0]} · ${s.ok}/6</span></div><div class="bar"><i style="width:${s.ok/6*100}%;background:${lv[2]}"></i></div><ul class="mlist">${s.c.map(x=>`<li class="${x[1]?'y':'n'}">${ic(x[1]?'check-fill':'circle')}${esc(x[0])}</li>`).join('')}</ul>`}
function fmtSug(t,r){let h=esc(t);const ks=[...r.kw,norm(r.label.split(' — ')[0].replace(/…$/,''))].filter(k=>k&&k.length>3).sort((a,b)=>b.length-a.length);
  for(const k of ks){const re=new RegExp('('+k.replace(/[+]/g,'\\+')+')','i');if(re.test(h)){h=h.replace(re,'<b class="kwh" title="Exact keyword from the vacancy">$1</b>');break}}
  return h.replace(/\[([^\]]+)\]/g,'<span class="blank" title="Fill in with your real details">$1</span>')}
function gapBox(r){const d=S.drafts[r.id]||'',sg=suggestionsFor(r);
  return `<div class="gapbox"><p class="q">${esc(r.question)}</p>
   <div class="sugs"><div class="sugs-h"><span class="ai">${ic('sparkles')}AI</span><b>Recommended statements</b><span class="hint" style="margin:0">Green = exact vacancy keyword. Amber = facts only you know.</span></div>
   ${sg.map((s,i)=>`<div class="sug"><div class="sug-t">${fmtSug(s.text,r)}</div><div class="sug-f"><span><b>${esc(s.angle)}</b> · based on ${/^[A-Z]\d/.test(s.basis)?`<span class="cite">${s.basis}</span>`:esc(s.basis)}</span><button class="btn line sm" data-act="use" data-i="${i}">Use this</button></div></div>`).join('')}</div>
   <div class="lbl"><label for="ans-${r.id}">Your answer</label></div><textarea id="ans-${r.id}" style="min-height:76px" placeholder="One or two lines: what you did, the scope, the result.">${esc(d)}</textarea>
   <div class="mbox" id="m-${r.id}">${meterHTML(r,d)}</div>
   <div class="acts"><button class="btn primary sm" data-act="add">Add to my vault</button><button class="btn ghost sm" data-act="skip">I don't have this</button></div></div>`}
$('#mapFilters').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(b){S.filter=b.dataset.f;renderMap()}});
$('#reqList').addEventListener('input',e=>{const t=e.target;if(!t.id||!t.id.startsWith('ans-'))return;const id=t.id.slice(4),r=S.reqs.find(x=>x.id===id);S.drafts[id]=t.value;$('#m-'+id).innerHTML=meterHTML(r,t.value)});
document.addEventListener('click',e=>{const c=e.target.closest('button.cite[data-v]');if(!c)return;const id=c.dataset.v;go(2);setTimeout(()=>{const el=$('#v-'+id)||$(`[data-conf="${id}"]`);if(el){el.scrollIntoView({block:'center',behavior:reduce?'auto':'smooth'});(el.classList.contains('rec')?el:el.closest('.role-h')||el).classList.add('flash')}},reduce?0:350)});
$('#reqList').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const id=b.closest('.req').dataset.id,act=b.dataset.act,r=S.reqs.find(x=>x.id===id);
  if(act==='toggle'){S.open[id]=!S.open[id];renderMap();if(S.open[id])setTimeout(()=>{const t=$('#ans-'+id);t&&t.focus({preventScroll:true})},50);return}
  if(act==='use'){const s=suggestionsFor(r)[+b.dataset.i],ta=$('#ans-'+id);ta.value=s.text;S.drafts[id]=s.text;$('#m-'+id).innerHTML=meterHTML(r,s.text);ta.focus();const m=s.text.match(/\[[^\]]*\]/);if(m)ta.setSelectionRange(m.index,m.index+m[0].length);toast(m?'Replace each [blank] with your real details':'Ready — this one uses only facts from your vault');return}
  if(act==='add'){const v=$('#ans-'+id).value.trim(),m=v.match(/\[[^\]]*\]/);
    if(m){toast('Replace the [blanks] with your real details first');const ta=$('#ans-'+id);ta.focus();ta.setSelectionRange(m.index,m.index+m[0].length);return}
    if(words(v)<5){toast('Add a little more detail (at least 5 words)');return}
    const rid='A'+(S.vault.filter(x=>x.type==='answer').length+1);S.vault.push({id:rid,type:'answer',text:v,src:'Your answer',confirmed:true,metrics:nums(v)});
    S.gaps[id]={status:'answered',answer:v,rec:rid};delete S.decisions['ga-'+id];delete S.edits['ga-'+id];S.open[id]=false;renderMap();
    toast(`Added to your vault as ${rid}`,()=>{undoGap(id);renderMap()});return}
  if(act==='skip'){S.gaps[id]={status:'skipped'};S.open[id]=false;renderMap();toast('Marked as a confirmed gap — it won\'t appear on your résumé',()=>{delete S.gaps[id];renderMap()});return}
  if(act==='undo'){const g=S.gaps[id];if(g&&g.answer)S.drafts[id]=g.answer;undoGap(id);S.open[id]=true;renderMap()}
});
function undoGap(id){const g=S.gaps[id];if(g&&g.rec)S.vault=S.vault.filter(v=>v.id!==g.rec);delete S.gaps[id];delete S.decisions['ga-'+id]}

/* =================== Strategy =================== */
const MODES=[
 {id:'conservative',ico:'shield',col:'#8e8e93',name:'Conservative',desc:'Only direct evidence. No inferred context, no reframing.',eff:'Hides suggestions that add context not in your vault.'},
 {id:'balanced',ico:'scale',col:'#007aff',name:'Balanced',desc:'Direct evidence plus clearly labelled transferable evidence.',eff:'Shows everything, with transferable claims flagged.'},
 {id:'career',ico:'branch',col:'#34c759',name:'Career change',desc:'Emphasises transferable outcomes for a new field.',eff:'Leads with outcomes and translates domain jargon.'},
 {id:'executive',ico:'columns',col:'#5856d6',name:'Executive',desc:'Leadership scope, transformation, governance and business impact.',eff:'Summary leads with scope, governance and business results.'},
 {id:'technical',ico:'cpu',col:'#30b0c7',name:'Technical',desc:'Tools, systems, complexity and measurable performance.',eff:'Summary leads with systems and tool depth.'},
 {id:'creative',ico:'brush',col:'#ff2d55',name:'Creative',desc:'Portfolio narrative plus an ATS-safe application résumé.',eff:'Adds a portfolio link prompt; keep Portal Safe for uploads.'},
 {id:'academic',ico:'grad',col:'#ff9500',name:'Academic',desc:'Research, publications, teaching and grants.',eff:'Adds prompts for publications and grants sections.'}
];
const modeObj=()=>MODES.find(m=>m.id===S.mode);
function recommendedMode(){return S.pack&&S.cls.seniorIdx>=4?'executive':S.pack&&S.pack.mode==='technical'?'technical':'balanced'}
function renderModes(){
  const rec=recommendedMode();
  $('#modes').innerHTML=MODES.map(m=>`<button class="mode" data-mode="${m.id}" role="radio" aria-checked="${S.mode===m.id}" aria-pressed="${S.mode===m.id}"><span class="top2"><span class="ico" style="background:${m.col}">${ic(m.ico)}</span><span class="radio">${S.mode===m.id?ic('check'):''}</span></span><b>${m.name} ${m.id===rec?'<span class="tag t-ok">Recommended</span>':''}</b><span>${m.desc}</span><span class="eff">${m.eff}</span></button>`).join('');
  const v=visibleChanges(),h=allChanges().length-v.length;
  $('#modeEffect').innerHTML=`${ic('info')}<div><b>${modeObj().name}:</b> ${v.length} changes will be proposed${h?`, ${h} hidden by this strategy`:''}. ${rec===S.mode?'Recommended because this is a '+esc(S.cls.seniority.toLowerCase())+' role.':''}</div>`;
  renderBar();
}
$('#modes').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;const prev=S.mode;S.mode=b.dataset.mode;S.manualFinal=null;renderModes();if(prev!==S.mode)toast(`${modeObj().name} strategy selected`,()=>{S.mode=prev;renderModes()})});

/* =================== Changes =================== */
const SUM={
 default:'Design Manager with 13+ years in product and enterprise UX, leading design teams, design strategy and design systems for 500,000+ users. Raises design quality through governance (35% higher first-pass approvals) and close collaboration with Product and Engineering.',
 executive:'Design leader with 13+ years shaping product and enterprise UX for 500,000+ users. Leads design teams, design strategy and design-system governance that lifted first-pass approvals 35%, partnering with Product and Engineering leadership across India and the UK.',
 technical:'Design Manager with 13+ years in enterprise UX and design systems — scaled Carbon Design System adoption (UI drift down 20%, developer rework down 10%) and works hands-on in Figma, Framer, Cursor and AI-assisted workflows.'
};
const EX_CHANGES=[
 {id:'c1',title:'Rewrite the professional summary',type:'replace',targets:['r1','r12','r4','r5'],before:'Product Design Manager with 13+ years across enterprise UX, design systems and design leadership.',after:'@summary',cites:['S1','E5','E4'],origin:['vac','company'],basis:'direct',risk:'low',why:'Mirrors the job title and leads with the strongest required capabilities. Keka lists collaboration as a value, so Product & Engineering partnership comes first.'},
 {id:'c2',title:'Lead the skills section with the role\'s language',type:'replace',targets:['r7','r12','r8','r4','r5','r9'],before:'Figma, FigJam, Miro, Framer, Adobe Creative Suite, Figma AI, Claude, Cursor',after:'Team Leadership · Design Strategy · User Experience Design · Design Systems · Quality Assurance (design governance) · Cross-functional Collaboration\nTools: Figma, FigJam, Miro, Framer, Adobe Creative Suite, Figma AI, Claude, Cursor',cites:['T1','E1','E2','E4','E7'],origin:['vac'],basis:'direct',risk:'low',why:'Applicant-tracking systems scan for exact phrases. Every term here is backed by a cited record.'},
 {id:'c3',title:'Use “lead and manage” in your IBM team bullet',type:'replace',targets:['r1','r7'],before:'• Manage and mentor four designers across four squads.',after:'• Lead and manage a design team of four designers across four product squads, providing mentorship and design direction.',cites:['E1'],origin:['vac'],basis:'direct',risk:'low',why:'Matches the first responsibility in the vacancy without changing the facts.'},
 {id:'c4',title:'Name the quality assurance you already do',type:'replace',targets:['r4'],before:'• Improved first-pass design approvals 35% through Product, Engineering and Design governance.',after:'• Established design quality assurance through Product, Engineering and Design governance, improving first-pass design approvals 35%.',cites:['E4'],origin:['vac','company'],basis:'direct',risk:'low',why:'“Quality Assurance” is required. Keka\'s design roles stress governance models — your governance work is exactly that.'},
 {id:'c5',title:'Frame BT Group discovery as project ownership',type:'replace',targets:['r10'],before:'• Reduced feature discovery from four weeks to two.',after:'• Managed discovery for design projects end to end, cutting feature discovery time by 40% across teams.',cites:['E6'],origin:['vac'],basis:'direct',risk:'low',why:'Strengthens the Project Management signal. The AI calculated a percentage — check it against your record.'},
 {id:'c6',title:'Add method to your Siemens mentoring bullet',type:'replace',targets:['r1','r11'],before:'• Mentored designers and researchers.',after:'• Mentored designers and researchers on evidence-based design, fostering a culture of excellence across an engineering-led organisation.',cites:['E11'],origin:['bench'],basis:'inference',risk:'med',claim:'“Evidence-based design” is not in your vault. Accept only if true.',why:'Design-leadership benchmarks expect growing people, not just mentoring. The added context must be defensible.'},
 {id:'c7',title:'Add creative direction as Visual Communication proof',type:'add',heading:'ADDITIONAL LEADERSHIP',targets:['r13'],before:'',after:'• Led creative direction and visual communication for brand and product ad videos and 360° factory tours, directing a team of about 30 visual designers, motion designers, 3D artists and editors.',cites:['X1'],origin:['vac'],basis:'direct',risk:'low',why:'Visual Communication is required and was missing from your résumé. Your extra evidence proves it.'},
 {id:'c8',title:'Add DFD as an innovation signal',type:'add',heading:'ADDITIONAL LEADERSHIP',targets:['r14'],before:'',after:'• Founded and launched DFD (Digital First Devotional), a live consumer app, using AI-assisted design and development workflows (Figma AI, Claude, Cursor).',cites:['X2','T1'],origin:['vac','company'],basis:'inference',risk:'med',claim:'Linking your AI tools to DFD is an inference. Confirm you used them on this project.',why:'Innovation is required and Keka promotes AI across its product. A shipped product built with AI tools is concrete proof.'},
 {id:'c9',title:'Retitle your IBM role to match the vacancy',type:'replace',targets:['r1'],before:'Product Design Manager — IBM | Jul 2025 – Present',after:'Design Manager — IBM | Jul 2025 – Present',cites:['R1'],origin:['vac'],basis:'mirror',risk:'low',lock:'R1',why:'Exact title matches can help keyword scans — but your official title must stay accurate.'}
];
function genericChanges(){
  const I=S.inputs,lines=I.resume.split('\n'),proven=S.reqs.filter(r=>r.status==='proven'),out=[];
  const top=[];proven.map(r=>r.label.replace(/…$/,'').toLowerCase()).forEach(l=>{if(top.length<4&&!top.some(t=>t.includes(l)||l.includes(t)))top.push(l)});
  const sRec=S.vault.find(v=>v.type==='summary'),newSum=`${I.role} with verified experience in ${top.length?top.join(', '):'the core requirements of this role'}.`;
  if(sRec)out.push({id:'x1',title:'Align the summary to the role',type:'replace',targets:proven.slice(0,4).map(r=>r.id),before:sRec.text,after:newSum+' '+sRec.text,cites:[sRec.id,...proven.slice(0,3).map(r=>r.rec).filter(Boolean)],origin:['vac'],basis:'direct',risk:'low',why:'Leads with the job title and requirements your vault already proves.'});
  else out.push({id:'x1',title:'Add a role-aligned summary',type:'top',heading:'PROFESSIONAL SUMMARY',targets:proven.slice(0,4).map(r=>r.id),before:'',after:newSum,cites:proven.slice(0,3).map(r=>r.rec).filter(Boolean),origin:['vac'],basis:'direct',risk:'low',why:'Recruiters and ATS read the top third first.'});
  const short=proven.filter(r=>r.label.split(' ').length<=4).map(r=>r.label),tRec=S.vault.find(v=>v.type==='tools');
  if(short.length){if(tRec)out.push({id:'x2',title:'Lead the skills section with the role\'s language',type:'replace',targets:proven.filter(r=>short.includes(r.label)).map(r=>r.id),before:tRec.text,after:short.join(' · ')+'\n'+tRec.text,cites:[tRec.id,...proven.filter(r=>short.includes(r.label)).map(r=>r.rec).filter(Boolean)].slice(0,5),origin:['vac'],basis:'direct',risk:'low',why:'ATS systems scan for exact phrases from the vacancy.'});
    else out.push({id:'x2',title:'Add a skills section in the role\'s language',type:'add',heading:'SKILLS',targets:proven.filter(r=>short.includes(r.label)).map(r=>r.id),before:'',after:short.join(' · '),cites:proven.filter(r=>short.includes(r.label)).map(r=>r.rec).filter(Boolean).slice(0,5),origin:['vac'],basis:'direct',risk:'low',why:'ATS systems scan for exact phrases from the vacancy.'})}
  const firstRole=S.vault.find(v=>v.type==='role');
  if(firstRole&&!/^design manager$|^senior|^lead/i.test(firstRole.title)&&norm(firstRole.title)!==norm(I.role))out.push({id:'x3',title:'Retitle your latest role to match the vacancy',type:'replace',targets:[],before:firstRole.text,after:firstRole.text.replace(firstRole.title,I.role),cites:[firstRole.id],origin:['vac'],basis:'mirror',risk:'low',lock:firstRole.id,why:'Exact title matches can help scans — but titles are protected facts.'});
  return out;
}
function polish(a){a=a.replace(/^[•\-*]\s*/,'').trim();a=a.charAt(0).toUpperCase()+a.slice(1);return '• '+(/[.!?]$/.test(a)?a:a+'.')}
function allChanges(){
  const gc=S.reqs.filter(r=>S.gaps[r.id]&&S.gaps[r.id].status==='answered').map(r=>({id:'ga-'+r.id,title:`Add your ${r.label.replace(/…$/,'').split(' — ')[0]} example`,type:'add',heading:'ADDITIONAL EXPERIENCE',targets:[r.id],before:'',after:polish(S.gaps[r.id].answer),cites:[S.gaps[r.id].rec],origin:['evid'],basis:'direct',risk:'low',why:'Turns your gap-interview answer into a résumé bullet so the requirement is visibly proven.'}));
  return S.changes.concat(gc);
}
function visibleChanges(){return allChanges().filter(c=>S.mode!=='conservative'||(c.basis==='direct'&&!c.claim))}
function afterOf(c){if(S.edits[c.id]!=null)return S.edits[c.id];if(c.variants&&(S.mode==='executive'||S.mode==='technical')&&c.variants[S.mode])return String(c.variants[S.mode]);if(c.after==='@summary')return SUM[S.mode==='executive'?'executive':S.mode==='technical'?'technical':'default'];return c.after}
function srcText(){return [S.inputs.resume,S.inputs.extra,...S.vault.filter(v=>v.type==='answer').map(v=>v.text)].join('\n')}
function flags(t){const src=new Set(nums(srcText()));return [...new Set(nums(t))].filter(n=>!src.has(n))}
function lockViolation(c,a){if(!c.lock)return null;const r=rec(c.lock);if(!r||!r.locked)return null;if(c.before.includes(r.title)&&!a.includes(r.title))return r;return null}
const GENERIC=['results-driven','results driven','dynamic','passionate','proven track record','team player','go-getter','detail-oriented','hard-working','synergy','think outside the box','self-starter','culture of excellence','best-in-class','value-add','fast-paced','wear many hats'];
const SUPER=['world-class','unparalleled','exceptional','outstanding','extraordinary','unmatched','visionary','best'];
const AIPAT=['fostering','leveraging','leverage','spearheaded','delve','showcasing','a testament to','seamlessly','robust','cutting-edge',"in today's",'pivotal','meticulous','tapestry','elevate'];
function trigrams(t){const w=norm(t).split(' ').filter(Boolean),o=[];for(let i=0;i+2<w.length;i++)o.push(w.slice(i,i+3).join(' '));return o}
function mirrorRatio(t){const jd=new Set(trigrams(S.inputs.jd)),tt=trigrams(t);if(tt.length<5)return 0;return tt.filter(x=>jd.has(x)).length/tt.length}
function authCheck(t){const n=' '+norm(t)+' ',out=[];
  GENERIC.forEach(p=>{if(n.includes(' '+norm(p)+' '))out.push({k:'Generic phrase',p})});
  SUPER.forEach(p=>{if(n.includes(' '+p+' '))out.push({k:'Unsupported superlative',p})});
  AIPAT.forEach(p=>{if(n.includes(' '+norm(p)+' '))out.push({k:'AI-sounding pattern',p})});
  const mr=mirrorRatio(t);if(mr>.45)out.push({k:'Copies the vacancy',p:Math.round(mr*100)+'% of phrases match the job ad word for word'});
  if(words(t)>45)out.push({k:'Too long for one bullet',p:words(t)+' words'});
  return out}
function hl(t,f,au){let h=esc(t);f.forEach(n=>{h=h.replace(/(\d[\d,]*(?:\.\d+)?)/g,m=>m.replace(/,/g,'')===n?`<mark class="flag">${m}</mark>`:m)});
  au.filter(a=>a.k!=='Copies the vacancy'&&a.k!=='Too long for one bullet').forEach(a=>{const re=new RegExp('\\b('+a.p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')\\b','i');h=h.replace(re,'<mark class="auth">$1</mark>')});return h.replace(/\n/g,'<br>')}
const OL={vac:['Vacancy','s-vac','doc'],bench:['Role benchmark','s-bench','chart'],company:['Company signal','s-company','building'],trend:['Industry trend','s-trend','sparkles'],evid:['Your evidence','s-evid','tray'],infer:['Inference','s-infer','info']};
function renderChanges(){
  $('#genericNote').classList.toggle('hide',!S.generic||S.aiUsed);
  $('#aiNote').classList.toggle('hide',!S.aiUsed);if(S.aiUsed)$('#aiNote').innerHTML=`${ic('sparkles')}<div><b>Proposed by ${esc(S.aiModel)}.</b> Every suggestion is then re-checked by TruthFit: numbers against your vault, locked facts, and authenticity. The AI can't bypass these checks.</div>`;
  const all=visibleChanges(),acc=all.filter(c=>S.decisions[c.id]==='accepted').length,rej=all.filter(c=>S.decisions[c.id]==='rejected').length,hid=allChanges().length-all.length;
  $('#chgCounts').innerHTML=`<span class="tag t-ok">${ic('check')}${acc} accepted</span><span class="tag t-rej">${rej} rejected</span><span class="tag t-med">${all.length-acc-rej} pending</span><span class="tag t-nice">${modeObj().name}</span>`;
  $('#hiddenNote').textContent=hid?`${hid} suggestion${hid>1?'s are':' is'} hidden by the ${modeObj().name} strategy. Change strategy in step 5 to see ${hid>1?'them':'it'}.`:'';
  const lbl=id=>{const r=S.reqs.find(x=>x.id===id);return r?r.label.replace(/…$/,'').split(' — ')[0]:''};
  $('#chgList').innerHTML=all.map(c=>{const a=afterOf(c),f=flags(a),au=authCheck(a),lk=lockViolation(c,a),d=S.decisions[c.id]||'',ed=S.editing[c.id];
    const risk=lk||f.length?'high':c.risk,riskL=lk?'Fact locked':f.length?'Blocked':risk==='med'?'Check claim':'Low risk';
    const blocked=!!(lk||f.length);
    return `<article class="chg ${d} ${d==='accepted'?'mini':''}" data-id="${c.id}">
     <div class="chg-h"><h3>${esc(c.title)}</h3><span class="tag ${risk==='high'?'t-high':risk==='med'?'t-med':'t-low'}">${riskL}</span>${au.length?`<span class="tag t-med">${au.length} authenticity flag${au.length>1?'s':''}</span>`:''}${d==='accepted'?`<span class="tag t-ok">${ic('check')} Accepted</span>`:d==='rejected'?'<span class="tag t-rej">Rejected</span>':''}</div>
     <div class="chg-b">
      ${ed?`<div class="edit-box"><label class="lbl" for="ed-${c.id}">Edit the proposed text</label><textarea id="ed-${c.id}" style="min-height:84px">${esc(a)}</textarea><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary sm" data-a="save">Save edit</button><button class="btn ghost sm" data-a="cancel">Cancel</button>${S.edits[c.id]!=null?'<button class="btn ghost sm" data-a="revert">Revert to AI version</button>':''}</div></div>`:
      `<div class="diff"><div class="bf ${c.before?'':'empty'}"><span class="k">Before</span>${c.before?esc(c.before).replace(/\n/g,'<br>'):'New line — nothing replaced'}</div><div class="af"><span class="k">After${S.edits[c.id]!=null?' · edited by you':''}</span>${hl(a,f,au)}</div></div>`}
      ${lk?`<div class="notice red">${ic('lock')}<div><b>Protected fact:</b> your official title at ${esc(lk.employer)} is “${esc(lk.title)}”. Employers, titles, dates and qualifications are locked, so this can't be accepted. Put the target title in your summary instead.</div></div>`:''}
      ${f.length?`<div class="notice red">${ic('xmark-fill')}<div><b>Fabrication alarm:</b> ${f.map(n=>`<b>${esc(n)}</b>`).join(', ')} ${f.length>1?'don\'t':'doesn\'t'} appear in any vault record. Edit to use your real numbers before accepting.</div></div>`:''}
      ${!f.length&&!lk&&c.claim?`<div class="notice amber">${ic('warn-fill')}<div><b>Check this claim:</b> ${esc(c.claim)}</div></div>`:''}
      ${au.length?`<div class="notice amber">${ic('sparkles')}<div><b>Authenticity:</b> ${au.map(x=>`${esc(x.k)} — “${esc(x.p)}”`).join('; ')}. Recruiters skim past language like this; say what you specifically did.</div></div>`:''}
      <div class="whybox"><b>Why</b><span>${esc(c.why)}</span><b>Source</b><span class="row">${c.origin.map(o=>`<span class="tag ${OL[o][1]}">${ic(OL[o][2])}${OL[o][0]}</span>`).join('')}</span><b>Proof</b><span class="row">${c.cites.filter(Boolean).map(id=>{const r=rec(id);return `<button class="cite" data-v="${id}" title="${esc(r?r.text:'')}">${id}${r?' · '+esc(vaultLabel(r)):''}</button>`}).join(' ')}</span><b>Targets</b><span>${c.targets.map(lbl).filter(Boolean).map(esc).join(' · ')||'—'}</span></div>
     </div>
     <div class="chg-f"><span class="why">${c.basis==='inference'?ic('info')+'Adds context not in your vault.':c.basis==='mirror'?ic('lock')+'Copies vacancy wording into a protected fact.':ic('tray')+'Uses only facts from your vault.'}</span>
      ${ed?'':d==='accepted'?`<span class="hint" style="margin:0 auto 0 0">${esc(a.split('\n')[0].slice(0,90))}${a.length>90?'…':''}</span><button class="btn plain sm" data-a="undo">${ic('undo')} Undo</button>`:`<button class="btn ghost sm" data-a="edit">${ic('pencil')} Edit</button><button class="btn ghost sm" data-a="reject" ${d==='rejected'?'disabled':''}>Reject</button><button class="btn ${blocked?'line':'primary'} sm" data-a="accept" ${blocked?'disabled':''}>${lk?ic('lock')+' Locked':f.length?'Fix Numbers to Accept':'Accept'}</button>`}
     </div></article>`}).join('');
  renderBar();
}
$('#chgList').addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;const card=b.closest('.chg'),id=card.dataset.id,a=b.dataset.a,c=allChanges().find(x=>x.id===id),prev=S.decisions[id];
  if(a==='accept'){S.decisions[id]='accepted';toast('Change accepted',()=>{if(prev)S.decisions[id]=prev;else delete S.decisions[id];renderChanges()})}
  if(a==='reject'){S.decisions[id]='rejected';toast('Change rejected',()=>{if(prev)S.decisions[id]=prev;else delete S.decisions[id];renderChanges()})}
  if(a==='undo'){delete S.decisions[id]}
  if(a==='edit')S.editing[id]=true;
  if(a==='cancel')delete S.editing[id];
  if(a==='revert'){delete S.edits[id];delete S.editing[id]}
  if(a==='save'){const v=$('#ed-'+id).value.trim();if(!v)return toast('Text can\'t be empty');if(v!==afterOf({...c,id:'__'}))S.edits[id]=v;else delete S.edits[id];delete S.editing[id];if(S.decisions[id]==='accepted'&&flags(v).length)delete S.decisions[id];toast(flags(v).length?'Still contains numbers not in your vault':authCheck(v).length?'Saved — authenticity flags remain':'Edit saved')}
  S.manualFinal=null;renderChanges();
  if(['save','cancel','edit','undo'].includes(a)){const el=$(`.chg[data-id="${id}"]`);el&&el.scrollIntoView({block:'nearest'})}
});
$('#acceptLow').onclick=()=>{const done=[];visibleChanges().forEach(c=>{const a=afterOf(c);if(!S.decisions[c.id]&&c.risk==='low'&&!flags(a).length&&!lockViolation(c,a)&&!authCheck(a).length){S.decisions[c.id]='accepted';done.push(c.id)}});S.manualFinal=null;renderChanges();toast(done.length?`${done.length} low-risk change${done.length>1?'s':''} accepted`:'No pending low-risk changes',done.length?()=>{done.forEach(i=>delete S.decisions[i]);renderChanges()}:null)};

/* =================== Final: build, templates =================== */
function insertInSection(ls,heading,line){let hi=ls.findIndex(l=>l.trim().toUpperCase()===heading);
  if(hi===-1){let ei=ls.findIndex(l=>/^EDUCATION/i.test(l.trim())&&isHeading(l));if(ei===-1)ei=ls.length;ls.splice(ei,0,heading,line,'');return ls}
  let j=hi+1;while(j<ls.length&&ls[j].trim()&&!isHeading(ls[j]))j++;ls.splice(j,0,line);return ls}
function buildFinal(){let text=S.inputs.resume;const added=[];
  visibleChanges().filter(c=>S.decisions[c.id]==='accepted').forEach(c=>{const a=afterOf(c);
    if(c.type==='replace'&&text.includes(c.before))text=text.replace(c.before,a);
    else if(c.type==='top'){const ls=text.split('\n');let at=ls.findIndex((l,i)=>i>0&&isHeading(l));if(at<0)at=Math.min(3,ls.length);ls.splice(at,0,c.heading,a,'');text=ls.join('\n')}
    else if(c.type!=='replace')text=insertInSection(text.split('\n'),c.heading||'ADDITIONAL EXPERIENCE',a).join('\n');
    a.split('\n').forEach(l=>l.trim()&&added.push(l.trim()))});
  S.added=new Set(added);return text}
const FONTS={arial:'Arial, Helvetica, sans-serif',sans:'"Helvetica Neue", Helvetica, Arial, sans-serif',calibri:'Calibri, Carlito, "Segoe UI", Arial, sans-serif',georgia:'Georgia, "Times New Roman", serif',garamond:'Garamond, "EB Garamond", Georgia, serif'};
const ACCENTS=['#111111','#1f3a5f','#0f6b4f','#7a2e3a','#0e6e7a','#5b3c8c'];
const CLASSES={portal:['Portal Safe','Single column, plain structure — for job portals and ATS uploads'],modern:['Recruiter Modern','More expressive, still parse-tested — for recruiter emails'],human:['Human / Portfolio','Visually richer — for networking, print and portfolios, not portals']};
const PRESETS={
 classic:{cls:'portal',name:'Classic',note:'Safest for portals',font:'arial',accent:'#111111',heading:'rule',density:'normal',name_:'left',nameAccent:false,layout:'one'},
 compact:{cls:'portal',name:'Compact',note:'Fits more on 1 page',font:'calibri',accent:'#1f3a5f',heading:'rule',density:'compact',name_:'left',nameAccent:false,layout:'one'},
 modern:{cls:'modern',name:'Modern',note:'Clean, colour accent',font:'sans',accent:'#0f6b4f',heading:'accent',density:'normal',name_:'left',nameAccent:true,layout:'one'},
 executive:{cls:'modern',name:'Executive',note:'Serif, centred',font:'georgia',accent:'#1f3a5f',heading:'center',density:'airy',name_:'center',nameAccent:true,layout:'one'},
 creative:{cls:'human',name:'Creative',note:'Two column',font:'sans',accent:'#7a2e3a',heading:'bar',density:'normal',name_:'left',nameAccent:true,layout:'two'}
};
S.tplKey='classic';S.tplClass='portal';S.tpl={...PRESETS.classic,order:[],hidden:{}};
const myTpls=()=>store.get('truthfit-templates',{});
function applyTpl(cfg,key){const keep={order:S.tpl.order,hidden:S.tpl.hidden};S.tpl={...cfg,order:cfg.order?[...cfg.order]:keep.order,hidden:cfg.hidden?{...cfg.hidden}:keep.hidden};S.tplKey=key;if(cfg.cls)S.tplClass=cfg.cls;renderTplUI();renderPaperOnly(true)}
function parseSections(text){const header=[],secs=[];let cur=null;text.split('\n').forEach(l=>{if(isHeading(l)&&header.some(x=>x.trim())){cur={title:l.trim(),lines:[]};secs.push(cur)}else(cur?cur.lines:header).push(l)});return {header,secs}}
function ordered(text){const {header,secs}=parseSections(text),titles=secs.map(s=>s.title),ord=S.tpl.order.filter(t=>titles.includes(t));
  titles.forEach((t,i)=>{if(!ord.includes(t)){const prev=titles.slice(0,i).reverse().find(x=>ord.includes(x));ord.splice(prev?ord.indexOf(prev)+1:0,0,t)}});
  S.tpl.order=ord;const all=ord.map(t=>secs.find(s=>s.title===t));return {header,all,secs:all.filter(s=>!S.tpl.hidden[s.title])}}
function orderedText(text){const o=ordered(text);return [o.header.join('\n').trim(),...o.secs.map(s=>s.title+'\n'+s.lines.join('\n').trim())].join('\n\n')}
function linesHTML(ls,clean){let html='',inList=false;const close=()=>{if(inList){html+='</ul>';inList=false}};
  for(const raw of ls){const l=raw.trim(),nw=!clean&&S.added&&S.added.has(l)?' new':'';if(!l){close();continue}
    if(/^[•\-*]\s/.test(l)){if(!inList){html+='<ul>';inList=true}html+=`<li class="${nw.trim()}">${esc(l.replace(/^[•\-*]\s*/,''))}</li>`;continue}
    close();html+=(/ [—–-] .+\|/.test(l))?`<p class="job${nw}">${esc(l)}</p>`:`<p class="${nw.trim()}">${esc(l)}</p>`}
  close();return html}
function renderPaper(text,clean){const o=ordered(text);let hd='<div class="hdr">',first=true;
  o.header.map(l=>l.trim()).filter(Boolean).forEach(l=>{if(first){hd+=`<p class="nm">${esc(l)}</p>`;first=false;return}hd+=`<p class="${EMAIL.test(l)||PHONE.test(l)?'ct':'sub'}">${esc(l)}</p>`});hd+='</div>';
  const sec=s=>`<h5>${esc(s.title)}</h5>${linesHTML(s.lines,clean)}`;
  if(S.tpl.layout==='two'){const side=o.secs.filter(s=>/skill|education|tool|language|certif|award|interest/i.test(s.title)),main=o.secs.filter(s=>!side.includes(s));return hd+`<div class="cols"><aside>${side.map(sec).join('')}</aside><div class="main">${main.map(sec).join('')}</div></div>`}
  return hd+o.secs.map(sec).join('')}
const paperClass=()=>`paper h-${S.tpl.heading} d-${S.tpl.density} n-${S.tpl.name_}${S.tpl.nameAccent?' na':''}${S.tpl.layout==='two'?' two':''}`;
const paperStyle=()=>`--accent:${S.tpl.accent};--pfont:${FONTS[S.tpl.font]}`;
function paginate(){const p=$('#paper');p.querySelectorAll('.pagemark').forEach(x=>x.remove());if(!p.clientWidth||p.offsetParent===null)return 1;const ph=p.clientWidth*1.4142;const n=Math.max(1,Math.ceil((p.scrollHeight-4)/ph));
  for(let i=1;i<n;i++){const m=document.createElement('div');m.className='pagemark';m.style.top=(i*ph)+'px';m.innerHTML=`<span>PAGE ${i+1}</span>`;p.appendChild(m)}S.pages=Math.max(1,Math.round(p.scrollHeight/ph*10)/10);return n}
function renderPaperOnly(rerun){const el=$('#paper');if(!S.finalText)return;el.className=paperClass();el.setAttribute('style',paperStyle());el.innerHTML=renderPaper(S.finalText);paginate();renderSecs();if(rerun)runParse(true);renderScores()}
function thumb(c){const a=c.accent,line='<i></i>',h5=`<i class="th5" style="background:${a}"></i>`,col=`${h5}${line}${line}${h5}${line}`;
  return c.layout==='two'?`<div class="th two"><i class="tn" style="grid-column:1/-1;background:${c.nameAccent?a:'#222'}"></i><div style="display:grid;gap:3px">${h5}${line}${h5}</div><div style="display:grid;gap:3px">${col}</div></div>`:`<div class="th" style="${c.name_==='center'?'justify-items:center':''}"><i class="tn" style="background:${c.nameAccent?a:'#222'}"></i><i style="width:45%"></i>${col}${line}</div>`}
function renderTplUI(){
  $('#tplClasses').innerHTML=`<div class="seg" role="group" aria-label="Output class">${Object.entries(CLASSES).map(([k,v])=>`<button data-cls="${k}" aria-pressed="${S.tplClass===k}">${v[0]}</button>`).join('')}</div><p class="hint">${esc(CLASSES[S.tplClass][1])}</p>`;
  const my=myTpls();
  $('#tplGallery').innerHTML=Object.entries(PRESETS).filter(([k,c])=>c.cls===S.tplClass).map(([k,c])=>`<button class="tpl" data-tpl="${k}" aria-pressed="${S.tplKey===k}">${thumb(c)}<b>${esc(c.name)}</b><span${c.layout==='two'?' style="color:var(--amber)"':''}>${esc(c.note)}</span></button>`).join('')+
   Object.entries(my).map(([k,c])=>`<div class="tpl" role="button" tabindex="0" data-my="${esc(k)}" aria-pressed="${S.tplKey==='my:'+k}">${thumb(c)}<b>${esc(k)}</b><span>My template</span><button class="del" data-del="${esc(k)}" aria-label="Delete ${esc(k)}">${ic('xmark')}</button></div>`).join('')+
   (S.tplKey==='custom'?`<div class="tpl" aria-pressed="true">${thumb(S.tpl)}<b>Custom</b><span>Unsaved</span></div>`:'');
  $('#tFont').value=S.tpl.font;$('#tNameAccent').checked=!!S.tpl.nameAccent;
  $('#tAccent').innerHTML=ACCENTS.map(c=>`<button style="background:${c}" data-c="${c}" aria-label="Accent ${c}" aria-pressed="${S.tpl.accent===c}"></button>`).join('')+`<input type="color" id="tColor" value="${S.tpl.accent}" aria-label="Custom colour">`;
  $$('#tplCustom .seg[data-t]').forEach(g=>{const f=g.dataset.t==='name'?'name_':g.dataset.t;g.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',S.tpl[f]===b.dataset.v))});
  $('#layoutHint').textContent=S.tpl.layout==='two'?'Parse test will check reading order — some portals read columns out of sequence.':'';
  renderSecs()}
function renderSecs(){if(!S.finalText)return;const o=ordered(S.finalText);
  $('#tSecs').innerHTML=o.all.map((s,i)=>`<li class="${S.tpl.hidden[s.title]?'off':''}" data-t="${esc(s.title)}"><span>${esc(s.title.charAt(0)+s.title.slice(1).toLowerCase())}</span><button data-mv="-1" ${i===0?'disabled':''} aria-label="Move up">${ic('chev-u')}</button><button data-mv="1" ${i===o.all.length-1?'disabled':''} aria-label="Move down">${ic('chev-d')}</button><label><span class="sr">Show ${esc(s.title)}</span><input type="checkbox" class="tg" data-show ${S.tpl.hidden[s.title]?'':'checked'}></label></li>`).join('')}
function customised(){S.tplKey='custom';renderTplUI();renderPaperOnly(true)}
$('#tplClasses').addEventListener('click',e=>{const b=e.target.closest('[data-cls]');if(!b)return;S.tplClass=b.dataset.cls;const first=Object.entries(PRESETS).find(([k,c])=>c.cls===S.tplClass);applyTpl(first[1],first[0])});
$('#tplGallery').addEventListener('click',e=>{const d=e.target.closest('[data-del]');if(d){const m=myTpls();delete m[d.dataset.del];store.set('truthfit-templates',m);if(S.tplKey==='my:'+d.dataset.del)S.tplKey='custom';renderTplUI();toast('Template deleted');return}
  const b=e.target.closest('[data-tpl],[data-my]');if(!b)return;if(b.dataset.tpl)applyTpl(PRESETS[b.dataset.tpl],b.dataset.tpl);else{const c=myTpls()[b.dataset.my];if(c)applyTpl(c,'my:'+b.dataset.my)}});
$('#tplCustomBtn').onclick=()=>{const p=$('#tplCustom'),closed=p.classList.toggle('hide');$('#tplCustomBtn').setAttribute('aria-expanded',!closed)};
$('#tFont').onchange=e=>{S.tpl.font=e.target.value;customised()};
$('#tNameAccent').onchange=e=>{S.tpl.nameAccent=e.target.checked;customised()};
$('#tAccent').addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b){S.tpl.accent=b.dataset.c;customised()}});
$('#tAccent').addEventListener('change',e=>{if(e.target.id==='tColor'){S.tpl.accent=e.target.value;customised()}});
$$('#tplCustom .seg[data-t]').forEach(g=>g.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.tpl[g.dataset.t==='name'?'name_':g.dataset.t]=b.dataset.v;if(g.dataset.t==='layout'&&b.dataset.v==='two')S.tplClass='human';customised()}));
$('#tSecs').addEventListener('click',e=>{const li=e.target.closest('li'),mv=e.target.closest('[data-mv]');if(!li||!mv)return;const o=S.tpl.order,i=o.indexOf(li.dataset.t),j=i+ +mv.dataset.mv;if(j<0||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];customised()});
$('#tSecs').addEventListener('change',e=>{if(!e.target.hasAttribute('data-show'))return;const t=e.target.closest('li').dataset.t;if(e.target.checked)delete S.tpl.hidden[t];else S.tpl.hidden[t]=true;customised()});
$('#tSave').onclick=()=>{const n=$('#tName').value.trim().slice(0,40);if(!n){toast('Give your template a name');$('#tName').focus();return}const m=myTpls();m[n]={...S.tpl,cls:S.tplClass,order:[...S.tpl.order],hidden:{...S.tpl.hidden}};if(!store.set('truthfit-templates',m))return toast('Saving isn\'t available in this view');S.tplKey='my:'+n;$('#tName').value='';renderTplUI();toast(`Saved “${n}”`)};

/* =================== Parse test =================== */
function runParse(silent){
  const p=$('#paper'),out=[];
  p.querySelectorAll('.nm,.sub,.ct,h5,p,li').forEach(el=>{const t=el.textContent.trim();if(!t)return;if(el.tagName==='H5')out.push({h:1,t});else out.push({t:(el.tagName==='LI'?'• ':'')+t})});
  const text=out.map(x=>x.t).join('\n'),checks=[],roles=S.vault.filter(v=>v.type==='role'),name=(S.vault.find(v=>v.type==='name')||{}).text;
  checks.push(out[0]&&out[0].t===name?['pass','Name read first',name]:['fail','Name not read first','ATS may mislabel your profile.']);
  checks.push(EMAIL.test(text)||PHONE.test(text)?['pass','Contact details extracted','Email and phone are plain text, not in a header or image.']:['fail','Contact details missing','Add email and phone as plain text.']);
  roles.forEach(r=>{const ok=text.includes(r.title)&&text.includes(r.employer)&&text.includes(r.dates);checks.push(ok?['pass',`${r.employer}: title, employer & dates intact`,`${r.title} · ${r.dates}`]:['fail',`${r.employer}: fact lost or altered`,'Check the title, employer and dates match your vault.'])});
  const srcB=ordered(S.finalText).secs.reduce((n,s)=>n+s.lines.filter(l=>/^\s*[•\-*]\s/.test(l)).length,0),gotB=out.filter(x=>x.t.startsWith('• ')).length;
  checks.push(srcB===gotB?['pass',`All ${gotB} bullets extracted`,'Nothing dropped or merged.']:['warn','Bullet count differs',`${gotB} extracted vs ${srcB} written.`]);
  const heads=out.filter(x=>x.h).map(x=>x.t),std=['summary','skill','experience','education'],miss=std.filter(h=>!heads.some(x=>x.toLowerCase().includes(h)));
  checks.push(miss.length?['warn','Section headings',`Not found: ${miss.join(', ')}. ATS parsers look for these names.`]:['pass','Standard sections detected',heads.map(h=>h.charAt(0)+h.slice(1).toLowerCase()).join(' · ')]);
  const iExp=heads.findIndex(h=>/experience/i.test(h)),iSum=heads.findIndex(h=>/summary/i.test(h)),iSide=heads.findIndex(h=>/skill|education/i.test(h));
  const orderIssue=S.tpl.layout==='two'&&iSide>-1&&(iSide<iSum||iSide<iExp);
  checks.push(orderIssue?['warn','Reading order changed by columns','The sidebar is read before your summary and experience. Use Portal Safe for job portals.']:['pass','Reading order matches the page','Top to bottom, as a recruiter reads it.']);
  const hid=Object.keys(S.tpl.hidden).filter(k=>S.tpl.hidden[k]);
  if(hid.some(h=>/experience|education/i.test(h)))checks.push(['fail','Required section hidden',hid.join(', ')+' is hidden in your template.']);
  checks.push(['pass','No icons, images or text boxes','Everything is real text an ATS can read.']);
  const target=+S.opts.pages,pg=S.pages||1;checks.push(pg<=target+0.05?['pass',`Fits ${target} page${target>1?'s':''}`,`About ${pg} page${pg>1?'s':''} at this density.`]:['warn',`Runs to ~${pg} pages`,`Target is ${target}. Try Compact density or hide a section.`]);
  const fails=checks.filter(c=>c[0]==='fail').length,warns=checks.filter(c=>c[0]==='warn').length;
  S.parse={checks,out,orderIssue,fails,warns,miss:miss.length,contact:EMAIL.test(text)||PHONE.test(text),roleLoss:checks.filter(c=>c[0]==='fail'&&/fact lost/.test(c[1])).length};
  $('#parseChecks').innerHTML=checks.map((c,i)=>`<li class="${c[0]}" style="animation-delay:${reduce?0:i*70}ms"><span class="c">${ic(c[0]==='pass'?'check-fill':c[0]==='warn'?'warn-fill':'xmark-fill')}</span><div><b>${esc(c[1])}</b><small>${esc(c[2])}</small></div></li>`).join('');
  $('#parseMeta').textContent=fails?`${fails} problem${fails>1?'s':''} found`:warns?`Parsed with ${warns} warning${warns>1?'s':''}`:'Parsed cleanly — every fact survived';
  $('#parsedText').innerHTML=out.map((x,i)=>`<div class="${x.h?'ph':''}" style="animation-delay:${reduce?0:Math.min(i*22,900)}ms">${esc(x.h?'## '+x.t:x.t)}</div>`).join('');
  if(!silent&&!reduce){const w=$('#finalWrap');w.classList.remove('scanning');void w.offsetWidth;w.classList.add('scanning')}
}
$('#rerunParse').onclick=()=>{runParse(false);renderScores();toast('Parse test complete')};

/* =================== Readiness score =================== */
function score(text,phase){
  const after=phase==='after',st=r=>after?statusOf(r):r.status,val=r=>({proven:1,partial:.5}[st(r)]||0);
  const must=S.reqs.filter(r=>r.priority==='must'),nice=S.reqs.filter(r=>r.priority!=='must');
  const cov=a=>a.length?a.reduce((s,r)=>s+val(r),0)/a.length:1;
  const n=norm(text);
  // evidence strength
  const backed=S.reqs.filter(r=>st(r)==='proven'||st(r)==='partial');
  const evs=backed.length?backed.reduce((s,r)=>{const x=after?recOf(r):rec(r.rec),direct=(after&&S.gaps[r.id]&&S.gaps[r.id].status==='answered')||r.match==='direct';return s+(st(r)==='proven'?1:.5)*(direct?1:.7)*(x&&(after?trusted(x):x.src==='Résumé')?1:.75)},0)/backed.length:0;
  // language alignment
  const kw=S.reqs.length?S.reqs.filter(r=>r.kw.some(k=>n.includes(k))).length/S.reqs.length:0,mr=mirrorRatio(text);
  const lang=Math.max(0,kw-(mr>.25?Math.min(.4,(mr-.25)*2):0));
  // benchmark
  const bench=S.bench.length?S.bench.filter(b=>b.kw.some(k=>n.includes(k))||(after&&b.status==='proven')).length/S.bench.length:1;
  // readability
  const au=authCheck(text).filter(a=>a.k!=='Too long for one bullet'&&a.k!=='Copies the vacancy'),bl=text.split('\n').filter(l=>/^\s*[•\-*]\s/.test(l)),longB=bl.filter(l=>words(l)>40).length;
  const read=Math.max(0,1-au.length*.07-longB*.05);
  // impact
  const imp=bl.length?Math.min(1,bl.filter(l=>/\d/.test(l)).length/bl.length/.75):0;
  // parseability
  let parse;if(after&&S.parse){parse=Math.max(0,1-S.parse.fails*.25-S.parse.warns*.08-(S.parse.orderIssue?.12:0))}else{const heads=['summary','skill','experience','education'].filter(h=>text.split('\n').some(l=>isHeading(l)&&l.toLowerCase().includes(h))).length;parse=Math.max(0,1-(4-heads)*.1-(EMAIL.test(text)?0:.2))}
  // claim safety
  const unv=flags(text).length,inf=after?visibleChanges().filter(c=>S.decisions[c.id]==='accepted'&&c.basis==='inference').length:0,locked=S.vault.filter(v=>v.type==='role'&&v.locked&&!text.includes(v.title)).length;
  const claim=Math.max(0,1-unv*.3-inf*.1-locked*.25);
  const P=[
   ['Mandatory qualifications',cov(must),.22,'Required items backed by evidence, including gates'],
   ['Evidence strength',evs,.16,'Direct, confirmed proof — not just matching words'],
   ['Job-language alignment',lang,.14,'Vacancy terms present, penalised for copying the ad'],
   ['Document parseability',parse,.12,after?'From the parse test of this exact layout':'Estimated from section structure'],
   ['Measurable impact',imp,.10,'Bullets with verified numbers or outcomes'],
   ['Recruiter readability',read,.10,'Specific language, no generic or AI-sounding filler'],
   ['Role benchmark coverage',bench,.08,S.pack?`Against the ${S.pack.name} pack`:'No pack for this role yet'],
   ['Claim safety',claim,.08,'No unverified numbers, inferred claims or altered facts']
  ];
  return {overall:Math.round(P.reduce((s,p)=>s+p[1]*p[2],0)*100),parts:P.map(p=>({label:p[0],v:Math.round(p[1]*100),detail:p[3]})),cov:cov(nice)};
}
const ringH=(v,l)=>`<div class="ring" style="--v:${v};--rc:${v>=85?'var(--green)':v>=70?'var(--orange)':'var(--red)'}"><div><b>${v}</b><span>${l}</span></div></div>`;
function scoreRecs(i,p){
  const text=orderedText(S.finalText),n=norm(text),open=S.reqs.filter(r=>statusOf(r)!=='proven'),missing=S.reqs.filter(r=>statusOf(r)==='proven'&&!r.kw.some(k=>n.includes(k))),bullets=text.split('\n').filter(l=>/^\s*[•\-*]\s/.test(l)),noImpact=bullets.filter(l=>!/\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|dozen|hundred|thousand|half|double|twice)\b/i.test(l));
  const list=(xs,f)=>xs.slice(0,4).map(f);
  if(i===0)return {items:list(open,r=>`<b>${esc(r.label)}</b> — ${statusOf(r)==='gap'?'no verified evidence yet':'evidence is only partial'}`),add:'Add a truthful example with scope, action and outcome. It will be saved as confirmed evidence.',placeholder:'Example: Led [project/team] across [scope], resulting in [verified outcome].',req:open[0]?.id,go:4};
  if(i===1){const weak=S.reqs.filter(r=>statusOf(r)!=='proven'||r.match==='transferable'||!trusted(recOf(r)));return {items:list(weak,r=>`<b>${esc(r.label)}</b> — ${r.match==='transferable'?'replace transferable proof with a direct example':'confirm or add stronger evidence'}`),add:'Add a direct, verifiable achievement. TruthFit will cite it in the evidence vault.',placeholder:'What did you personally do? Include team/project scope and a verified result.',req:weak[0]?.id,go:2}}
  if(i===2)return {items:list(missing,r=>`Add the verified vacancy term <b>“${esc(r.kw[0]||r.label)}”</b> using evidence ${esc((recOf(r)||{}).id||'')}`),action:missing.length?'keywords':null,actionLabel:'Add verified terms'};
  if(i===3)return {items:(S.parse?.checks||[]).filter(c=>c[0]!=='pass').slice(0,4).map(c=>`<b>${esc(c[1])}</b> — ${esc(c[2])}`),action:'parse',actionLabel:'Apply Portal Safe & retest'};
  if(i===4)return {items:list(noImpact,l=>`Add a verified outcome to “${esc(l.replace(/^\s*[•\-*]\s*/,'' ).slice(0,90))}${l.length>95?'…':''}”`),add:'Add a real metric or outcome. Numbers are accepted only when you provide them here.',placeholder:'Example: Improved [metric] from [before] to [after], or reduced [time/cost] by [verified amount].'};
  if(i===5){const flags_=authCheck(text);return {items:list(flags_,a=>`<b>${esc(a.k)}</b> — revise “${esc(a.p)}”`),action:flags_.length?'edit':null,actionLabel:'Edit résumé text'} }
  if(i===6){const miss=S.bench.filter(b=>!b.kw.some(k=>n.includes(k))&&b.status!=='proven');return {items:list(miss,b=>`Show evidence for <b>${esc(b.label)}</b>`),add:miss.length?'Add a benchmark-relevant example you have actually done.':null,placeholder:'Describe the relevant work, scope and result.'}}
  const unsafe=flags(text),infs=visibleChanges().filter(c=>S.decisions[c.id]==='accepted'&&c.basis==='inference');return {items:[...unsafe.map(x=>`Remove or verify unsupported number <b>${esc(x)}</b>`),...infs.map(c=>`Confirm the inference in <b>${esc(c.title)}</b>`)].slice(0,4),action:(unsafe.length||infs.length)?'review':null,actionLabel:'Review flagged claims'};
}
function recHTML(i,p){const r=scoreRecs(i,p),items=r.items.length?r.items:['This dimension is already strong. Keep the current evidence and formatting.'];return `<div class="dim-rec ${S.dimOpen&&S.dimOpen[i]?'':'hide'}" data-rec="${i}"><ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul>${r.add?`<div class="dim-rec-note">${esc(r.add)}</div><div class="dim-add"><textarea data-dim-text="${i}" placeholder="${esc(r.placeholder||'Add verified evidence')}"></textarea><button class="btn primary sm" data-dim-add="${i}" ${r.req?`data-req="${r.req}"`:''}>Add evidence</button></div>`:''}<div class="dim-rec-actions">${r.action?`<button class="btn line sm" data-dim-action="${r.action}" data-i="${i}">${esc(r.actionLabel)}</button>`:''}${r.go?`<button class="btn plain sm" data-dim-go="${r.go}">Open ${r.go===4?'Evidence Map':'Evidence Vault'}</button>`:''}</div></div>`}
function renderScores(){
  if(!S.finalText)return;const af=score(orderedText(S.finalText),'after'),bf=S.before;S.after=af;
  const band=af.overall>=85?'Application-ready':af.overall>=70?'Nearly there':'Needs more evidence';
  $('#scoreHero').innerHTML=`${ringH(af.overall,'READINESS')}<div><b style="font-size:15px">${band}</b><div class="hint" style="margin:3px 0 0">Up from <b>${bf.overall}</b> for your original résumé. Weights are a prototype hypothesis and shown in full below.</div></div>`;
  $('#jumpScore').textContent=af.overall;
  S.dimOpen=S.dimOpen||{};$('#dims').innerHTML=af.parts.map((p,i)=>`<div class="dim"><div class="ln"><span>${p.label}</span><span class="dim-tools"><span>${bf.parts[i].v} → ${p.v}</span><button class="dim-rec-btn" data-dim-toggle="${i}" aria-expanded="${!!S.dimOpen[i]}">${S.dimOpen[i]?'Hide':'Recommendations'}</button></span></div><div class="bar"><i class="b" style="width:${bf.parts[i].v}%"></i><i class="a" data-w="${p.v}" style="width:0"></i></div><p>${p.detail}</p>${recHTML(i,p)}</div>`).join('');
  requestAnimationFrame(()=>$$('#dims i.a').forEach((el,i)=>setTimeout(()=>el.style.width=el.dataset.w+'%',reduce?0:i*70)));
  // authenticity panel
  const t=orderedText(S.finalText),au=authCheck(t),mr=mirrorRatio(t),bl=t.split('\n').filter(l=>/^\s*[•\-*]\s/.test(l)),noCtx=bl.filter(l=>!/\d|for |across |with /i.test(l)).length;
  const items=[
    au.filter(a=>a.k==='Generic phrase').length?['warn','Generic phrases',au.filter(a=>a.k==='Generic phrase').map(a=>a.p).join(', ')]:['pass','No generic filler','No “results-driven” or “team player” language.'],
    au.filter(a=>a.k==='AI-sounding pattern').length?['warn','AI-sounding patterns',au.filter(a=>a.k==='AI-sounding pattern').map(a=>a.p).join(', ')]:['pass','Sounds human','No common AI phrasing detected.'],
    au.filter(a=>a.k==='Unsupported superlative').length?['warn','Unsupported superlatives',au.filter(a=>a.k==='Unsupported superlative').map(a=>a.p).join(', ')]:['pass','No unsupported superlatives','Claims are shown, not hyped.'],
    mr>.25?['warn','Mirrors the vacancy heavily',`${Math.round(mr*100)}% of phrases copy the job ad word for word.`]:['pass','Healthy keyword use',`${Math.round(mr*100)}% of phrases match the ad — natural, not stuffed.`],
    noCtx?['warn',`${noCtx} bullet${noCtx>1?'s':''} lack context or outcome`,'Add scope, a constraint or a result.']:['pass','Every bullet has context','Scope, method or outcome in each line.'],
    S.cls.seniorIdx>=4&&!/lead|manag|direct|mentor/i.test(t)?['warn','Seniority mismatch','Manager roles need people-leadership evidence.']:['pass','Seniority matches the role',`Reads as ${S.cls.seniority.toLowerCase()} level.`]
  ];
  $('#authChecks').innerHTML=items.map((c,i)=>`<li class="${c[0]}" style="animation-delay:${reduce?0:i*60}ms"><span class="c">${ic(c[0]==='pass'?'check-fill':'warn-fill')}</span><div><b>${esc(c[1])}</b><small>${esc(c[2])}</small></div></li>`).join('');
}
$('#dims').addEventListener('click',e=>{const t=e.target.closest('[data-dim-toggle]'),add=e.target.closest('[data-dim-add]'),act=e.target.closest('[data-dim-action]'),goBtn=e.target.closest('[data-dim-go]');
  if(t){const i=+t.dataset.dimToggle;S.dimOpen[i]=!S.dimOpen[i];renderScores();return}
  if(goBtn){go(+goBtn.dataset.dimGo);return}
  if(add){const i=+add.dataset.dimAdd,ta=$(`[data-dim-text="${i}"]`),v=ta.value.trim();if(words(v)<6)return toast('Add a specific example with at least six words');const rid='A'+(S.vault.filter(x=>x.type==='answer').length+1);S.vault.push({id:rid,type:'answer',text:v,src:'Your answer',confirmed:true,metrics:nums(v)});const req=add.dataset.req&&S.reqs.find(r=>r.id===add.dataset.req);if(req){S.gaps[req.id]={status:'answered',answer:v,rec:rid};req.rec=rid}S.manualFinal=insertInSection(S.finalText.split('\n'),'ADDITIONAL EVIDENCE',polish(v)).join('\n');renderFinal();S.dimOpen[i]=true;toast('Evidence added and score recalculated');return}
  if(!act)return;const i=+act.dataset.i;
  if(act.dataset.dimAction==='keywords'){const n=norm(S.finalText),terms=S.reqs.filter(r=>statusOf(r)==='proven'&&trusted(recOf(r))).flatMap(r=>r.kw).filter(k=>k&&!n.includes(k));if(!terms.length)return toast('All verified terms are already present');S.manualFinal=insertInSection(S.finalText.split('\n'),'CORE SKILLS',terms.slice(0,8).map(x=>x.replace(/\b\w/g,c=>c.toUpperCase())).join(' · ')).join('\n');renderFinal();S.dimOpen[i]=true;toast('Verified job terms added and score recalculated')}
  if(act.dataset.dimAction==='parse'){applyTpl(PRESETS.classic,'classic');runParse(false);renderScores();S.dimOpen[i]=true;toast('Portal Safe applied and parse test rerun')}
  if(act.dataset.dimAction==='edit'){$('#editToggle').click();$('#finalEdit').focus()}
  if(act.dataset.dimAction==='review')go(6)
});

/* =================== Final render, letter, exports, versions =================== */
function letter(){if(S.aiLetter)return S.aiLetter;const I=S.inputs,name=(S.vault.find(v=>v.type==='name')||{}).text||'',ev=S.reqs.filter(r=>statusOf(r)==='proven'&&r.priority==='must').slice(0,3);
  const sig=S.signals.find(s=>s.type==='company'&&s.use);
  return `Dear Hiring Team at ${I.company},\n\nI'm applying for the ${I.role} role. ${sig?`Your emphasis on ${/collaboration/i.test(sig.text)?'collaboration and innovation with impact':'design at scale'} matches how I work. `:''}The vacancy asks for ${ev.map(r=>r.label.split(' — ')[0].toLowerCase()).join(', ')} — areas where I can point to specific results:\n\n${ev.map(r=>{const x=recOf(r);return '• '+(x?x.text:'').replace(/^[•\-*]\s*/,'')}).join('\n')}\n\nI'd welcome the chance to discuss how this experience could support ${I.company}'s design team.\n\nKind regards,\n${name}\n\n—\nEvery claim above is cited from your evidence vault.`}
function renderFinal(){
  S.finalText=S.manualFinal!=null?S.manualFinal:buildFinal();
  $('#finalTitle').textContent='Design & Test';
  $('#finalEdit').value=S.finalText;$('#letter').textContent=letter();
  renderTplUI();renderPaperOnly(false);runParse(false);renderScores();renderVersions();
}
function setTab(t){S.ftab=t;$$('[data-ftab]').forEach(x=>x.setAttribute('aria-selected',x.dataset.ftab===t));$('#finalWrap').classList.toggle('hide',t!=='resume');$('#parsedWrap').classList.toggle('hide',t!=='parsed');$('#letterWrap').classList.toggle('hide',t!=='letter');$('#editToggle').classList.toggle('hide',t!=='resume');$('#tplBar').classList.toggle('hide',t==='letter');if(t==='parsed'){runParse(true)}}
$$('[data-ftab]').forEach(b=>b.onclick=()=>setTab(b.dataset.ftab));
$$('[data-jump]').forEach(b=>b.onclick=()=>$('#'+b.dataset.jump).scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'}));
$('#showDiff').onchange=e=>document.body.classList.toggle('showdiff-off',!e.target.checked);
$('#editToggle').onclick=()=>{const ed=$('#finalEdit'),editing=!ed.classList.contains('hide');
  if(editing){S.manualFinal=ed.value;ed.classList.add('hide');$('#paper').classList.remove('hide');$('#editToggle').innerHTML=ic('pencil')+' Edit text';renderFinal();toast('Edits applied — parse test re-run')}
  else{ed.classList.remove('hide');$('#paper').classList.add('hide');$('#editToggle').innerHTML=ic('check')+' Done';ed.focus()}};
const curText=()=>S.ftab==='letter'?letter():orderedText(!$('#finalEdit').classList.contains('hide')?$('#finalEdit').value:S.finalText);
const fname=ext=>`${S.inputs.company}_${S.inputs.role}_${S.ftab==='letter'?'cover_letter':'resume'}`.replace(/\W+/g,'_')+'.'+ext;
$('#copyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(curText());toast('Copied to clipboard')}catch(_){toast('Copy blocked here — use a download instead')}};
let DL=null;try{window.claude&&window.claude.use&&window.claude.use('downloads').then(d=>{DL=d}).catch(()=>{})}catch(_){}
async function save(ext,data){if(DL){try{await DL.save({filename:fname(ext),data});toast('Saved')}catch(e){if(e&&e.code!=='declined')toast('Download unavailable here — use Copy')}return}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'text/plain'}));a.download=fname(ext);document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast('Download started')}catch(_){toast('Download unavailable here — use Copy')}}
function exportHtml(){const name=(S.vault.find(v=>v.type==='name')||{}).text||'Résumé';return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)} — Résumé</title><style>body{margin:0;background:#eef0ea}${$('#paperCss').textContent}.paper{max-width:820px;margin:24px auto;box-shadow:none;min-height:0}@media print{body{background:#fff}.paper{margin:0;border:0;max-width:none;padding:0}@page{margin:16mm}}</style></head><body><div class="${paperClass()}" style="${esc(paperStyle())}">${renderPaper(S.finalText,true)}</div></body></html>`}
$('#txtBtn').onclick=()=>save('txt',curText());
$('#mdBtn').onclick=()=>save('md',curText().split('\n').map((l,i)=>i===0?'# '+l:isHeading(l)?'\n## '+l.charAt(0)+l.slice(1).toLowerCase():l.replace(/^•\s*/,'- ')).join('\n'));
$('#htmlBtn').onclick=()=>{if(S.ftab==='letter')return toast('Styled export is for the résumé');save('html',exportHtml())};
function getVers(){return store.get('truthfit-v3-versions',[])}
function renderVersions(){const v=getVers();$('#versions').innerHTML=v.length?v.map((x,i)=>`<li><div><b>${esc(x.name)}</b><span>${esc(x.date)} · Readiness ${x.score}${x.contra?` · <b style="color:var(--amber)">${esc(x.contra)}</b>`:''}</span></div><button class="btn plain sm" data-restore="${i}">${ic('undo')} Restore</button></li>`).join(''):'<li><span>No saved versions yet. Save one per application to track what you sent.</span></li>'}
$('#saveVersion').onclick=()=>{const v=getVers(),t=orderedText(S.finalText);
  // contradiction detection across versions: same employer, different title or dates
  const roles=S.vault.filter(r=>r.type==='role');let contra='';
  v.forEach(old=>{roles.forEach(r=>{const m=old.text.split('\n').find(l=>l.includes(' '+r.employer+' ')||l.includes('— '+r.employer));if(m&&!m.includes(r.title))contra=`Title for ${r.employer} differs from “${old.name}”`;else if(m&&!m.includes(r.dates))contra=`Dates for ${r.employer} differ from “${old.name}”`})});
  v.unshift({name:`${S.inputs.company} · ${S.inputs.role} · ${modeObj().name}`,date:new Date().toLocaleDateString(),score:S.after?S.after.overall:0,text:t,tpl:{...S.tpl},contra});
  if(!store.set('truthfit-v3-versions',v.slice(0,10)))return toast('Saving isn\'t available in this view');renderVersions();toast(contra?'Saved — contradiction with an earlier version flagged':'Version saved')};
$('#versions').addEventListener('click',e=>{const b=e.target.closest('[data-restore]');if(!b)return;const x=getVers()[+b.dataset.restore];if(!x)return;const prev={m:S.manualFinal,t:{...S.tpl}};S.manualFinal=x.text;S.tpl={...x.tpl};renderFinal();toast('Version restored',()=>{S.manualFinal=prev.m;S.tpl=prev.t;renderFinal()})});

$('#letterAI').onclick=async()=>{
  if(!aiReady())return toast('Live AI isn\'t available in this view');
  const I=S.inputs,ctl=new AbortController(),el=$('#letter'),prev=S.aiLetter;
  $('#letterAI').disabled=true;$('#letterStop').classList.remove('hide');$('#letterStop').onclick=()=>ctl.abort();$('#letterNote').textContent='Thinking…';el.textContent='';
  const facts=S.vault.filter(v=>['ach','extra','answer','summary','edu'].includes(v.type)).map(v=>`${v.id}: ${v.text}`).join('\n');
  const sig=S.signals.filter(s=>!s.infer).map(s=>`- ${s.text} (source: ${s.src})`).join('\n')||'- none';
  const name=(S.vault.find(v=>v.type==='name')||{}).text||'';
  const prompt=`Write a concise cover letter (180–240 words) from ${name} for the "${I.role}" role at ${I.company}. Tone: ${S.opts.tone}.
Rules: use ONLY facts from the evidence below — never invent numbers, employers, titles or achievements; every number must appear in the evidence. Mention at most one company signal, and only if it genuinely connects to the evidence. No generic phrases (passionate, results-driven, team player), no AI-sounding words (leverage, foster, spearhead, delve), no superlatives. Plain text only, starting "Dear Hiring Team at ${I.company}," and ending with "Kind regards," and the name.

TOP REQUIREMENTS: ${S.reqs.filter(r=>r.priority==='must').slice(0,6).map(r=>r.label).join('; ')}
EVIDENCE:\n${facts}
COMPANY SIGNALS:\n${sig}`;
  try{const res=await SAMPLE(prompt,{signal:ctl.signal,onText:({text})=>{el.textContent=text;$('#letterNote').textContent='Writing…'}});
    S.aiLetter=res.text.trim();el.textContent=S.aiLetter;const f=flags(S.aiLetter),au=authCheck(S.aiLetter);
    $('#letterNote').textContent=f.length?`Check: ${f.join(', ')} not found in your vault — edit before sending.`:au.length?`Written by ${res.provider} · ${au.length} authenticity flag${au.length>1?'s':''}: ${au.map(x=>x.p).join(', ')}`:`Written by ${res.provider} · every number checked against your vault`;
    $('#letterReset').classList.remove('hide');
  }catch(e){S.aiLetter=prev;el.textContent=e.text&&e.code==='cancelled'?e.text:letter();$('#letterNote').textContent=e.code==='cancelled'?'Stopped.':e.code==='not_granted'?'Claude access wasn\'t allowed.':e.code==='rate_limited'?'Usage limit reached — try later.':'Couldn\'t write the letter — try again.'}
  finally{$('#letterAI').disabled=false;$('#letterStop').classList.add('hide')}
};
$('#letterReset').onclick=()=>{S.aiLetter=null;$('#letter').textContent=letter();$('#letterReset').classList.add('hide');$('#letterNote').textContent=''};

/* =================== Sheets: settings & plans =================== */
let lastFocus=null;
function openSheet(id){lastFocus=document.activeElement;$('#scrim').classList.remove('hide');$(id).classList.remove('hide');const x=$(id).querySelector('[data-close]');x&&x.focus()}
function closeSheets(){$('#scrim').classList.add('hide');$$('.sheet,.asheet').forEach(s=>s.classList.add('hide'));lastFocus&&lastFocus.focus()}
$('#settingsBtn').onclick=$('#settingsBtnM').onclick=()=>openSheet('#settingsSheet');
$('#resetConfirm').onclick=()=>{closeSheets();reset();toast('Ready for a new application')};
$('#planBtn').onclick=$('#planBtnM').onclick=()=>{renderPlans();openSheet('#planSheet')};
$('#scrim').onclick=closeSheets;$$('[data-close]').forEach(b=>b.onclick=closeSheets);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#scrim').classList.contains('hide'))closeSheets()});
$('#providers').addEventListener('change',e=>{S.provider=e.target.value;renderAIStatus()});
$('#shield').onchange=e=>{S.shield=e.target.checked};
const month=()=>new Date().toISOString().slice(0,7);
function usage(){const u=store.get('truthfit-usage',{m:month(),n:0});return u.m===month()?u:{m:month(),n:0}}
function bumpUsage(){const u=usage();u.n++;store.set('truthfit-usage',u);renderUsage();if(u.n===3)setTimeout(()=>toast('That was your last free analysis this month — the prototype keeps working'),3800)}
function renderUsage(){const u=usage(),left=Math.max(0,3-u.n);$('#usageMeter').innerHTML=[0,1,2].map(i=>`<i class="${i<left?'on':''}"></i>`).join('');$('#planLabel').textContent=`Free · ${left} left`}
const PLANS=[
 {id:'free',name:'Free',price:'₹0',per:'',items:['One evidence vault','2 active résumé versions','3 job analyses a month','Core evidence map','3 Portal Safe templates','PDF export','Basic transparent score'],cta:'Current plan'},
 {id:'pass',name:'Job Search Pass',price:'₹1,199',per:'/ 30 days',rec:true,items:['Unlimited tailoring (fair use)','All role packs','Cited company research','All templates & output classes','DOCX + PDF with parse verification','Version comparison','Cover letters & interview evidence prep'],cta:'Start a 30-day pass',note:'No auto-renewal'},
 {id:'campaign',name:'90-day Campaign',price:'₹2,999',per:'/ 90 days',items:['Everything in the Pass','Covers a typical search window','One price, no cancellation worry','Application outcome tracking'],cta:'Start a campaign'},
 {id:'pro',name:'Career Pro',price:'₹1,999',per:'/ month',items:['Ongoing evidence vault','Multiple role tracks','LinkedIn & portfolio alignment','Career-change mapping','Application tracker & outcome analytics','Quarterly résumé health review'],cta:'Go Pro'}
];
function renderPlans(){const u=usage();$('#usageNote').innerHTML=`${ic('info')}<div><b>You've used ${Math.min(u.n,3)} of 3 free analyses this month.</b> Upgrade when you start applying seriously — not before.</div>`;
  $('#plans').innerHTML=PLANS.map(p=>`<div class="plan ${p.rec?'best':''}"><h3>${p.name}</h3><div class="pr">${p.price} <small>${p.per}</small></div>${p.note?`<span class="tag t-ok" style="justify-self:start">${ic('check')}${p.note}</span>`:''}<ul>${p.items.map(i=>`<li>${ic('check')}<span>${esc(i)}</span></li>`).join('')}</ul><button class="btn ${p.id==='free'?'ghost':p.rec?'primary':'line'} sm" data-plan="${p.id}" ${p.id==='free'?'disabled':''}>${p.cta}</button></div>`).join('')}
document.addEventListener('click',e=>{const b=e.target.closest('[data-plan]');if(b&&!b.disabled)toast('Checkout isn\'t part of this prototype — this tests which plan people choose')});

function reset(){F.forEach(k=>$('#'+k).value='');$$('.upmsg').forEach(m=>m.textContent='');Object.assign(S,{maxStep:1,reqs:[],changes:[],vault:[],gaps:{},decisions:{},manualFinal:null,finalText:''});go(1)}
renderUsage();renderAIStatus();go(1);
})();
