import django_filters

from .models import Accommodation, Service


class AccommodationFilter(django_filters.FilterSet):
    # `ciudad` se resuelve en apply_accommodation_search_params (UBIGEO / texto libre).
    tipo = django_filters.CharFilter(field_name="type")
    precio_min = django_filters.NumberFilter(
        field_name="precio_desde", lookup_expr="gte"
    )
    precio_max = django_filters.NumberFilter(
        field_name="precio_desde", lookup_expr="lte"
    )
    servicios = django_filters.ModelMultipleChoiceFilter(
        field_name="services__slug",
        to_field_name="slug",
        queryset=Service.objects.filter(is_active=True),
        conjoined=True,
    )

    class Meta:
        model = Accommodation
        fields = ("type", "city")
