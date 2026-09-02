window.LETTER_CATEGORY_OPTIONS = [
  { key: 'LATE_PAYMENT', label: 'Late Payment', templateKey: 'latePayment', subject: 'Re: Formal Dispute of Inaccurate Late-Payment Reporting', closing: 'Upon completion of the investigation, please provide written results identifying the outcome of the reinvestigation and any information that was corrected, modified, or deleted.\n\nPlease also provide an updated copy of my consumer report reflecting any changes resulting from this dispute.\n\nI expect this dispute to be investigated fully and in accordance with the requirements of the Fair Credit Reporting Act. I am retaining copies of this correspondence and any supporting documentation for my records.\n\nPlease provide the written results of your investigation upon completion.', description: 'Dispute inaccurate or unverifiable late-payment reporting.' },
  { key: 'DELETION', label: 'Deletion', templateKey: 'deletion', description: 'Request deletion of disputed information that cannot be verified as accurate and complete.' },
  { key: 'DISMISSED_BANKRUPTCY', label: 'Dismissed Bankruptcy', templateKey: 'dismissedBankruptcy', description: 'Bankruptcy reporting identified as dismissed.' },
  { key: 'DISCHARGED_BANKRUPTCY', label: 'Discharged Bankruptcy', templateKey: 'dischargedBankruptcy', description: 'Bankruptcy reporting identified as discharged.' },
  { key: 'CHAPTER_7_BANKRUPTCY', label: 'Chapter 7 Bankruptcy', templateKey: 'chapter7Bankruptcy', description: 'Chapter 7 bankruptcy reporting.' },
  { key: 'CHAPTER_13_BANKRUPTCY', label: 'Chapter 13 Bankruptcy', templateKey: 'chapter13Bankruptcy', description: 'Chapter 13 bankruptcy reporting.' },
  { key: 'HARD_INQUIRY', label: 'Hard Inquiry', templateKey: 'hardInquiry', description: 'Hard credit inquiry dispute.' },
  { key: 'PERSONAL_INFORMATION', label: 'Personal Information', templateKey: 'personalInformation', description: 'Incorrect personal information dispute.' }
];

window.LETTER_CATEGORY_MAP = Object.fromEntries(window.LETTER_CATEGORY_OPTIONS.map(option => [option.key, option]));
