# Generated manually for PDF audit trail

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_schooldistrict_logo'),
    ]

    operations = [
        migrations.CreateModel(
            name='GeneratedPDF',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('generated_at', models.DateTimeField(auto_now_add=True)),
                ('pdf_file', models.FileField(blank=True, help_text='Stored PDF file for audit trail', null=True, upload_to='generated_pdfs/%Y/%m/%d/')),
                ('file_size', models.PositiveIntegerField(blank=True, help_text='File size in bytes', null=True)),
                ('generation_method', models.CharField(choices=[('server_side', 'Server-side with signatures'), ('client_side', 'Client-side (legacy)')], default='server_side', max_length=20)),
                ('ip_address', models.GenericIPAddressField(blank=True, help_text='IP address of the user who generated the PDF', null=True)),
                ('user_agent', models.TextField(blank=True, help_text='User agent string for audit trail', null=True)),
                ('generated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='generated_pdfs', to='api.user')),
                ('request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='generated_pdfs', to='api.requestmanagement')),
            ],
            options={
                'verbose_name': 'Generated PDF',
                'verbose_name_plural': 'Generated PDFs',
                'ordering': ['-generated_at'],
            },
        ),
    ]
