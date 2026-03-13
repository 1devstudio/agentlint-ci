# GitHub Actions

## Quick Start

```yaml
name: AgentLint Audit
on:
  pull_request:
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Run AgentLint Audit
        uses: 1devstudio/agentlint-ci@v1
        with:
          url: "https://your-site.com"
          api-key: ${{ secrets.AGENTLINT_API_KEY }}
          threshold: 50
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `url` | ✅ | — | URL to audit |
| `api-key` | ✅ | — | AgentLint API key |
| `threshold` | — | `0` | Minimum score to pass (0-100) |
| `api-url` | — | `https://agentlint.io` | API base URL |
| `comment` | — | `true` | Post results as a PR comment |

## Outputs

| Output | Description |
|---|---|
| `score` | Overall audit score (0-100) |
| `report-url` | Link to the full report |
| `categories` | JSON string of category scores |
| `pass` | Whether the audit passed (`true`/`false`) |

## PR Comments

On `pull_request` events, the action posts a formatted comment with category breakdown,
failing checks, and warnings. Updates the existing comment on re-runs.

## Using Outputs

```yaml
- id: audit
  uses: 1devstudio/agentlint-ci@v1
  with:
    url: "https://example.com"
    api-key: ${{ secrets.AGENTLINT_API_KEY }}

- run: |
    echo "Score: ${{ steps.audit.outputs.score }}"
    echo "Passed: ${{ steps.audit.outputs.pass }}"
```
