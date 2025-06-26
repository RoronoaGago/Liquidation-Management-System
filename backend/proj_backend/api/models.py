from django.db import models
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.contrib.auth.models import AbstractUser
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
import string


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
        max_length=10, primary_key=True, editable=False)  # Primary Key
    schoolName = models.CharField(max_length=255)
    municipality = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    legislativeDistrict = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)  # Added for archiving

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
        ('trainDev', 'Training and Development'),
        ('transport', 'Travel & Transportation'),
        ('communication', 'Communication & Utilities'),
        ('office', 'Office Operations & Supplies'),
        ('services', 'Services & Maintenance'),
        ('medical', 'Medical & Food Supplies'),
        ('misc', 'Miscellaneous'),
    ]

    LOPID = models.AutoField(primary_key=True)
    expenseTitle = models.CharField(max_length=255)
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default='misc'
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
    """Generate REQ-ABC123 format ID"""
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
    ]

    request_id = models.CharField(
        max_length=10,
        primary_key=True,
        default=generate_request_id,
        editable=False,
        unique=True
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    request_month = models.CharField(max_length=20, null=True, blank=True)
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
    date_approved = models.DateField(
        null=True, blank=True)  # <-- Add this field
    date_downloaded = models.DateField(null=True, blank=True)
    rejection_comment = models.TextField(null=True, blank=True)
    rejection_date = models.DateField(null=True, blank=True)

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        old_status = None
        if not is_new:
            old = RequestManagement.objects.get(pk=self.pk)
            old_status = old.status

        # Status change logic
        status_changed = (old_status != self.status)

        if status_changed:
            from .models import Notification  # Avoid circular import
            Notification.objects.create(
                notification_title=f"Request {self.status.title()}",
                details=self.rejection_comment if self.status == 'rejected' else None,
                receiver=self.user,
                sender=getattr(self, '_status_changed_by', None),
            )
        # Automatically set date_approved when status becomes 'approved'
        if self.status == 'approved' and self.date_approved is None:
            self.date_approved = timezone.now().date()
        # If status is changed from approved to something else, clear date_approved
        elif self.status != 'approved' and self.date_approved is not None:
            self.date_approved = None

          # Automatically set date_downloaded when status becomes 'downloaded'
        if self.status == 'downloaded' and self.date_downloaded is None:
            self.date_downloaded = timezone.now().date()
        elif self.status != 'downloaded' and self.date_downloaded is not None:
            self.date_downloaded = None

          # Automatically set rejection_date when status becomes 'rejected'
        if self.status == 'rejected' and self.rejection_date is None:
            self.rejection_date = timezone.now().date()
        elif self.status != 'rejected' and self.rejection_date is not None:
            self.rejection_date = None

        super().save(*args, **kwargs)

        if status_changed:
            from .models import Notification  # Avoid circular import
            Notification.objects.create(
                notification_title=f"Request {self.status.title()}",
                details=self.rejection_comment if self.status == 'rejected' else None,
                receiver=self.user,
                # Set this in your view if needed
                sender=getattr(self, '_status_changed_by', None),
            )

    def __str__(self):
        return f"Request {self.request_id} by {self.user.username}"


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
