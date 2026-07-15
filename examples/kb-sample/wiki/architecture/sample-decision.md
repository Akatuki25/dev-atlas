---
id: sample-decision
title: サンプル: proto-first codegen — 手書きは契約とビジネスロジックだけ
type: architecture
status: draft
confidence: medium
---

## TL;DR

単一の `.proto` 契約から backend の DDD 各層と frontend の CRUD UI を生成する。
手書きするのは契約(proto)と、判断が要るビジネスロジック(service/usecase)のみ。

| 生成 | 手書き |
|---|---|
| entity / dto / repository / handler / UI | proto / service / usecase / main |

## 関連

- [[sample-pitfall]]
