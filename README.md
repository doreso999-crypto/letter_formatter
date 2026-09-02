# Letter Formatter

A browser-only tool for turning compact credit-report account notes into bureau-specific letter drafts.

## Workflow

1. Click **New Case**.
2. Enter the client's **Personal Info**.
3. Choose the letter date. The default is calculated using the `America/New_York` timezone for Washington, DC.
4. Paste account blocks using four lines per account:

```text
TBOM CCI MC
Xxxxxxxx6638
$531
EX - TU - OPEN LP
```

5. Click **Generate Letters**.
6. The output automatically creates a column for each bureau represented by the accounts.

## Bureau routing

- `EQU` = Equifax
- `EXP` or `EX` = Experian
- `TU` = TransUnion
- `3BR` = all three bureaus

Example:

```text
TBOM CCI MC
Xxxxxxxx6638
$531
EX - TU - OPEN LP
```

This account appears in the **Experian** and **TransUnion** letters only.

An account tagged `3BR` appears in **all three** letters.

## Files

- `index.html` — application interface and modal
- `styles.css` — responsive UI styling
- `app.js` — parser, Washington DC date handling, bureau routing, letter generation, copy, and TXT download

## Run

Open `index.html` directly in a modern browser. No Python server or build process is required.

## Privacy

The application processes pasted data locally in the browser. Do not commit real client information to GitHub.

## Notice

The generated correspondence is a general drafting template and is not legal advice. Review each output and verify all account details against the underlying report before use.
