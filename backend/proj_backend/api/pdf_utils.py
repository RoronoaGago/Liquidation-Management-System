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
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, Flowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from PIL import Image as PILImage
import logging

logger = logging.getLogger(__name__)


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
            story.append(Paragraph("Sir:", self.styles['BodyText']))
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
        """Create signature section with superintendent in the middle and always show signature lines/names"""
        story = []

        story.append(Spacer(1, 100))

        # --- Left Column: School Head ---
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

        # --- Middle Column: Superintendent ---
        middle_column = []
        middle_column.append(
            Paragraph("Approved by:", self.styles['SignatureLabel']))
        middle_column.append(Spacer(1, 15))

        superintendent_signature = self._get_user_signature(
            superintendent) if superintendent else None
        if superintendent_signature and request_obj.status == 'approved':
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

        # --- Right Column: Accountant ---
        right_column = []
        right_column.append(Paragraph("Certified Correct:",
                            self.styles['SignatureLabel']))
        right_column.append(Spacer(1, 15))

        accountant_signature = self._get_user_signature(
            accountant) if accountant else None
        if accountant_signature and request_obj.status == 'downloaded':
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

        # Table with 3 equal columns
        signature_table = Table(signature_data, colWidths=[
            2.5*inch, 2.5*inch, 2.5*inch])  # Narrower side columns
        signature_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
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
