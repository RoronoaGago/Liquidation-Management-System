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
from simple_history.models import HistoricalRecords
from .json_utils import DecimalJSONEncoder  # Import your custom encoder
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
    school_district = models.ForeignKey(
        'SchoolDistrict',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='district_users',
        help_text="District assignment (only for district administrative assistants)"
    )
    otp_code = models.CharField(max_length=6, null=True, blank=True)
    otp_generated_at = models.DateTimeField(blank=True, null=True)
    e_signature = models.ImageField(
        upload_to='e_signatures/',
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png'])],
        blank=True,
        null=True,
        help_text="E-signature for School Head, Division Superintendent, and Division Accountant"
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

    def get_audit_description(self, created=False, action='create'):
        if action == 'archive':
            return f"Archived user {self.get_full_name()} ({self.email})"
        elif action == 'restore':
            return f"Restored user {self.get_full_name()} ({self.email})"
        return f"{action.capitalize()} user {self.get_full_name()} ({self.email})"


class School(models.Model):
    schoolId = models.CharField(max_length=10, primary_key=True, editable=True)
    schoolName = models.CharField(max_length=255)
    municipality = models.CharField(max_length=100)
    district = models.ForeignKey(
        'SchoolDistrict',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='schools'
    )
    legislativeDistrict = models.CharField(
        max_length=100,
        choices=[("1st District", "1st District"),
                 ("2nd District", "2nd District")]
    )
    is_active = models.BooleanField(default=True)
    max_budget = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        verbose_name="Maximum Budget"
    )
    last_liquidated_month = models.PositiveSmallIntegerField(
        null=True, blank=True)
    last_liquidated_year = models.PositiveSmallIntegerField(
        null=True, blank=True)

    def __str__(self):
        return f"{self.schoolName} ({self.schoolId})"

    def get_audit_description(self, created=False, action='create'):
        if action == 'archive':
            return f"Archived school {self.schoolName} ({self.schoolId})"
        elif action == 'restore':
            return f"Restored school {self.schoolName} ({self.schoolId})"
        return f"{action.capitalize()} school {self.schoolName} ({self.schoolId})"


