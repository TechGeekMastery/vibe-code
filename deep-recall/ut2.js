const src=require('fs').readFileSync('main.js','utf8');
global.window={math:require('/tmp/mj/package/lib/browser/math.js')};
const body=src.replace(/^\(function \(\) \{\n'use strict';\n/,'').replace(/\}\)\(\);\n$/,'');
// stub browser bits used at top level
global.document={querySelector:()=>null,addEventListener:()=>{},body:{classList:{toggle(){}}}};
const cut=(a,b)=>body.slice(body.indexOf(a), b?body.indexOf(b):undefined);
const code = body.replace(/\/\* -{60,} boot \*\/[\s\S]*$/,'') ;
const fn = new Function('window','document', code + `
return {parseProblemBlocks,toProblem,machineCheck,MX,parseFields,validateLangItems,langMatch,normL,stripAcc,renderPlot,parsePlotSpec,extractVocab,extractKeyPoints,parseLesson,mdToHtml,nodeInfo,rootCandidates,calStats,recordCal,Store,mastery,rungFor,SUBJECTS,subj,fsrsNext,fsrsR,fsrsInterval,reconcileOutline,newKeyFor,migrateCurriculum,recordKP,Store,kpTargets,topicStage,lessonCoverage,syllabusFor,objectiveFor,subnetInfo,subnetDrill,portDrill,solSteps,toProblem,parseProblemBlocks,goalStatus,goalKeys};`);
const A = fn(window, document);
let fails=0; const ok=(c,m)=>{ if(!c){fails++; console.log('FAIL',m);} };
// problem blocks with messy formatting
const t=`Sure! Here:\n\`\`\`\n=== PROBLEM ===\n**TOPIC:** mth-1-4\n**SKILL:** chain rule\nDIFFICULTY: 2\nTYPE: expression\nVARS: x\nPROMPT:\nDifferentiate \\( e^{3x^2} \\).\n\`\`\`plot\nf: exp(3*x^2)\n\`\`\`\nANSWER: \`6*x*exp(3*x^2)\`\nHINT: outer exp\nSOLUTION:\nstep\n=== END ===\n===PROBLEM\n### TOPIC: mth-1-0\nSKILL: limits\nTYPE: number\nTOLERANCE: 0.001\nPROMPT:\nFind it.\nANSWER: 1/2\nSOLUTION:\nok\n===END\n=== PROBLEM\nTOPIC: mth-1-0\nTYPE: choice\nPROMPT: Which?\nOPTIONS:\nA) one\nB) two\nANSWER: B) two\nSOLUTION: b\n=== END\n`;
const bl=A.parseProblemBlocks(t); ok(bl.length===3,'3 blocks got '+bl.length);
const qs=bl.map(b=>A.toProblem(b,['mth-1-4','mth-1-0'],'mth-1-4'));
ok(qs.every(Boolean),'all valid'); ok(qs[0].answer==='6*x*exp(3*x^2)','backticks stripped'); ok(/```plot/.test(qs[0].prompt),'plot fence kept in prompt'); ok(qs[1].node==='mth-1-0','topic with ###'); ok(qs[2].answer==='B','choice letter');
ok(A.machineCheck(qs[0],'6x e^(3x^2)')===true,'expr equiv'); ok(A.machineCheck(qs[0],'3x e^(3x^2)')===false,'expr wrong');
ok(A.machineCheck(qs[1],'0.5')===true,'number'); ok(A.machineCheck(qs[2],'b')===true,'choice');
const f=A.parseFields('WORK:\nx\n**VERDICT:** wrong\nANSWER: 2*x\nNOTE: n\nSOLUTION:\nfix\nmore',['WORK','VERDICT','ANSWER','NOTE','SOLUTION']); ok(f.VERDICT==='wrong'&&f.SOLUTION==='fix\nmore','fields');
// language
const items=A.validateLangItems([{type:'translate_to',node:'de-0-1',prompt:'The dog',answers:['der Hund'],focus:'gender'},{type:'build',node:'x',prompt:'I am tired',answer:'Ich bin müde.',distractors:['ist']},{type:'cloze',node:'de-0-1',prompt:'Ich ___ müde',answers:['bin']},{type:'choice',node:'de-0-1',prompt:'?',options:['a','b','c'],answer:2},{type:'listen',text:'Guten Morgen'},{type:'bogus'}],['de-0-1'],'de-0-1');
ok(items.length===5,'lang items '+items.length); ok(items[1].tokens.length===4,'build tokens');
ok(A.langMatch('Der Hund!',['der Hund'])==='exact','lang exact'); ok(A.langMatch('ich bin mude',['Ich bin müde.'])==='accent','umlaut partial'); ok(A.langMatch('Strasse',['Straße'])==='accent','eszett');
ok(A.langMatch("L'home",['l’home'])==='exact','apostrophe');
// vocab & key points
const md='# T\nhi\n## Vocabulario\n- {{el gos}} — el perro (m.)\n- **la casa** – la casa\n## Puntos clave\n- one\n- two\n## Sources\n- x';
const v=A.extractVocab(md); ok(v.length===2&&v[0].t==='el gos'&&v[0].m==='el perro'&&v[0].n==='m.','vocab parse '+JSON.stringify(v));
ok(A.extractKeyPoints(md).length===2,'key points stop at next heading');
// lesson parse with CHECK inside code fence ignored
const pl=A.parseLesson('## A\ntext\n```\nCHECK: not real\n```\nCHECK: real?\nANSWER: yes');
ok(pl.filter(b=>b.type==='check').length===1,'check parse ignores fences');
// plot
const svg=A.renderPlot('x: -3, 3\nf: x^2 | parabola\nf: 2*x-1\npoint: 1, 1 | P\nshade: x^2, 0, 2\nvector: (0,0) -> (2,1) | F\nfield: x - y\nvline: 2');
ok(svg && svg.includes('<svg') && svg.includes('parabola') && (svg.match(/class="pl /g)||[]).length===2,'plot renders');
ok(A.renderPlot('param: cos(t); sin(t)').includes('<path'),'param plot');
// md with say + plot
const h=A.mdToHtml('Hola {{Bon dia}}\n```plot\nf: x\n```',{lang:'ca-ES'}); ok(h.includes('data-act="say"')&&h.includes('class="plot"'),'md say+plot');
// root candidates across subjects
const rc=A.rootCandidates('phy-0-2'); ok(rc.some(k=>k.startsWith('mth-')),'physics roots include math'); ok(rc.length<=60,'cap');
// calibration
A.recordCal('mth',95,false); A.recordCal('mth',95,true); A.recordCal(null,25,false); const cs=A.calStats(); ok(cs.n===3,'cal n'); 
// mastery decay
const n={mastery:90,last:Date.now()-20*864e5,interval:3}; const m=A.mastery(n); ok(m<90&&m>=31,'decay '+m); ok(A.mastery({mastery:90,last:Date.now(),interval:3})===90,'fresh');
// curriculum integrity
ok(A.SUBJECTS.length===24,'subjects '+A.SUBJECTS.length); ok(A.nodeInfo('ca-1-1').title.includes('en y hi'),'catalan topic'); ok(A.nodeInfo('elx-0-0').skills===true,'skills flag');
// FSRS: success grows stability, lapse shrinks it; R=0.9 at t=S
let st=A.fsrsNext(null,3,0); ok(Math.abs(st.s-3.7145)<1e-6,'init S'); ok(Math.abs(A.fsrsR(st.s,st.s)-0.9)<1e-9,'R(S,S)=0.9'); ok(A.fsrsInterval(10)===10,'interval=S at 90%');
const st2=A.fsrsNext(st,3,st.l+4*864e5); ok(st2.s>st.s*2,'success grows S '+st2.s); const st3=A.fsrsNext(st2,1,st2.l+10*864e5); ok(st3.s<st2.s,'lapse shrinks S'); ok(st3.d>st2.d,'lapse raises D');
// outline audit application
const O1={kps:[{id:'k1',t:'A',d:'a'},{id:'k2',t:'B',d:'b'},{id:'k3',t:'C',d:'c'}]}; A.reconcileOutline(O1,{missing:[{t:'M',d:'m',after:1}],remove:[3],fix:[{n:2,t:'B2',d:'b2'}],split:[]},-1);
ok(O1.kps.map(k=>k.t).join()==='A,M,B2','audit apply '+O1.kps.map(k=>k.t).join()); ok(O1.kps[2].id==='k2' && O1.kps[1].id==='k4','ids stable');
const O2={kps:[{id:'k1',t:'A',d:'a'},{id:'k2',t:'B',d:'b'},{id:'k3',t:'C',d:'c'}]}; A.reconcileOutline(O2,{missing:[{t:'M',d:'m',after:0}],remove:[1],fix:[{n:2,t:'X',d:'x'}],split:[{n:3,into:[{t:'C1'},{t:'C2'}]}]},1);
ok(O2.kps.map(k=>k.t).join()==='A,B,M,C1,C2','locked points untouched '+O2.kps.map(k=>k.t).join());
// migration by title, renamed titles, gaps rekeyed
ok(A.newKeyFor('econ-2-3')==='econ-1-1','rename game theory -> '+A.newKeyFor('econ-2-3')); ok(A.newKeyFor('cs-2-3').startsWith('ai-0-'),'ML moved to AI');
ok(A.nodeInfo(A.newKeyFor('geo-0-1')).title==='Realism, liberalism, and constructivism','geo realism');
A.Store.nodes={'geo-0-1':{key:'geo-0-1',mastery:50,last:Date.now(),hasLesson:true},'mth-1-4':{key:'mth-1-4',mastery:40}};
A.Store.gaps={'geo-0-1~x':{id:'geo-0-1~x',node:'geo-0-1',concept:'x',status:'open',root:'hist-2-3'}};
A.Store.profile.lastNode='geo-0-1'; A.migrateCurriculum();
const nk=A.newKeyFor('geo-0-1'); ok(A.Store.nodes[nk]&&A.Store.nodes[nk].mastery===50&&!A.Store.nodes['geo-0-1'],'node moved to '+nk); ok(A.Store.nodes['mth-1-4'].mastery===40,'program untouched');
ok(A.Store.gaps[nk+'~x']&&A.Store.gaps[nk+'~x'].root===A.newKeyFor('hist-2-3'),'gap rekeyed'); ok(A.Store.profile.lastNode===nk,'lastNode'); ok(A.Store.profile.lessonAlias[nk]==='geo-0-1','lesson alias');
A.migrateCurriculum(); ok(A.Store.nodes[nk],'idempotent');
// knowledge points: record, blend, targets
A.Store.outlines['mth-1-4']={kps:[{id:'k1',t:'a'},{id:'k2',t:'b'},{id:'k3',t:'c'},{id:'k4',t:'d'}],pre:[]};
A.Store.nodes['mth-1-4']={key:'mth-1-4',mastery:40,last:Date.now(),kpN:4};
A.recordKP('mth-1-4','k2',1,75); A.recordKP('mth-1-4','k9',1,75);
const nn=A.Store.nodes['mth-1-4']; ok(nn.kp.k2&&!nn.kp.k9,'kp recorded, unknown ignored'); ok(nn.due>Date.now(),'due synced');
const bm=A.mastery(nn); ok(bm>40&&bm<100,'blended mastery '+bm);
ok(A.kpTargets('mth-1-4',4).map(k=>k.id).join()==='k1,k3,k4,k2','targets unseen first then seen');
ok(A.topicStage({mastery:95,last:Date.now(),sessions:3,interval:30})===3,'no Mastered without retention'); ok(A.topicStage({mastery:95,last:Date.now(),sessions:3,retained:Date.now()})===4,'Mastered with retention');
ok([...A.lessonCoverage('## A [k1,k2]\nx\n## B [k3]\n')].join()==='k1,k2,k3','coverage ids');
ok(A.objectiveFor(A.nodeInfo('cert-0-6')).includes('IPv4 network addressing'),'cert objective'); ok(A.nodeInfo('cert-5-0').title==='1.1 Security controls','sec+ first');
ok(/Stewart/.test(A.syllabusFor(A.nodeInfo('mth-1-0'))),'syllabus per course');
// subnetting math
const si=A.subnetInfo('172.16.45.200',20); ok(si.net==='172.16.32.0'&&si.bc==='172.16.47.255'&&si.mask==='255.255.240.0'&&si.hosts===4094,'subnet /20 '+JSON.stringify(si));
const s2=A.subnetInfo('192.168.1.130',26); ok(s2.net==='192.168.1.128'&&s2.bc==='192.168.1.191'&&s2.first==='192.168.1.129'&&s2.hosts===62,'subnet /26');
for(let i=0;i<200;i++){const d=A.subnetDrill(); if(!d.answers||!d.answers[0]||/NaN|undefined/.test(d.answers[0]+d.prompt)){ok(false,'drill '+JSON.stringify(d));break;}}
for(let i=0;i<50;i++){const d=A.portDrill(); if(d.options&&(d.answer<0||d.options.length!==4)){ok(false,'port drill');break;}}
ok(A.solSteps('1. a\n2. b\n3. c').length===3,'steps'); ok(A.solSteps('just text')===null,'no steps');
const cp=A.parseProblemBlocks("=== PROBLEM\nTOPIC: py-0-8\nKP: k1\nSKILL: functions\nDIFFICULTY: 1\nTYPE: code\nPROMPT:\nWrite add.\nSTARTER:\n```python\ndef add(a, b):\n    pass\n```\nTESTS:\nassert add(1, 2) == 3\nREFERENCE:\ndef add(a, b):\n    return a + b\nANSWER: code\nSOLUTION:\n1. x\n=== END").map(b=>A.toProblem(b,['py-0-8'],'py-0-8'))[0];
ok(cp&&cp.ptype==='code'&&cp.starter.startsWith('def add')&&!cp.starter.includes('```')&&cp.tests.includes('assert')&&cp.kp==='k1','code problem parse '+JSON.stringify(cp));
// goals
const gs=A.goalStatus({sid:'cert',ui:'N10-009',date:A.dayKeyFuture||'2099-01-01',created:Date.now()-864e5,startProf:0}); ok(gs.total===25&&gs.need===25&&gs.perWeek>0,'goal status '+JSON.stringify(gs)); ok(A.goalKeys({sid:'cert',ui:'SY0-701'}).length===28,'sec+ keys');
console.log(fails? fails+' FAILURES':'ALL PASS');
