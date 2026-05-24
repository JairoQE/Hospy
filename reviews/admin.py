from django.contrib import admin

from .models import Review
from .services import moderate_review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("accommodation", "author", "rating", "status", "created_at")
    list_filter = ("status", "rating")
    search_fields = ("accommodation__name", "author__email", "comment")
    actions = ("aprobar_resenas", "rechazar_resenas")

    @admin.action(description="Aprobar resenas seleccionadas")
    def aprobar_resenas(self, request, queryset):
        for review in queryset.filter(status=Review.Status.PENDIENTE):
            moderate_review(review, True)

    @admin.action(description="Rechazar resenas seleccionadas")
    def rechazar_resenas(self, request, queryset):
        for review in queryset.filter(status=Review.Status.PENDIENTE):
            moderate_review(review, False)
