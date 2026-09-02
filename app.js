const BUREAUS = {
  EQU: { key: 'equifax', name: 'Equifax Information Services, LLC', address: 'Equifax Information Services, LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256' },
  EXP: { key: 'experian', name: 'Experian', address: 'Experian\nP.O. Box 4500\nAllen, TX 75013' },
  TU: { key: 'transunion', name: 'TransUnion Consumer Solutions', address: 'TransUnion Consumer Solutions\nP.O. Box 2000\nChester, PA 19016-2000' }
};

const EXAMPLE_PERSONAL = `John Doe\n2616 Kings Gate Dr\nCarrollton TX 75006\nDOB: 06/26/1968\nSSN: 123-45-6789`;

const $ = id => document.getElementById(id);
const caseModal = $('caseModal'), caseForm = $('caseForm'), modalError = $('modalError');
const results = $('results'), emptyState = $('emptyState'), resultCount = $('resultCount');
const resultsTitle = $('resultsTitle'), resultsSubtitle = $('resultsSubtitle'), toast = $('toast');
const clean = (value = '') => value.trim().replace(/\s+/g, ' ');

function getWashingtonDateParts() {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
  return Object.fromEntries(formatter.formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
function getWashingtonDateInputValue() { const {year,month,day}=getWashingtonDateParts(); return `${year}-${month}-${day}`; }
function formatLetterDate(value) {
  if (!value) return '';
  const [year,month,day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'long',day:'numeric'}).format(new Date(Date.UTC(year,month-1,day,12)));
}
function parsePersonalInfo(text) {
  const lines=String(text||'').replace(/\r/g,'').split('\n').map(line=>line.trim()).filter(Boolean);
  const name=clean(lines[0]||'');
  const dobIndex=lines.findIndex(line=>/^(Date of Birth|DOB)\s*:/i.test(line));
  const ssnIndex=lines.findIndex(line=>/^SS#?\s*:/i.test(line) || /^SSN\s*:/i.test(line));
  const cutoff=[dobIndex,ssnIndex].filter(i=>i>=0).sort((a,b)=>a-b)[0] ?? lines.length;
  return {name,address:lines.slice(1,cutoff).join('\n'),dob:dobIndex>=0?clean(lines[dobIndex].split(':').slice(1).join(':')):'',ssn:ssnIndex>=0?clean(lines[ssnIndex].split(':').slice(1).join(':')):''};
}
function detectBureaus(line) {
  const upper=String(line||'').toUpperCase().replace(/[_/|]+/g,' ');
  if (/\b3BR\b|\bALL\s+BUREAUS?\b|\bTHREE\s+BUREAUS?\b/.test(upper)) return ['EQU','EXP','TU'];
  const found=[];
  if (/\bEQU\b|\bEQUIFAX\b/.test(upper)) found.push('EQU');
  if (/\bEXP\b|\bEX\b|\bEXPERIAN\b/.test(upper)) found.push('EXP');
  if (/\bTU\b|\bTRANSUNION\b/.test(upper)) found.push('TU');
  return [...new Set(found)];
}
function parseItems(text) {
  const lines=String(text||'').replace(/\r/g,'').split('\n').map(line=>line.trim());
  const items=[];
  let i=0;
  let currentBureau=null;
  let inquiryMode=false;

  while(i<lines.length){
    const raw=lines[i];
    if(!raw){i++;continue;}
    const cleanedLine=raw.replace(/^[-•*]\s*/,'').trim();
    const heading=cleanedLine.replace(/[:：]\s*$/,'').trim().toUpperCase();
    const headingCode = heading==='EQUIFAX' ? 'EQU' : heading==='EXPERIAN' ? 'EXP' : heading==='TRANSUNION' ? 'TU' : null;
    if(headingCode){ currentBureau=headingCode; inquiryMode=true; i++; continue; }
    const inquiryMatch=cleanedLine.match(/^(.+?)\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s*$/);
    if(inquiryMode && currentBureau && inquiryMatch){
      const creditor=clean(inquiryMatch[1]);
      const inquiryDate=inquiryMatch[2].replace(/-/g,'/');
      if(creditor && inquiryDate) items.push({label: creditor,identifier: inquiryDate,balance: inquiryDate,details:'HARD INQUIRY',bureaus:[currentBureau]});
      i++; continue;
    }
    const block=lines.slice(i,i+4);
    if(block.length===4 && block.every(Boolean)){
      const [label,identifier,balance,details]=block.map(clean), bureaus=detectBureaus(details);
      const validIdentifier=/[xX*#]/.test(identifier)||/\d{3,}/.test(identifier);
      const validValue=/\$?\s*-?\d/.test(balance) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(balance);
      if(validIdentifier && validValue && bureaus.length){ items.push({label,identifier,balance,details,bureaus}); i+=4; continue; }
    }
    i++;
  }
  return items;
}
function groupItems(items){ return {EQU:items.filter(x=>x.bureaus.includes('EQU')),EXP:items.filter(x=>x.bureaus.includes('EXP')),TU:items.filter(x=>x.bureaus.includes('TU'))}; }
function selectedTemplate(categoryKey){ const option=window.LETTER_CATEGORY_MAP?.[categoryKey]; return option?.templateKey ? (window.LETTER_TEMPLATES?.[option.templateKey] || '') : ''; }
function itemLines(items){ return items.map((x,i)=>`${i+1}. ${x.label} Account #: ${x.identifier}`).join('\n'); }
function inquiryLines(items){ return items.map((x,i)=>`${i+1}. ${x.label} ${x.identifier}`).join('\n') + (items.length ? '\n\n    I DID NOT AUTHORIZE THIS INQUIRY. PLEASE DELETE THIS IMMEDIATELY' : ''); }
function bankruptcyLines(items){ return items.map(x=>`Bankruptcy – Case Number: ${x.identifier} – Filing Date: ${x.balance}`).join('\n\n'); }
function buildLetter({person,bureau,items,date,categoryKey}){
  const base=window.LETTER_TEMPLATES?.base||{};
  const identity=[person.name,person.address,person.dob?`Date of Birth: ${person.dob}`:'',person.ssn?`SS#: ${person.ssn}`:''].filter(Boolean).join('\n');
  const category=window.LETTER_CATEGORY_MAP?.[categoryKey];
  let body=selectedTemplate(categoryKey)||base.opening||'';
  const disputed=itemLines(items);
  if(categoryKey==='LATE_PAYMENT' || categoryKey==='DELETION' || categoryKey==='FACTUAL') body=body.replace('[[DISPUTED_ITEMS]]',disputed);
  if(categoryKey==='HARD_INQUIRY') body=body.replace('[[INQUIRY_ITEMS]]',inquiryLines(items)).replace(/\n\s*I DID NOT AUTHORIZE THIS INQUIRY\. PLEASE DELETE THIS IMMEDIATELY\s*$/,'');
  if(categoryKey==='DISCHARGED_BANKRUPTCY' || categoryKey==='DISMISSED_BANKRUPTCY') body=body.replace('[[BANKRUPTCY_ITEMS]]',bankruptcyLines(items)).replace('[[CASE_NUMBER]]',items[0]?.identifier||'').replace('[[FILING_DATE]]',items[0]?.balance||'');
  const subject=category?.subject || `Re: ${category?.label || base.subject || 'Credit Report Dispute'}`;
  const specialCategory=['LATE_PAYMENT','DELETION','DISCHARGED_BANKRUPTCY','DISMISSED_BANKRUPTCY','HARD_INQUIRY','FACTUAL'].includes(categoryKey);
  const closing=category?.closing || (specialCategory ? '' : (base.closing||'Please investigate each disputed item individually and correct or delete any information that cannot be verified as accurate and complete.'));
  const genericDisputed=specialCategory?'':`\n\nDISPUTED ITEM(S)\n\n${disputed}`;
  const closingBlock=closing?`\n\n${closing}`:'';
  const salutation=(categoryKey==='DISCHARGED_BANKRUPTCY'||categoryKey==='DISMISSED_BANKRUPTCY'||categoryKey==='HARD_INQUIRY'||categoryKey==='FACTUAL') ? 'To Whom It May Concern:' : `Dear ${bureau.name}:`;
  return `${identity}\n\n${date}\n\n${bureau.address}\n\n${subject}\n\n${salutation}\n\n${body}${genericDisputed}${closingBlock}\n\nSincerely,\n\n${person.name}`;
}
function clearLetters(){results.innerHTML='';results.classList.add('hidden');emptyState.classList.remove('hidden');resultCount.textContent='0 letters';resultsTitle.textContent='No case loaded';resultsSubtitle.innerHTML='Click <strong>New Case</strong> to select the letter category and enter the case.';showToast('Letters cleared');}
function renderLetters(person,items,date,categoryKey){
  const grouped=groupItems(items),active=Object.entries(grouped).filter(([,list])=>list.length);
  results.innerHTML='';results.style.setProperty('--columns',Math.min(active.length,3));resultCount.textContent=`${active.length} letter${active.length===1?'':'s'}`;
  const category=window.LETTER_CATEGORY_MAP?.[categoryKey];
  resultsTitle.textContent=`${person.name} · ${category?.label || 'Letters Ready'}`;
  resultsSubtitle.textContent=`${items.length} item${items.length===1?'':'s'} parsed and routed to ${active.length} bureau${active.length===1?'':'s'}.`;
  if(!active.length){results.classList.add('hidden');emptyState.classList.remove('hidden');return;}
  emptyState.classList.add('hidden');results.classList.remove('hidden');
  active.forEach(([code,list])=>{
    const bureau=BUREAUS[code],letter=buildLetter({person,bureau,items:list,date,categoryKey});
    const card=document.createElement('article');card.className='letter-card';
    card.innerHTML=`<div class="letter-card-head"><div><div class="bureau ${bureau.key}">${bureau.name}</div><div class="meta-row compact">${list.length} item${list.length===1?'':'s'} assigned</div></div><div class="card-actions"><button class="small-btn copy-btn" type="button">Copy</button><button class="small-btn txt-btn" type="button">TXT</button></div></div><div class="category-row"><span class="category-badge">${escapeHtml(category?.label||'')}</span></div><div class="letter-preview"></div><div class="meta-row"><strong>Included:</strong> ${list.map(x=>`${escapeHtml(x.label)} ${escapeHtml(x.identifier)}`).join(' · ')}</div>`;
    card.querySelector('.letter-preview').textContent=letter;
    card.querySelector('.copy-btn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(letter);showToast(`${bureau.name} letter copied`);}catch{showToast('Clipboard permission was unavailable');}});
    card.querySelector('.txt-btn').addEventListener('click',()=>downloadText(`${bureau.key}-${String(category?.label||'letter').toLowerCase().replace(/[^a-z0-9]+/g,'-')}.txt`,letter));
    results.appendChild(card);
  });
}
function escapeHtml(str){return String(str).replace(/[&<>\"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[s]));}
function downloadText(filename,text){const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast('Letter downloaded');}
function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),1800);}
function showModalError(message){modalError.textContent=message;modalError.classList.remove('hidden');}
function openModal(){modalError.classList.add('hidden');caseModal.classList.remove('hidden');caseModal.setAttribute('aria-hidden','false');if(!$('letterDate').value)$('letterDate').value=getWashingtonDateInputValue();updateDcDateNote();setTimeout(()=>$('letterCategory').focus(),30);}
function closeModal(){caseModal.classList.add('hidden');caseModal.setAttribute('aria-hidden','true');}
function updateDcDateNote(){ $('dcDateNote').textContent=$('letterDate').value?`Washington, DC · ${formatLetterDate($('letterDate').value)}`:'Washington, DC'; }
$('newCaseBtn').addEventListener('click',openModal);$('closeModalBtn').addEventListener('click',closeModal);$('cancelBtn').addEventListener('click',closeModal);$('clearLettersBtn').addEventListener('click',clearLetters);$('letterDate').addEventListener('change',updateDcDateNote);$('letterCategory').addEventListener('change',()=>{const option=window.LETTER_CATEGORY_MAP?.[$('letterCategory').value];$('categoryNote').textContent=option?.description||'The selected category controls the letter wording.';});
caseModal.addEventListener('click',e=>{if(e.target===caseModal)closeModal();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!caseModal.classList.contains('hidden'))closeModal();});
caseForm.addEventListener('submit',e=>{e.preventDefault();modalError.classList.add('hidden');const person=parsePersonalInfo($('personalInput').value),items=parseItems($('accountInput').value),categoryKey=$('letterCategory').value,dateValue=$('letterDate').value;if(!categoryKey)return showModalError('Please select a letter category.');if(!person.name)return showModalError('Please provide the client name.');if(!person.address)return showModalError('Please provide the client address.');if(!dateValue)return showModalError('Please select a letter date.');if(!items.length)return showModalError('No valid report items were found. Use the standard four-line account format, or for Hard Inquiry use bureau headings such as EQUIFAX: followed by one or more "creditor date" lines.');renderLetters(person,items,formatLetterDate(dateValue),categoryKey);closeModal();showToast('Letters generated');});
window.addEventListener('load',()=>{$('personalInput').value=EXAMPLE_PERSONAL;$('letterDate').value=getWashingtonDateInputValue();updateDcDateNote();});
