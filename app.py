from flask import Flask, request, render_template_string, send_file
from io import BytesIO
from datetime import datetime
import re

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

app = Flask(__name__)

# ----------------------------
# FONT
# ----------------------------
try:
    pdfmetrics.registerFont(TTFont("Arial", "arial.ttf"))
    FONT = "Arial"
except:
    FONT = "Helvetica"


# ----------------------------
# STORAGE
# ----------------------------
stored_letters = []
stored_name = ""
stored_date = ""
stored_raw_date = ""   # FIX: keeps form date


# ----------------------------
# DATE FORMAT
# ----------------------------
def to_us_date(date_str):
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return d.strftime("%m/%d/%Y")


# ----------------------------
# NAME SHORT (FILE ONLY)
# ----------------------------
def short_name(name):
    ignore = {"jr", "sr", "ii", "iii", "iv"}

    parts = [p for p in name.strip().split() if p.lower().strip(".") not in ignore]

    if len(parts) == 0:
        return ""
    if len(parts) == 1:
        return parts[0]

    return f"{parts[0]} {parts[-1][0].upper()}"


# ----------------------------
# LETTER GENERATION
# ----------------------------
def generate_letters(name, date):
    bureaus = [
        ("Equifax Information Services LLC", "P.O. Box 740256\nAtlanta, GA 30374-0256"),
        ("TransUnion LLC Consumer Dispute Center", "PO Box 2000\nChester, PA 19016"),
        ("Experian", "P.O. Box 2002\nAllen, TX 75013"),
    ]

    template = [
        "{bureau}",
        "{address}",
        "",
        "",
        "This is <font name='Helvetica-Bold'>{name}</font> and I authorize this dispute.",
        "",
        "Today is {date}.",
        "",
        "I am mailing this through a mailing company as I can’t physically go into postal office due to health issues. This is my authorization for you to process this dispute.",
        "",
        "This is not a third party agency.",
        "",
        "Please do not deflect or not process my dispute for any such reason. Again, this is <font name='Helvetica-Bold'>{name}</font> ",
        "",
        "I authorize this dispute."
    ]

    letters = []

    for bureau, address in bureaus:
        letters.append("\n".join(
            line.format(bureau=bureau, address=address, name=name, date=date)
            for line in template
        ))

    return letters


# ----------------------------
# PDF CREATION
# ----------------------------
def create_pdf(text):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer)

    style = ParagraphStyle(
        "style",
        fontName=FONT,
        fontSize=14.5,
        leading=21
    )

    elements = []

    for line in text.split("\n"):
        line = line.strip()
        if line == "":
            elements.append(Spacer(1, 21))
        else:
            elements.append(Paragraph(line, style))

    doc.build(elements)
    buffer.seek(0)
    return buffer


# ----------------------------
# DISPUTE FORMATTER
# ----------------------------
def format_dispute(text):
    accounts, addresses, employers, inquiries = [], [], [], []
    lines = text.splitlines()
    current_name = None

    for i, line in enumerate(lines):
        line = line.strip()

        if "ADDRESS" in line.upper():
            if ":" in line:
                addresses.append(line.split(":", 1)[1].strip())

        elif "EMPLOYER" in line.upper():
            if ":" in line:
                employers.append(line.split(":", 1)[1].strip())

        elif "inquiry was not authorized" in line.lower():
            if i + 2 < len(lines):
                name = lines[i + 1].strip()
                date = lines[i + 2].strip()
                inquiries.append(f"{name} – {date}")

        elif re.match(r"^\d+\.", line):
            current_name = line.split(".", 1)[1].strip()

        elif "Account Number" in line:
            acc = line.split(":", 1)[1].strip()
            if current_name:
                accounts.append(f"{current_name} – Account Number: {acc}")
                current_name = None

    output = []

    if accounts:
        output.append("Accounts")
        for i, a in enumerate(accounts, 1):
            output.append(f"{i}. {a}")
        output.append("")

    if addresses:
        output.append("Addresses")
        for i, a in enumerate(addresses, 1):
            output.append(f"{i}. {a}")
        output.append("")

    if employers:
        output.append("Employers")
        for i, e in enumerate(employers, 1):
            output.append(f"{i}. {e}")
        output.append("")

    if inquiries:
        output.append("Unauthorized Inquiries")
        for i, q in enumerate(inquiries, 1):
            output.append(f"{i}. {q}")

    return "\n".join(output)


