const BUREAUS = {
  EQU: { key: 'equifax', name: 'Equifax', address: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256' },
  EXP: { key: 'experian', name: 'Experian', address: 'Experian\nP.O. Box 4500\nAllen, TX 75013' },
  TU: { key: 'transunion', name: 'TransUnion', address: 'TransUnion Consumer Solutions\nP.O. Box 2000\nChester, PA 19016-2000' }
};

const EXAMPLE_ACCOUNTS = `TBOM CCI MC
Xxxxxxxx6638
$531
EX - TU - OPEN LP

THD/CBNA
Xxxxxxxxxxxx7165
$244
3BR - OPEN LP

CAPITAL ONE
Xxxxxxxx3748
$0
3BR - INCLUDED IN BANKRUPTCY`;

const $ = (id) => document.getElementById(id);
const caseModal = $('caseModal');
const caseForm = $('caseForm');
const modalError = $('modalError');
const results = $('results');
const emptyState = $('emptyState');
const resultCount = $('resultCount');
const resultsTitle = $('resultsTitle');
const resultsSubtitle = $('resultsSubtitle');
const toast = $('toast');

const clean = (value = '') => value.trim().replace(/\s+/g, ' ');

function getWashingtonDateParts() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return { year: parts.year, month: parts.month, day: parts.day };
}

function getWashingtonDateInputValue() {
  const { year, month, day } = getWashingtonDateParts();
  return `${year}-${month}-${day}`;
}

