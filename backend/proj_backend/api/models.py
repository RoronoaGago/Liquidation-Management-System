from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.core.validators import FileExtensionValidator


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
    schoolId = models.CharField(max_length=10, primary_key=True, editable=False)  # Primary Key
    schoolName = models.CharField(max_length=255)
    municipality = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    legislativeDistrict = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.schoolName} ({self.schoolId})"

class Requirement(models.Model):
    requirementID = models.AutoField(primary_key=True)
    requirementTitle = models.CharField(max_length=255)
    is_required = models.BooleanField(default=False)  # <-- updated field

    def __str__(self):
        return self.requirementTitle


class ListOfPriority(models.Model):
    LOPID = models.AutoField(primary_key=True)
    expenseTitle = models.CharField(max_length=255)
    requirement = models.ManyToManyField(
        Requirement, related_name='priorities')

    def __str__(self):
        return self.expenseTitle
    
class Request(models.Model):
    STATUS_CHOICES = [
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('pending', 'Pending'),
        ('inliquidated', 'Inliquidated'),
    ]

    request_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # Replace User with your custom User model if needed
    request_month = models.DateField()
    priorities = models.ForeignKey(ListOfPriority, on_delete=models.SET_NULL, null=True, related_name='requests')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    def __str__(self):
        return f"Request #{self.request_id} - {self.status}"
