"""
PDF Generation Utilities - Debug Version
Fixed common issues that cause 500 errors
"""

import os
import io
import base64
from datetime import datetime
from decimal import Decimal
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, Flowable,Frame, PageTemplate, BaseDocTemplate, NextPageTemplate
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from PIL import Image as PILImage
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String
import logging


logger = logging.getLogger(__name__)


def format_currency_safe(amount, use_peso_symbol=True):
    """
    Format currency amount with safe peso symbol display.
    Falls back to 'Php' if peso symbol is not supported.
    """
    try:
        if use_peso_symbol:
            return f"₱{float(amount):,.2f}"
        else:
            return f"Php {float(amount):,.2f}"
    except (ValueError, TypeError):
        return "Php 0.00"


class PDFGenerator:
    """Handles PDF generation with actual e-signatures matching original format"""

    def __init__(self):
        try:
            self.styles = getSampleStyleSheet()
            self.setup_custom_styles()
            # Page dimensions
            self.page_width = A4[0]
            self.page_height = A4[1]
            # Logo settings (matching original)
            self.logo_width = 28 * 72/25.4  # ~79.3 points ≈ 1.1 inch
            self.logo_height = 28 * 72/25.4  # ~79.3 points ≈ 1.1 inch
            self.logo_y = 22 * 72/25.4
            self.header_base_y = 20 * 72/25.4
            # Logo positioning
            self.logo_margin_from_center = 55 * 72/25.4
            logger.info("PDFGenerator initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing PDFGenerator: {e}")
            raise

    def register_old_english_font(self):
        """Register Old English Text MT font from project directory"""
        try:
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont

            # Path to your font file in the project
            font_path = os.path.join(
                settings.BASE_DIR, 'static', 'fonts', 'oldenglishtextmt.ttf')

            if os.path.exists(font_path):
                pdfmetrics.registerFont(TTFont('OldEnglishTextMT', font_path))
                logger.info("Old English Text MT font registered successfully")
                return 'OldEnglishTextMT'
            else:
                logger.warning(
                    "Old English Text MT font not found, using Times-Roman as fallback")
                return 'Times-Roman'

        except Exception as e:
            logger.error(f"Error registering Old English font: {e}")
            return 'Times-Roman'

    def setup_custom_styles(self):
        """Setup custom paragraph styles matching original format"""
        try:
            # Register the Old English font
            old_english_font = self.register_old_english_font()

            # Header styles matching original fonts and sizes
            if not hasattr(self.styles, 'HeaderRepublic'):
                self.styles.add(ParagraphStyle(
                    name='HeaderRepublic',
                    parent=self.styles['Normal'],
                    fontSize=12,
                    spaceAfter=3,
                    alignment=TA_CENTER,
                    fontName=old_english_font  # Use Old English Text MT
                ))

            if not hasattr(self.styles, 'HeaderDepartment'):
                self.styles.add(ParagraphStyle(
                    name='HeaderDepartment',
                    parent=self.styles['Normal'],
                    fontSize=18,
                    spaceAfter=3,
                    alignment=TA_CENTER,
                    fontName=old_english_font  # Use Old English Text MT
                ))

            if not hasattr(self.styles, 'HeaderSmall'):
                self.styles.add(ParagraphStyle(
                    name='HeaderSmall',
                    parent=self.styles['Normal'],
                    fontSize=10,
                    spaceAfter=2,
                    alignment=TA_CENTER,
                    fontName='Helvetica-Bold'
                ))

            if not hasattr(self.styles, 'HeaderSchool'):
                self.styles.add(ParagraphStyle(
                    name='HeaderSchool',
                    parent=self.styles['Normal'],
                    fontSize=11,
                    spaceAfter=2,
                    alignment=TA_CENTER,
                    fontName='Helvetica-Bold'
                ))

            # Body styles matching Calibri equivalent - check if they exist first
            if not hasattr(self.styles, 'BodyText'):
                self.styles.add(ParagraphStyle(
                    name='BodyText',
                    parent=self.styles['Normal'],
                    fontSize=11,
                    spaceAfter=6,
                    alignment=TA_LEFT,
                    fontName='Helvetica'
                ))

            if not hasattr(self.styles, 'BodyBold'):
                self.styles.add(ParagraphStyle(
                    name='BodyBold',
                    parent=self.styles['Normal'],
                    fontSize=11,
                    spaceAfter=6,
                    alignment=TA_LEFT,
                    fontName='Helvetica-Bold'
                ))

            # Table title style
            if not hasattr(self.styles, 'TableTitle'):
                self.styles.add(ParagraphStyle(
                    name='TableTitle',
                    parent=self.styles['Normal'],
                    fontSize=11,
                    spaceAfter=3,
                    alignment=TA_CENTER,
                    fontName='Helvetica-Bold'
                ))

            # Signature styles
            if not hasattr(self.styles, 'SignatureLabel'):
                self.styles.add(ParagraphStyle(
                    name='SignatureLabel',
                    parent=self.styles['Normal'],
                    fontSize=11,
                    spaceAfter=3,
                    alignment=TA_LEFT,
                    fontName='Helvetica'
                ))

            if not hasattr(self.styles, 'SignatureName'):
                self.styles.add(ParagraphStyle(
                    name='SignatureName',
                    parent=self.styles['Normal'],
                    fontSize=11,
                    spaceAfter=3,
                    alignment=TA_LEFT,
                    fontName='Helvetica-Bold'
                ))

            if not hasattr(self.styles, 'SignatureTitle'):
                self.styles.add(ParagraphStyle(
                    name='SignatureTitle',
                    parent=self.styles['Normal'],
                    fontSize=11,
                    spaceAfter=3,
                    alignment=TA_LEFT,
                    fontName='Helvetica'
                ))
            logger.debug("Custom styles setup completed")
        except Exception as e:
            logger.error(f"Error setting up custom styles: {e}")
            raise

    def get_deped_logo_base64(self):
        """Get DepEd logo as base64 from static folder"""
        try:
            # Path to your logo file
            logo_path = os.path.join(
                settings.BASE_DIR, 'static', 'images', 'logo.png')
            if not os.path.exists(logo_path):
                logger.error(f"DepEd logo not found at {logo_path}")
                return None
            with open(logo_path, 'rb') as img_file:
                img_data = img_file.read()
                base64_data = base64.b64encode(img_data).decode('utf-8')
                return f"data:image/png;base64,{base64_data}"
        except Exception as e:
            logger.error(f"Error getting DepEd logo: {e}")
            return None

    def get_district_logo_base64(self, district):
        """Convert district logo to base64 string with error handling"""
        if not district:
            logger.debug("No district provided")
            return None

        if not hasattr(district, 'logo') or not district.logo:
            logger.debug(f"District {district} has no logo")
            return None

        try:
            # Check if file exists locally
            if hasattr(district.logo, 'path') and os.path.exists(district.logo.path):
                logger.debug(
                    f"Reading district logo from path: {district.logo.path}")
                with open(district.logo.path, 'rb') as img_file:
                    img_data = img_file.read()
                    base64_data = base64.b64encode(img_data).decode('utf-8')
                    return f"data:image/png;base64,{base64_data}"
            else:
                logger.debug(
                    f"District logo path not accessible, trying URL: {district.logo.url}")
                # For cloud storage, we'll skip for now to avoid external requests
                return None

        except Exception as e:
            logger.error(f"Error converting district logo to base64: {e}")
            return None

    def get_school_logo_base64(self, school):
        """Convert school logo to base64 string with error handling"""
        if not school or not hasattr(school, 'logo') or not school.logo:
            logger.debug("No school logo provided")
            return None

        try:
            # Check if file exists locally
            if hasattr(school.logo, 'path') and os.path.exists(school.logo.path):
                logger.debug(
                    f"Reading school logo from path: {school.logo.path}")
                with open(school.logo.path, 'rb') as img_file:
                    img_data = img_file.read()
                    base64_data = base64.b64encode(img_data).decode('utf-8')
                    return f"data:image/png;base64,{base64_data}"
            else:
                logger.debug(
                    "School logo path not accessible, skipping remote URLs for now")
                return None
        except Exception as e:
            logger.error(f"Error converting school logo to base64: {e}")
            return None

    def create_logo_image(self, logo_base64, width, height):
        """Create a ReportLab Image from base64 data with error handling"""
        if not logo_base64:
            logger.debug("No logo base64 data provided")
            return None

        try:
            # Remove data URL prefix if present
            if logo_base64.startswith('data:'):
                logo_base64 = logo_base64.split(',')[1]

            # Decode base64
            logo_data = base64.b64decode(logo_base64)

            # Create a temporary file-like object
            logo_io = io.BytesIO(logo_data)

            # Create ReportLab Image
            image = Image(logo_io, width=width, height=height)
            logger.debug(f"Successfully created logo image: {width}x{height}")
            return image

        except Exception as e:
            logger.error(f"Error creating logo image: {e}")
            return None

    def create_signature_image(self, signature_base64, width=2*inch, height=0.5*inch):
        """Create a signature image from base64 data with error handling"""
        if not signature_base64:
            logger.debug("No signature base64 data provided")
            return None

        try:
            # Remove data URL prefix if present
            if signature_base64.startswith('data:'):
                signature_base64 = signature_base64.split(',')[1]

            # Decode base64
            signature_data = base64.b64decode(signature_base64)

            # Create a temporary file-like object
            signature_io = io.BytesIO(signature_data)

            # Open with PIL to get dimensions
            pil_image = PILImage.open(signature_io)

            # Calculate aspect ratio
            aspect_ratio = pil_image.width / pil_image.height

            # Adjust dimensions while maintaining aspect ratio
            if aspect_ratio > width/height:
                new_width = width
                new_height = width / aspect_ratio
            else:
                new_height = height
                new_width = height * aspect_ratio

            # Create ReportLab Image
            signature_io.seek(0)  # Reset to beginning
            image = Image(signature_io, width=new_width, height=new_height)
            logger.debug(
                f"Successfully created signature image: {new_width}x{new_height}")
            return image

        except Exception as e:
            logger.error(f"Error creating signature image: {e}")
            return None

    def generate_request_pdf_with_signatures(self, request_obj):
        """
        Generate PDF for approved request with actual e-signatures
        Debug version with extensive error handling

        Args:
            request_obj: RequestManagement instance that has been approved

        Returns:
            PDF content as bytes
        """
        try:
            logger.info(
                f"Starting PDF generation for request: {request_obj.request_id}")

            # Create a BytesIO buffer to hold the PDF
            buffer = io.BytesIO()

            # Create the PDF document with exact margins from original
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=18*72/25.4,  # 18mm converted to points
                leftMargin=18*72/25.4,
                topMargin=72,
                bottomMargin=18*72/25.4
            )

            logger.debug("PDF document template created")

            # Build the PDF content
            story = []

            # Get signatories with error handling
            try:
                from .models import User
                superintendent = User.objects.filter(
                    role='superintendent', is_active=True).first()
                accountant = User.objects.filter(
                    role='accountant', is_active=True).first()
                logger.debug(
                    f"Found superintendent: {superintendent}, accountant: {accountant}")
            except Exception as e:
                logger.error(f"Error getting signatories: {e}")
                superintendent = None
                accountant = None

            # Add header (simplified for debugging)
            try:
                story.extend(self._create_simple_header(request_obj))
                logger.debug("Header created successfully")
            except Exception as e:
                logger.error(f"Error creating header: {e}")
                story.append(
                    Paragraph("LIQUIDATION MANAGEMENT SYSTEM", self.styles['HeaderDepartment']))

            story.append(Spacer(1, 6))  # Small space below header
            # story.append(HorizontalLine(self.page_width - 36,
            #              thickness=0.5, color=colors.grey))
            story.append(Spacer(1, 12))  # Space after the line

            # Date (left aligned, matching original)
            try:
                date_str = request_obj.created_at.strftime("%B %d, %Y")
                story.append(
                    Paragraph(f"Date: {date_str}", self.styles['BodyText']))
                logger.debug("Date added successfully")
            except Exception as e:
                logger.error(f"Error adding date: {e}")
                story.append(
                    Paragraph("Date: [Error getting date]", self.styles['BodyText']))

            story.append(Spacer(1, 15))

            # Recipient section
            try:
                story.extend(self._create_recipient_section(superintendent))
                logger.debug("Recipient section created")
            except Exception as e:
                logger.error(f"Error creating recipient section: {e}")
                story.append(
                    Paragraph("Schools Division Superintendent", self.styles['BodyBold']))

            story.append(Spacer(1, 15))

            # Salutation
            story.append(Paragraph("Dear Superintendent:",
                         self.styles['BodyText']))
            story.append(Spacer(1, 10))

            # Request content
            try:
                story.extend(self._create_request_content(request_obj))
                logger.debug("Request content created")
            except Exception as e:
                logger.error(f"Error creating request content: {e}")
                story.append(
                    Paragraph("Request for cash advance.", self.styles['BodyText']))

            story.append(Spacer(1, 20))

            # Table header
            try:
                story.extend(self._create_table_header(request_obj))
                logger.debug("Table header created")
            except Exception as e:
                logger.error(f"Error creating table header: {e}")
                story.append(Paragraph("LIST OF PRIORITIES",
                             self.styles['TableTitle']))

            story.append(Spacer(1, 10))

            # Priorities table
            try:
                story.extend(self._create_priorities_table(request_obj))
                logger.debug("Priorities table created")
            except Exception as e:
                logger.error(f"Error creating priorities table: {e}")
                story.append(
                    Paragraph("Error creating priorities table", self.styles['BodyText']))

            story.append(Spacer(1, 30))

            # Signature section (simplified)
            try:
                story.extend(self._create_simple_signature_section(
                    request_obj, superintendent, accountant))
                logger.debug("Signature section created")
            except Exception as e:
                logger.error(f"Error creating signature section: {e}")
                story.append(Paragraph("Signature section error",
                             self.styles['BodyText']))

            # Before adding the signature section
            # Increase this value to move signatories further down

            # Build the PDF
            logger.debug("Building PDF...")
            doc.build(story)

            # Get the PDF content
            pdf_content = buffer.getvalue()
            buffer.close()

            logger.info(
                f"PDF generated successfully. Size: {len(pdf_content)} bytes")
            return pdf_content

        except Exception as e:
            logger.error(f"Critical error generating PDF: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

    def _create_simple_header(self, request_obj):
        """
        Create header that matches the frontend PDF layout exactly:
        - DepEd logo on the left
        - Texts centered
        - District logo on the right
        """
        story = []

        # Get logos
        deped_logo_base64 = self.get_deped_logo_base64()
        deped_logo_img = None
        if deped_logo_base64:
            deped_logo_img = self.create_logo_image(
                deped_logo_base64, self.logo_width, self.logo_height
            )

        school = getattr(request_obj.user, 'school', None)
        district = getattr(school, 'district', None) if school else None

        district_logo_img = None
        if district:
            district_logo_base64 = self.get_district_logo_base64(district)
            if district_logo_base64:
                district_logo_img = self.create_logo_image(
                    district_logo_base64, self.logo_width, self.logo_height
                )

        # Build center text
        center_text = []
        center_text.append(
            Paragraph("Republic of the Philippines", self.styles['HeaderRepublic']))
        center_text.append(
            Paragraph("Department of Education", self.styles['HeaderDepartment']))
        center_text.append(Spacer(1, 9))  # 6 points, adjust as needed
        center_text.append(Paragraph("Region 1", self.styles['HeaderSmall']))
        center_text.append(
            Paragraph("Schools Division of La Union", self.styles['HeaderSmall']))

        if district:
            center_text.append(
                Paragraph(district.districtName.upper(), self.styles['HeaderSchool']))
            municipality = district.municipality.upper() if district.municipality else ""
            center_text.append(
                Paragraph(f"{municipality}, LA UNION", self.styles['HeaderSmall']))
        elif school:
            center_text.append(
                Paragraph(school.schoolName.upper(), self.styles['HeaderSchool']))
            municipality = school.municipality.upper() if school.municipality else ""
            center_text.append(
                Paragraph(f"{municipality}, LA UNION", self.styles['HeaderSmall']))

        # Table with 3 columns: left logo, center text, right logo
        table_data = [[
            deped_logo_img if deped_logo_img else "",
            center_text,
            district_logo_img if district_logo_img else ""
        ]]

        header_table = Table(
            table_data,
            colWidths=[self.logo_width + 5, self.page_width -
                       (2 * (self.logo_width + 5) + 100), self.logo_width + 5]
        )

        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
        ]))

        story.append(header_table)
        story.append(Spacer(1, 6))  # Small space below header
        story.append(HorizontalLine(self.page_width - 80,
                     thickness=2, color=colors.black))
        story.append(Spacer(1, 12))  # Space after the line

        return story

    def _create_recipient_section(self, superintendent):
        """Create recipient section matching original format"""
        story = []

        if superintendent:
            full_name = f"{superintendent.first_name} {superintendent.last_name}".upper(
            )
            story.append(Paragraph(full_name, self.styles['BodyBold']))
        else:
            story.append(
                Paragraph("[SUPERINTENDENT NAME]", self.styles['BodyBold']))

        story.append(Paragraph("Schools Division Superintendent",
                     self.styles['BodyText']))
        story.append(Paragraph("DEPED La Union Schools Division",
                     self.styles['BodyText']))
        story.append(Paragraph("San Fernando City, La Union",
                     self.styles['BodyText']))

        return story

    def _create_request_content(self, request_obj):
        """Create request content matching original format"""
        story = []

        # Calculate total amount
        total_amount = sum(
            rp.amount for rp in request_obj.requestpriority_set.all())

        # Dynamic month/year from submission date
        submission_date = request_obj.created_at
        month_year = submission_date.strftime("%B %Y")

        # Request text (matching original exactly)
        request_text = (f"Requesting for cash advance to School MOOE for the month of {month_year}, "
                        f"amounting to Php {total_amount:,.2f}.")

        story.append(Paragraph(request_text, self.styles['BodyText']))

        return story

    def _create_table_header(self, request_obj):
        """Create centered table header matching original"""
        story = []

        # Main title
        story.append(Paragraph("LIST OF PRIORITIES",
                     self.styles['TableTitle']))

        # Month/year subtitle
        submission_date = request_obj.created_at
        month_year = submission_date.strftime("%B %Y")
        story.append(Paragraph(month_year, self.styles['TableTitle']))

        return story

    def _create_priorities_table(self, request_obj):
        """Create priorities table with error handling"""
        story = []

        try:
            # Table data
            data = []

            # Header row
            data.append(['Expense', 'Amount'])

            # Priority rows
            priorities = request_obj.requestpriority_set.all()
            logger.debug(f"Found {len(priorities)} priorities")

            for rp in priorities:
                expense_text = rp.priority.expenseTitle
                amount_text = f"{rp.amount:,.2f}"
                data.append([expense_text, amount_text])

            # Total row
            total_amount = sum(rp.amount for rp in priorities)
            data.append(['TOTAL', f"{total_amount:,.2f}"])

            # Create table with fixed column widths
            table = Table(data, colWidths=[4*inch, 2*inch])

            # Table styling (simplified for debugging)
            table_style = TableStyle([
                # Header row styling
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (1, 0), (1, 0), 'CENTER'),

                # Data rows styling
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -2), 11),
                ('ALIGN', (0, 1), (0, -2), 'LEFT'),
                ('ALIGN', (1, 1), (1, -2), 'CENTER'),

                # Total row styling
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 11),
                ('ALIGN', (0, -1), (0, -1), 'LEFT'),
                ('ALIGN', (1, -1), (1, -1), 'CENTER'),

                # Grid and borders
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),

                # Padding
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ])

            table.setStyle(table_style)
            story.append(table)

        except Exception as e:
            logger.error(f"Error creating priorities table: {e}")
            # Fallback simple table
            fallback_data = [['Expense', 'Amount'],
                             ['Error loading data', '0.00']]
            fallback_table = Table(fallback_data, colWidths=[4*inch, 2*inch])
            story.append(fallback_table)

        return story

    def _create_simple_signature_section(self, request_obj, superintendent, accountant):
        """Create signature section with proper business rule logic"""
        story = []
        story.append(Spacer(1, 100))

        # Get approval status based on business rules
        status = request_obj.status

        # --- Left Column: School Head (ALWAYS visible - submitted by school head) ---
        left_column = []
        left_column.append(
            Paragraph("Prepared by:", self.styles['SignatureLabel']))
        left_column.append(Spacer(1, 15))

        school_head = request_obj.user
        school_head_signature = self._get_user_signature(school_head)
        if school_head_signature:
            left_column.append(school_head_signature)
        else:
            left_column.append(
                Paragraph("_" * 20, self.styles['SignatureLabel']))

        school_head_name = f"{school_head.first_name.upper()} {school_head.last_name.upper()}"
        left_column.append(
            Paragraph(school_head_name, self.styles['SignatureName']))
        left_column.append(
            Paragraph("School Head", self.styles['SignatureTitle']))

        # --- Middle Column: Superintendent (visible when APPROVED or later) ---
        middle_column = []
        middle_column.append(
            Paragraph("Approved by:", self.styles['SignatureLabel']))
        middle_column.append(Spacer(1, 15))

        # Superintendent signature shows when status is approved or beyond
        superintendent_signature = self._get_user_signature(
            superintendent) if superintendent else None
        if superintendent_signature and status in ['approved', 'downloaded', 'unliquidated', 'liquidated']:
            middle_column.append(superintendent_signature)
        else:
            middle_column.append(
                Paragraph("_" * 20, self.styles['SignatureLabel']))

        if superintendent:
            superintendent_name = f"{superintendent.first_name.upper()} {superintendent.last_name.upper()}"
            middle_column.append(
                Paragraph(superintendent_name, self.styles['SignatureName']))
        else:
            middle_column.append(
                Paragraph("[SUPERINTENDENT NAME]", self.styles['SignatureName']))

        middle_column.append(
            Paragraph("Schools Division Superintendent", self.styles['SignatureTitle']))

        # --- Right Column: Accountant (visible when DOWNLOADED or beyond) ---
        right_column = []
        right_column.append(Paragraph("Certified Correct:",
                            self.styles['SignatureLabel']))
        right_column.append(Spacer(1, 15))

        # Accountant signature shows when status is downloaded or beyond (after accountant processes)
        accountant_signature = self._get_user_signature(
            accountant) if accountant else None
        if accountant_signature and status in ['downloaded', 'unliquidated', 'liquidated']:
            right_column.append(accountant_signature)
        else:
            right_column.append(
                Paragraph("_" * 20, self.styles['SignatureLabel']))

        if accountant:
            accountant_name = f"{accountant.first_name.upper()} {accountant.last_name.upper()}"
            right_column.append(
                Paragraph(accountant_name, self.styles['SignatureName']))
        else:
            right_column.append(
                Paragraph("[ACCOUNTANT NAME]", self.styles['SignatureName']))

        right_column.append(
            Paragraph("Accountant III", self.styles['SignatureTitle']))

        # --- Combine into row ---
        signature_data = [[left_column, middle_column, right_column]]
        signature_table = Table(signature_data, colWidths=[
                                2.5*inch, 2.5*inch, 2.5*inch])
        signature_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))

        story.append(signature_table)
        return story

    def _get_user_signature(self, user):
        """Helper to get user signature image"""
        if user and user.e_signature:
            try:
                if hasattr(user.e_signature, 'path') and os.path.exists(user.e_signature.path):
                    with open(user.e_signature.path, 'rb') as sig_file:
                        sig_data = sig_file.read()
                        sig_base64 = base64.b64encode(sig_data).decode('utf-8')
                        return self.create_signature_image(
                            f"data:image/png;base64,{sig_base64}",
                            width=2*inch,
                            height=0.5*inch
                        )
            except Exception as e:
                logger.error(
                    f"Error loading signature for user {user.id}: {e}")
        return None

    def _get_approval_status(self, request_obj):
        """Determine which signatures should be visible based on request status"""
        status = request_obj.status

        return {
            'school_head_visible': True,  # Always visible (submitted)
            'superintendent_visible': status in ['approved', 'downloaded', 'unliquidated', 'liquidated'],
            'accountant_visible': status in ['downloaded', 'unliquidated', 'liquidated']
        }


