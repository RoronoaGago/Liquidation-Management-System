from django.db import models
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.contrib.auth.models import AbstractUser
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from datetime import date
import string
import logging
# Configure logging
logger = logging.getLogger(__name__)


class User(AbstractUser):
    # Custom ID field - primary key
    id = models.CharField(primary_key=True, max_length=10, editable=False)

    # Role choices
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('school_head', 'School Head'),
        ('school_admin', 'School Administrative Assistant'),
        ('district_admin', 'District Administrative Assistant'),
        ('superintendent', 'Division Superintendent'),
        ('liquidator', 'Liquidator'),
        ('accountant', 'Division Accountant'),
    ]

    SEX_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='school_admin'
    )
    school = models.ForeignKey(
        'School',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='users'
    )
    date_of_birth = models.DateField(null=True, blank=True)
    sex = models.CharField(
        max_length=10, choices=SEX_CHOICES, null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png'])],
        blank=True,
        null=True
    )

    def save(self, *args, **kwargs):
        if not self.id:
            # Generate custom ID (yymmdd + sequential ID)
            now = timezone.now()
            date_part = now.strftime("%y%m%d")

            # Get the last user with today's date prefix
            last_user = User.objects.filter(
                id__startswith=date_part
            ).order_by('-id').first()

            if last_user:
                last_seq = int(last_user.id[6:])  # Extract the sequential part
                seq_part = str(last_seq + 1).zfill(4)
            else:
                seq_part = '0001'

            self.id = f"{date_part}{seq_part}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.username})"


class School(models.Model):
    schoolId = models.CharField(
        max_length=10, primary_key=True, editable=True)
    schoolName = models.CharField(max_length=255)
    municipality = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    legislativeDistrict = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)  # Added for archiving
    max_budget = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        verbose_name="Maximum Budget"
    )
    is_active = models.BooleanField(default=True)
    last_liquidated_month = models.PositiveSmallIntegerField(
        null=True, blank=True)  # 1-12
    last_liquidated_year = models.PositiveSmallIntegerField(
        null=True, blank=True)

    def __str__(self):
        return f"{self.schoolName} ({self.schoolId})"


class Requirement(models.Model):
    requirementID = models.AutoField(primary_key=True)
    requirementTitle = models.CharField(max_length=255)
    is_required = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)  # <-- Add this line

    def __str__(self):
        return self.requirementTitle


class ListOfPriority(models.Model):
    CATEGORY_CHOICES = [
        ('travel', 'Travel Expenses'),
        ('training', 'Training Expenses'),
        ('scholarship', 'Scholarship Grants/Expenses'),
        ('supplies', 'Office Supplies & Materials Expenses'),
        ('utilities', 'Utilities Expenses'),
        ('communication', 'Communication Expenses'),
        ('awards', 'Awards/Rewards/Prizes Expenses'),
        ('survey', 'Survey, Research, Exploration and Development Expenses'),
        ('confidential', 'Confidential & Intelligence Expenses'),
        ('extraordinary', 'Extraordinary and Miscellaneous Expenses'),
        ('professional', 'Professional Service Expenses'),
        ('services', 'General Services'),
        ('maintenance', 'Repairs and Maintenance Expenses'),
        ('financial_assistance', 'Financial Assistance/Subsidy Expenses'),
        ('taxes', 'Taxes, Duties and Licenses Expenses'),
        ('labor', 'Labor and Wages Expenses'),
        ('other_maintenance', 'Other Maintenance and Operating Expenses'),
        ('financial', 'Financial Expenses'),
        ('non_cash', 'Non-cash Expenses'),
        ('losses', 'Losses'),
    ]

    LOPID = models.AutoField(primary_key=True)
    expenseTitle = models.CharField(max_length=255)
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default='other_maintenance'
    )
    requirements = models.ManyToManyField(
        'Requirement',
        through='PriorityRequirement',
        related_name='priority_requirement'
    )
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.expenseTitle


class PriorityRequirement(models.Model):
    """Through model connecting Priority to its Requirements"""
    priority = models.ForeignKey(
        ListOfPriority,
        on_delete=models.CASCADE,
        related_name='priority_reqs'  # Added explicit related_name
    )
    requirement = models.ForeignKey(
        'Requirement',
        on_delete=models.CASCADE,
        related_name='priority_reqs'  # Added explicit related_name
    )

    class Meta:
        unique_together = ('priority', 'requirement')

    def __str__(self):
        return f"{self.priority} requires {self.requirement}"


def generate_request_id():
    prefix = "REQ-"
    random_part = get_random_string(
        length=6,
        allowed_chars=string.ascii_uppercase + string.digits
    )
    return f"{prefix}{random_part}"


