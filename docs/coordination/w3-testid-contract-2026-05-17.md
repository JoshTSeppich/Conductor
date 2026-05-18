# W3 conductor-chat testid contract — 2026-05-17

Frozen testid surface for parallel W3 sessions. Operator-arbitrated. CC sessions do NOT modify.

## SHELL (WB1 — shipped d0a96bf)
- conductor-chat-root / -header / -thread / -composer

## MESSAGE ROLES (WB2 — gen-7 W3)
- conductor-message-user / -user-bubble
- conductor-message-assistant / -assistant-mark / -assistant-body
- conductor-message-dispatch / -rule / -badge / -step / -arrow / -target / -task
- conductor-message-system / -system-dot
- conductor-message-typing / -typing-dot / -typing-label

## COMPOSER (WB3 — operator-CC)
- conductor-composer-paperclip / -textarea / -send
- conductor-composer-buildmd-chip (placeholder; gen-7 ships real body in build-md-chip.tsx)
- conductor-composer-dispatch-next

## HEADER (WB4 — operator-CC)
- conductor-header-brand / -filename-pill
- conductor-header-pause / -resume / -cancel

## TERRITORY DISJOINT
operator-CC: src/conductor-chat/composer.tsx + header.tsx + probe-03 + probe-04
gen-7 W3: src/conductor-chat/conductor-message.tsx + build-md-chip.tsx + mount.ts + index.ts + probe-02 + probe-05 + probe-06 + probe-07

## CROSS-SESSION NOTE
docs/coordination/w3-cross-session-2026-05-17.md — append one line per commit: TIMESTAMP | SESSION | SHA | FILE

## DISCIPLINE
- Per-path git add only; NEVER git add -A
- Pre-stage git status --short before every commit
- Per-commit-push immediately after commit
- If push gets non-fast-forward: git pull --rebase, re-verify staged scope, re-push
