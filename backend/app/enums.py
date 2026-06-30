from enum import Enum

class BulkUpsertMode(str, Enum):
    COMMIT = "commit"
    FLUSH = "flush"