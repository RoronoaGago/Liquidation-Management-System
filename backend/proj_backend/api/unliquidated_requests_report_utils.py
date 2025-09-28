# report_utils.py
import io
import csv
import os
from django.conf import settings
from django.http import HttpResponse
from openpyxl import Workbook
from openpyxl.drawing.image import Image
from openpyxl.styles import Font
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from .models import RequestManagement
from django.db.models import Sum
from .models import RequestManagement
from openpyxl.styles import Font, Alignment
import logging
logger = logging.getLogger('api')


class AgingReportPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000


def get_aging_period(days):
    if days <= 30:
        return "0-30 days"
    elif days <= 60:
        return "31-60 days"
    elif days <= 90:
        return "61-90 days"
    elif days <= 120:
        return "91-120 days"
    elif days <= 180:
        return "121-180 days"
    else:
        return "180+ days"


def generate_aging_report_data(days_threshold='30'):
    """Generate aging report data for unliquidated requests"""
    print(f"Logger name: {__name__}")  # Add this temporarily
    # Get all unliquidated requests
    unliquidated_requests = RequestManagement.objects.filter(
        status='unliquidated')

    # Calculate aging for each request
    today = timezone.now().date()
    aging_data = []

    for req in unliquidated_requests:
        if req.downloaded_at:
            days_elapsed = (today - req.downloaded_at.date()).days
        else:
            # Fallback to created_at if downloaded_at is not available
            days_elapsed = (today - req.created_at.date()).days

        # Apply threshold filter
        should_include = False
        if days_threshold == 'all':
            should_include = True
        elif days_threshold == 'demand_letter':
            # Include requests that are exactly 29 days old (1 day before 30 days ends)
            should_include = days_elapsed == 29
        else:
            should_include = int(days_threshold) <= days_elapsed

        if should_include:
            aging_data.append({
                'request_id': req.request_id,
                'school_id': req.user.school.schoolId if req.user and req.user.school else '',
                'school_name': req.user.school.schoolName if req.user and req.user.school else '',
                'downloaded_at': req.downloaded_at.date() if req.downloaded_at else req.created_at.date(),
                'days_elapsed': days_elapsed,
                'aging_period': get_aging_period(days_elapsed),
                'amount': sum(rp.amount for rp in req.requestpriority_set.all())
            })

    return aging_data


def generate_aging_csv_report(aging_data, days_threshold):
    """Generate CSV report for aging data"""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="aging_report_{days_threshold}_days.csv"'

    writer = csv.writer(response)

    # Add company header
    writer.writerow(['COMPANY NAME'])
    writer.writerow(['Aging Report'])
    writer.writerow([f'Generated on: {timezone.now().date()}'])
    writer.writerow([f'Days Threshold: {days_threshold}'])
    writer.writerow([])  # Empty row for spacing

    # Write column headers
    writer.writerow(['School ID', 'School Name', 'Request ID', 'Downloaded At',
                     'Days Elapsed', 'Aging Period', 'Amount'])

    for item in aging_data:
        writer.writerow([
            item['school_id'],
            item['school_name'],
            item['request_id'],
            item['downloaded_at'],
            item['days_elapsed'],
            item['aging_period'],
            item['amount']
        ])

    return response


def generate_aging_excel_report(aging_data, days_threshold):
    """Generate Excel report for aging data with same format as liquidation report"""
    from openpyxl.styles import Font, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from datetime import datetime
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Aging Report"

    # Set column widths to match the liquidation report format
    column_widths = {
        'A': 15, 'B': 30, 'C': 20, 'D': 15, 'E': 15, 'F': 15, 'G': 15
    }

    for col, width in column_widths.items():
        ws.column_dimensions[col].width = width

    # Define border styles
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    # Define fonts
    base_font = Font(name='Times New Roman', size=10)
    bold_font = Font(name='Times New Roman', size=10, bold=True)
    title_font = Font(name='Times New Roman', size=12, bold=True)

    # Add logos (same as liquidation report)
    try:
        # Left logo
        left_logo_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo.png')
        if os.path.exists(left_logo_path):
            left_img = Image(left_logo_path)
            left_img.width = 80
            left_img.height = 80
            ws.add_image(left_img, 'A1')
    except Exception as e:
        logger.error(f"Could not add left logo: {e}")

    try:
        # Right logo
        right_logo_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'depend-bagong-pilipinas-logo.png')
        if os.path.exists(right_logo_path):
            right_img = Image(right_logo_path)
            right_img.width = 80
            right_img.height = 80
            ws.add_image(right_img, 'G1')
    except Exception as e:
        logger.error(f"Could not add right logo: {e}")

    # Add header text (same format as liquidation report)
    header_text = [
        "Republic of the Philippines",
        "Department of Education",
        "La Union Schools Division",
        "",
        "AGEING REQUESTS REPORT"
    ]

    # Start from row 1 and place each text in column D
    for i, text in enumerate(header_text, 1):
        cell = ws.cell(row=i, column=4, value=text)
        cell.font = bold_font
        if i == 5:  # Report title
            cell.font = Font(name='Times New Roman', size=14, bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center')

    # Merge cells for the report title
    ws.merge_cells('D5:F5')

    # Add generation info (same format as liquidation report)
    current_date = timezone.now().strftime("%Y-%m-%d")
    ws['A7'] = f"Generated on: {current_date}"
    ws['A7'].font = base_font
    
    # Add days threshold info
    threshold_text = "All requests" if days_threshold == 'all' else f"Requests older than {days_threshold} days"
    if days_threshold == 'demand_letter':
        threshold_text = "Requests at 29 days (Demand Letter)"
    ws['A8'] = f"Filter: {threshold_text}"
    ws['A8'].font = base_font

    # Add column headers with borders
    headers = ['School ID', 'School Name', 'Request ID', 'Downloaded At', 'Days Elapsed', 'Aging Period', 'Amount']
    
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=10, column=col_num, value=header)
        cell.font = bold_font
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border

    # Add data with borders
    for row_num, item in enumerate(aging_data, 11):
        ws.cell(row=row_num, column=1, value=item['school_id']).border = thin_border
        ws.cell(row=row_num, column=2, value=item['school_name']).border = thin_border
        ws.cell(row=row_num, column=3, value=item['request_id']).border = thin_border
        ws.cell(row=row_num, column=4, value=item['downloaded_at']).border = thin_border
        ws.cell(row=row_num, column=5, value=item['days_elapsed']).border = thin_border
        ws.cell(row=row_num, column=6, value=item['aging_period']).border = thin_border
        ws.cell(row=row_num, column=7, value=item['amount']).border = thin_border

    # Add summary section (same format as liquidation report)
    summary_row = 11 + len(aging_data) + 2
    ws[f'A{summary_row}'] = "Prepared by:"
    ws[f'A{summary_row}'].font = bold_font
    
    ws[f'A{summary_row + 1}'] = "_________________________"
    ws[f'A{summary_row + 1}'].font = base_font
    
    ws[f'A{summary_row + 2}'] = "Signature over Printed Name"
    ws[f'A{summary_row + 2}'].font = base_font
    
    ws[f'A{summary_row + 3}'] = "Position/Designation"
    ws[f'A{summary_row + 3}'].font = base_font

    # Save to response
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    # Generate filename based on threshold
    if days_threshold == 'demand_letter':
        filename = "aging_report_demand_letter.xlsx"
    else:
        filename = f"aging_report_{days_threshold}_days.xlsx"

    response = HttpResponse(buffer.getvalue(),
                            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    return response
