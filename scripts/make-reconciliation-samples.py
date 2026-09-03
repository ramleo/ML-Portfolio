"""Generates the two sample documents the Contract/Invoice Reconciliation demo uses.

Kept as a script rather than two committed-and-forgotten PDFs because the point
of these files is their PLANTED GROUND TRUTH, and that has to be written down
somewhere a reader can check it against what the tool reports:

    clause          contract        invoice         expected
    ---------------------------------------------------------------
    hourly rate     USD 145.00      USD 165.00      DISCREPANCY
    payment terms   Net 30          Net 15          DISCREPANCY
    fuel surcharge  capped at 4%    4%              agrees - must NOT flag
    interest        1.0% / month    1.0% / month    agrees - must NOT flag

The two agreeing clauses are the control. A tool that flags four things is as
wrong as one that flags none, and only a document with a known answer can show
that. Clause wording is deliberately parallel across the two files so the
passages pair up on cosine similarity before the judge ever sees them.

One clause per PAGE, not per paragraph. /rag/mm-ingest builds chunks page by
page (mm_ingest.py's `for page_num in range(1, n_pages + 1)`), so a one-page
contract arrives as a single chunk no matter how many clauses it prints - and
the judge then gets whole-document vs whole-document and can only report one
finding. Four pages, four chunks, and the rate clause pairs with the rate
clause.

    python3 scripts/make-reconciliation-samples.py
"""
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, PageBreak, Spacer

styles = getSampleStyleSheet()
H = ParagraphStyle("H", parent=styles["Heading1"], fontSize=15, spaceAfter=2)
SUB = ParagraphStyle("SUB", parent=styles["Normal"], fontSize=10.5, textColor="#555555", spaceAfter=14)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=12.5, spaceAfter=8)
BODY = ParagraphStyle("BODY", parent=styles["Normal"], fontSize=10.5, leading=15, spaceAfter=11)

CONTRACT = [
    ("H", "Meridian Freight Services"),
    ("SUB", "Master Services Agreement &mdash; MSA-2024-118"),
    ("BODY", "This agreement is made between Meridian Freight Services (the &quot;Supplier&quot;) and "
             "Halden Retail Group (the &quot;Client&quot;), effective 1 March 2024 for an initial term of "
             "twelve months. It governs all haulage and distribution services requested by the Client "
             "under purchase orders referencing this agreement."),
    ("BODY", "<b>1. Rates.</b> The Supplier shall bill professional haulage services at a rate of "
             "USD 145.00 per hour. This rate is fixed for the full term of the agreement and may not be "
             "revised without a signed written amendment executed by both parties. Hours are recorded "
             "to the nearest quarter hour and are billed monthly in arrears."),
    ("PAGE", ""),
    ("H2", "2. Payment terms"),
    ("BODY", "All invoices issued under this agreement are payable Net 30 days from the invoice date. "
             "The Client shall raise any dispute over a line item within ten business days of receipt, "
             "failing which the invoice is deemed accepted in full."),
    ("BODY", "Late payment interest accrues at 1.0% per month on any overdue balance, calculated daily "
             "from the day after the due date until payment is received in cleared funds."),
    ("PAGE", ""),
    ("H2", "3. Fuel surcharge"),
    ("BODY", "A fuel surcharge may be added to each invoice, capped at 4% of the pre-tax line total for "
             "that invoice. The surcharge is calculated against the published regional diesel index for "
             "the month in which the services were performed."),
    ("BODY", "Where the index falls below the baseline recorded at signature, no surcharge shall be "
             "applied and any surcharge already collected for that period shall be credited."),
    ("PAGE", ""),
    ("H2", "4. Term cap and notice"),
    ("BODY", "Total billings under this agreement shall not exceed USD 48,000.00 in aggregate across the "
             "twelve-month term. The Supplier shall notify the Client in writing once cumulative billings "
             "reach 80% of that cap."),
    ("BODY", "Either party may terminate this agreement on 60 days written notice delivered to the "
             "address of record. Termination does not affect amounts properly invoiced before the "
             "effective date."),
]

INVOICE = [
    ("H", "Meridian Freight Services"),
    ("SUB", "Invoice MF-2291 &mdash; issued 14 June 2024"),
    ("BODY", "Bill to: Halden Retail Group. Issued under agreement reference MSA-2024-118 for haulage "
             "and distribution services performed during May 2024. Purchase order HRG-4471."),
    ("BODY", "<b>1. Rates.</b> Professional haulage services were billed at a rate of USD 165.00 per hour "
             "for 96 hours worked during the billing period. Hours were recorded to the nearest quarter "
             "hour from driver timesheets and are billed here in arrears."),
    ("PAGE", ""),
    ("H2", "2. Payment terms"),
    # Deliberately NOT worded the way the contract words the same clause. The
    # first draft of this file repeated the contract's sentences verbatim, which
    # scored above _SIM_CEILING (0.93) and got the pair dropped before the judge
    # ever saw it - the Net 30 vs Net 15 discrepancy went unreported because the
    # two passages were too similar, not too different.
    ("BODY", "Payment for this invoice falls due Net 15 days from the issue date shown above. "
             "Remittance advice should quote invoice number MF-2291 and purchase order HRG-4471."),
    ("BODY", "Overdue balances carry interest at 1.0% per month, applied from the first day after "
             "the due date until the sum is received in cleared funds."),
    ("PAGE", ""),
    ("H2", "3. Fuel surcharge"),
    ("BODY", "A fuel surcharge has been added to this invoice at 4% of the pre-tax line total. The "
             "surcharge was calculated against the published regional diesel index for May 2024, the "
             "month in which the services were performed."),
    ("BODY", "The index remained above the baseline throughout the period, so no credit is due against "
             "the surcharge shown."),
    ("PAGE", ""),
    ("H2", "4. Totals"),
    ("BODY", "Subtotal USD 15,840.00. Fuel surcharge USD 633.60. Total now due USD 16,473.60. "
             "Cumulative billings under agreement MSA-2024-118 stand at USD 31,210.00 to date."),
    ("BODY", "Remittance to Meridian Freight Services, account reference MF-2291. Please quote the "
             "invoice number on all payments."),
]

STYLE = {"H": H, "H2": H2, "SUB": SUB, "BODY": BODY}


def build(path, blocks):
    doc = SimpleDocTemplate(path, pagesize=LETTER,
                            leftMargin=1 * inch, rightMargin=1 * inch,
                            topMargin=1 * inch, bottomMargin=1 * inch,
                            title=blocks[1][1].replace("&mdash;", "-"))
    flow = []
    for kind, text in blocks:
        if kind == "PAGE":
            flow.append(PageBreak())
            continue
        flow.append(Paragraph(text, STYLE[kind]))
    flow.append(Spacer(1, 12))
    doc.build(flow)
    print("wrote", path)


build("public/samples/meridian-contract.pdf", CONTRACT)
build("public/samples/meridian-invoice-2291.pdf", INVOICE)
