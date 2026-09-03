"""Generates the sample invoice the Document Intelligence demo uses.

Same reasoning as make-reconciliation-samples.py: the value of this file is its
KNOWN CONTENT, so the ground truth lives next to the generator rather than only
inside a PDF nobody can diff.

    field            value
    ------------------------------------------
    invoice number   MF-2318
    invoice date     02 July 2024
    due date         01 August 2024      <- a second date, on purpose
    vendor           Meridian Freight Services
    bill to          Halden Retail Group
    PO number        HRG-4471
    subtotal         USD 12,480.00       <- a second amount, on purpose
    tax (8.25%)      USD 1,029.60
    total due        USD 13,509.60

The two dates and the three amounts are the point. A field extractor that
cannot tell an invoice date from a due date, or a subtotal from a total, will
put the wrong one in the wrong slot - and with only one date and one amount on
the page there would be no way to tell that it had.

    python3 scripts/make-document-intel-sample.py
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

styles = getSampleStyleSheet()
TITLE = ParagraphStyle("TITLE", parent=styles["Heading1"], fontSize=20, spaceAfter=2,
                       textColor=colors.HexColor("#1f3a5f"))
SUB = ParagraphStyle("SUB", parent=styles["Normal"], fontSize=10, textColor="#666666", spaceAfter=18)
LABEL = ParagraphStyle("LABEL", parent=styles["Normal"], fontSize=8, textColor="#888888", spaceAfter=1)
VAL = ParagraphStyle("VAL", parent=styles["Normal"], fontSize=10.5, spaceAfter=10)
NOTE = ParagraphStyle("NOTE", parent=styles["Normal"], fontSize=9, textColor="#666666", leading=13)

LINES = [
    ["Description", "Qty", "Unit price", "Amount"],
    ["Regional haulage - Zone 2 depots", "48 hrs", "USD 145.00", "USD 6,960.00"],
    ["Regional haulage - Zone 4 depots", "24 hrs", "USD 145.00", "USD 3,480.00"],
    ["Overnight storage - Halden DC", "6 nights", "USD 180.00", "USD 1,080.00"],
    ["Pallet handling and wrapping", "320 units", "USD 3.00", "USD 960.00"],
    ["", "", "Subtotal", "USD 12,480.00"],
    ["", "", "Tax (8.25%)", "USD 1,029.60"],
    ["", "", "Total due", "USD 13,509.60"],
]


def meta_table():
    left = [
        Paragraph("BILL TO", LABEL), Paragraph("Halden Retail Group<br/>"
                                               "1 Halden Way, Bristol BS1 4QT<br/>"
                                               "Attn: Accounts Payable", VAL),
    ]
    right = [
        Paragraph("INVOICE NUMBER", LABEL), Paragraph("MF-2318", VAL),
        Paragraph("INVOICE DATE", LABEL), Paragraph("02 July 2024", VAL),
        Paragraph("DUE DATE", LABEL), Paragraph("01 August 2024", VAL),
        Paragraph("PO NUMBER", LABEL), Paragraph("HRG-4471", VAL),
    ]
    t = Table([[left, right]], colWidths=[3.2 * inch, 3.1 * inch])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    return t


def lines_table():
    t = Table(LINES, colWidths=[3.1 * inch, 0.9 * inch, 1.1 * inch, 1.2 * inch])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f3a5f")),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 1), (-1, 4), 0.4, colors.HexColor("#dddddd")),
        ("LINEABOVE", (2, 5), (-1, 5), 0.8, colors.HexColor("#999999")),
        ("FONTNAME", (2, 7), (-1, 7), "Helvetica-Bold"),
        ("TEXTCOLOR", (2, 7), (-1, 7), colors.HexColor("#1f3a5f")),
    ]))
    return t


def build(path):
    doc = SimpleDocTemplate(path, pagesize=LETTER,
                            leftMargin=1 * inch, rightMargin=1 * inch,
                            topMargin=0.9 * inch, bottomMargin=1 * inch,
                            title="Invoice MF-2318")
    doc.build([
        Paragraph("Meridian Freight Services", TITLE),
        Paragraph("Unit 7, Portway Industrial Estate, Bristol BS11 9YX &middot; "
                  "VAT GB 418 2277 04 &middot; accounts@meridianfreight.example", SUB),
        meta_table(),
        Spacer(1, 16),
        lines_table(),
        Spacer(1, 20),
        Paragraph("Payment is due within 30 days of the invoice date. Please quote invoice "
                  "number MF-2318 with your remittance. Late payment interest accrues at "
                  "1.0% per month on any overdue balance.", NOTE),
    ])
    print("wrote", path)


build("public/samples/meridian-invoice-2318.pdf")