class RequestManagement(models.Model):
    STATUS_CHOICES = [
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('pending', 'Pending'),
        ('downloaded', 'Downloaded'),
        ('liquidated', 'Liquidated'),
        ('advanced', 'Advanced'),
    ]

    request_id = models.CharField(
        max_length=10,
        primary_key=True,
        editable=False,
        unique=True,
        default=generate_request_id  # <-- Add this line
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    request_monthyear = models.CharField(
        max_length=7, null=True, blank=True)  # Format: YYYY-MM
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending')
    priorities = models.ManyToManyField(
        'ListOfPriority',
        through='RequestPriority',
        related_name='requests'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_reminder_sent = models.DateField(null=True, blank=True)
    demand_letter_sent = models.BooleanField(default=False)
    demand_letter_date = models.DateField(null=True, blank=True)
    date_approved = models.DateField(null=True, blank=True)
    date_downloaded = models.DateField(null=True, blank=True)
    rejection_comment = models.TextField(null=True, blank=True)
    rejection_date = models.DateField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_requests'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._old_status = self.status  # Initialize old status

    def save(self, *args, **kwargs):
        # Store old status before any changes
        if self.pk:
            try:
                old_instance = RequestManagement.objects.get(pk=self.pk)
                self._old_status = old_instance.status
            except RequestManagement.DoesNotExist:
                logger.warning(
                    f"Couldn't find existing request with pk {self.pk}")
                self._old_status = None

        # Handle business logic
        if not self.pk or not self.request_monthyear:
            self.set_initial_monthyear()

        self.set_automatic_status()

        super().save(*args, **kwargs)

    def set_initial_monthyear(self):
        school = self.user.school
        if school:
            if school.last_liquidated_month and school.last_liquidated_year:
                year = school.last_liquidated_year
                month = school.last_liquidated_month + 1
                if month > 12:
                    month = 1
                    year += 1
                self.request_monthyear = f"{year:04d}-{month:02d}"
            elif not self.request_monthyear:
                today = date.today()
                self.request_monthyear = f"{today.year:04d}-{today.month:02d}"

    def set_automatic_status(self):
        if self.request_monthyear:
            today = date.today()
            req_year, req_month = map(int, self.request_monthyear.split('-'))
            if req_year > today.year or (req_year == today.year and req_month > today.month):
                self.status = 'advanced'
            elif req_year == today.year and req_month == today.month:
                self.status = 'pending'


class RequestPriority(models.Model):
    request = models.ForeignKey(RequestManagement, on_delete=models.CASCADE)
    priority = models.ForeignKey(ListOfPriority, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = ('request', 'priority')

    def __str__(self):
        return f"{self.request} - {self.priority} (${self.amount})"


def generate_liquidation_id():
    """Generate LQN-ABC123 format ID"""
    prefix = "LQN-"
    random_part = get_random_string(
        length=6,
        allowed_chars=string.ascii_uppercase + string.digits
    )
    return f"{prefix}{random_part}"


class LiquidationManagement(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review_district', 'Under Review (District)'),
        ('under_review_division', 'Under Review (Division)'),
        ('resubmit', 'Needs Revision'),
        ('approved_district', 'Approved by District'),
        ('liquidated', 'Liquidated'),
    ]

    LiquidationID = models.CharField(
        max_length=10,
        primary_key=True,
        default=generate_liquidation_id,
        editable=False,
        unique=True
    )
    request = models.OneToOneField(
        RequestManagement,
        on_delete=models.CASCADE,
        related_name='liquidation'
    )
    refund = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True)
    comment_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default='draft'
    )
    reviewed_by_district = models.ForeignKey(
        User, null=True, blank=True, related_name='district_reviewed_liquidations', on_delete=models.SET_NULL
    )
    reviewed_at_district = models.DateTimeField(null=True, blank=True)
    reviewed_by_division = models.ForeignKey(
        User, null=True, blank=True, related_name='division_reviewed_liquidations', on_delete=models.SET_NULL
    )
    reviewed_at_division = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    date_districtApproved = models.DateField(null=True, blank=True)
    date_liquidated = models.DateField(null=True, blank=True)
    remaining_days = models.IntegerField(
        null=True, blank=True)  # <-- Add this field

    def calculate_refund(self):
        # Calculate total requested amount
        total_requested = sum(
            rp.amount for rp in self.request.requestpriority_set.all()
        )
        # Calculate total liquidated amount
        total_liquidated = sum(
            lp.amount for lp in self.liquidation_priorities.all()
        )
        # Refund is the difference, or None if equal
        if total_requested == total_liquidated:
            return None
        return total_requested - total_liquidated

    def calculate_remaining_days(self):
        """
        Calculates how many days are left to liquidate the request.
        Assumes you want 30 days from the request's approval date.
        """
        if self.request and self.request.date_downloaded:
            deadline = self.request.date_downloaded + \
                timezone.timedelta(days=30)
            today = date.today()
            remaining = (deadline - today).days
            return max(remaining, 0)
        return None

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        old_status = None
        if not is_new:
            old = LiquidationManagement.objects.get(pk=self.pk)
            old_status = old.status

        status_changed = (old_status != self.status)
        # Automatically set date_liquidated when status becomes 'liquidated'
        if self.status == 'liquidated' and self.date_liquidated is None:
            self.date_liquidated = timezone.now().date()
        elif self.status != 'liquidated' and self.date_liquidated is not None:
            self.date_liquidated = None

        # Automatically set date_districtApproved when status becomes 'approved_district'
        if self.status == 'approved_district' and self.date_districtApproved is None:
            self.date_districtApproved = timezone.now().date()
        elif self.status != 'approved_district' and self.date_districtApproved is not None:
            self.date_districtApproved = None

        # Calculate refund amount
        self.refund = self.calculate_refund()
        self.remaining_days = self.calculate_remaining_days()

        super().save(*args, **kwargs)

        # Notification logic (after save, so PK exists)
        if status_changed:
            from .models import Notification  # Avoid circular import
            Notification.objects.create(
                notification_title=f"Liquidation {self.status.title()}",
                details=self.comment_id if self.status == 'rejected' else None,
                receiver=self.request.user,
                # Set this in your view if needed
                sender=getattr(self, '_status_changed_by', None),
            )

            # Email notification
            subject = f"Liquidation Status Update: {self.status.title()}"
            message = render_to_string('emails/status_change.txt', {
                'object_type': 'Liquidation',
                'object': self,
                'user': self.request.user,
                'status': self.status,
            })
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [self.request.user.email],
                fail_silently=True,
            )

    def __str__(self):
        return f"Liquidation {self.LiquidationID} for {self.request}"

    def clean(self):
        """
        Validate that the request status is 'downloaded' before saving.
        This works with Django forms and admin interface.
        """
        if self.request.status != 'downloaded':
            raise ValidationError(
                "Liquidation can only be created for requests with 'downloaded' status."
            )

    def save(self, *args, **kwargs):
        """
        Ensure the request status is 'downloaded' before saving to database.
        """
        # Skip validation when updating existing instance (optional)
        if not self.pk and self.request.status != 'downloaded':
            raise ValidationError(
                "Liquidation can only be created for requests with 'downloaded' status."
            )

        super().save(*args, **kwargs)


