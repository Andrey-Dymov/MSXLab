# AI setup

[Русский](AI.ru.md)

AI assistance is optional. A new installation starts with AI disabled and no provider, models, or key configured. No account or API key is supplied with MSXLab.

## Quick setup

1. Obtain your own API key and a supported model ID from a provider offering an HTTPS **Chat Completions-compatible API**.
2. Open **Workspace settings → AI**.
3. Enter the API **base URL**, for example `https://api.example.com/v1`. Do not append `/chat/completions`: MSXLab adds it.
4. Enter the exact model ID supplied by your provider. Optional fallback models go on separate lines, in priority order.
5. Enter your API key in the password field, enable AI, and save.
6. Select instructions in the disassembler and choose the AI analysis action. Review the proposed description before saving it as a comment.

Requests use **your provider account** and may incur its API charges. MSXLab does not sign in with the author's account or share an AI subscription. Saving settings does not send a test request. The provider must support the request/response format used by Chat Completions; this is not a connector for arbitrary AI websites.

## What is sent

Analysis sends the selected instruction text and relevant context: label names, descriptions/comments, addresses, numeric operands, and memory-scope information. A system prompt asks for a short Z80 description in the interface language. The whole project, ROM, and execution history are not automatically uploaded. Generated text is not saved to the project until you confirm it.

## Where settings and keys live

Settings are kept in `ai.json` inside Electron's per-user `userData` directory, outside the repositories. Typical locations for this application are:

- macOS: `~/Library/Application Support/msxlab/`
- Windows: `%APPDATA%/msxlab/`
- Linux: `~/.config/msxlab/`

A custom `MSXLAB_USER_DATA` directory overrides the normal location.

Newly entered keys are encrypted using Electron `safeStorage` and stored alongside settings. They are bound to the exact normalized API base URL. Changing the URL does not forward the saved key to the new endpoint. Leave the password field blank to keep the existing key; enter a new key to replace it. The UI receives only key-presence status, never the saved key or ciphertext. Do not share even encrypted settings files.

Encryption depends on the operating system's secret store. If it is unavailable, or Linux uses the unprotected `basic_text` backend, MSXLab refuses to save a new key. See [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage) for platform details. Moving the file to another computer may require entering the key again.

## Environment-variable alternative

You can supply `MSXLAB_AI_API_KEY` and `MSXLAB_AI_BASE_URL` to the process that launches Electron. The URL must match the configured API base URL. Use your own secret-management method; do not put real keys in shell commands committed to Git or in screenshots. A matching saved encrypted key takes precedence. An already running app must be restarted to receive changed environment variables.

Existing installations using `WAVESPEED_API_KEY` or the corresponding field in local `ai-secrets.json` remain compatible **only for `https://llm.wavespeed.ai/v1`**. They are not defaults for new users. Legacy plaintext files are not silently migrated or deleted; entering the key through Settings creates an encrypted replacement used in preference to the legacy key.

## Troubleshooting

- Missing key: enter your own key for the configured URL and save.
- HTTP 401/403: check the key, account permissions, and model access.
- HTTP 404: check the base URL and model ID.
- HTTP 429: check your provider's quota. Configured fallback models are tried for 429 and selected server errors.
- Cannot unlock a saved key: enter it again through Settings on this machine.
- Redirects are rejected; use the final API base URL supplied by your provider.

Keys, local settings, `.env` files, and `.msxlab-runtime.json` are excluded from Git. No live provider calls are required for the automated configuration tests.
