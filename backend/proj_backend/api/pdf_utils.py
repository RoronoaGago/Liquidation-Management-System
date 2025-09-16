"""
PDF Generation Utilities for Liquidation Management System
Generates server-side PDFs with actual e-signatures after approval
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
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from PIL import Image as PILImage
import logging

logger = logging.getLogger(__name__)

class PDFGenerator:
    """Handles PDF generation with actual e-signatures"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
    
    def setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=14,
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Header style
        self.styles.add(ParagraphStyle(
            name='CustomHeader',
            parent=self.styles['Normal'],
            fontSize=12,
            spaceAfter=6,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold'
        ))
        
        # Body style
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=6,
            alignment=TA_LEFT,
            fontName='Helvetica'
        ))
        
        # Signature style
        self.styles.add(ParagraphStyle(
            name='SignatureStyle',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=3,
            alignment=TA_CENTER,
            fontName='Helvetica'
        ))

    def get_image_base64(self, image_field):
        """Convert Django ImageField to base64 string"""
        if not image_field:
            return None
        
        try:
            # Get the file path
            if hasattr(image_field, 'path'):
                image_path = image_field.path
            else:
                # For cloud storage or other backends
                image_path = image_field.url
            
            # Read and convert to base64
            with open(image_path, 'rb') as img_file:
                img_data = img_file.read()
                base64_data = base64.b64encode(img_data).decode('utf-8')
                return f"data:image/jpeg;base64,{base64_data}"
        except Exception as e:
            logger.error(f"Error converting image to base64: {e}")
            return None

    def create_signature_image(self, signature_base64, width=2*inch, height=0.5*inch):
        """Create a signature image from base64 data"""
        if not signature_base64:
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
            return Image(signature_io, width=new_width, height=new_height)
            
        except Exception as e:
            logger.error(f"Error creating signature image: {e}")
            return None

    def generate_request_pdf_with_signatures(self, request_obj):
        """
        Generate PDF for approved request with actual e-signatures
        
        Args:
            request_obj: RequestManagement instance that has been approved
            
        Returns:
            HttpResponse with PDF content
        """
        try:
            # Create a BytesIO buffer to hold the PDF
            buffer = io.BytesIO()
            
            # Create the PDF document
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )
            
            # Build the PDF content
            story = []
            
            # Get signatories
            from .models import User
            superintendent = User.objects.filter(role='superintendent', is_active=True).first()
            accountant = User.objects.filter(role='accountant', is_active=True).first()
            
            # Add header with logos
            story.extend(self._create_header(request_obj))
            
            # Add date
            story.append(Spacer(1, 12))
            date_str = request_obj.created_at.strftime("%B %d, %Y")
            story.append(Paragraph(f"Date: {date_str}", self.styles['CustomBody']))
            
            # Add recipient
            story.append(Spacer(1, 12))
            if superintendent:
                story.append(Paragraph(
                    f"{superintendent.first_name.upper()} {superintendent.last_name.upper()}",
                    self.styles['CustomHeader']
                ))
            story.append(Paragraph("Schools Division Superintendent", self.styles['CustomBody']))
            story.append(Paragraph("DEPED La Union Schools Division", self.styles['CustomBody']))
            story.append(Paragraph("San Fernando City, La Union", self.styles['CustomBody']))
            
            story.append(Spacer(1, 12))
            story.append(Paragraph("Sir:", self.styles['CustomBody']))
            story.append(Spacer(1, 12))
            
            # Add request content
            total_amount = sum(rp.amount for rp in request_obj.requestpriority_set.all())
            month_year = request_obj.created_at.strftime("%B %Y")
            
            story.append(Paragraph(
                f"Requesting for cash advance to School MOOE for the month of {month_year}, "
                f"amounting to Php {total_amount:,.2f}.",
                self.styles['CustomBody']
            ))
            
            story.append(Spacer(1, 20))
            
            # Add priorities table
            story.extend(self._create_priorities_table(request_obj))
            
            story.append(Spacer(1, 30))
            
            # Add signature section with actual e-signatures
            story.extend(self._create_signature_section(request_obj, superintendent, accountant))
            
            # Build the PDF
            doc.build(story)
            
            # Get the PDF content
            pdf_content = buffer.getvalue()
            buffer.close()
            
            return pdf_content
            
        except Exception as e:
            logger.error(f"Error generating PDF: {e}")
            raise

    def _create_header(self, request_obj):
        """Create header with logos and title"""
        story = []
        
        # Title
        story.append(Paragraph("LIST OF PRIORITIES", self.styles['CustomTitle']))
        
        # School information
        school = request_obj.user.school
        if school:
            story.append(Paragraph(f"School: {school.schoolName}", self.styles['CustomBody']))
            if school.district:
                story.append(Paragraph(f"District: {school.district.districtName}", self.styles['CustomBody']))
        
        story.append(Spacer(1, 12))
        
        return story

    def _create_priorities_table(self, request_obj):
        """Create the priorities table"""
        story = []
        
        # Table data
        data = [['Expense Title', 'Amount']]
        
        # Add priorities
        for rp in request_obj.requestpriority_set.all():
            data.append([
                rp.priority.expenseTitle,
                f"Php {rp.amount:,.2f}"
            ])
        
        # Add total row
        total_amount = sum(rp.amount for rp in request_obj.requestpriority_set.all())
        data.append(['TOTAL', f"Php {total_amount:,.2f}"])
        
        # Create table
        table = Table(data, colWidths=[4*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
        return story

    def _create_signature_section(self, request_obj, superintendent, accountant):
        """Create signature section with actual e-signatures"""
        story = []
        
        # Signature labels
        story.append(Spacer(1, 20))
        
        # Create signature table
        signature_data = []
        
        # Left side - School Head
        school_head_signature = self.create_signature_image(
            self.get_image_base64(request_obj.user.e_signature),
            width=1.5*inch,
            height=0.4*inch
        )
        
        left_signature_cell = []
        left_signature_cell.append(Paragraph("Prepared by:", self.styles['SignatureStyle']))
        if school_head_signature:
            left_signature_cell.append(school_head_signature)
        else:
            left_signature_cell.append(Paragraph("_________________", self.styles['SignatureStyle']))
        left_signature_cell.append(Paragraph(
            f"{request_obj.user.first_name.upper()} {request_obj.user.last_name.upper()}",
            self.styles['SignatureStyle']
        ))
        left_signature_cell.append(Paragraph("School Head", self.styles['SignatureStyle']))
        
        # Right side - Accountant
        accountant_signature = None
        if accountant:
            accountant_signature = self.create_signature_image(
                self.get_image_base64(accountant.e_signature),
                width=1.5*inch,
                height=0.4*inch
            )
        
        right_signature_cell = []
        right_signature_cell.append(Paragraph("Certified Correct:", self.styles['SignatureStyle']))
        if accountant_signature:
            right_signature_cell.append(accountant_signature)
        else:
            right_signature_cell.append(Paragraph("_________________", self.styles['SignatureStyle']))
        if accountant:
            right_signature_cell.append(Paragraph(
                f"{accountant.first_name.upper()} {accountant.last_name.upper()}",
                self.styles['SignatureStyle']
            ))
        right_signature_cell.append(Paragraph("Accountant III", self.styles['SignatureStyle']))
        
        # Add approval signature if available
        approval_cell = []
        if request_obj.reviewed_by and request_obj.reviewed_by.role == 'superintendent':
            approval_signature = self.create_signature_image(
                self.get_image_base64(request_obj.reviewed_by.e_signature),
                width=1.5*inch,
                height=0.4*inch
            )
            
            approval_cell.append(Paragraph("Approved by:", self.styles['SignatureStyle']))
            if approval_signature:
                approval_cell.append(approval_signature)
            else:
                approval_cell.append(Paragraph("_________________", self.styles['SignatureStyle']))
            approval_cell.append(Paragraph(
                f"{request_obj.reviewed_by.first_name.upper()} {request_obj.reviewed_by.last_name.upper()}",
                self.styles['SignatureStyle']
            ))
            approval_cell.append(Paragraph("Division Superintendent", self.styles['SignatureStyle']))
            
            # Add approval date
            if request_obj.date_approved:
                approval_date = request_obj.date_approved.strftime("%B %d, %Y")
                approval_cell.append(Paragraph(f"Date: {approval_date}", self.styles['SignatureStyle']))
        
        # Create signature table
        signature_table_data = [[left_signature_cell, right_signature_cell]]
        if approval_cell:
            signature_table_data.append([approval_cell, ""])
        
        signature_table = Table(signature_table_data, colWidths=[3*inch, 3*inch])
        signature_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(signature_table)
        
        return story


def generate_request_pdf_with_signatures(request_obj):
    """
    Main function to generate PDF with signatures
    This is the function that will be called from views.py
    """
    generator = PDFGenerator()
    return generator.generate_request_pdf_with_signatures(request_obj)
