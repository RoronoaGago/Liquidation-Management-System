from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    date_of_birth = models.DateField(null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    # Remove these fields as they're already in AbstractUser:
    # first_name, last_name, username, password, email

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.username})"
