from enum import Enum


class ShipmentStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    done = "done"
    failed = "failed"


class ShipmentShippingPreference(str, Enum):
    cheap = "cheap"
    fast = "fast"
    reliable = "reliable"


class ShipmentExportReason(str, Enum):
    commercial_goods = "commercial_goods"
    documents = "documents"
    gift = "gift"


class Country(str, Enum):
    NL = "NL"
    FR = "FR"
    DE = "DE"
    PT = "PT"
    ES = "ES"
    IT = "IT"
    GB = "GB"
    US = "US"
