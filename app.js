const BUREAUS = {
  EQU: { key: 'equifax', name: 'Equifax', address: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256' },
  EXP: { key: 'experian', name: 'Experian', address: 'Experian\nP.O. Box 4500\nAllen, TX 75013' },
  TU: { key: 'transunion', name: 'TransUnion', address: 'TransUnion Consumer Solutions\nP.O. Box 2000\nChester, PA 19016-2000' },
};
const EXAMPLE = `John Doe
2616 Kings Gate Dr
Carrollton TX 75006
DOB: 06/26/1968
SSN: 123-45-6789

SN BERNDINO
Xxxxxxxxxxx8439
$0
EQU - TU - CLOSED LP

THD/CBNA
Xxxxxxxxxxxx7165
$244
3BR- OPEN LP

CAPITAL ONE
Xxxxxxxx3748
$0
3BR- INCLUDED IN BANKRUPTCY`;
const TEMPLATE = ({ person, bureau, accounts, today }) => {
  const accountText = accounts.map((a, i) => `${i + 1}. ${a.creditor} — ${a.accountNumber} — ${a.balance}\n   Reported status/comment: ${a.status}`).join('\n\n');
  return `${person.name}\n${person.address}\nDOB: ${person.dob || 'Not provided'}\nSSN: ${person.ssn || 'Not provided'}\n\n${today}\n\n${bureau.address}\n\nRe: Dispute of Inaccurate, Fraudulent, or Unverifiable Information\n\nDear ${bureau.name} Consumer Dispute Department:\n\nI am writing to formally dispute the accuracy and completeness of the account information identified below as it appears on my consumer report. I am requesting a reasonable reinvestigation of each disputed item and correction or deletion of any information that cannot be verified as accurate and complete.\n\nDisputed account(s):\n\n${accountText}\n\nThe information above is being disputed because the reporting, as presently appearing on my file, is inaccurate, fraudulent, incomplete, or otherwise unverifiable. Please review the underlying records and verify all material fields associated with each account, including the account identity, status, balance, payment history, dates, and any comments being reported.\n\nPlease conduct a reasonable reinvestigation and provide the results of that investigation. Where the information cannot be verified as accurate and complete, please delete or correct the inaccurate reporting and send me an updated copy of my consumer report reflecting the results.\n\nThis letter is a direct request for correction of inaccurate or unverifiable information appearing in my file. I expect the investigation to address each account individually rather than simply confirming the information previously furnished.\n\nThank you for your prompt attention to this dispute.\n\nSincerely,\n\n${person.name}`;
};
const $ = id => document.getElementById(id);
const rawInput = $('rawInput'), results = $('results'), emptyState = $('emptyState'), resultCount = $('resultCount'), errorBox = $('errorBox'), toast = $('toast');
const clean = (value = '') => value.trim().replace(/\s+/g, ' ');
function parsePerson(lines) {
  const nonBlank = lines.map(clean).filter(Boolean), name = nonBlank[0] || '';
  const dobLine = nonBlank.find(x => /^DOB\s*:/i.test(x)), ssnLine = nonBlank.find(x => /^SSN\s*:/i.test(x));
  const nameIndex = lines.findIndex(x => clean(x) === name), dobIndex = lines.findIndex(x => /^DOB\s*:/i.test(clean(x)));
  const headerEnd = dobIndex >= 0 ? dobIndex : Math.min(lines.length, nameIndex + 5);
  return { name, address: lines.slice(nameIndex + 1, headerEnd).map(clean).filter(Boolean).join('\n'), dob: dobLine ? clean(dobLine.split(':').slice(1).join(':')) : '', ssn: ssnLine ? clean(ssnLine.split(':').slice(1).join(':')) : '' };
}
function detectBureaus(statusLine) {
  const upper = statusLine.toUpperCase().replace(/[_/|]+/g, ' ');
  if (/\b3BR\b|\bALL\b|\bTHREE\s+BUREAU\b/.test(upper)) return Object.keys(BUREAUS);
  const found = new Set();
  if (/\bEQU\b|\bEQUIFAX\b/.test(upper)) found.add('EQU');
  if (/\bEXP\b|\bEXPERIAN\b/.test(upper)) found.add('EXP');
  if (/\bTU\b|\bTRANSUNION\b/.test(upper)) found.add('TU');
  return [...found];
}
function parseAccounts(lines) {
  const accounts = [];
  for (let i = 0; i < lines.length;) {
    const block = lines.slice(i, i + 4);
    if (block.length === 4 && block.every(v => clean(v))) {
      const [creditor, accountNumber, balance, status] = block.map(clean), bureaus = detectBureaus(status);
      const accountLooksMasked = /[xX*#]/.test(accountNumber) || /\d{3,}/.test(accountNumber);
      if (accountLooksMasked && /(?:\$|\d)/.test(balance) && bureaus.length) { accounts.push({ creditor, accountNumber, balance, status, bureaus }); i += 4; continue; }
    }
    i++;
  }
  return accounts;
}
function parseInput(text) {
  const lines = text.replace(/\r/g, '').split('\n').map(line => line.trimEnd());
  if (!lines.some(line => clean(line))) throw new Error('Paste the client details and account blocks first.');
  const person = parsePerson(lines), accounts = parseAccounts(lines), missing = [];
  if (!person.name) missing.push('a name');
  if (!person.address) missing.push('an address');
  if (!accounts.length) missing.push('at least one valid account block');
  if (missing.length) throw new Error(`Please provide ${missing.join(', ')} in the expected format.`);
  return { person, accounts };
}
function groupByBureau(parsed) {
  const grouped = { EQU: [], EXP: [], TU: [] };
  parsed.accounts.forEach(account => account.bureaus.forEach(code => { if (grouped[code]) grouped[code].push(account); }));
  return grouped;
}
function renderLetters(parsed) {
  const active = Object.entries(groupByBureau(parsed)).filter(([, accounts]) => accounts.length);
  results.innerHTML = ''; resultCount.textContent = `${active.length} letter${active.length === 1 ? '' : 's'}`;
  if (!active.length) { results.classList.add('hidden'); emptyState.classList.remove('hidden'); return; }
  emptyState.classList.add('hidden'); results.classList.remove('hidden');
  active.forEach(([code, accounts]) => {
    const bureau = BUREAUS[code], letter = TEMPLATE({ person: parsed.person, bureau, accounts, today: new Date().toLocaleDateString('en-US') });
    const card = document.createElement('article'); card.className = 'letter-card';
    card.innerHTML = `<div class="letter-card-head"><div><div class="bureau ${bureau.key}">${bureau.name}</div><div class="meta-row compact">${accounts.length} account${accounts.length === 1 ? '' : 's'} assigned</div></div><div class="card-actions"><button class="small-btn copy-btn" type="button">Copy</button><button class="small-btn txt-btn" type="button">TXT</button></div></div><div class="letter-preview"></div><div class="meta-row"><strong>Included:</strong> ${accounts.map(a => `${escapeHtml(a.creditor)} ${escapeHtml(a.accountNumber)}`).join(' · ')}</div>`;
    card.querySelector('.letter-preview').textContent = letter;
    card.querySelector('.copy-btn').addEventListener('click', async () => { try { await navigator.clipboard.writeText(letter); showToast(`${bureau.name} letter copied`); } catch { showToast('Clipboard permission was unavailable'); } });
    card.querySelector('.txt-btn').addEventListener('click', () => downloadText(`${bureau.key}-dispute-letter.txt`, letter));
    results.appendChild(card);
  });
}
function escapeHtml(str) { return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s])); }
function downloadText(filename, text) { const blob = new Blob([text], { type: 'text/plain;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showToast('Letter downloaded'); }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast._timer); showToast._timer = setTimeout(() => toast.classList.remove('show'), 1800); }
$('generateBtn').addEventListener('click', () => { errorBox.classList.add('hidden'); try { renderLetters(parseInput(rawInput.value)); } catch (error) { resultCount.textContent = '0 letters'; errorBox.textContent = error instanceof Error ? error.message : 'Unable to parse the pasted data.'; errorBox.classList.remove('hidden'); } });
$('loadExampleBtn').addEventListener('click', () => { rawInput.value = EXAMPLE; rawInput.focus(); showToast('Example loaded'); });
$('clearBtn').addEventListener('click', () => { rawInput.value = ''; results.innerHTML = ''; results.classList.add('hidden'); emptyState.classList.remove('hidden'); resultCount.textContent = '0 letters'; errorBox.classList.add('hidden'); });
