from __future__ import annotations

import json
from typing import Any, Mapping
from urllib import request as urlrequest


class PromptZeroClient:
    """HTTP client for the public execute endpoint."""

    def __init__(self, *, base_url: str, api_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def execute_prompt(self, prompt_id: str, payload: Mapping[str, Any] | None = None) -> Any:
        data = json.dumps(payload or {}).encode("utf-8")
        req = urlrequest.Request(
            f"{self.base_url}/public/prompts/{prompt_id}/execute",
            data=data,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "X-PromptZero-Api-Key": self.api_key,
            },
        )
        with urlrequest.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