function formatLetterDate(inputValue) {
  if (!inputValue) return '';
  const [year, month, day] = inputValue.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric'
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function openModal() {
  modalError.classList.add('hidden');
  caseModal.classList.remove('hidden');
  caseModal.setAttribute('aria-hidden', 'false');
  if (!$('letterDate').value) $('letterDate').value = getWashingtonDateInputValue();
  updateDcDateNote();
  setTimeout(() => $('personName').focus(), 30);
}

function closeModal() {
  caseModal.classList.add('hidden');
  caseModal.setAttribute('aria-hidden', 'true');
}

function updateDcDateNote() {
  const value = $('letterDate').value;
  $('dcDateNote').textContent = value ? `Washington, DC · ${formatLetterDate(value)}` : 'Washington, DC';
}

function detectBureaus(statusLine) {
  const upper = String(statusLine || '').toUpperCase().replace(/[_/|]+/g, ' ');
  if (/\b3BR\b|\bALL\b|\bALL\s+BUREAUS\b|\bTHREE\s+BUREAUS?\b/.test(upper)) return ['EQU', 'EXP', 'TU'];
  const found = [];
  if (/\bEQU\b|\bEQUIFAX\b/.test(upper)) found.push('EQU');
  if (/\bEXP\b|\bEX\b|\bEXPERIAN\b/.test(upper)) found.push('EXP');
  if (/\bTU\b|\bTRANSUNION\b/.test(upper)) found.push('TU');
  return [...new Set(found)];
}

function parseAccounts(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(line => line.trim());
  const accounts = [];
  let i = 0;

  while (i < lines.length) {
    if (!lines[i]) { i += 1; continue; }
    const block = lines.slice(i, i + 4);
    if (block.length === 4 && block.every(Boolean)) {
      const [creditor, accountNumber, balance, status] = block.map(clean);
      const bureaus = detectBureaus(status);
      const hasAccountNumber = /[xX*#]/.test(accountNumber) || /\d{3,}/.test(accountNumber);
      const hasBalance = /\$?\s*-?\d/.test(balance);
      if (hasAccountNumber && hasBalance && bureaus.length) {
        accounts.push({ creditor, accountNumber, balance, status, bureaus });
        i += 4;
        continue;
      }
    }
    i += 1;
  }
  return accounts;
}

function makePerson() {
  return {
    name: clean($('personName').value),
    address: clean($('personAddress').value),
    dob: clean($('personDob').value),
    ssn: clean($('personSsn').value)
  };
}

function groupAccounts(accounts) {
  const grouped = { EQU: [], EXP: [], TU: [] };
  accounts.forEach(account => account.bureaus.forEach(code => grouped[code].push(account)));
  return grouped;
}

function accountLines(accounts) {
  return accounts.map((a, i) => [
    `${i + 1}. ${a.creditor}`,
    `   Account: ${a.accountNumber}`,
    `   Balance: ${a.balance}`,
    `   Reported status/comment: ${a.status}`
  ].join('\n')).join('\n\n');
}

function template({ person, bureau, accounts, date }) {
  const identity = [
    person.name,
    person.address,
    person.dob ? `DOB: ${person.dob}` : '',
    person.ssn ? `SSN: ${person.ssn}` : ''
  ].filter(Boolean).join('\n');

  return `${identity}\n\n${date}\n\n${bureau.address}\n\nRe: Dispute of Inaccurate, Fraudulent, or Unverifiable Information\n\nDear ${bureau.name} Consumer Dispute Department:\n\nI am writing to formally dispute the accuracy and completeness of the information identified below as it appears on my consumer report. I request a reasonable reinvestigation of each listed item and correction or deletion of any information that cannot be verified as accurate and complete.\n\nDISPUTED ACCOUNT(S)\n\n${accountLines(accounts)}\n\nThe information above is disputed because the reporting, as presently appearing on my file, is inaccurate, fraudulent, incomplete, or otherwise unverifiable. Please review the underlying records and verify the material fields associated with each item, including the account identity, status, balance, payment history, dates, and any comments being reported.\n\nPlease investigate each disputed account individually and provide the results of the reinvestigation. Where any information cannot be verified as accurate and complete, please correct or delete the information and provide an updated copy of my consumer report reflecting the results.\n\nThank you for your attention to this dispute.\n\nSincerely,\n\n${person.name}`;
}

function renderLetters(person, accounts, date) {
  const grouped = groupAccounts(accounts);
  const active = Object.entries(grouped).filter(([, items]) => items.length);

  results.innerHTML = '';
  results.style.setProperty('--columns', Math.min(active.length, 3));
  resultCount.textContent = `${active.length} letter${active.length === 1 ? '' : 's'}`;
  resultsTitle.textContent = `${person.name} · Letters Ready`;
  resultsSubtitle.textContent = `${accounts.length} account${accounts.length === 1 ? '' : 's'} parsed and routed to ${active.length} bureau${active.length === 1 ? '' : 's'}.`;

  if (!active.length) {
    results.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  results.classList.remove('hidden');

  active.forEach(([code, items]) => {
    const bureau = BUREAUS[code];
    const letter = template({ person, bureau, accounts: items, date });
    const card = document.createElement('article');
    card.className = 'letter-card';
    card.innerHTML = `
      <div class="letter-card-head">
        <div>
          <div class="bureau ${bureau.key}">${bureau.name}</div>
          <div class="meta-row compact">${items.length} account${items.length === 1 ? '' : 's'} assigned</div>
        </div>
        <div class="card-actions">
          <button class="small-btn copy-btn" type="button">Copy</button>
          <button class="small-btn txt-btn" type="button">TXT</button>
        </div>
      </div>
      <div class="letter-preview"></div>
      <div class="meta-row"><strong>Included:</strong> ${items.map(a => `${escapeHtml(a.creditor)} ${escapeHtml(a.accountNumber)}`).join(' · ')}</div>`;

    card.querySelector('.letter-preview').textContent = letter;
    card.querySelector('.copy-btn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(letter);
        showToast(`${bureau.name} letter copied`);
      } catch {
        showToast('Clipboard permission was unavailable');
      }
    });
    card.querySelector('.txt-btn').addEventListener('click', () => downloadText(`${bureau.key}-letter.txt`, letter));
    results.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[s]));
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast('Letter downloaded');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function showModalError(message) {
  modalError.textContent = message;
  modalError.classList.remove('hidden');
}

$('newCaseBtn').addEventListener('click', openModal);
$('closeModalBtn').addEventListener('click', closeModal);
$('cancelBtn').addEventListener('click', closeModal);
$('letterDate').addEventListener('change', updateDcDateNote);

caseModal.addEventListener('click', (event) => {
  if (event.target === caseModal) closeModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !caseModal.classList.contains('hidden')) closeModal();
});

caseForm.addEventListener('submit', (event) => {
  event.preventDefault();
  modalError.classList.add('hidden');

  const person = makePerson();
  const accounts = parseAccounts($('accountInput').value);
  const dateValue = $('letterDate').value;

  if (!person.name) return showModalError('Please enter the client name.');
  if (!person.address) return showModalError('Please enter the client address.');
  if (!dateValue) return showModalError('Please select a letter date.');
  if (!accounts.length) return showModalError('No valid account blocks were found. Each account must use four lines: creditor, account number, balance, and bureau/status line.');

  renderLetters(person, accounts, formatLetterDate(dateValue));
  closeModal();
  showToast(`${Object.values(groupAccounts(accounts)).filter(items => items.length).length} bureau letter(s) generated`);
});

window.addEventListener('load', () => {
  $('letterDate').value = getWashingtonDateInputValue();
  updateDcDateNote();
});
