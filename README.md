# Letter Formatter

A browser-only tool for turning compact credit-report notes into bureau-specific letter drafts.

## Workflow

1. Click **New Case**.
2. Paste the client's complete **Personal Info** block once. The parser recognizes the name, address, `DOB:` and `SSN:` lines.
3. Choose the letter date. The default is calculated using `America/New_York`, the Washington, DC timezone.
4. Paste report items using four lines per item:

```text
TBOM CCI MC
Xxxxxxxx6638
$531
EX - TU - OPEN LP
```

5. Click **Generate Letters**.
6. The app automatically creates 1, 2, or 3 bureau columns based on the bureau codes in the pasted items.
7. Use **Copy** or **TXT** on each generated letter. Use **Clear Letters** to remove the current output.

## Bureau routing

- `EQU` = Equifax
- `EXP` or `EX` = Experian
- `TU` = TransUnion
- `3BR` = all three bureaus

## Negative-item categories

The category is classified automatically from the final line of each item.

- **Open / Closed / Late Payment** — open, closed, late, or `LP` reporting
- **Charge-Off / Collection / Repossession** — charge-off, collection, repo, or repossession reporting
- **Bankruptcy** — bankruptcy-related reporting, with sub-details for **Chapter 7**, **Chapter 13**, **Discharged**, and **Dismissed** when present
- **Hard Inquiry** — inquiry reporting
- **Personal Information** — reserved template category for personal-information disputes

Example:

```text
CAPITAL ONE
Xxxxxxxx3748
$0
3BR - INCLUDED IN BANKRUPTCY - CHAPTER 7 - DISCHARGED
```

This account is categorized as **Bankruptcy**, with **Chapter 7** and **Discharged** retained as category details, and it appears in all three bureau letters.

## Template organization

Editable correspondence language is kept separately under `templates/` so category-specific wording can be replaced without rebuilding the main application.

- `templates/base.js` — common letter subject/opening/closing
- `templates/open-closed-late.js` — open/closed/late-payment template
- `templates/charge-off-collection-repossession.js` — charge-off/collection/repossession template
- `templates/bankruptcy.js` — bankruptcy template
- `templates/hard-inquiry.js` — hard-inquiry template
- `templates/personal-information.js` — personal-information template
- `templates/categories.js` — category metadata and labels

## Files

- `index.html` — application interface and modal
- `styles.css` — responsive UI styling
- `app.js` — parser, category detection, Washington DC date handling, bureau routing, letter generation, copy, and TXT download

## Run

Open `index.html` directly in a modern browser. No Python server or build process is required.

## Privacy

The application processes pasted data locally in the browser. Do not commit real client information to GitHub.

## Notice

The generated correspondence is a general drafting template and is not legal advice. Review each output and verify all details against the underlying report before use.
