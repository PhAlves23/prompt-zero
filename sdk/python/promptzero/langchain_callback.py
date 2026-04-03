"""
LangChain → PromptZero: envia spans para POST /traces/ingest (JWT).

Install: pip install ".[langchain]"

Usa os ``run_id`` do LangChain como ``id`` dos spans para o backend conseguir
montar a hierarquia (``parent_run_id`` → ``parentId``).
"""

from __future__ import annotations

import datetime as dt
import json
import logging
from typing import Any, List, Optional
from urllib import error as urlerror
from urllib import request as urlrequest
from uuid import uuid4

try:
    from langchain_core.callbacks import BaseCallbackHandler
except ImportError as e:  # pragma: no cover
    raise ImportError("Install langchain-core to use PromptZeroLangChainCallback") from e

logger = logging.getLogger(__name__)


def _iso_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _run_str(run_id: Any) -> str:
    return str(run_id) if run_id is not None else str(uuid4())


def _parent_kw(kwargs: dict[str, Any]) -> Optional[str]:
    pid = kwargs.get("parent_run_id")
    return str(pid) if pid is not None else None


class PromptZeroLangChainCallback(BaseCallbackHandler):
    """
    Regista chain + LLM (início/fim) e opcionalmente faz ``flush`` ao terminar a chain.
    """

    def __init__(
        self,
        *,
        base_url: str,
        jwt_bearer_token: str,
        name: str = "langchain",
        flush_on_chain_end: bool = False,
        clear_spans_after_flush: bool = True,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = jwt_bearer_token
        self.run_name = name
        self.flush_on_chain_end = flush_on_chain_end
        self.clear_spans_after_flush = clear_spans_after_flush
        self.spans: List[dict[str, Any]] = []

    def _append_span(self, span: dict[str, Any]) -> None:
        cleaned = {k: v for k, v in span.items() if v is not None}
        self.spans.append(cleaned)

    def on_chain_start(
        self,
        serialized: dict[str, Any],
        inputs: dict[str, Any],
        *,
        run_id: Any,
        **kwargs: Any,
    ) -> None:
        self._append_span(
            {
                "id": _run_str(run_id),
                "parentId": _parent_kw(kwargs),
                "name": serialized.get("name", "chain"),
                "startTime": _iso_now(),
                "attributes": {
                    "kind": "chain",
                    "phase": "start",
                    "inputs_keys": list(inputs.keys()),
                },
            }
        )

    def on_chain_end(
        self,
        outputs: dict[str, Any],
        *,
        run_id: Any,
        **kwargs: Any,
    ) -> None:
        now = _iso_now()
        rid = _run_str(run_id)
        self._append_span(
            {
                "id": str(uuid4()),
                "parentId": rid,
                "name": "chain:end",
                "startTime": now,
                "endTime": now,
                "attributes": {
                    "kind": "chain",
                    "phase": "end",
                    "outputs_keys": list(outputs.keys()) if isinstance(outputs, dict) else [],
                },
            }
        )
        if self.flush_on_chain_end:
            self.flush(clear=self.clear_spans_after_flush)

    def on_chain_error(
        self,
        error: BaseException,
        *,
        run_id: Any,
        **kwargs: Any,
    ) -> None:
        now = _iso_now()
        rid = _run_str(run_id)
        self._append_span(
            {
                "id": str(uuid4()),
                "parentId": rid,
                "name": "chain:error",
                "startTime": now,
                "endTime": now,
                "attributes": {
                    "kind": "chain",
                    "phase": "error",
                    "error": type(error).__name__,
                    "message": str(error)[:500],
                },
            }
        )

    def on_llm_start(
        self,
        serialized: dict[str, Any],
        prompts: list[str],
        *,
        run_id: Any,
        **kwargs: Any,
    ) -> None:
        name = serialized.get("name")
        if not name and serialized.get("id"):
            name = serialized["id"][-1] if isinstance(serialized["id"], list) else serialized["id"]
        self._append_span(
            {
                "id": _run_str(run_id),
                "parentId": _parent_kw(kwargs),
                "name": f"llm:{name or 'model'}",
                "startTime": _iso_now(),
                "attributes": {
                    "kind": "llm",
                    "phase": "start",
                    "prompt_count": len(prompts),
                },
            }
        )

    def on_llm_end(self, response: Any, *, run_id: Any, **kwargs: Any) -> None:
        now = _iso_now()
        rid = _run_str(run_id)
        gens = getattr(response, "generations", None)
        n_gen = len(gens) if gens is not None else 0
        self._append_span(
            {
                "id": str(uuid4()),
                "parentId": rid,
                "name": "llm:end",
                "startTime": now,
                "endTime": now,
                "attributes": {
                    "kind": "llm",
                    "phase": "end",
                    "generations": n_gen,
                },
            }
        )

    def flush(self, *, clear: bool | None = None) -> None:
        """POST ``/traces/ingest``. Por omissão limpa ``spans`` após sucesso (configurável)."""
        if not self.spans:
            return
        do_clear = self.clear_spans_after_flush if clear is None else clear
        body = json.dumps({"name": self.run_name, "spans": self.spans}).encode("utf-8")
        req = urlrequest.Request(
            f"{self.base_url}/traces/ingest",
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}",
            },
        )
        try:
            with urlrequest.urlopen(req, timeout=60) as resp:
                resp.read()
            if do_clear:
                self.spans = []
        except urlerror.HTTPError as e:
            logger.warning("PromptZero trace ingest HTTP %s: %s", e.code, e.read()[:500])
            raise
        except urlerror.URLError as e:
            logger.warning("PromptZero trace ingest URL error: %s", e)
            raise
