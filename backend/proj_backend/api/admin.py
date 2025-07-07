from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


class UserAdmin(BaseUserAdmin):
    # Remove username from ordering and use email instead
    ordering = ('email',)

    # Update the list display to show email instead of username
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_active')

    # Update the fieldsets to remove username
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name',
         'last_name', 'phone_number', 'profile_picture')}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('Role Information', {
         'fields': ('role', 'school', 'school_district')}),
    )

    # Update the add_fieldsets to remove username
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )


# Register your custom UserAdmin
admin.site.register(User, UserAdmin)
