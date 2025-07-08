from django.db import models
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from datetime import datetime, timedelta, date
import string
import logging
# Configure logging
logger = logging.getLogger(__name__)


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    # Custom ID field - primary key
    id = models.CharField(primary_key=True, max_length=10, editable=False)
    password_change_required = models.BooleanField(default=True)
    username = None  # Remove username field

    email = models.EmailField(
        unique=True,
        verbose_name='email address',
        help_text='Required. Must be a valid email address.'
    )

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
    school_district = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="District assignment (only for district administrative assistants)"
    )

    USERNAME_FIELD = 'email'  # Use email as the login identifier
    REQUIRED_FIELDS = ['first_name', 'last_name']  # Add basic required fields
    # Add these at the bottom of your User model class
    objects = UserManager()

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

        # Normalize email address
        if self.email:
            self.email = self.email.lower()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    def clean(self):
        super().clean()
        # Add any additional validation here
        if self.phone_number:
            # Example: Remove all non-digit characters
            self.phone_number = ''.join(
                c for c in self.phone_number if c.isdigit())


class School(models.Model):
    schoolId = models.CharField(
        max_length=10, primary_key=True, editable=True)
    schoolName = models.CharField(max_length=255)
    municipality = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    legislativeDistrict = models.CharField(
        max_length=100,
        # Must match LiquidatorAssignment
        choices=[("1st District", "1st District"),
                 ("2nd District", "2nd District")]
    )
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
        ('unliquidated', 'Unliquidated'),
        ('liquidated', 'Liquidated'),
        ('advanced', 'Advanced'),
    ]

    request_id = models.CharField(
        max_length=10,
        primary_key=True,
        editable=False,
        unique=True,
        default=generate_request_id
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
    downloaded_at = models.DateTimeField(null=True, blank=True)
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
    previous_version = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True)
    is_resubmission = models.BooleanField(default=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._old_status = self.status  # Track initial status
        self._skip_auto_status = False  # Explicit control flag

    def save(self, *args, **kwargs):
        """Atomic save with protected status changes"""
        from django.db import transaction

        try:
            with transaction.atomic():
                # Fetch existing status safely
                if self.pk:
                    current_status = RequestManagement.objects.filter(
                        pk=self.pk).values_list('status', flat=True).first()
                    self._old_status = current_status or self.status

                # Set initial month/year if needed (won't affect status)
                self.set_initial_monthyear()

                # Only auto-set status if not explicitly skipped
                if not (hasattr(self, '_status_changed_by') or not self._skip_auto_status):
                    self.set_automatic_status()

                # Handle status change dates
                self.handle_status_change_dates()

                logger.debug(
                    f"Saving request {self.request_id} with status {self.status}")
                super().save(*args, **kwargs)

        except Exception as e:
            logger.error(
                f"Failed to save request {getattr(self, 'request_id', 'new')}: {str(e)}")
            raise

    def set_initial_monthyear(self):
        """Safe month/year initialization without status side effects"""
        if not self.request_monthyear:
            school = getattr(self.user, 'school', None)
            if school:
                if school.last_liquidated_month and school.last_liquidated_year:
                    year = school.last_liquidated_year
                    month = school.last_liquidated_month + 1
                    self.request_monthyear = f"{year+(month//12):04d}-{(month % 12) or 12:02d}"
                else:
                    today = date.today()
                    self.request_monthyear = f"{today.year:04d}-{today.month:02d}"

    def set_automatic_status(self):
        """Only runs when not manually approving/rejecting"""
        if (not hasattr(self, '_status_changed_by')
                    and not self._skip_auto_status
                    and self.request_monthyear
                ):
            today = date.today()
            try:
                req_year, req_month = map(
                    int, self.request_monthyear.split('-'))
                if (req_year, req_month) > (today.year, today.month):
                    self.status = 'advanced'
                elif (req_year, req_month) == (today.year, today.month):
                    self.status = 'pending'
            except (ValueError, AttributeError):
                logger.warning(
                    f"Invalid request_monthyear: {self.request_monthyear}")

    def handle_status_change_dates(self):
        """Automatically set date fields based on status changes"""
        today = date.today()

        # Check if status changed
        if self._old_status != self.status:
            # Approved date
            if self.status == 'approved' and not self.date_approved:
                self.date_approved = today

            # Downloaded date
            if self.status == 'downloaded' and not self.downloaded_at:
                self.downloaded_at = timezone.now()  # Use timezone.now() instead of date.today()

            # Rejected date
            if self.status == 'rejected' and not self.rejection_date:
                self.rejection_date = today

            # Reset dates if status changes back from these states
            if self.status != 'approved':
                self.date_approved = None
            if self.status != 'downloaded':
                self.downloaded_at = None
            if self.status != 'rejected':
                self.rejection_date = None


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


# models.py - LiquidationManagement modifications
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
    rejection_comment = models.TextField(null=True, blank=True)
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
    remaining_days = models.IntegerField(null=True, blank=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._old_status = self.status  # Track initial status
        self._status_changed_by = None  # Track who changed the status

    @property
    def liquidation_deadline(self):
        if self.request.downloaded_at:
            return (self.request.downloaded_at + timezone.timedelta(days=30)).date()
        return None

    def calculate_refund(self):
        total_requested = sum(
            rp.amount for rp in self.request.requestpriority_set.all()
        )
        total_liquidated = sum(
            lp.amount for lp in self.liquidation_priorities.all()
        )
        if total_requested == total_liquidated:
            return None
        return total_requested - total_liquidated

    def calculate_remaining_days(self):
        if self.request and self.request.downloaded_at:
            # Ensure downloaded_at is timezone-aware if working with timezones
            deadline = self.request.downloaded_at + timedelta(days=30)

            # Use timezone-aware now() if working with timezones
            today = datetime.now(
                deadline.tzinfo) if deadline.tzinfo else datetime.now()

            remaining = (deadline - today).days
            return max(remaining, 0)  # Returns 0 if deadline has passed
        return None

    def save(self, *args, **kwargs):
        is_new = self._state.adding

        if not is_new:
            old = LiquidationManagement.objects.get(pk=self.pk)
            self._old_status = old.status

        # Set downloaded_at when status changes to 'downloaded'
        # if self.status == 'downloaded' and not self.downloaded_at:
        #     self.downloaded_at = timezone.now()

        # Automatically set dates based on status changes
        if self.status == 'liquidated' and self.date_liquidated is None:
            self.date_liquidated = timezone.now().date()

            # Update the school's last liquidation date
            if self.request and self.request.user and self.request.user.school:
                school = self.request.user.school
                if self.request.request_monthyear:  # Format: YYYY-MM
                    year, month = map(
                        int, self.request.request_monthyear.split('-'))
                    school.last_liquidated_month = month
                    school.last_liquidated_year = year
                    school.save()
        elif self.status != 'liquidated' and self.date_liquidated is not None:
            self.date_liquidated = None

        if self.status == 'approved_district' and self.date_districtApproved is None:
            self.date_districtApproved = timezone.now().date()
        elif self.status != 'approved_district' and self.date_districtApproved is not None:
            self.date_districtApproved = None

        # Calculate fields
        self.refund = self.calculate_refund()

        super().save(*args, **kwargs)

    def clean(self):
        if not self.pk and self.request.status != 'downloaded':
            raise ValidationError(
                "Liquidation can only be created for requests with 'downloaded' status."
            )

    def __str__(self):
        return f"Liquidation {self.LiquidationID} for {self.request}"


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
    is_approved = models.BooleanField(null=True, default=None)
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
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Notification to {self.receiver.username}: {self.notification_title}"


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
