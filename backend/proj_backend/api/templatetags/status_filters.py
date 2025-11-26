from django import template

register = template.Library()

@register.filter
def format_status(status):
    """
    Format status values to display user-friendly labels
    """
    status_labels = {
        'draft': "Draft",
        'submitted': "Submitted",
        'under_review_district': "Under Review (District)",
        'under_review_liquidator': "Under Review (Liquidator)",
        'under_review_division': "Under Review (Division)",
        'resubmit': "Needs Revision",
        'approved_district': "Approved (District)",
        'rejected': "Rejected",
        'liquidated': "Liquidated",
        'cancelled': "Cancelled",
        # Request statuses
        'pending': "Pending",
        'approved': "Approved",
        'downloaded': "Downloaded",
        'unliquidated': "Unliquidated",
    }
    
    return status_labels.get(status, status.replace('_', ' ').title())
