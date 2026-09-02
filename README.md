# Letter Template

Local browser-only tool for turning compact credit-report notes into bureau-specific dispute-letter drafts.

## Bureau routing

`EQU` = Equifax  
`EXP` = Experian  
`TU` = TransUnion  
`3BR` = all three bureaus

Accounts inherit the exact bureau routing from their final status line. An account tagged `3BR` appears in all three letters; `EQU - TU` appears only in the Equifax and TransUnion letters.

## Input format

```text
John Doe
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
3BR- INCLUDED IN BANKRUPTCY
```

## Files

- `index.html` — application interface
- `styles.css` — application styling
- `app.js` — parser, bureau routing, letter generation, copy/download actions

## Run

Open `index.html` in a modern browser. No Python server or build step is required.

## Privacy

All parsing happens in the browser. Do not commit real client information to GitHub.

## Important

The correspondence is a general template and is not legal advice. Review each generated letter and verify the underlying report information before use.
