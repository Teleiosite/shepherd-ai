"""
Security Utilities for Shepherd AI
Provides SSRF validation, rate limiting, and filename sanitization.
"""

import ipaddress
import os
import re
import socket
import time
import uuid
from typing import Dict, List, Tuple
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)


def is_safe_url(url: str) -> Tuple[bool, str]:
    """
    Validate that a URL does not point to internal, private, loopback,
    or cloud provider metadata IP addresses (SSRF defense).
    Returns (is_safe: bool, reason: str).
    """
    if not url:
        return False, "URL is required"

    try:
        parsed = urlparse(url)
    except Exception:
        return False, "Malformed URL"

    # Only permit HTTP and HTTPS schemes
    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"Unsupported scheme: {parsed.scheme}. Only HTTP and HTTPS are allowed."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL missing valid hostname"

    # Block local aliases and metadata hostnames explicitly
    blocked_hostnames = {
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "instance-data",
        "metadata.google.internal",
        "metadata",
    }
    if hostname.lower() in blocked_hostnames:
        return False, f"Access to restricted hostname '{hostname}' is forbidden."

    # Resolve hostname to IP addresses
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False, f"Could not resolve hostname '{hostname}'"
    except Exception as e:
        return False, f"DNS resolution failed: {e}"

    if not addr_info:
        return False, f"No IP addresses resolved for '{hostname}'"

    for entry in addr_info:
        ip_str = entry[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            return False, f"Invalid IP address: {ip_str}"

        # Block private, loopback, link-local, multicast, and reserved addresses
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
        ):
            return False, f"Access to internal network address ({ip_str}) is forbidden."

        # Explicitly block cloud metadata service IPv4 (169.254.169.254)
        if ip_str == "169.254.169.254":
            return False, "Access to cloud metadata service is forbidden."

    return True, "URL is safe"


class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter.
    Stores timestamps of requests per key (e.g. IP or user identifier).
    """

    def __init__(self):
        self._records: Dict[str, List[float]] = {}

    def is_allowed(self, key: str, max_requests: int, window_seconds: int = 60) -> Tuple[bool, int]:
        """
        Check if an action is allowed for the given key.
        Returns (allowed: bool, retry_after_seconds: int).
        """
        now = time.time()
        window_start = now - window_seconds

        timestamps = self._records.get(key, [])
        # Filter out expired timestamps
        valid_timestamps = [t for t in timestamps if t > window_start]

        if len(valid_timestamps) >= max_requests:
            oldest_valid = valid_timestamps[0]
            retry_after = max(1, int(window_seconds - (now - oldest_valid)))
            self._records[key] = valid_timestamps
            return False, retry_after

        valid_timestamps.append(now)
        self._records[key] = valid_timestamps
        return True, 0


# Global rate limiter singletons for auth and widget
auth_rate_limiter = SlidingWindowRateLimiter()
widget_rate_limiter = SlidingWindowRateLimiter()


def sanitize_filename(filename: str) -> str:
    """
    Sanitize an uploaded file name to prevent path traversal attacks.
    Returns a safe filename prefixed with a unique UUID.
    """
    if not filename:
        return f"{uuid.uuid4().hex}.bin"

    # Extract basename only (eliminating ../, ..\\, etc.)
    base = os.path.basename(filename).strip()

    # Replace spaces and non-alphanumeric characters (except dots, dashes, underscores)
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", base)

    # Avoid hidden files starting with dot
    safe_name = safe_name.lstrip(".")

    if not safe_name:
        safe_name = "file.bin"

    # Truncate overly long names
    if len(safe_name) > 100:
        ext = os.path.splitext(safe_name)[1]
        safe_name = safe_name[:90] + ext

    return f"{uuid.uuid4().hex[:12]}_{safe_name}"


def find_user_by_connection_code(code: str, db):
    """
    Safely locate a user by their bridge connection code.
    Requires at least 8 characters and performs exact 8-character prefix matching
    to prevent wildcard hijacking and enumeration attacks.
    """
    if not code:
        return None
    clean = str(code).strip().lower()
    if len(clean) < 8:
        return None
    from app.models import User
    from sqlalchemy import cast, String, func
    return db.query(User).filter(
        func.substr(func.lower(cast(User.id, String)), 1, 8) == clean[:8]
    ).first()
