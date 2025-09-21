# liquidation_report_utils.py
import io
import csv
import os
from django.conf import settings
from django.http import HttpResponse
from openpyxl import Workbook
from openpyxl.drawing.image import Image
from openpyxl.styles import Font, Alignment
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from .models import LiquidationManagement, RequestManagement
from django.db.models import Q, Sum
import logging
from datetime import date, timedelta

logger = logging.getLogger('api')


class LiquidationReportPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000


def generate_liquidation_report_data(
    status_filter=None,
    start_date=None,
    end_date=None,
    legislative_district=None,
    municipality=None,
    school_district=None,
    school_ids=None
):
    """Generate liquidation report data with filtering"""

    # Start with all liquidations
    queryset = LiquidationManagement.objects.select_related(
        'request__user__school__district'
    ).all()

    # Apply status filter
    if status_filter and status_filter != 'all':
        queryset = queryset.filter(status=status_filter)

    # Apply date range filter - FIXED: Use timezone-aware date comparison
    if start_date and end_date:
        # Convert string dates to timezone-aware datetime objects
        start_datetime = timezone.make_aware(
            timezone.datetime.combine(start_date, timezone.datetime.min.time()))
        end_datetime = timezone.make_aware(
            timezone.datetime.combine(end_date, timezone.datetime.max.time()))

        queryset = queryset.filter(
            created_at__gte=start_datetime,
            created_at__lte=end_datetime
        )
    elif start_date:
        start_datetime = timezone.make_aware(
            timezone.datetime.combine(start_date, timezone.datetime.min.time()))
        queryset = queryset.filter(created_at__gte=start_datetime)
    elif end_date:
        end_datetime = timezone.make_aware(
            timezone.datetime.combine(end_date, timezone.datetime.max.time()))
        queryset = queryset.filter(created_at__lte=end_datetime)

    # Apply legislative district filter
    if legislative_district:
        queryset = queryset.filter(
            request__user__school__district__legislativeDistrict=legislative_district
        )

    # Apply municipality filter
    if municipality:
        queryset = queryset.filter(
            request__user__school__district__municipality=municipality
        )

    # Apply school district filter
    if school_district:
        queryset = queryset.filter(
            request__user__school__district__districtId=school_district
        )

    # Apply school IDs filter
    if school_ids:
        school_id_list = school_ids.split(',') if isinstance(
            school_ids, str) else school_ids
        queryset = queryset.filter(
            request__user__school__schoolId__in=school_id_list
        )

    # Convert to list of dictionaries - FIXED: Convert User objects to strings
    report_data = []
    for liquidation in queryset:
        request = liquidation.request
        user = request.user
        school = user.school
        district = school.district if school else None

        # Helper function to format user information
        def format_user(user_obj):
            if user_obj:
                return f"{user_obj.first_name} {user_obj.last_name} ({user_obj.email})"
            return ""

        report_data.append({
            'liquidation_id': liquidation.LiquidationID,
            'request_id': request.request_id,
            'school_id': school.schoolId if school else '',
            'school_name': school.schoolName if school else '',
            'district_name': district.districtName if district else '',
            'municipality': district.municipality if district else '',
            'legislative_district': district.legislativeDistrict if district else '',
            'request_month': request.request_monthyear,
            'status': liquidation.status,
            'created_at': liquidation.created_at,
            'date_submitted': liquidation.date_submitted,
            'date_liquidated': liquidation.date_liquidated,
            'refund': liquidation.refund,
            'reviewed_by_district': format_user(liquidation.reviewed_by_district),
            'reviewed_by_liquidator': format_user(liquidation.reviewed_by_liquidator),
            'reviewed_by_division': format_user(liquidation.reviewed_by_division),
        })

    return report_data


def generate_liquidation_csv_report(report_data, filters):
    """Generate CSV report for liquidation data"""
    response = HttpResponse(content_type='text/csv')

    # Generate filename based on filters
    filename_parts = ['liquidation_report']
    if filters.get('start_date') and filters.get('end_date'):
        filename_parts.append(
            f"{filters['start_date']}_to_{filters['end_date']}")
    elif filters.get('status') and filters['status'] != 'all':
        filename_parts.append(filters['status'])

    response['Content-Disposition'] = f'attachment; filename="{"_".join(filename_parts)}.csv"'

    writer = csv.writer(response)

    # Add company header
    writer.writerow(['COMPANY NAME'])
    writer.writerow(['Liquidation Report'])
    writer.writerow([f'Generated on: {timezone.now().date()}'])
    if filters.get('start_date') and filters.get('end_date'):
        writer.writerow(
            [f'Date Range: {filters["start_date"]} to {filters["end_date"]}'])
    if filters.get('status') and filters['status'] != 'all':
        writer.writerow([f'Status: {filters["status"]}'])
    writer.writerow([])  # Empty row for spacing

    # Write column headers
    writer.writerow([
        'Liquidation ID', 'Request ID', 'School ID', 'School Name',
        'District', 'Municipality', 'Legislative District', 'Month',
        'Status', 'Created At', 'Submitted At', 'Liquidated At', 'Refund',
        'Reviewed by District', 'Reviewed by Liquidator', 'Reviewed by Division'
    ])

    for item in report_data:
        writer.writerow([
            item['liquidation_id'],
            item['request_id'],
            item['school_id'],
            item['school_name'],
            item['district_name'],
            item['municipality'],
            item['legislative_district'],
            item['request_month'],
            item['status'],
            item['created_at'].date() if item['created_at'] else '',
            item['date_submitted'].date() if item['date_submitted'] else '',
            item['date_liquidated'].date() if item['date_liquidated'] else '',
            item['refund'] or '',
            # Now a string instead of User object
            item['reviewed_by_district'],
            # Now a string instead of User object
            item['reviewed_by_liquidator'],
            # Now a string instead of User object
            item['reviewed_by_division'],
        ])

    return response


