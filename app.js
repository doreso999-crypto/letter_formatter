const BUREAUS = {
  EQU: { key: 'equifax', name: 'Equifax', address: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256' },
  EXP: { key: 'experian', name: 'Experian', address: 'Experian\nP.O. Box 4500\nAllen, TX 75013' },
  TU: { key: 'transunion', name: 'TransUnion', address: 'TransUnion Consumer Solutions\nP.O. Box 2000\nChester, PA 19016-2000' }
};

const EXAMPLE_PERSONAL = `John Doe
2616 Kings Gate Dr
Carrollton TX 75006
DOB: 06/26/1968
SSN: 123-45-6789`;
const EXAMPLE_ITEMS = `TBOM CCI MC
Xxxxxxxx6638
$531
EX - TU - OPEN LP

THD/CBNA
Xxxxxxxxxxxx7165
$244
3BR - LATE PAYMENT

CAPITAL ONE
Xxxxxxxx3748
$0
3BR - INCLUDED IN BANKRUPTCY - CHAPTER 7 - DISCHARGED`;

const $ = id => document.getElementById(id);
const caseModal = $('caseModal'), caseForm = $('caseForm'), modalError = $('modalError');
const results = $('results'), emptyState = $('emptyState'), resultCount = $('resultCount');
const resultsTitle = $('resultsTitle'), resultsSubtitle = $('resultsSubtitle'), toast = $('toast');
const clean = (value = '') => value.trim().replace(/\s+/g, ' ');

function getWashingtonDateParts() {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
  return Object.fromEntries(formatter.formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
function getWashingtonDateInputValue() {
  const { year, month, day } = getWashingtonDateParts();
  return `${year}-${month}-${day}`;
}
function formatLetterDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function parsePersonalInfo(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean);
  const name = clean(lines[0] || '');
  const dobIndex = lines.findIndex(line => /^DOB\s*:/i.test(line));
  const ssnIndex = lines.findIndex(line => /^SSN\s*:/i.test(line));
  const cutoff = [dobIndex, ssnIndex].filter(i => i >= 0).sort((a, b) => a - b)[0] ?? lines.length;
  const address = lines.slice(1, cutoff).join('\n');
  const dobLine = dobIndex >= 0 ? lines[dobIndex] : '';
  const ssnLine = ssnIndex >= 0 ? lines[ssnIndex] : '';
  return {
    name,
    address,
    dob: dobLine ? clean(dobLine.split(':').slice(1).join(':')) : '',
    ssn: ssnLine ? clean(ssnLine.split(':').slice(1).join(':')) : ''
  };
}

function detectBureaus(line) {
  const upper = String(line || '').toUpperCase().replace(/[_/|]+/g, ' ');
  if (/\b3BR\b|\bALL\s+BUREAUS?\b|\bTHREE\s+BUREAUS?\b/.test(upper)) return ['EQU', 'EXP', 'TU'];
  const found = [];
  if (/\bEQU\b|\bEQUIFAX\b/.test(upper)) found.push('EQU');
  if (/\bEXP\b|\bEX\b|\bEXPERIAN\b/.test(upper)) found.push('EXP');
  if (/\bTU\b|\bTRANSUNION\b/.test(upper)) found.push('TU');
  return [...new Set(found)];
}

function classifyItem(statusLine) {
  const value = clean(statusLine).toUpperCase();
  if (/HARD\s+INQUIRY|INQUIRY/.test(value)) return { key: 'HARD_INQUIRY', label: 'Hard Inquiry', details: [] };

  if (/INCLUDED\s+IN\s+BANKRUPTCY|BANKRUPTCY|CHAPTER\s*7|CHAPTER\s*13|DISCHARGED|DISMISSED/.test(value)) {
    const details = [];
    if (/CHAPTER\s*7/.test(value)) details.push('Chapter 7');
    if (/CHAPTER\s*13/.test(value)) details.push('Chapter 13');
    if (/DISCHARGED/.test(value)) details.push('Discharged');
    if (/DISMISSED/.test(value)) details.push('Dismissed');
    return { key: 'BANKRUPTCY', label: 'Bankruptcy', details };
  }

  if (/CHARGE.?OFF|COLLECTION|REPOSSESSION|REPO\b/.test(value)) {
    const details = [];
    if (/CHARGE.?OFF/.test(value)) details.push('Charge-Off');
    if (/COLLECTION/.test(value)) details.push('Collection');
    if (/REPOSSESSION|REPO\b/.test(value)) details.push('Repossession');
    return { key: 'CHARGE_OFF_COLLECTION_REPOSSESSION', label: 'Charge-Off / Collection / Repossession', details };
  }

  const details = [];
  if (/\bOPEN\b/.test(value)) details.push('Open');
  if (/\bCLOSED\b/.test(value)) details.push('Closed');
  if (/LATE\s+PAYMENT|\bLATE\b|\bLP\b/.test(value)) details.push('Late Payment');
  return { key: 'OPEN_CLOSED_LATE', label: 'Open / Closed / Late Payment', details };
}

function parseItems(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(line => line.trim());
  const accounts = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i]) { i += 1; continue; }
    const block = lines.slice(i, i + 4);
    if (block.length === 4 && block.every(Boolean)) {
      const [creditor, accountNumber, balance, status] = block.map(clean);
      const bureaus = detectBureaus(status);
      const validNumber = /[xX*#]/.test(accountNumber) || /\d{3,}/.test(accountNumber);
      const validBalance = /\$?\s*-?\d/.test(balance);
      if (validNumber && validBalance && bureaus.length) {
        accounts.push({ creditor, accountNumber, balance, status, bureaus, category: classifyItem(status) });
        i += 4;
        continue;
      }
    }
    i += 1;
  }
  return accounts;
}

