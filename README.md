# Letter Template

Local browser-only tool for turning compact credit-report notes into bureau-specific dispute-letter drafts.

## Bureau routing

`EQU` = Equifax  
`EXP` = Experian  
`TU` = TransUnion  
`3BR` = all three bureaus

An account tagged `3BR` is included in all three letters. An account tagged `EQU - TU` is included only in the Equifax and TransUnion letters.

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
- `app.html` — compatibility redirect to `index.html`

## Run

Open `index.html` in a modern browser. No Python server or build process is required.

## Privacy

The application processes pasted text locally in the browser. Do not commit real client information to the repository.

## Important

The generated correspondence is a general template and is not legal advice. Review each letter and verify every account detail against the underlying report before use.