# ----------------------------
# PAGE HTML
# ----------------------------
LETTER_HTML = """
<!doctype html>
<html>
<head>
<title>Letter Generator</title>
<style>
body { font-family: Arial; padding: 20px; }

button, a {
    display:block;
    padding:10px;
    margin:10px 0;
    width:300px;
    background:#eee;
    border:1px solid #ccc;
    text-decoration:none;
    color:black;
}
</style>
</head>
<body>

<h2>Letter Generator</h2>

<a href="/formatter">Go to Formatter →</a>

<form method="post" action="/generate">
    <input type="text" name="name" placeholder="Full Name" required><br>

    <!-- FIX: persist date -->
    <input type="date" name="date"
        value="{{ stored_raw_date or today }}" required><br>

    <button type="submit">Generate Letters</button>
</form>

{% if ready %}
<h3>Generated Info</h3>
<p><b>Name:</b> {{name}}</p>
<p><b>Date:</b> {{date}}</p>

<h3>Downloads</h3>

<a href="/pdf/1">Equifax</a>
<a href="/pdf/2">TransUnion</a>
<a href="/pdf/3">Experian</a>

<form method="post" action="/download_all">
    <button type="submit">Download ALL</button>
</form>
{% endif %}

</body>
</html>
"""


# ----------------------------
# ROUTES
# ----------------------------
@app.route("/", methods=["GET"])
def home():
    today = datetime.now().strftime("%Y-%m-%d")

    return render_template_string(
        LETTER_HTML,
        today=today,
        stored_raw_date=stored_raw_date,
        ready=False
    )


@app.route("/generate", methods=["POST"])
def generate():
    global stored_letters, stored_name, stored_date, stored_raw_date

    stored_name = request.form["name"]

    raw_date = request.form.get("date") or datetime.now().strftime("%Y-%m-%d")
    stored_raw_date = raw_date  # FIX: keep for UI

    stored_date = to_us_date(raw_date)

    stored_letters = generate_letters(stored_name, stored_date)

    return render_template_string(
        LETTER_HTML,
        ready=True,
        name=stored_name,
        date=stored_date,
        stored_raw_date=stored_raw_date,
        today=datetime.now().strftime("%Y-%m-%d")
    )


@app.route("/pdf/<int:i>")
def pdf(i):
    if not stored_letters:
        return "No letters generated yet."

    code_map = ["EQU", "TU", "EXP"]
    code = code_map[i - 1]

    filename = f"{short_name(stored_name)}-{code}-AUTHORIZATION.pdf"

    return send_file(
        create_pdf(stored_letters[i - 1]),
        as_attachment=True,
        download_name=filename,
        mimetype="application/pdf"
    )


@app.route("/download_all", methods=["POST"])
def download_all():
    return """
    <script>
        window.location.href='/pdf/1';
        setTimeout(()=>window.open('/pdf/2'),700);
        setTimeout(()=>window.open('/pdf/3'),1400);
    </script>
    """


@app.route("/formatter", methods=["GET", "POST"])
def formatter():
    result = ""
    original = ""

    if request.method == "POST":
        original = request.form["text"]
        result = format_dispute(original)

    return render_template_string(FORMAT_HTML, result=result, original=original)


# ----------------------------
# FORMAT PAGE HTML (UNCHANGED)
# ----------------------------
FORMAT_HTML = """
<!doctype html>
<html>
<head>
<title>Formatter</title>
<style>
body { font-family: Arial; padding: 20px; }
.container { display:flex; gap:20px; }
.box { width:50%; }
textarea, pre {
    width:100%;
    height:400px;
    padding:10px;
    border:1px solid #ccc;
}
button { margin-top:10px; padding:10px; }
</style>
</head>

<body>

<h2>Dispute Formatter</h2>

<a href="/">← Back to Generator</a>

<form method="post" action="/formatter">
    <textarea name="text"></textarea><br>
    <button type="submit">Format</button>
</form>

{% if result %}
<div class="container">

    <div class="box">
        <h3>Before</h3>
        <pre>{{original}}</pre>
    </div>

    <div class="box">
        <h3>After</h3>
        <pre id="out">{{result}}</pre>
        <button onclick="copyText()">Copy</button>
    </div>

</div>
{% endif %}

<script>
function copyText(){
    navigator.clipboard.writeText(document.getElementById("out").innerText);
}
</script>

</body>
</html>
"""


if __name__ == "__main__":
    app.run(debug=True)