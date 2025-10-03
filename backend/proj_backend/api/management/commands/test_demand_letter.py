from django.core.management.base import BaseCommand
from django.conf import settings
import os
from api.pdf_utils import generate_demand_letter_pdf
from api.models import RequestManagement

class Command(BaseCommand):
    help = 'Test demand letter PDF generation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--request-id',
            type=str,
            help='Request ID to generate demand letter for',
        )
        parser.add_argument(
            '--output',
            type=str,
            default='test_demand_letter.pdf',
            help='Output filename for the PDF',
        )

    def handle(self, *args, **options):
        request_id = options.get('request_id')
        output_file = options.get('output')

        try:
            if request_id:
                # Use actual request from database
                try:
                    request_obj = RequestManagement.objects.get(request_id=request_id)
                    self.stdout.write(f"Using request: {request_obj.request_id}")
                except RequestManagement.DoesNotExist:
                    self.stdout.write(
                        self.style.ERROR(f"Request {request_id} not found")
                    )
                    return
            else:
                # Create mock request object
                class MockUser:
                    school = None

                class MockRequestObj:
                    request_id = "REQ-TEST-001"
                    user = MockUser()

                request_obj = MockRequestObj()
                self.stdout.write("Using mock request object")

            # Mock unliquidated data
            unliquidated_data = [
                {
                    "check_ada_no": "ADA-12345",
                    "issue_date": "2025-01-15",
                    "particulars": "Cash Advance for School Supplies",
                    "balance": 5000.00
                },
                {
                    "check_ada_no": "ADA-67890",
                    "issue_date": "2025-01-10",
                    "particulars": "Cash Advance for Travel Expenses",
                    "balance": 3000.00
                }
            ]

            due_date = "February 15, 2025"

            # Generate PDF
            self.stdout.write("Generating demand letter PDF...")
            pdf_content = generate_demand_letter_pdf(request_obj, unliquidated_data, due_date)

            # Save to file
            output_path = os.path.join(settings.BASE_DIR, output_file)
            with open(output_path, 'wb') as f:
                f.write(pdf_content)

            self.stdout.write(
                self.style.SUCCESS(f"Demand letter PDF generated successfully: {output_path}")
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error generating demand letter: {e}")
            )
