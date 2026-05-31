from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .natural_region import enrich_distrito, enrich_provincia, get_provincia_zona_for_item
from .ubigeo_loader import (
    list_departamentos,
    list_distritos,
    list_distritos_departamento,
    list_provincias,
    resolve_provincia,
    search_places,
)


class UbigeoDepartamentosView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(list_departamentos())


class UbigeoProvinciasView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        departamento = request.query_params.get("departamento", "").strip()
        if not departamento:
            return Response(
                {"departamento": "Indique el departamento (código o nombre)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = list_provincias(departamento)
        if not data:
            return Response(
                {"departamento": "Departamento no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        enriched = [enrich_provincia(p) for p in data]
        return Response(enriched)


class UbigeoDistritosView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        provincia = request.query_params.get("provincia", "").strip()
        departamento = request.query_params.get("departamento", "").strip() or None

        if provincia:
            data = list_distritos(provincia, departamento)
            if not data:
                return Response(
                    {"provincia": "Provincia no encontrada."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            prov = resolve_provincia(provincia, departamento)
            zona = get_provincia_zona_for_item(prov) if prov else "sierra"
            enriched = [enrich_distrito(d, zona) for d in data]
            return Response(enriched)

        if departamento:
            data = list_distritos_departamento(departamento)
            if not data:
                return Response(
                    {"departamento": "Departamento no encontrado o sin distritos."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            enriched = []
            for d in data:
                prov = resolve_provincia(d.get("provincia_nombre") or "", departamento)
                zona = get_provincia_zona_for_item(prov) if prov else "sierra"
                enriched.append(enrich_distrito(d, zona))
            return Response(enriched)

        return Response(
            {
                "detail": "Indique provincia (y opcional departamento) o solo departamento para listar distritos."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class UbigeoBuscarView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        try:
            limit = int(request.query_params.get("limit", "8"))
        except ValueError:
            limit = 8
        limit = max(1, min(limit, 30))
        return Response(search_places(query, limit=limit))
