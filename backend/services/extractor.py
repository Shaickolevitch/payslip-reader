import anthropic
import base64
import json
import re
import fitz
from config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

EXTRACTION_PROMPT = """
You are an expert in Israeli payslips (תלושי שכר). You are looking at an IMAGE of a payslip.
Read every number and label carefully. Return ONLY a valid JSON object — no explanation, no markdown, no backticks.

=== HEADER LAYOUT — THIS IS CRITICAL ===

Before extracting, identify these two rows in the header table:

ROW 1 — EMPLOYER ROW: contains "שם החברה" label
  → The value next to שם החברה goes into employer_name
  → The number next to ח.פ. or מספר מעסיק goes NOWHERE (ignore it for IDs)

ROW 2 — EMPLOYEE ROW: contains "שם עובד" label  
  → The value next to שם עובד goes into employee_name
  → The number next to ת.ז goes into employee_id

On this payslip:
  - שם החברה row is at the TOP of the header
  - שם עובד row is BELOW it

SELF-CHECK before outputting:
  - Is employee_name a person's name (2-3 words, sounds like a human)? ✓
  - Is employer_name an organization name (contains אגודת/קיבוץ/בע"מ/מושב etc.)? ✓
  - If employee_name looks like an org name → you have them SWAPPED, fix it.
  - If employer_name looks like a person's name → you have them SWAPPED, fix it.

=== ID NUMBERS — ALSO CRITICAL ===

The header has TWO different ID numbers:
  - Company number: labeled ח.פ. or מספר מעסיק — this belongs to the EMPLOYER row — example: 924509300
  - Employee ID: labeled ת.ז or תעודת זהות — this belongs to the EMPLOYEE row — example: 305480014

employee_id = ONLY the number in the EMPLOYEE row labeled ת.ז
DO NOT use the ח.פ. company number as employee_id.

The ת.ז appears on the SAME ROW or SAME SECTION as שם עובד.
The ח.פ. appears on the SAME ROW or SAME SECTION as שם החברה.

=== LEAVE BALANCES TABLE ===

Columns: סוג | ניצול | יתרה | צבירה
- used_this_month = ניצול = days used this month (small integer 0-5)
- balance_days = יתרה = total remaining days (integer 5-200, NOT shekels)
- accrual_this_month = צבירה = monthly accrual rate (decimal like 1.5, 2.08)

=== DEDUCTIONS ===
- מס הכנסה / מילוי מס → income_tax
- ביטוח לאומי → national_insurance
- מס בריאות / דמי בריאות → health_insurance
- פנסיה עובד / גמל עובד → pension_employee
- פנסיה מעסיק / גמל מעסיק → pension_employer

=== SALARY ===
- base_salary = שכר יסוד (must be ≤ gross_pay)
- gross_pay = סך תשלומים / שכר ברוטו
- net_pay = שכר נטו / לתשלום
- total_deductions = סך ניכויים

=== EXAMPLE — USE THIS AS REFERENCE ===

For a payslip that looks like this one, the correct extraction is:
  employee_name = "שי חי גיאן"     ← the person who works
  employer_name = "אגודת שמיר חולדה"  ← the organization that employs them
  employee_id = "305480014"         ← the ת.ז number

If you see "אגודת שמיר חולדה" in employee_name → WRONG, swap them.
If you see "305480014" as employer ID → WRONG, it belongs in employee_id.

=== OUTPUT FORMAT ===

{
  "meta": {
    "employee_name": "value from שם עובד field only",
    "employee_id": "9-digit ת.ז only",
    "employer_name": "value from שם החברה field only",
    "pay_period_month": "month in English",
    "pay_period_year": "4-digit year",
    "currency": "ILS"
  },
  "payments": [
    { "description": "exact Hebrew label", "hours_or_days": null, "rate": null, "amount": 0 }
  ],
  "deductions": [
    { "description": "exact Hebrew label", "rate_percent": null, "amount": 0 }
  ],
  "summary": {
    "gross_pay": 0,
    "total_deductions": 0,
    "net_pay": 0,
    "base_salary": null,
    "income_tax": null,
    "national_insurance": null,
    "health_insurance": null,
    "pension_employee": null,
    "pension_employer": null
  },
  "leave_balances": [
    {
      "type": "Hebrew label",
      "used_this_month": 0,
      "balance_days": 0,
      "accrual_this_month": 0.0
    }
  ]
}

Return ONLY the JSON. No other text.
""".strip()


def pdf_to_images_base64(pdf_bytes: bytes) -> list[dict]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images = []
    for page in doc:
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        b64 = base64.standard_b64encode(img_bytes).decode("utf-8")
        images.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": b64,
            },
        })
    doc.close()
    return images


def parse_claude_json(text: str) -> dict:
    cleaned = re.sub(r"```json|```", "", text).strip()
    return json.loads(cleaned)


def flatten_for_db(data: dict, filename: str) -> dict:
    meta = data.get("meta", {})
    summary = data.get("summary", {})
    leave = data.get("leave_balances", [])

    flat = {
        "source_filename": filename,
        "employee_name": meta.get("employee_name"),
        "employee_id": meta.get("employee_id"),
        "employer_name": meta.get("employer_name"),
        "pay_period_month": meta.get("pay_period_month"),
        "pay_period_year": meta.get("pay_period_year"),
        "currency": meta.get("currency", "ILS"),
        "gross_pay": summary.get("gross_pay"),
        "net_pay": summary.get("net_pay"),
        "base_salary": summary.get("base_salary"),
        "total_deductions": summary.get("total_deductions"),
        "income_tax": summary.get("income_tax"),
        "national_insurance": summary.get("national_insurance"),
        "health_insurance": summary.get("health_insurance"),
        "pension_employee": summary.get("pension_employee"),
        "pension_employer": summary.get("pension_employer"),
    }

    for row in leave:
        label = row.get("type", "").strip()
        if label:
            key = label.replace(" ", "_")
            flat[f"leave_{key}_used"] = row.get("used_this_month")
            flat[f"leave_{key}_balance"] = row.get("balance_days")
            flat[f"leave_{key}_accrual"] = row.get("accrual_this_month")

    for row in data.get("payments", []):
        desc = row.get("description", "").strip()
        if desc:
            flat[f"payment_{desc}"] = row.get("amount")

    for row in data.get("deductions", []):
        desc = row.get("description", "").strip()
        if desc:
            flat[f"deduction_{desc}"] = row.get("amount")

    flat["_raw"] = data
    return flat


async def extract_payslip(pdf_bytes: bytes, filename: str) -> dict:
    images = pdf_to_images_base64(pdf_bytes)
    content = images + [{"type": "text", "text": EXTRACTION_PROMPT}]

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[{"role": "user", "content": content}],
    )

    raw_text = response.content[0].text
    data = parse_claude_json(raw_text)
    return flatten_for_db(data, filename)