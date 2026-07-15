---
id: sample-pitfall
title: サンプル: fork で gh pr create を引数なしで叩くと親リポジトリに PR が作られる
type: pitfall
status: verified
confidence: high
---

## TL;DR

fork リポジトリで `gh pr create` を引数なしで実行すると、PR が fork 元(upstream)に作られる。
`--repo <owner>/<repo>` を明示するか、PreToolUse hook で強制確認を挟む。

## 関連

- [[sample-decision]]