def generate_liquidation_excel_report(report_data, filters):
    """Generate Excel report for liquidation data"""
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Liquidation Report"

    # Add logos
    try:
        # Left logo - company-logo.png
        left_logo_path = os.path.join(
            settings.BASE_DIR, 'static', 'images', 'logo.png')
        if os.path.exists(left_logo_path):
            left_img = Image(left_logo_path)
            left_img.width = 80
            left_img.height = 80
            ws.add_image(left_img, 'A1')
    except Exception as e:
        logger.error(f"Could not add left logo: {e}")

    try:
        # Right logo - deped-bagong-pilipinas-logo.png
        right_logo_path = os.path.join(
            settings.BASE_DIR, 'static', 'images', 'depend-bagong-pilipinas-logo.png')
        if os.path.exists(right_logo_path):
            right_img = Image(right_logo_path)
            right_img.width = 80
            right_img.height = 80
            ws.add_image(right_img, 'P1')
    except Exception as e:
        logger.error(f"Could not add right logo: {e}")

    # Add centered text
    header_text = [
        "Republic of the Philippines",
        "Department of Education",
        "La Union Schools Division",
        "",
        "LIQUIDATION REPORT"
    ]

    # Start from row 1 and place each text in column H (which is column 8)
    for i, text in enumerate(header_text, 1):
        cell = ws.cell(row=i, column=8, value=text)
        cell.font = Font(bold=True)
        if i == 5:  # Make the last line (report title) larger
            cell.font = Font(size=14, bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center')

    # Merge cells for the report title to make it span across multiple columns
    ws.merge_cells('H5:J5')

    # Add generation info
    ws['A7'] = f'Generated on: {timezone.now().date()}'
    if filters.get('start_date') and filters.get('end_date'):
        ws['A8'] = f'Date Range: {filters["start_date"]} to {filters["end_date"]}'
    if filters.get('status') and filters['status'] != 'all':
        ws['A9'] = f'Status: {filters["status"]}'

    # Add column headers
    headers = [
        'Liquidation ID', 'Request ID', 'School ID', 'School Name',
        'District', 'Municipality', 'Legislative District', 'Month',
        'Status', 'Created At', 'Submitted At', 'Liquidated At', 'Refund',
        'Reviewed by District', 'Reviewed by Liquidator', 'Reviewed by Division'
    ]

    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=10, column=col_num, value=header)
        cell.font = Font(bold=True)

    # Add data
    for row_num, item in enumerate(report_data, 11):
        ws.cell(row=row_num, column=1, value=item['liquidation_id'])
        ws.cell(row=row_num, column=2, value=item['request_id'])
        ws.cell(row=row_num, column=3, value=item['school_id'])
        ws.cell(row=row_num, column=4, value=item['school_name'])
        ws.cell(row=row_num, column=5, value=item['district_name'])
        ws.cell(row=row_num, column=6, value=item['municipality'])
        ws.cell(row=row_num, column=7, value=item['legislative_district'])
        ws.cell(row=row_num, column=8, value=item['request_month'])
        ws.cell(row=row_num, column=9, value=item['status'])
        ws.cell(row=row_num, column=10,
                value=item['created_at'].date() if item['created_at'] else '')
        ws.cell(row=row_num, column=11, value=item['date_submitted'].date(
        ) if item['date_submitted'] else '')
        ws.cell(row=row_num, column=12, value=item['date_liquidated'].date(
        ) if item['date_liquidated'] else '')
        ws.cell(row=row_num, column=13, value=item['refund'] or '')
        ws.cell(row=row_num, column=14,
                value=f"{item['reviewed_by_district'].first_name} {item['reviewed_by_district'].last_name}" if item['reviewed_by_district'] else '')
        ws.cell(row=row_num, column=15,
                value=f"{item['reviewed_by_liquidator'].first_name} {item['reviewed_by_liquidator'].last_name}" if item['reviewed_by_liquidator'] else '')
        ws.cell(row=row_num, column=16,
                value=f"{item['reviewed_by_division'].first_name} {item['reviewed_by_division'].last_name}" if item['reviewed_by_division'] else '')

    # Auto-adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)  # Cap at 50 characters
        ws.column_dimensions[column_letter].width = adjusted_width

    # Save to response
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    # Generate filename based on filters
    filename_parts = ['liquidation_report']
    if filters.get('start_date') and filters.get('end_date'):
        filename_parts.append(
            f"{filters['start_date']}_to_{filters['end_date']}")
    elif filters.get('status') and filters['status'] != 'all':
        filename_parts.append(filters['status'])

    response = HttpResponse(buffer.getvalue(),
                            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="{"_".join(filename_parts)}.xlsx"'

    return response