class Requirement(models.Model):
    requirementID = models.AutoField(primary_key=True)
    requirementTitle = models.CharField(max_length=255)
    is_required = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)  # <-- Add this line

    def __str__(self):
        return self.requirementTitle

    def get_audit_description(self, created=False, action='create'):
        if action == 'archive':
            return f"Archived requirement {self.requirementTitle}"
        elif action == 'restore':
            return f"Restored requirement {self.requirementTitle}"
        return f"{action.capitalize()} requirement {self.requirementTitle}"


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

    def get_audit_description(self, created=False, action='create'):
        if action == 'archive':
            return f"Archived priority {self.expenseTitle}"
        elif action == 'restore':
            return f"Restored priority {self.expenseTitle}"
        return f"{action.capitalize()} priority {self.expenseTitle}"


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
    history = HistoricalRecords()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._old_status = self.status  # Track initial status
        self._skip_auto_status = False  # Explicit control flag

    def clean(self):
        """Validate business rules before saving"""
        super().clean()

        # Skip validation for existing records being updated (unless status change)
        if self.pk and not self._state.adding:
            return

        # Check if user can submit a request for the requested month
        if not self.can_user_request_for_month(self.user, self.request_monthyear):
            raise ValidationError(
                "You cannot submit a request for this month. Please liquidate your current request first."
            )

    def save(self, *args, **kwargs):
        """Enhanced save with business rule enforcement"""
        from django.db import transaction

        try:
            with transaction.atomic():
                # For new requests, determine the appropriate month/year
                if self._state.adding and not self.request_monthyear:
                    self.request_monthyear = self.get_next_available_month()

                # Set initial month/year if needed (won't affect status)
                self.set_initial_monthyear()

                # Only auto-set status if not explicitly skipped
                if not (hasattr(self, '_status_changed_by') or self._skip_auto_status):
                    self.set_automatic_status()

                # Handle status change dates
                self.handle_status_change_dates()

                # Validate business rules
                self.full_clean()

                logger.debug(
                    f"Saving request {self.request_id} with status {self.status}")
                super().save(*args, **kwargs)

        except Exception as e:
            logger.error(
                f"Failed to save request {getattr(self, 'request_id', 'new')}: {str(e)}")
            raise

    def get_next_available_month(self):
        """Determine the next available month for the user to request"""
        user_school = self.user.school
        if not user_school:
            # Default to current month if no school
            today = date.today()
            return f"{today.year:04d}-{today.month:02d}"

        # Check if user has any liquidated requests
        last_liquidated = RequestManagement.objects.filter(
            user=self.user,
            status='liquidated'
        ).order_by('-request_monthyear').first()

        if last_liquidated and last_liquidated.request_monthyear:
            # User has liquidated requests, next month after the last liquidated
            try:
                year, month = map(
                    int, last_liquidated.request_monthyear.split('-'))
                next_month = month + 1
                next_year = year
                if next_month > 12:
                    next_month = 1
                    next_year += 1
                return f"{next_year:04d}-{next_month:02d}"
            except (ValueError, AttributeError):
                pass

        # Check if user has any active (non-liquidated) requests
        active_request = RequestManagement.objects.filter(
            user=self.user
        ).exclude(status__in=['liquidated', 'rejected']).first()

        if active_request and active_request.request_monthyear:
            # User has active request, next available is the month after
            try:
                year, month = map(
                    int, active_request.request_monthyear.split('-'))
                next_month = month + 1
                next_year = year
                if next_month > 12:
                    next_month = 1
                    next_year += 1
                return f"{next_year:04d}-{next_month:02d}"
            except (ValueError, AttributeError):
                pass

        # Default: use school's last liquidated month or current month
        if user_school.last_liquidated_month and user_school.last_liquidated_year:
            next_month = user_school.last_liquidated_month + 1
            next_year = user_school.last_liquidated_year
            if next_month > 12:
                next_month = 1
                next_year += 1
            return f"{next_year:04d}-{next_month:02d}"
        else:
            # No previous liquidations, use current month
            today = date.today()
            return f"{today.year:04d}-{today.month:02d}"

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

    @staticmethod
    def can_user_request_for_month(user, target_month_year):
        """Check if user can submit a request for the specified month"""
        if not target_month_year:
            return True  # Let the system determine the month

        # Check if user already has a request for this month
        existing_request = RequestManagement.objects.filter(
            user=user,
            request_monthyear=target_month_year
        ).exclude(status='rejected').first()

        if existing_request:
            return False  # Already has a request for this month

        # Parse the target month
        try:
            target_year, target_month = map(int, target_month_year.split('-'))
        except (ValueError, AttributeError):
            return False  # Invalid format

        today = date.today()
        current_year, current_month = today.year, today.month

        # If requesting for current month or past months
        if (target_year, target_month) <= (current_year, current_month):
            # Check if user has any unliquidated requests for previous months
            unliquidated_requests = RequestManagement.objects.filter(
                user=user
            ).exclude(status__in=['liquidated', 'rejected'])

            for req in unliquidated_requests:
                if req.request_monthyear:
                    try:
                        req_year, req_month = map(
                            int, req.request_monthyear.split('-'))
                        if (req_year, req_month) < (target_year, target_month):
                            return False  # Has unliquidated request from previous months
                    except (ValueError, AttributeError):
                        continue

        # If requesting for future months (advance requests)
        elif (target_year, target_month) > (current_year, current_month):
            # Must have liquidated all previous requests
            unliquidated_requests = RequestManagement.objects.filter(
                user=user
            ).exclude(status__in=['liquidated', 'rejected'])

            if unliquidated_requests.exists():
                return False  # Has unliquidated requests

        return True

    def set_automatic_status(self):
        """Enhanced automatic status setting with business rules"""
        if self.status in ['approved', 'downloaded', 'unliquidated', 'liquidated', 'rejected']:
            return
        if (not hasattr(self, '_status_changed_by')
                and not self._skip_auto_status
                and self.request_monthyear
            ):
            today = date.today()
            try:
                req_year, req_month = map(
                    int, self.request_monthyear.split('-'))

                # Set status based on requested month vs current month
                if (req_year, req_month) > (today.year, today.month):
                    self.status = 'advanced'
                elif (req_year, req_month) == (today.year, today.month):
                    self.status = 'pending'
                else:
                    # Past month - should not normally happen with proper validation
                    self.status = 'pending'

            except (ValueError, AttributeError):
                logger.warning(
                    f"Invalid request_monthyear: {self.request_monthyear}")
                self.status = 'pending'  # Default fallback

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

    def should_be_visible_to_superintendent(self):
        """
        Determine if this request should be visible to superintendent for approval.
        Only pending requests for current or past months should be visible.
        """
        if self.status != 'pending':
            return False

        if not self.request_monthyear:
            return True  # Default to visible if no month specified

        today = date.today()
        try:
            req_year, req_month = map(int, self.request_monthyear.split('-'))
            current_year, current_month = today.year, today.month

            # Should be visible if request month is current or past
            return (req_year, req_month) <= (current_year, current_month)
        except (ValueError, AttributeError):
            return True  # Default to visible if invalid format

    def get_visibility_status(self):
        """Get detailed visibility information for debugging"""
        today = date.today()
        current_month_year = f"{today.year:04d}-{today.month:02d}"

        return {
            'request_id': self.request_id,
            'status': self.status,
            'request_month': self.request_monthyear,
            'current_month': current_month_year,
            'visible_to_superintendent': self.should_be_visible_to_superintendent(),
            'is_future_month': self.request_monthyear > current_month_year if self.request_monthyear else False
        }

    # def get_audit_description(self, created=False, action='create'):
    #     status_action = f"changed status to {self.status}" if action == 'update' and 'status' in getattr(
    #         self, '_audit_changed_fields', []) else action
    #     return f"{status_action.capitalize()} request {self.request_id}"