function groupAccounts(accounts) {
  return {
    EQU: accounts.filter(a => a.bureaus.includes('EQU')),
    EXP: accounts.filter(a => a.bureaus.includes('EXP')),
    TU: accounts.filter(a => a.bureaus.includes('TU'))
  };
}

function categoryTemplate(account) {
  const library = window.LETTER_TEMPLATES || {};
  switch (account.category.key) {
    case 'BANKRUPTCY': return library.bankruptcy || '';
    case 'CHARGE_OFF_COLLECTION_REPOSSESSION': return library.chargeOffCollectionRepossession || '';
    case 'HARD_INQUIRY': return library.hardInquiry || '';
    default: return library.openClosedLate || '';
  }
}

function accountLines(accounts) {
  return accounts.map((a, i) => {
    const detail = a.category.details?.length ? `\n   Category details: ${a.category.details.join(', ')}` : '';
    return [`${i + 1}. ${a.creditor}`, `   Account: ${a.accountNumber}`, `   Balance: ${a.balance}`, `   Reported status/comment: ${a.status}`, `   Category: ${a.category.label}${detail}`].join('\n');
  }).join('\n\n');
}

function template({ person, bureau, accounts, date }) {
  const base = window.LETTER_TEMPLATES?.base || {};
  const identity = [person.name, person.address, person.dob ? `DOB: ${person.dob}` : '', person.ssn ? `SSN: ${person.ssn}` : ''].filter(Boolean).join('\n');
  const categoryNotes = [...new Set(accounts.map(categoryTemplate).filter(Boolean))].join('\n\n');
  const subject = base.subject || 'Re: Dispute of Inaccurate, Fraudulent, or Unverifiable Information';
  const opening = categoryNotes || base.opening || '';
  const closing = base.closing || 'Please investigate each disputed item individually and provide the results of the reinvestigation.';
  return `${identity}\n\n${date}\n\n${bureau.address}\n\n${subject}\n\nDear ${bureau.name} Consumer Dispute Department:\n\n${opening}\n\nDISPUTED ITEM(S)\n\n${accountLines(accounts)}\n\n${closing}\n\nThank you for your attention to this dispute.\n\nSincerely,\n\n${person.name}`;
}

function renderCategoryLegend() {
  const target = $('categoryLegend');
  if (!target || !window.LETTER_CATEGORY_TEMPLATES) return;
  target.innerHTML = Object.entries(window.LETTER_CATEGORY_TEMPLATES).map(([key, meta]) => `<div class="category-chip"><span class="category-dot category-${key.toLowerCase()}"></span>${meta.label}</div>`).join('');
}

