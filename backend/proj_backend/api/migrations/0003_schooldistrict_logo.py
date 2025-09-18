# Generated manually for SchoolDistrict logo field

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_historicalliquidationmanagement_date_liquidatorapproved_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='schooldistrict',
            name='logo',
            field=models.ImageField(blank=True, help_text='District logo image', null=True, upload_to='district_logos/', validators=[django.core.validators.FileExtensionValidator(['jpg', 'jpeg', 'png', 'svg'])]),
        ),
    ]
