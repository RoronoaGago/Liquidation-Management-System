from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import School, BudgetAllocation, User
from datetime import date
import decimal

class Command(BaseCommand):
    help = 'Create budget allocations for schools that don\'t have them for the current year'

    def add_arguments(self, parser):
        parser.add_argument(
            '--year',
            type=int,
            default=date.today().year,
            help='Year for budget allocation (default: current year)'
        )
        parser.add_argument(
            '--default-budget',
            type=float,
            default=100000.0,
            help='Default yearly budget amount for schools (default: 100000)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating records'
        )
        parser.add_argument(
            '--school-id',
            type=str,
            help='Create budget allocation for a specific school ID only'
        )

    def handle(self, *args, **options):
        year = options['year']
        default_budget = decimal.Decimal(str(options['default_budget']))
        dry_run = options['dry_run']
        school_id = options['school_id']

        self.stdout.write(f"Creating budget allocations for year {year}")
        self.stdout.write(f"Default yearly budget: ₱{default_budget:,.2f}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No records will be created"))

        # Get admin user for created_by field
        try:
            admin_user = User.objects.filter(is_superuser=True).first()
            if not admin_user:
                admin_user = User.objects.first()
        except:
            admin_user = None

        if not admin_user:
            self.stdout.write(self.style.ERROR("No admin user found. Please create an admin user first."))
            return

        # Get schools to process
        if school_id:
            schools = School.objects.filter(schoolId=school_id, is_active=True)
            if not schools.exists():
                self.stdout.write(self.style.ERROR(f"School with ID '{school_id}' not found or inactive"))
                return
        else:
            # Get schools without budget allocation for the specified year
            schools_with_budget = BudgetAllocation.objects.filter(
                year=year,
                is_active=True
            ).values_list('school_id', flat=True)
            
            schools = School.objects.filter(
                is_active=True
            ).exclude(
                schoolId__in=schools_with_budget
            )

        if not schools.exists():
            self.stdout.write(self.style.SUCCESS("All schools already have budget allocations for this year!"))
            return

        self.stdout.write(f"Found {schools.count()} schools without budget allocation for {year}")

        created_count = 0
        errors = []

        with transaction.atomic():
            for school in schools:
                try:
                    if dry_run:
                        self.stdout.write(f"Would create budget allocation for: {school.schoolName} ({school.schoolId})")
                        created_count += 1
                    else:
                        # Check if budget allocation already exists (double-check)
                        if BudgetAllocation.objects.filter(school=school, year=year, is_active=True).exists():
                            self.stdout.write(f"Skipping {school.schoolName} - budget allocation already exists")
                            continue

                        # Create budget allocation
                        budget_allocation = BudgetAllocation.objects.create(
                            school=school,
                            year=year,
                            yearly_budget=default_budget,
                            created_by=admin_user
                        )
                        
                        self.stdout.write(
                            f"Created budget allocation for {school.schoolName} ({school.schoolId}): "
                            f"₱{budget_allocation.yearly_budget:,.2f} yearly, "
                            f"₱{budget_allocation.monthly_budget:,.2f} monthly"
                        )
                        created_count += 1

                except Exception as e:
                    error_msg = f"Error creating budget allocation for {school.schoolName}: {str(e)}"
                    self.stdout.write(self.style.ERROR(error_msg))
                    errors.append(error_msg)

        # Summary
        self.stdout.write("\n" + "="*50)
        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"DRY RUN: Would create {created_count} budget allocations"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} budget allocations"))
        
        if errors:
            self.stdout.write(self.style.ERROR(f"Encountered {len(errors)} errors:"))
            for error in errors:
                self.stdout.write(f"  - {error}")

        # Show current status
        self.stdout.write("\nCurrent budget allocation status:")
        total_schools = School.objects.filter(is_active=True).count()
        schools_with_budget = BudgetAllocation.objects.filter(year=year, is_active=True).count()
        schools_without_budget = total_schools - schools_with_budget
        
        self.stdout.write(f"  Total active schools: {total_schools}")
        self.stdout.write(f"  Schools with budget allocation: {schools_with_budget}")
        self.stdout.write(f"  Schools without budget allocation: {schools_without_budget}")
        
        if schools_without_budget == 0:
            self.stdout.write(self.style.SUCCESS("All schools now have budget allocations!"))
        else:
            self.stdout.write(self.style.WARNING(f"{schools_without_budget} schools still need budget allocations"))