class RequestPriority(models.Model):
    request = models.ForeignKey(RequestManagement, on_delete=models.CASCADE)
    priority = models.ForeignKey(ListOfPriority, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    history = HistoricalRecords()

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
        ('under_review_liquidator', 'Under Review (Liquidator)'),
        ('under_review_division', 'Under Review (Division)'),
        ('resubmit', 'Needs Revision'),
        ('approved_district', 'Approved by District'),
        ('approved_liquidator', 'Approved by Liquidator'),
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
    reviewed_by_liquidator = models.ForeignKey(
        User, null=True, blank=True, related_name='liquidator_reviewed_liquidations', on_delete=models.SET_NULL
    )
    reviewed_at_liquidator = models.DateTimeField(null=True, blank=True)
    reviewed_by_division = models.ForeignKey(
        User, null=True, blank=True, related_name='division_reviewed_liquidations', on_delete=models.SET_NULL
    )
    reviewed_at_division = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    date_submitted = models.DateTimeField(null=True, blank=True)
    date_districtApproved = models.DateField(null=True, blank=True)
    date_liquidatorApproved = models.DateField(null=True, blank=True)
    date_liquidated = models.DateTimeField(
        null=True, blank=True)  # Changed from DateField
    remaining_days = models.IntegerField(null=True, blank=True)
    history = HistoricalRecords()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._old_status = self.status  # Track initial status
        self._status_changed_by = None  # Track who changed the status
        self._old_remaining_days = self.remaining_days  # Track initial remaining_days

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

    def check_and_send_reminders(self):
        """Check and send reminders based on remaining days"""
        if self.status in ['liquidated']:
            return

        if not self.liquidation_deadline:
            return

        from django.utils import timezone
        today = timezone.now().date()
        days_left = (self.liquidation_deadline - today).days

        reminder_days = [15, 10, 5, 3, 1]

        if days_left in reminder_days:
            if self.request.last_reminder_sent != today:
                from .tasks import send_liquidation_reminder
                send_liquidation_reminder.delay(self.pk, days_left)
                self.request.last_reminder_sent = today
                self.request.save(update_fields=['last_reminder_sent'])

        elif days_left <= 0 and not self.request.demand_letter_sent:
            from .tasks import send_liquidation_demand_letter
            send_liquidation_demand_letter.delay(self.pk)
            self.request.demand_letter_sent = True
            self.request.demand_letter_date = today
            self.request.save(
                update_fields=['demand_letter_sent', 'demand_letter_date'])

    def calculate_remaining_days(self):
        if self.request and self.request.downloaded_at:
            # Ensure downloaded_at is timezone-aware if working with timezones
            downloaded_at = self.request.downloaded_at
            if isinstance(downloaded_at, date) and not isinstance(downloaded_at, datetime):
                downloaded_at = timezone.datetime.combine(
                    downloaded_at, timezone.datetime.min.time())

            deadline = downloaded_at + timedelta(days=30)

            # Use timezone-aware now() if working with timezones
            today = timezone.now() if timezone.is_aware(deadline) else datetime.now()

            remaining = (deadline - today).days
            return max(remaining, 0)  # Returns 0 if deadline has passed
        return None

    def save(self, *args, **kwargs):
        is_new = self._state.adding

        if not is_new:
            old = LiquidationManagement.objects.get(pk=self.pk)
            self._old_status = old.status
            self._old_remaining_days = old.remaining_days

        # Calculate fields BEFORE saving
        self.refund = self.calculate_refund()
        self.remaining_days = self.calculate_remaining_days()

        # Handle status-based date fields
        now = timezone.now()

        # District approval
        if self.status == 'approved_district':
            if self.date_districtApproved is None:
                self.date_districtApproved = now.date()
            if self.reviewed_at_district is None:
                self.reviewed_at_district = now

        # Liquidator approval
        if self.status == 'approved_liquidator':
            if self.date_liquidatorApproved is None:
                self.date_liquidatorApproved = now.date()
            if self.reviewed_at_liquidator is None:
                self.reviewed_at_liquidator = now

        # Division approval
        if self.status == 'liquidated':
            if self.date_liquidated is None:
                self.date_liquidated = now
            if self.reviewed_at_division is None:
                self.reviewed_at_division = now

        # Handle submitted status
        if self.status == 'submitted' and self.date_submitted is None:
            self.date_submitted = now
        # elif self.status != 'submitted' and self.date_submitted is not None:
        #     self.date_submitted = None

        # Handle district approval - only set if not already set
        if self.status == 'approved_district' and self.date_districtApproved is None:
            self.date_districtApproved = timezone.now().date()
        # Don't reset the date when status changes - keep the approval date

        # Handle liquidator approval - only set if not already set
        if self.status == 'approved_liquidator' and self.date_liquidatorApproved is None:
            self.date_liquidatorApproved = timezone.now().date()
        # Don't reset the date when status changes - keep the approval date

        super().save(*args, **kwargs)

    def clean(self):
        if not self.pk and self.request.status != 'downloaded':
            raise ValidationError(
                "Liquidation can only be created for requests with 'downloaded' status."
            )

    def __str__(self):
        return f"Liquidation {self.LiquidationID} for {self.request}"

    def get_audit_description(self, created=False, action='create'):
        status_action = f"changed status to {self.status}" if action == 'update' and 'status' in getattr(
            self, '_audit_changed_fields', []) else action
        return f"{status_action.capitalize()} liquidation {self.LiquidationID}"

    @classmethod
    def update_all_remaining_days(cls):
        for liquidation in cls.objects.all():
            new_remaining = liquidation.calculate_remaining_days()
            if liquidation.remaining_days != new_remaining:
                liquidation.remaining_days = new_remaining
                liquidation.save(update_fields=['remaining_days'])


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


class SchoolDistrict(models.Model):
    districtId = models.AutoField(primary_key=True)
    districtName = models.CharField(max_length=255)
    municipality = models.CharField(max_length=100)
    legislativeDistrict = models.CharField(
        max_length=100,
        choices=[("1st District", "1st District"),
                 ("2nd District", "2nd District")]
    )
    logo = models.ImageField(
        upload_to='district_logos/',
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png', 'svg'])],
        blank=True,
        null=True,
        help_text="District logo image"
    )
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.districtName} ({self.districtId})"

    def get_audit_description(self, created=False, action='create'):
        if action == 'archive':
            return f"Archived district {self.districtName}"
        elif action == 'restore':
            return f"Restored district {self.districtName}"
        return f"{action.capitalize()} district {self.districtName}"