class LiquidationDocument(models.Model):
    liquidation = models.ForeignKey(
        LiquidationManagement,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    request_priority = models.ForeignKey(
        RequestPriority,
        on_delete=models.CASCADE
    )
    requirement = models.ForeignKey(Requirement, on_delete=models.CASCADE)
    document = models.FileField(
        upload_to='liquidation_documents/%Y/%m/%d/',
        validators=[FileExtensionValidator(['pdf', 'jpg', 'jpeg', 'png'])]
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_documents'
    )
    is_approved = models.BooleanField(default=False)
    reviewer_comment = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('liquidation', 'request_priority', 'requirement')

    def __str__(self):
        return f"Document for {self.requirement} in {self.request_priority}"

    def save(self, *args, **kwargs):
        # Ensure the document belongs to the same request as the liquidation
        if self.request_priority.request != self.liquidation.request:
            raise ValueError(
                "Document's priority must belong to the liquidation's request")
        super().save(*args, **kwargs)


class Notification(models.Model):
    notification_title = models.CharField(max_length=255)
    details = models.TextField(null=True, blank=True)
    receiver = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications_received')
    sender = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications_sent')
    notification_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification to {self.receiver.username}: {self.notification_title}"


class LiquidatorAssignment(models.Model):
    DISTRICT_CHOICES = [
        ('all', 'All District'),
        ('1st', '1st District'),
        ('2nd', '2nd District')
    ]
    liquidator = models.ForeignKey(
        User, on_delete=models.CASCADE, limit_choices_to={'role': 'liquidator'})
    district = models.CharField(
        max_length=100, choices=DISTRICT_CHOICES, default='all')
    # Optionally, you can use a ForeignKey to School if you want assignment per school
    school = models.ForeignKey(
        School, on_delete=models.CASCADE, null=True, blank=True)

    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments_made')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('liquidator', 'district')

    def __str__(self):
        return f"{self.liquidator} assigned to {self.district}"


class LiquidationPriority(models.Model):
    liquidation = models.ForeignKey(
        'LiquidationManagement',
        on_delete=models.CASCADE,
        related_name='liquidation_priorities'
    )
    priority = models.ForeignKey(
        'ListOfPriority',
        on_delete=models.CASCADE
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = ('liquidation', 'priority')

    def __str__(self):
        return f"{self.liquidation} - {self.priority} (${self.amount})"
