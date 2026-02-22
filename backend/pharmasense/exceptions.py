class SafetyBlockError(Exception):
    """Raised when Gemini's promptFeedback.blockReason is non-null."""

    def __init__(self, reason: str = "Content blocked by safety filters"):
        self.reason = reason
        super().__init__(self.reason)


class ValidationError(Exception):
    """Raised when parsed Gemini output fails business-rule validation."""

    def __init__(self, field: str, message: str, operation: str = ""):
        self.field = field
        self.message = message
        self.operation = operation
        super().__init__(f"[{operation}] Validation failed on '{field}': {message}")


class ResourceNotFoundError(Exception):
    """Raised when a requested resource does not exist."""

    def __init__(self, resource: str, identifier: str = ""):
        self.resource = resource
        self.identifier = identifier
        msg = f"{resource} not found"
        if identifier:
            msg = f"{resource} '{identifier}' not found"
        super().__init__(msg)
