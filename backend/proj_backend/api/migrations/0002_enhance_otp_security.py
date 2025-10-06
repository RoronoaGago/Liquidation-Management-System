"""
Enhanced OTP Security Migration
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='otp_attempts_count',
            field=models.PositiveIntegerField(default=0, help_text='Number of failed OTP attempts'),
        ),
        migrations.AddField(
            model_name='user',
            name='otp_last_attempt_at',
            field=models.DateTimeField(blank=True, null=True, help_text='Timestamp of last OTP attempt'),
        ),
        migrations.AddField(
            model_name='user',
            name='account_locked_until',
            field=models.DateTimeField(blank=True, null=True, help_text='Account locked until this timestamp'),
        ),
        migrations.AddField(
            model_name='user',
            name='last_otp_request_ip',
            field=models.GenericIPAddressField(blank=True, null=True, help_text='IP address of last OTP request'),
        ),
        migrations.AddField(
            model_name='user',
            name='last_otp_request_user_agent',
            field=models.TextField(blank=True, help_text='User agent of last OTP request'),
        ),
    ]
