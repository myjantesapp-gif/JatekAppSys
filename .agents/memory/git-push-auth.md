---
name: GitHub push auth
description: How to push to the GitHub remote for this repl without leaking the token.
---

## Rule
Push with the token passed as an HTTP header, never embedded in the remote URL:
`GIT_TERMINAL_PROMPT=0 git -c "http.https://github.com.extraheader=Authorization: Basic $(printf 'x-access-token:%s' "$GIT_TOKEN" | base64 -w 0)" push origin main`

**Why:** The `gitPush` callback fails (no Replit GitHub connection), and embedding `$GIT_TOKEN` in the remote URL both leaks the token into shell output and breaks Replit's askpass helper. The header approach works cleanly. The user supplies the token via the `GIT_TOKEN` secret.

**How to apply:** Any time the user asks to sync/push to GitHub. Keep `origin` set to the clean URL `https://github.com/myjantesapp-gif/JatekAppSys.git`. The user's own pushes from the Git pane fail with auth errors — pushes must go through the agent with this command until they connect GitHub to Replit.
