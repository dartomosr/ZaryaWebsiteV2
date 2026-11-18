"""Форматы примеров без optional-зависимостей jsonschema."""
from datetime import date, datetime
import re
from jsonschema import FormatChecker

FORMAT_CHECKER = FormatChecker()


@FORMAT_CHECKER.checks('date-time', raises=ValueError)
def date_time(value):
    if not isinstance(value, str):
        return True
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})', value):
        return False
    # .NET/проект не используют leap seconds. Offset проверяется также по минутам.
    if value[-1:].upper() != 'Z' and (int(value[-5:-3]) > 23 or int(value[-2:]) > 59):
        return False
    datetime.fromisoformat(value.upper().replace('Z', '+00:00'))
    return True


@FORMAT_CHECKER.checks('date', raises=ValueError)
def calendar_date(value):
    if not isinstance(value, str):
        return True
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        return False
    date.fromisoformat(value)
    return True