class GeneratedPDF(models.Model):
    """
    Model to track PDF generation for audit trail and compliance
    """
    id = models.AutoField(primary_key=True)
    request = models.ForeignKey(
        RequestManagement,
        on_delete=models.CASCADE,
        related_name='generated_pdfs'
    )
    generated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='generated_pdfs'
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    pdf_file = models.FileField(
        upload_to='generated_pdfs/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Stored PDF file for audit trail"
    )
    file_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="File size in bytes"
    )
    generation_method = models.CharField(
        max_length=20,
        choices=[
            ('server_side', 'Server-side with signatures'),
            ('client_side', 'Client-side (legacy)'),
        ],
        default='server_side'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the user who generated the PDF"
    )
    user_agent = models.TextField(
        blank=True,
        null=True,
        help_text="User agent string for audit trail"
    )

    class Meta:
        ordering = ['-generated_at']
        verbose_name = "Generated PDF"
        verbose_name_plural = "Generated PDFs"

    def __str__(self):
        return f"PDF for {self.request.request_id} generated by {self.generated_by} on {self.generated_at}"

    def save(self, *args, **kwargs):
        # Calculate file size if PDF file is provided
        if self.pdf_file and not self.file_size:
            try:
                self.file_size = self.pdf_file.size
            except (OSError, ValueError):
                pass
        super().save(*args, **kwargs)