function renderLetters(person, accounts, date) {
  const grouped = groupAccounts(accounts);
  const active = Object.entries(grouped).filter(([, items]) => items.length);
  results.innerHTML = '';
  results.style.setProperty('--columns', Math.min(active.length, 3));
  resultCount.textContent = `${active.length} letter${active.length === 1 ? '' : 's'}`;
  resultsTitle.textContent = `${person.name} · Letters Ready`;
  resultsSubtitle.textContent = `${accounts.length} item${accounts.length === 1 ? '' : 's'} parsed and routed to ${active.length} bureau${active.length === 1 ? '' : 's'}.`;

  if (!active.length) { results.classList.add('hidden'); emptyState.classList.remove('hidden'); return; }
  emptyState.classList.add('hidden'); results.classList.remove('hidden');

  active.forEach(([code, items]) => {
    const bureau = BUREAUS[code], letter = template({ person, bureau, accounts: items, date });
    const categories = [...new Set(items.map(a => a.category.label))];
    const card = document.createElement('article');
    card.className = 'letter-card';
    card.innerHTML = `<div class="letter-card-head"><div><div class="bureau ${bureau.key}">${bureau.name}</div><div class="meta-row compact">${items.length} item${items.length === 1 ? '' : 's'} assigned</div></div><div class="card-actions"><button class="small-btn copy-btn" type="button">Copy</button><button class="small-btn txt-btn" type="button">TXT</button></div></div><div class="category-row">${categories.map(c => `<span class="category-badge">${escapeHtml(c)}</span>`).join('')}</div><div class="letter-preview"></div><div class="meta-row"><strong>Included:</strong> ${items.map(a => `${escapeHtml(a.creditor)} ${escapeHtml(a.accountNumber)}`).join(' · ')}</div>`;
    card.querySelector('.letter-preview').textContent = letter;
    card.querySelector('.copy-btn').addEventListener('click', async () => { try { await navigator.clipboard.writeText(letter); showToast(`${bureau.name} letter copied`); } catch { showToast('Clipboard permission was unavailable'); } });
    card.querySelector('.txt-btn').addEventListener('click', () => downloadText(`${bureau.key}-letter.txt`, letter));
    results.appendChild(card);
  });
}

function escapeHtml(str) { return String(str).replace(/[&<>"']/g, s => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[s])); }
function downloadText(filename, text) { const blob = new Blob([text], {type:'text/plain;charset=utf-8'}), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showToast('Letter downloaded'); }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800); }
function showModalError(message) { modalError.textContent = message; modalError.classList.remove('hidden'); }
function openModal() { modalError.classList.add('hidden'); caseModal.classList.remove('hidden'); caseModal.setAttribute('aria-hidden','false'); if (!$('letterDate').value) $('letterDate').value = getWashingtonDateInputValue(); updateDcDateNote(); }
function closeModal() { caseModal.classList.add('hidden'); caseModal.setAttribute('aria-hidden','true'); }
function updateDcDateNote() { $('dcDateNote').textContent = $('letterDate').value ? `Washington, DC · ${formatLetterDate($('letterDate').value)}` : 'Washington, DC'; }
function clearLetters() { results.innerHTML=''; results.classList.add('hidden'); emptyState.classList.remove('hidden'); resultCount.textContent='0 letters'; resultsTitle.textContent='No case loaded'; resultsSubtitle.textContent='Click New Case to enter personal information and report items.'; showToast('Letters cleared'); }

$('newCaseBtn').addEventListener('click', openModal);
$('closeModalBtn').addEventListener('click', closeModal);
$('cancelBtn').addEventListener('click', closeModal);
$('clearLettersBtn').addEventListener('click', clearLetters);
$('letterDate').addEventListener('change', updateDcDateNote);
$('caseModal').addEventListener('click', event => { if (event.target === $('caseModal')) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !caseModal.classList.contains('hidden')) closeModal(); });

caseForm.addEventListener('submit', event => {
  event.preventDefault(); modalError.classList.add('hidden');
  const person = parsePersonalInfo($('personalInput').value);
  const accounts = parseItems($('accountInput').value);
  const dateValue = $('letterDate').value;
  if (!person.name) return showModalError('Please provide the client name.');
  if (!person.address) return showModalError('Please provide the client address.');
  if (!dateValue) return showModalError('Please select a letter date.');
  if (!accounts.length) return showModalError('No valid items were found. Each item currently needs four lines: creditor, account number, balance, and bureau/category line.');
  renderLetters(person, accounts, formatLetterDate(dateValue));
  closeModal();
  showToast(`${Object.values(groupAccounts(accounts)).filter(items => items.length).length} letter(s) generated`);
});

window.addEventListener('load', () => { $('personalInput').value = EXAMPLE_PERSONAL; $('accountInput').value = ''; $('letterDate').value = getWashingtonDateInputValue(); updateDcDateNote(); renderCategoryLegend(); });
