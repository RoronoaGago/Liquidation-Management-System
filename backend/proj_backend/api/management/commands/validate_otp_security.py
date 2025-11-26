"""
Django management command to validate OTP security configuration
Usage: python manage.py validate_otp_security
"""
from django.core.management.base import BaseCommand
from api.otp_security_validator import OTPSecurityValidator


class Command(BaseCommand):
    help = 'Validate OTP security configuration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--report',
            action='store_true',
            help='Generate detailed security report',
        )
        parser.add_argument(
            '--fail-on-error',
            action='store_true',
            help='Exit with error code if validation fails',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🔒 Starting OTP Security Validation...')
        )
        
        # Run validation
        validation_result = OTPSecurityValidator.validate_production_environment()
        
        # Display results
        if validation_result['passed']:
            self.stdout.write(
                self.style.SUCCESS('✅ OTP Security Validation PASSED')
            )
        else:
            self.stdout.write(
                self.style.ERROR('❌ OTP Security Validation FAILED')
            )
            
            self.stdout.write('\n🚨 Critical Errors:')
            for error in validation_result['errors']:
                self.stdout.write(
                    self.style.ERROR(f'   • {error}')
                )
        
        if validation_result['warnings']:
            self.stdout.write('\n⚠️  Warnings:')
            for warning in validation_result['warnings']:
                self.stdout.write(
                    self.style.WARNING(f'   • {warning}')
                )
        
        # Generate detailed report if requested
        if options['report']:
            self.stdout.write('\n📊 Detailed Security Report:')
            security_report = OTPSecurityValidator.get_security_report()
            
            self.stdout.write(f"Environment: {'Production' if security_report['validation_result']['is_production'] else 'Development'}")
            self.stdout.write(f"Debug Mode: {security_report['environment']['debug']}")
            
            self.stdout.write('\nOTP Configuration:')
            config = security_report['otp_config']
            self.stdout.write(f"  • Lifetime: {config['lifetime_minutes']} minutes ({config['lifetime_seconds']} seconds)")
            self.stdout.write(f"  • Length: {config['length']} digits")
            self.stdout.write(f"  • Max Attempts: {config['max_attempts']}")
            self.stdout.write(f"  • Lockout Time: {config['lockout_minutes']} minutes")
        
        # Exit with error code if validation failed and requested
        if not validation_result['passed'] and options['fail_on_error']:
            self.stdout.write(
                self.style.ERROR('\n💥 Exiting with error code due to validation failure')
            )
            exit(1)
        
        self.stdout.write(
            self.style.SUCCESS('\n🎉 OTP Security Validation completed')
        )
