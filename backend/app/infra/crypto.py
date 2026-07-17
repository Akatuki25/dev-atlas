"""対称暗号(手書き infra seam)。ユーザーの GitHub PAT など秘密情報を DB に平文で置かない。

Fernet(AES128-CBC + HMAC)。鍵は env `SECRET_ENC_KEY`(Fernet 形式の base64 32byte)。
本番では必ず設定する(Railway shared var)。未設定ならローカル用の固定 dev 鍵に
フォールバックし警告する — dev 鍵で暗号化したものは本番では復号できない。

鍵生成: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
from __future__ import annotations

import base64
import logging
import os

from cryptography.fernet import Fernet, InvalidToken

log = logging.getLogger("mss.crypto")

# ローカル開発用の固定鍵(本番では SECRET_ENC_KEY を必ず設定)。
# 32byte の固定シードから有効な Fernet 鍵を導出する。
_DEV_KEY = base64.urlsafe_b64encode(b"dev-only-fixed-key-32bytes-00000")


def _fernet() -> Fernet:
    key = os.environ.get("SECRET_ENC_KEY")
    if not key:
        log.warning("SECRET_ENC_KEY 未設定。ローカル用 dev 鍵を使用(本番では設定必須)")
        return Fernet(_DEV_KEY)
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt(plaintext: str) -> str:
    if not plaintext:
        return ""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    if not ciphertext:
        return ""
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        # 鍵が変わった/壊れた等。呼び出し側で「未設定」と同義に扱えるよう空を返す。
        log.warning("PAT の復号に失敗(鍵不一致の可能性)")
        return ""
