# AgentLint GitHub Action

Run [AgentLint.io](https://agentlint.io) AI agent readiness audits in your CI/CD pipeline.

## Usage

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
        uses: 1devstudio/agentlint-action@v1
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
| `api-key` | ✅ | — | AgentLint API key ([get one here](https://agentlint.io/dashboard/settings)) |
| `threshold` | — | `0` | Minimum score to pass (0-100). Fails the step if below. |
| `api-url` | — | `https://agentlint.io` | API base URL (for self-hosted/staging) |
| `comment` | — | `true` | Post results as a PR comment |

## Outputs

| Output | Description |
|---|---|
| `score` | Overall audit score (0-100) |
| `report-url` | Link to the full report |
| `categories` | JSON string of category scores |
| `pass` | Whether the audit passed the threshold (`true`/`false`) |

## PR Comments

When running on `pull_request` events with `comment: true` (default), the action posts a formatted comment with:

- Overall score with pass/fail indicator
- Category breakdown table
- Collapsible lists of failing checks and warnings
- Link to the full report

The comment is updated on subsequent runs (no spam).

Requires `GITHUB_TOKEN` in the environment:

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Threshold Examples

```yaml
# Just report, never fail
- uses: 1devstudio/agentlint-action@v1
  with:
    url: "https://example.com"
    api-key: ${{ secrets.AGENTLINT_API_KEY }}
    threshold: 0

# Fail if score drops below 60
- uses: 1devstudio/agentlint-action@v1
  with:
    url: "https://example.com"
    api-key: ${{ secrets.AGENTLINT_API_KEY }}
    threshold: 60

# Use outputs in subsequent steps
- id: audit
  uses: 1devstudio/agentlint-action@v1
  with:
    url: "https://example.com"
    api-key: ${{ secrets.AGENTLINT_API_KEY }}

- run: echo "Score was ${{ steps.audit.outputs.score }}"
```

## Get an API Key

1. Sign up at [agentlint.io](https://agentlint.io)
2. Go to Dashboard → API Keys
3. Create a key and add it as a repository secret (`AGENTLINT_API_KEY`)

## License

MIT
