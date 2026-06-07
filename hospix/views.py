from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import HospixChatSerializer
from .services import engine


class HospixChatView(APIView):
    """
    POST /api/v1/hospix/chat/
    Asistente Hospix: reglas + datos reales; IA opcional.
    Mensajes solo en caché temporal (RAM/TTL), no en base de datos.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        ser = HospixChatSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        user = request.user if request.user.is_authenticated else None
        pathname = data.get("pathname") or "/"
        session_id = (data.get("session_id") or "").strip() or None

        if data.get("welcome"):
            payload = engine.welcome(user, pathname, session_id)
            return Response(payload)

        message = (data.get("message") or "").strip()
        action_id = (data.get("action_id") or "").strip() or None
        action_target = (data.get("action_target") or "").strip() or None

        if not message and not action_id:
            return Response(
                {"detail": "Indique message o action_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        history = [
            {"role": h["role"], "content": h["content"]}
            for h in data.get("history") or []
        ]

        payload = engine.chat(
            message=message,
            user=user,
            pathname=pathname,
            session_id=session_id,
            history=history,
            action_id=action_id,
            action_target=action_target,
            request=request,
        )
        return Response(payload)
