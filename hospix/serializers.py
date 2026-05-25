from rest_framework import serializers


class HospixHistoryItemSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=("user", "assistant"))
    content = serializers.CharField(max_length=4000)


class HospixChatSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    pathname = serializers.CharField(max_length=300, required=False, default="/")
    session_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    history = HospixHistoryItemSerializer(many=True, required=False, default=list)
    action_id = serializers.CharField(max_length=80, required=False, allow_blank=True)
    action_target = serializers.CharField(max_length=120, required=False, allow_blank=True)
    welcome = serializers.BooleanField(required=False, default=False)
