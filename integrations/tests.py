from integrations.ipguide import geo_hints_from_lookup, normalize_ipguide_payload


def test_normalize_ipguide_payload():
    raw = {
        "ip": "1.2.3.4",
        "network": {
            "cidr": "1.2.3.0/24",
            "autonomous_system": {
                "asn": 270068,
                "name": "AS270068 - DIT PERU",
                "organization": "DIT PERU SA",
                "country": "PE",
                "rir": "LACNIC",
            },
        },
        "location": {
            "city": "Lima",
            "country": "Peru",
            "timezone": "America/Lima",
            "latitude": -12.05,
            "longitude": -77.05,
        },
    }
    out = normalize_ipguide_payload(raw)
    assert out["country_code"] == "PE"
    assert out["city"] == "Lima"
    assert out["asn"] == 270068


def test_geo_hints_peru():
    hints = geo_hints_from_lookup(
        {
            "country_code": "PE",
            "country": "Peru",
            "city": "Arequipa",
            "timezone": "America/Lima",
        }
    )
    assert hints["detected"] is True
    assert hints["language"] == "es-PE"
    assert hints["currency"] == "PEN"


def test_geo_hints_foreign():
    hints = geo_hints_from_lookup(
        {
            "country_code": "US",
            "country": "United States",
            "city": "Chicago",
        }
    )
    assert hints["language"] == "en"
    assert hints["currency"] == "USD"