class Backup(models.Model):
    """
    Track backup and restore operations.
    Stores metadata about where artifacts are saved and their sizes.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    id = models.AutoField(primary_key=True)
    initiated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='backups'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    format = models.CharField(max_length=20, choices=[(
        'json', 'JSON'), ('sql', 'SQL'), ('csv', 'CSV')], default='json')
    include_media = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending')
    file_size = models.BigIntegerField(
        null=True, blank=True, help_text="Size in bytes of the main archive")
    message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Backup {self.id} ({self.status})"


# Add to models.py
# Add to models.py
class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('archive', 'Archive'),
        ('restore', 'Restore'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('submit', 'Submit'),
        ('download', 'Download'),
        ('backup', 'Backup'),
        ('restore', 'Restore'),
        ('password_change', 'Password Change'),
        ('resubmit', 'Resubmit'),
        ('approve_district', 'Approve (District)'),
        ('approve_liquidator', 'Approve (Liquidator)'),
        ('approve_division', 'Approve (Division)'),
        ('liquidate', 'Liquidate'),
        ('batch_update', 'Batch Update'),
    ]

    MODULE_CHOICES = [
        ('user', 'User Management'),
        ('school', 'School Management'),
        ('request', 'Request Management'),
        ('liquidation', 'Liquidation Management'),
        ('priority', 'Priority Management'),
        ('requirement', 'Requirement Management'),
        ('district', 'District Management'),
        ('system', 'System Operations'),
        ('auth', 'Authentication'),
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL,
                             null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    module = models.CharField(max_length=20, choices=MODULE_CHOICES)
    object_id = models.CharField(max_length=100, null=True, blank=True)
    object_type = models.CharField(max_length=100, null=True, blank=True)
    object_name = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    # For changes tracking
    old_values = models.JSONField(
        null=True, blank=True, encoder=DecimalJSONEncoder)
    new_values = models.JSONField(
        null=True, blank=True, encoder=DecimalJSONEncoder)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['module', 'action']),
            models.Index(fields=['object_type', 'object_id']),
        ]

    def __str__(self):
        user_name = self.user.get_full_name() if self.user else "System"
        return f"{user_name} {self.action} {self.module} at {self.timestamp}"
