# In your utils.py or a new file like json_utils.py
import json
from decimal import Decimal
from django.core.serializers.json import DjangoJSONEncoder


class DecimalJSONEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def decimal_safe_json_dumps(data):
    return json.dumps(data, cls=DecimalJSONEncoder)


def decimal_safe_json_loads(json_string):
    return json.loads(json_string)