class HorizontalLine(Flowable):
    def __init__(self, width, thickness=0.5, color=colors.black):
        Flowable.__init__(self)
        self.width = width
        self.thickness = thickness
        self.color = color

    def draw(self):
        self.canv.setLineWidth(self.thickness)
        self.canv.setStrokeColor(self.color)
        self.canv.line(0, 0, self.width, 0)


def generate_request_pdf_with_signatures(request_obj):
    """
    Main function to generate PDF with signatures
    Debug version with extensive error handling and logging
    """
    try:
        logger.info(
            f"generate_request_pdf_with_signatures called for request: {request_obj.request_id}")
        generator = PDFGenerator()
        result = generator.generate_request_pdf_with_signatures(request_obj)
        logger.info("PDF generation completed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in generate_request_pdf_with_signatures: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise


class DemandLetterGenerator(PDFGenerator):
    """Handles Demand Letter PDF generation matching the exact specifications"""
    
    def __init__(self):
        super().__init__()
        self.setup_demand_letter_styles()
    
    def setup_demand_letter_styles(self):
        """Setup custom paragraph styles for demand letter matching exact specs"""
        try:
            # Register required fonts first
            self._register_required_fonts()
            
            # Ensure we have a font mapping for use in styles
            # Defaults map to base ReportLab fonts if custom ones are unavailable
            if not hasattr(self, 'font_names') or not self.font_names:
                self.font_names = {
                    'old_english': 'Times-Roman',
                    'trajan_regular': 'Helvetica',
                    'trajan_bold': 'Helvetica-Bold',
                    'times_regular': 'Times-Roman',
                    'times_bold': 'Times-Bold',
                    'times_italic': 'Times-Italic',
                }
            
            # Header styles - compact spacing
            if not hasattr(self.styles, 'HeaderRepublic'):
                self.styles.add(ParagraphStyle(
                    name='HeaderRepublic',
                    parent=self.styles['Normal'],
                    fontSize=12,
                    spaceAfter=0,  # Reduced from 2 to 0
                    alignment=TA_CENTER,
                    fontName=self.font_names.get('old_english', 'Times-Roman')  # Old English Text MT or fallback
                ))
            
            if not hasattr(self.styles, 'HeaderDepartment'):
                self.styles.add(ParagraphStyle(
                    name='HeaderDepartment',
                    parent=self.styles['Normal'],
                    fontSize=20,
                    spaceAfter=0,  # Reduced from 2 to 0
                    alignment=TA_CENTER,
                    fontName=self.font_names.get('old_english', 'Times-Roman')  # Old English Text MT or fallback
                ))
            
            if not hasattr(self.styles, 'HeaderRegion'):
                self.styles.add(ParagraphStyle(
                    name='HeaderRegion',
                    parent=self.styles['Normal'],
                    fontSize=10,
                    spaceAfter=0,   # Keep no space after
                    alignment=TA_CENTER,
                    fontName=self.font_names.get('trajan_regular', 'Times-Roman')  # Trajan Pro or fallback
                ))
            
            if not hasattr(self.styles, 'HeaderDivision'):
                self.styles.add(ParagraphStyle(
                    name='HeaderDivision',
                    parent=self.styles['Normal'],
                    fontSize=12.5,
                    spaceAfter=0,  # Reduced from 1 to 0
                    alignment=TA_CENTER,
                    fontName=self.font_names.get('trajan_bold', 'Times-Roman')
                ))
            
            # Body styles (Times New Roman, size 10)
            if not hasattr(self.styles, 'DemandBody'):
                self.styles.add(ParagraphStyle(
                    name='DemandBody',
                    parent=self.styles['Normal'],
                    fontSize=10,
                    spaceAfter=8,
                    alignment=TA_JUSTIFY,
                    fontName=self.font_names.get('times_regular', 'Times-Roman'),
                    leading=12
                ))
            
            if not hasattr(self.styles, 'DemandBodyLeft'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodyLeft',
                    parent=self.styles['DemandBody'],
                    alignment=TA_LEFT
                ))
            
            if not hasattr(self.styles, 'DemandBodyBold'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodyBold',
                    parent=self.styles['DemandBody'],
                    fontName=self.font_names.get('times_bold', 'Times-Bold')
                ))
            
            if not hasattr(self.styles, 'DemandBodyIndent'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodyIndent',
                    parent=self.styles['DemandBody'],
                    leftIndent=20
                ))
            
            # Specific indentation styles for demand letter
            if not hasattr(self.styles, 'DemandBodyIndentHalf'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodyIndentHalf',
                    parent=self.styles['DemandBody'],
                    leftIndent=36  # 0.5 inch = 36 points
                ))
            
            if not hasattr(self.styles, 'DemandBodyIndentFull'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodyIndentFull',
                    parent=self.styles['DemandBody'],
                    leftIndent=72  # 1 inch = 72 points
                ))
            
            # Italicized style for district supervisor info
            if not hasattr(self.styles, 'DemandBodyItalic'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodyItalic',
                    parent=self.styles['DemandBody'],
                    fontName=self.font_names.get('times_italic', 'Times-Italic'),
                    spaceAfter=2  # Reduced spacing
                ))
            
            # Italicized style for school head info with 1 inch indent
            if not hasattr(self.styles, 'DemandBodyItalicIndent'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodyItalicIndent',
                    parent=self.styles['DemandBody'],
                    fontName=self.font_names.get('times_italic', 'Times-Italic'),
                    leftIndent=72,  # 1 inch = 72 points
                    spaceAfter=2  # Reduced spacing
                ))
            
            # Compact bold style for signature names
            if not hasattr(self.styles, 'DemandBodyBoldCompact'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodyBoldCompact',
                    parent=self.styles['DemandBody'],
                    fontName=self.font_names.get('times_bold', 'Times-Bold'),
                    spaceAfter=0  # No spacing for maximum tightness
                ))
            
            # Compact italicized style for signature titles/positions
            if not hasattr(self.styles, 'DemandBodyItalicCompact'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodyItalicCompact',
                    parent=self.styles['DemandBody'],
                    fontName=self.font_names.get('times_italic', 'Times-Italic'),
                    spaceAfter=0  # No spacing for maximum tightness
                ))
            
            # Small font style for carbon copy section
            if not hasattr(self.styles, 'DemandBodySmall'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodySmall',
                    parent=self.styles['DemandBody'],
                    fontSize=8,
                    spaceAfter=2  # Tight spacing
                ))
            
            # Small font bold style for names in carbon copy
            if not hasattr(self.styles, 'DemandBodySmallBold'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodySmallBold',
                    parent=self.styles['DemandBody'],
                    fontSize=8,
                    fontName=self.font_names.get('times_bold', 'Times-Bold'),
                    spaceAfter=2  # Tight spacing
                ))
            
            # Small font italic style for carbon copy
            if not hasattr(self.styles, 'DemandBodySmallItalic'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodySmallItalic',
                    parent=self.styles['DemandBody'],
                    fontSize=8,
                    fontName=self.font_names.get('times_italic', 'Times-Italic'),
                    spaceAfter=2  # Tight spacing
                ))
            
            # Small font with small indent for carbon copy
            if not hasattr(self.styles, 'DemandBodySmallIndent'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodySmallIndent',
                    parent=self.styles['DemandBody'],
                    fontSize=8,
                    leftIndent=12,  # Small indent
                    spaceAfter=2  # Tight spacing
                ))
            
            # Small font italic with small indent for carbon copy
            if not hasattr(self.styles, 'DemandBodySmallItalicIndent'):
                self.styles.add(ParagraphStyle(
                    name='DemandBodySmallItalicIndent',
                    parent=self.styles['DemandBody'],
                    fontSize=8,
                    fontName=self.font_names.get('times_italic', 'Times-Italic'),
                    leftIndent=12,  # Small indent
                    spaceAfter=2  # Tight spacing
                ))
            
            # Table styles
            if not hasattr(self.styles, 'DemandTableHeader'):
                self.styles.add(ParagraphStyle(
                    name='DemandTableHeader',
                    parent=self.styles['Normal'],
                    fontSize=9,
                    spaceAfter=3,
                    alignment=TA_CENTER,
                    fontName=self.font_names.get('times_bold', 'Times-Bold'),
                    textColor=colors.white
                ))
            
            if not hasattr(self.styles, 'DemandTableCell'):
                self.styles.add(ParagraphStyle(
                    name='DemandTableCell',
                    parent=self.styles['Normal'],
                    fontSize=9,
                    spaceAfter=3,
                    alignment=TA_LEFT,
                    fontName=self.font_names.get('times_regular', 'Times-Roman')
                ))
            
            if not hasattr(self.styles, 'DemandTableCellRight'):
                self.styles.add(ParagraphStyle(
                    name='DemandTableCellRight',
                    parent=self.styles['DemandTableCell'],
                    alignment=TA_RIGHT
                ))
            
            # Footer styles
            if not hasattr(self.styles, 'FooterText'):
                self.styles.add(ParagraphStyle(
                    name='FooterText',
                    parent=self.styles['Normal'],
                    fontSize=8,
                    spaceAfter=2,
                    alignment=TA_LEFT,
                    fontName=self.font_names.get('trajan_regular', 'Helvetica'),
                    textColor=colors.HexColor('#555555')  # Gray color
                ))
            
            if not hasattr(self.styles, 'FooterTagline'):
                self.styles.add(ParagraphStyle(
                    name='FooterTagline',
                    parent=self.styles['Normal'],
                    fontSize=9,
                    spaceAfter=3,
                    alignment=TA_CENTER,
                    fontName=self.font_names.get('times_italic', 'Times-Italic'),
                    textColor=colors.HexColor('#E91E63')  # Pink-red color
                ))
            
            # Title styles
            if not hasattr(self.styles, 'DemandTitle'):
                self.styles.add(ParagraphStyle(
                    name='DemandTitle',
                    parent=self.styles['Normal'],
                    fontSize=14,
                    spaceAfter=6,
                    alignment=TA_CENTER,
                    fontName=self.font_names.get('times_bold', 'Times-Bold')
                ))
            
            logger.debug("Demand letter styles setup completed")
        except Exception as e:
            logger.error(f"Error setting up demand letter styles: {e}")
            raise
    
    def _register_required_fonts(self):
        """Register required fonts for the document"""
        try:
            self.font_names = {}

            def register_font_or_fallback(preferred_name, ttf_path, fallback_name):
                try:
                    if ttf_path and os.path.exists(ttf_path):
                        pdfmetrics.registerFont(TTFont(preferred_name, ttf_path))
                        logger.info(f"Successfully registered font: {preferred_name}")
                        return preferred_name
                    else:
                        logger.warning(f"Font file not found for {preferred_name} at {ttf_path}, falling back to {fallback_name}")
                        return fallback_name
                except Exception as ex:
                    logger.warning(f"Failed to register {preferred_name}, using fallback {fallback_name}: {ex}")
                    return fallback_name

            # Old English Text MT
            old_english_path = os.path.join(settings.BASE_DIR, 'static', 'fonts', 'OLDENGL.TTF')
            self.font_names['old_english'] = register_font_or_fallback('OldEnglishTextMT', old_english_path, 'Times-Roman')

            # Trajan Pro (regular and bold)
            trajan_regular_path = os.path.join(settings.BASE_DIR, 'static', 'fonts', 'TrajanPro-Regular.ttf')
            self.font_names['trajan_regular'] = register_font_or_fallback('TrajanPro-Regular', trajan_regular_path, 'Helvetica')
            # For bold, try a bold file if exists, else fallback to Helvetica-Bold
            trajan_bold_path = os.path.join(settings.BASE_DIR, 'static', 'fonts', 'TrajanPro-Bold.otf')
            self.font_names['trajan_bold'] = register_font_or_fallback('TrajanPro-Bold', trajan_bold_path, 'Helvetica-Bold')

            # Times family (mostly built-in in ReportLab, no need to register files)
            self.font_names['times_regular'] = 'Times-Roman'
            self.font_names['times_bold'] = 'Times-Bold'
            self.font_names['times_italic'] = 'Times-Italic'
            
            # Register a font that supports peso symbol (₱)
            # Try to register DejaVu Sans which has better Unicode support
            dejavu_path = os.path.join(settings.BASE_DIR, 'static', 'fonts', 'DejaVuSans.ttf')
            if os.path.exists(dejavu_path):
                pdfmetrics.registerFont(TTFont('DejaVuSans', dejavu_path))
                self.font_names['unicode_safe'] = 'DejaVuSans'
                logger.info("DejaVu Sans font registered for Unicode support")
            else:
                # Fallback to system font or use 'Php' instead of ₱
                self.font_names['unicode_safe'] = 'Helvetica'
                logger.warning("DejaVu Sans not found, using Helvetica fallback")
            
            # Log final font mapping
            logger.info(f"Final font mapping: {self.font_names}")
            
        except Exception as e:
            logger.error(f"Error registering fonts: {e}")
            # Set fallback fonts if registration fails completely
            self.font_names = {
                'old_english': 'Times-Roman',
                'trajan_regular': 'Helvetica',
                'trajan_bold': 'Helvetica-Bold',
                'times_regular': 'Times-Roman',
                'times_bold': 'Times-Bold',
                'times_italic': 'Times-Italic',
            }

    def _create_official_header(self):
        """Create official header with DepEd seal and proper typography"""
        story = []
        try:
            seal_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'seal_deped.png')
            seal_img = None
            if os.path.exists(seal_path):
                seal_img = Image(seal_path, width=1*inch, height=1*inch)  # Slightly larger for emphasis

            # Add DepEd seal if available
            if seal_img:
                story.append(seal_img)
                story.append(Spacer(1, 2))  # Small space after seal
            
            # Add header text as individual paragraphs for better spacing control
            story.append(Paragraph("Republic of the Philippines", self.styles['HeaderRepublic']))
            story.append(Paragraph("Department of Education", self.styles['HeaderDepartment']))
            story.append(Spacer(1, 6))  # Add space before REGION I to prevent overlapping
            story.append(Paragraph("REGION I", self.styles['HeaderRegion']))
            story.append(Paragraph("SCHOOLS DIVISION OF LA UNION", self.styles['HeaderDivision']))
            story.append(Spacer(1, 3))  # Reduced from 6 to 3
            story.append(HorizontalLine(6.5*inch, thickness=1.5, color=colors.black))
            story.append(Spacer(1, 8))  # Reduced from 12 to 8
        except Exception as e:
            logger.error(f"Error creating official header: {e}")
            story.append(Paragraph("Department of Education - Region I", self.styles['HeaderDivision']))
            story.append(Spacer(1, 12))
        return story

    def _create_official_footer(self):
        """Create official footer with simple layout for precise control"""
        story = []
        
        try:
            # Create a custom footer style for Calibri font (using Helvetica as fallback)
            if not hasattr(self.styles, 'FooterCalibri'):
                self.styles.add(ParagraphStyle(
                    name='FooterCalibri',
                    parent=self.styles['Normal'],
                    fontSize=10,
                    spaceAfter=0,  # No space after for tight control
                    spaceBefore=0,  # No space before for tight control
                    leading=10,     # Set leading to match font size for tight line spacing
                    alignment=TA_RIGHT,
                    fontName='Helvetica-Bold',  # Using Helvetica-Bold as Calibri fallback
                    textColor=colors.black
                ))
            
            # Create a custom style for the tagline
            if not hasattr(self.styles, 'FooterTaglineCustom'):
                self.styles.add(ParagraphStyle(
                    name='FooterTaglineCustom',
                    parent=self.styles['Normal'],
                    fontSize=8,
                    spaceAfter=0,  # No space after for tight control
                    spaceBefore=0,  # No space before for tight control
                    leading=8,      # Set leading to match font size for tight line spacing
                    alignment=TA_CENTER,  # Center aligned for full width
                    fontName='Times-BoldItalic',  # Using Times-BoldItalic as Bookman Old Style fallback
                    textColor=colors.red
                ))
            
            # DepEd Matatag logo - exact dimensions: 1.54 inch width, 0.8 inch height
            deped_matatag_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'Deped_matatag.png')
            deped_matatag_logo = None
            if os.path.exists(deped_matatag_path):
                deped_matatag_logo = Image(deped_matatag_path, width=1.54*inch, height=0.8*inch)
            else:
                logger.warning("DepEd Matatag logo not found, using text fallback")
                deped_matatag_logo = Paragraph("DepED MATATAG", self.styles['FooterCalibri'])

            # SDO La Union logo - exact dimensions: 0.79 inch width, 0.79 inch height
            sdo_la_union_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo.png')
            sdo_la_union_logo = None
            if os.path.exists(sdo_la_union_path):
                sdo_la_union_logo = Image(sdo_la_union_path, width=0.79*inch, height=0.79*inch)
            else:
                logger.warning("SDO La Union logo not found, using text fallback")
                sdo_la_union_logo = Paragraph("SDO La Union", self.styles['FooterCalibri'])

            # Create text content
            address_text = "Address: Flores St. Catbangen, City of San Fernando, La Union 2500"
            telephone_text = "Telephone Number: (072)607-6801"
            contact_text = "DepEd Tayo – La Union SDO"
            email_text = "la.union@deped.gov.ph"
            
            # Create contact details as a single line
            contact_combined = f"{contact_text} | {email_text}"
            
            # Create paragraphs for the text content
            address_para = Paragraph(address_text, self.styles['FooterCalibri'])
            telephone_para = Paragraph(telephone_text, self.styles['FooterCalibri'])
            contact_para = Paragraph(contact_combined, self.styles['FooterCalibri'])
            
            # Combine all text into a single paragraph with line breaks for ultra-tight spacing
            combined_text = f"{address_text}<br/>{telephone_text}<br/>{contact_combined}"
            combined_para = Paragraph(combined_text, self.styles['FooterCalibri'])
            
            # Create a single row table with logos and text, but add empty text above address
            # Add empty text content above the address to push it down
            text_with_spacing = f"<br/>{address_text}<br/>{telephone_text}<br/>{contact_combined}"
            combined_para_with_spacing = Paragraph(text_with_spacing, self.styles['FooterCalibri'])
            
            footer_data = [
                [deped_matatag_logo, sdo_la_union_logo, combined_para_with_spacing]      # Single row with logos + text with spacing
            ]
            
            # Calculate column widths
            first_logo_width = 1.54*inch   # DepEd Matatag logo width
            second_logo_width = 0.79*inch  # SDO La Union logo width
            text_col_width = 4.0*inch      # Remaining space for text
            
            footer_table = Table(footer_data, colWidths=[first_logo_width, second_logo_width, text_col_width])
            footer_table.setStyle(TableStyle([
                # First logo column (DepEd Matatag)
                ('VALIGN', (0, 0), (0, 0), 'TOP'),      # First logo aligned to top
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),      # First logo left aligned
                
                # Second logo column (SDO La Union)
                ('VALIGN', (1, 0), (1, 0), 'TOP'),      # Second logo aligned to top
                ('ALIGN', (1, 0), (1, 0), 'LEFT'),      # Second logo left aligned
                
                # Text column alignment
                ('VALIGN', (2, 0), (2, 0), 'TOP'),      # Combined text aligned to top
                ('ALIGN', (2, 0), (2, 0), 'RIGHT'),     # Text right aligned
                
                # Minimal padding
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                
                # Remove grid lines
                ('LINEBELOW', (0, 0), (-1, -1), 0, colors.white),
                ('LINEABOVE', (0, 0), (-1, -1), 0, colors.white),
                ('LINELEFT', (0, 0), (-1, -1), 0, colors.white),
                ('LINERIGHT', (0, 0), (-1, -1), 0, colors.white),
            ]))
            
            # Add the complete footer table
            story.append(footer_table)

            # Tagline - Bookman Old Style 8pt bold italic red, center aligned (full width)
            tagline = "Excellence We Profess, Care We Cultivate, Love We Share, Kindness We Embrace, Humility We Live."
            story.append(Paragraph(tagline, self.styles['FooterTaglineCustom']))
            
        except Exception as e:
            logger.error(f"Error creating official footer: {e}")
            story.append(Paragraph("Department of Education - La Union SDO", self.styles['FooterText']))
        
        return story

    def generate_demand_letter_pdf(self, request_obj, unliquidated_data, due_date):
        """
        Generate professional Demand Letter PDF matching exact specifications
        
        Args:
            request_obj: RequestManagement instance
            unliquidated_data: List of dictionaries with unliquidated items
            due_date: Due date for settlement (string)
            
        Returns:
            PDF content as bytes
        """
        try:
            logger.info(f"Starting professional Demand Letter generation for request: {request_obj.request_id}")

            # Create a BytesIO buffer to hold the PDF
            buffer = io.BytesIO()

            # Create the PDF document with reduced top margin for compact header
            doc = SimpleDocTemplate(
                buffer,
                pagesize=letter,
                rightMargin=72,  # 1 inch
                leftMargin=72,   # 1 inch
                topMargin=10,    # Reduced from 72 (1 inch) to 36 (0.5 inch)
                bottomMargin=72  # 1 inch
            )

            logger.debug("Professional Demand Letter document template created")

            # Build the PDF content
            story = []

            # Official, centered header with static images
            story.extend(self._create_official_header())

            # Add date (dynamic current date) - reduced spacing
            current_date = datetime.now().strftime("%B %d, %Y")
            story.append(Paragraph(f"DATE: {current_date}", self.styles['DemandBodyLeft']))
            story.append(Spacer(1, 15))  # Reduced from 12 to 8

            # Add demand letter title
            story.append(Paragraph("DEMAND LETTER", self.styles['DemandTitle']))
            story.append(Paragraph("(Re: LIQUIDATION)", self.styles['DemandTitle']))
            
            story.append(Spacer(1, 12))

            # Add recipient information
            school = getattr(request_obj.user, 'school', None)
            if school:
                district = getattr(school, 'district', None)
                if district:
                    # Get district admin name
                    from .models import User
                    district_admin = User.objects.filter(
                        role='district_admin', 
                        school__district=district, 
                        is_active=True
                    ).first()
                    
                    if district_admin:
                        district_admin_name = f"{district_admin.first_name.upper()} {district_admin.last_name.upper()}"
                        story.append(Paragraph(district_admin_name, self.styles['DemandBodyLeft']))
                    else:
                        story.append(Paragraph("DISTRICT ADMINISTRATIVE ASSISTANT", self.styles['DemandBodyLeft']))
                    
                    story.append(Paragraph("Public Schools District Administrative Assistant", self.styles['DemandBodyItalic']))
                    story.append(Paragraph(f"{district.districtName} District", self.styles['DemandBodyItalic']))
                    story.append(Spacer(1, 30))  # Reduced from 6 to 3
            
            # 0.5 inch indent for ATTENTION (36 points = 0.5 inch)
            school_head = request_obj.user
            school_head_name = f"{school_head.first_name.upper()} {school_head.last_name.upper()}"
            story.append(Paragraph(f"ATTENTION: {school_head_name}", self.styles['DemandBodyIndentHalf']))
            story.append(Spacer(1, 3))  # Reduced from 6 to 3
            
            if school:
                # 1 inch indent for School Head and School Name (72 points = 1 inch) - italicized and compact
                story.append(Paragraph("School Head", self.styles['DemandBodyItalicIndent']))
                story.append(Paragraph(school.schoolName, self.styles['DemandBodyItalicIndent']))
            
            story.append(Spacer(1, 12))
            story.append(Paragraph("Sir/Mam:", self.styles['DemandBodyLeft']))
            story.append(Spacer(1, 12))

            # Add main content
            content_text = (
                f"This is to inform you that as of {current_date}, records of "
                f"the Accounting Office show that the following downloaded cash advances "
                f"remain unliquidated and have already been overdue despite the issuance "
                f"of the previous demand letter."
            )
            story.append(Paragraph(content_text, self.styles['DemandBody']))
            story.append(Spacer(1, 12))

            # Add unliquidated items table
            try:
                story.extend(self._create_professional_unliquidated_table(unliquidated_data))
                logger.debug("Professional unliquidated table created successfully")
            except Exception as e:
                logger.error(f"Error creating professional unliquidated table: {e}")
                story.append(Paragraph("Error creating unliquidated items table", self.styles['DemandBody']))

            story.append(Spacer(1, 12))

            # Add demand section
            demand_text = (
                f"Anent this, <b>DEMAND</b> is hereby made to settle the aforementioned unliquidated "
                f"cash advance/s by submitting the necessary documents to the Accounting Office and to "
                f"refund amount in excess thereof (if any) to the Cashier <b>on or before {due_date}</b>."
            )
            story.append(Paragraph(demand_text, self.styles['DemandBody']))
            story.append(Spacer(1, 12))

            # Add CSC guidelines
            csc_text = (
                "CSC Resolution No. 1900929 dated August 13, 2019, circularized via CSC "
                "Memo Circular No. 23 s. 2019 provided the revised guidelines on the "
                "settlement of cash advance and the penalty to be imposed for failure of "
                "an Accountable Officer to liquidate cash advance within the prescribed "
                "period which includes among others:"
            )
            story.append(Paragraph(csc_text, self.styles['DemandBody']))
            story.append(Spacer(1, 6))

            # Add section 5.4
            section_text = (
                "Section 5.4 An Accountable shall be held liable for Gross Neglect of "
                "Duty and imposed the penalty of dismissal from the service for the "
                "first offense in any of the following instances:"
            )
            story.append(Paragraph(section_text, self.styles['DemandBody']))
            story.append(Spacer(1, 6))

            # Add bullet points
            bullets = [
                "a. The Accountable Officer who, after formal demand letter by the State Auditor or Audit Team Leader, fails to make any liquidation, whether partial of full, of the cash advances within the prescribed period stated in the formal demand letter;",
                "b. The Accountable Officer who, after formal demand letter by the State Auditor or Audit Team Leader, makes a partial liquidation (regardless of the amount) of the cash advance but failed to present any justifying circumstance and has no intention to fully liquidate; and",
                "c. The Accountable Officer mentioned in Section 5.2 (c) and 5.3 (c) defaulted in the payment of the unliquidated cash advance."
            ]
            
            for bullet in bullets:
                story.append(Paragraph(bullet, self.styles['DemandBodyIndent']))
                story.append(Spacer(1, 3))

            story.append(Spacer(1, 6))

            # Add COA guidelines
            coa_text = (
                "As provided under COA Circular 97-002 dated February 10, 1997, failure "
                "to comply shall constitute as a valid ground for the withholding of "
                "salaries and/or payment of any money due the Accountable Officer. "
                "Further, this may be a ground for filing of necessary action, "
                "administrative, civil or criminal in any court/tribunal pursuant to the "
                "governing laws, rules and regulations and such shall also affect the "
                "performance rating of the concerned Accountable Officer."
            )
            story.append(Paragraph(coa_text, self.styles['DemandBody']))
            story.append(Spacer(1, 12))

            # Add closing
            story.append(Paragraph("Please give this matter your preferential attention.", self.styles['DemandBody']))
            story.append(Spacer(1, 24))

            # Add signature section
            try:
                story.extend(self._create_professional_signature_section())
                logger.debug("Professional signature section created successfully")
            except Exception as e:
                logger.error(f"Error creating professional signature section: {e}")
                story.append(Paragraph("Signature section error", self.styles['DemandBody']))

            story.append(Spacer(1, 24))

            # Add receipt section - COMMENTED OUT FOR NOW
            # story.append(Paragraph("Original Copy Received:", self.styles['DemandBodyLeft']))
            # story.append(Spacer(1, 18))
            # story.append(Paragraph("Signature Over Printed Name of", self.styles['DemandBodyLeft']))
            # story.append(Paragraph("Accountable Officer", self.styles['DemandBodyLeft']))
            # story.append(Spacer(1, 12))

            # Add carbon copy - COMMENTED OUT FOR NOW
            # story.append(Paragraph("cc: ATTY. PAMELA DE GUZMAN", self.styles['DemandBodySmallBold']))
            # story.append(Paragraph("Legal Office", self.styles['DemandBodySmallItalic']))
            # story.append(Paragraph("La Union Schools Division Office", self.styles['DemandBodySmallItalic']))
            # story.append(Spacer(1, 3))  # Reduced spacing
            # story.append(Paragraph("JONALYN D. MANONGDO", self.styles['DemandBodySmallBold']))
            # story.append(Paragraph("State Auditor IV / Audit Team Leader", self.styles['DemandBodySmallItalicIndent']))
            # story.append(Paragraph("Commission on Audit", self.styles['DemandBodySmallItalicIndent']))
            # story.append(Paragraph("NGS Cluster 5-Audit Group A", self.styles['DemandBodySmallItalicIndent']))
            # story.append(Paragraph("Regional Office I, Government Center", self.styles['DemandBodySmallItalicIndent']))
            # story.append(Paragraph("Sevilla, San Fernando City", self.styles['DemandBodySmallItalicIndent']))
            # story.append(Paragraph("2500, La Union", self.styles['DemandBodySmallItalicIndent']))

            # Add official footer (kept on the same page; if you prefer at bottom of page, integrate via PageTemplate)
            story.append(Spacer(1, 12))
            story.extend(self._create_official_footer())
            
            # Build the PDF
            logger.debug("Building professional Demand Letter PDF...")
            doc.build(story)

            # Get the PDF content
            pdf_content = buffer.getvalue()
            buffer.close()

            logger.info(f"Professional Demand Letter PDF generated successfully. Size: {len(pdf_content)} bytes")
            return pdf_content

        except Exception as e:
            logger.error(f"Critical error generating professional Demand Letter PDF: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            raise

    def _create_professional_unliquidated_table(self, unliquidated_data):
        """Create professional table for unliquidated items - copied structure from PDFGenerator"""
        story = []
        
        try:
            # Table data - using same structure as PDFGenerator
            data = []
            
            # Header row - changed to Particulars and Balance
            data.append(['Particulars', 'Balance'])
            
            # Add data rows
            total_balance = 0
            for item in unliquidated_data:
                particulars_text = item.get('particulars', '')
                balance_text = format_currency_safe(item.get('balance', 0))
                data.append([particulars_text, balance_text])
                total_balance += float(item.get('balance', 0))
            
            # Total row - changed to TOTAL UNLIQUIDATED BALANCES
            data.append(['TOTAL UNLIQUIDATED BALANCES', format_currency_safe(total_balance)])
            
            # Create table with fixed column widths - same as PDFGenerator
            table = Table(data, colWidths=[4*inch, 2*inch])
            
            # Table styling - copied from PDFGenerator with same colors and structure
            table_style = TableStyle([
                # Header row styling
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (1, 0), (1, 0), 'CENTER'),
                
                # Data rows styling
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -2), 11),
                ('ALIGN', (0, 1), (0, -2), 'LEFT'),
                ('ALIGN', (1, 1), (1, -2), 'CENTER'),
                
                # Total row styling
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 11),
                ('ALIGN', (0, -1), (0, -1), 'LEFT'),
                ('ALIGN', (1, -1), (1, -1), 'CENTER'),
                
                # Grid and borders
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                
                # Padding
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ])
            
            table.setStyle(table_style)
            story.append(table)
            
        except Exception as e:
            logger.error(f"Error creating unliquidated table: {e}")
            # Fallback simple table - same structure as PDFGenerator
            fallback_data = [['Particulars', 'Balance'],
                           ['Error loading data', format_currency_safe(0)]]
            fallback_table = Table(fallback_data, colWidths=[4*inch, 2*inch])
            story.append(fallback_table)
        
        return story

    def _create_professional_signature_section(self):
        """Create professional signature section"""
        story = []
        
        # Get superintendent
        from .models import User
        superintendent = User.objects.filter(role='superintendent', is_active=True).first()
        
        if superintendent:
            superintendent_name = f"{superintendent.first_name.upper()} {superintendent.last_name.upper()}"
            title = "Schools Division Superintendent"
            position = "La Union Schools Division Office"
            
            # Add superintendent e-signature if available
            superintendent_signature = self._get_user_signature(superintendent)
            if superintendent_signature:
                story.append(superintendent_signature)
                story.append(Spacer(1, 6))  # Small space between signature and name
        else:
            superintendent_name = "JORGE M. REINANTE, CSEE, CEO VI, CESO V"
            title = "Schools Division Superintendent"
            position = "La Union Schools Division Office"
        
        story.append(Paragraph(superintendent_name, self.styles['DemandBodyBoldCompact']))
        story.append(Paragraph(title, self.styles['DemandBodyItalicCompact']))
        story.append(Paragraph(position, self.styles['DemandBodyItalicCompact']))
        
        return story


def generate_demand_letter_pdf(request_obj, unliquidated_data, due_date):
    """
    Main function to generate professional Demand Letter PDF
    
    Args:
        request_obj: RequestManagement instance
        unliquidated_data: List of dictionaries with unliquidated items
        due_date: Due date for settlement (string)
        
    Returns:
        PDF content as bytes
    """
    try:
        logger.info(f"generate_demand_letter_pdf called for request: {request_obj.request_id}")
        generator = DemandLetterGenerator()
        result = generator.generate_demand_letter_pdf(request_obj, unliquidated_data, due_date)
        logger.info("Professional Demand Letter PDF generation completed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in generate_demand_letter_pdf: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise
