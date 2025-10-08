import base64
import os
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def get_email_image_base64(image_path):
    """
    Convert an image file to base64 data URL for embedding in emails.
    
    Args:
        image_path (str): Path to the image file relative to the templates/emails directory
        
    Returns:
        str: Base64 data URL (e.g., "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...")
        None: If image cannot be loaded
    """
    try:
        # Construct full path to the image in static folder
        # This is more reliable than using templates folder
        full_path = os.path.join(settings.BASE_DIR, 'static', 'images', image_path)
        
        if not os.path.exists(full_path):
            logger.error(f"Image file not found: {full_path}")
            return None
            
        # Read and encode the image
        with open(full_path, 'rb') as img_file:
            img_data = img_file.read()
            base64_data = base64.b64encode(img_data).decode('utf-8')
            
            # Determine MIME type based on file extension
            ext = os.path.splitext(image_path)[1].lower()
            mime_types = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml'
            }
            mime_type = mime_types.get(ext, 'image/png')
            
            return f"data:{mime_type};base64,{base64_data}"
            
    except Exception as e:
        logger.error(f"Error converting image to base64: {e}")
        return None

def get_deped_logo_base64():
    """
    Get the DepEd logo as base64 data URL for email templates.
    
    Returns:
        str: Base64 data URL for the DepEd logo
    """
    return get_email_image_base64('DepEd_logo-W.png')
