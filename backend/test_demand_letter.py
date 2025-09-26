import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "proj_backend.settings") # or your actual settings module
import django
django.setup()

from proj_backend.api.pdf_utils import generate_demand_letter_pdf

# Mock request_obj (replace with actual or minimal mock as needed)
class MockUser:
    school = None

class MockRequestObj:
    request_id = "REQ-TEST-001"
    user = MockUser()

request_obj = MockRequestObj()

# Example unliquidated data
unliquidated_data = [
    {
        "check_ada_no": "ADA-12345",
        "issue_date": "2025-09-22",
        "particulars": "Cash Advance for Supplies",
        "balance": 5000.00
    },
    {
        "check_ada_no": "ADA-67890",
        "issue_date": "2025-09-15",
        "particulars": "Cash Advance for Travel",
        "balance": 3000.00
    }
]

due_date = "October 15, 2025"

# Run the function
pdf_bytes = generate_demand_letter_pdf(request_obj, unliquidated_data, due_date)

# Save to file for inspection
with open("demand_letter_test.pdf", "wb") as f:
    f.write(pdf_bytes)

print("PDF generated: demand_letter_test.pdf")