from rest_framework import serializers

from .models import CriminalCase


class CriminalCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = CriminalCase
        fields = ['id', 'province', 'date_created', 'status', 'created_by']
        read_only_fields = ['id', 'date_created', 'created_by']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)

