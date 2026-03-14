# @1devstudio/agentlint

Run [AgentLint.io](https://agentlint.io) AI agent readiness audits in any CI/CD pipeline.

## Platform Guides

| Platform | Integration | Docs |
|---|---|---|
| **GitHub Actions** | Native action with PR comments | [docs/github.md](docs/github.md) |
| **GitLab CI** | CLI via `npx` | [docs/gitlab.md](docs/gitlab.md) |
| **CircleCI** | CLI via `npx` | [docs/circleci.md](docs/circleci.md) |
| **Bitbucket Pipelines** | CLI via `npx` | [docs/bitbucket.md](docs/bitbucket.md) |

## GitHub Actions

```yaml
- uses: 1devstudio/agentlint-ci@v1
  with:
    url: "https://your-site.com"
    api-key: ${{ secrets.AGENTLINT_API_KEY }}
    threshold: 50
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## CLI (GitLab, CircleCI, Bitbucket, anything else)

```bash
npx @1devstudio/agentlint audit --url https://your-site.com --api-key $AGENTLINT_API_KEY --threshold 50
```

### CLI Options

```
--url <url>          URL to audit (required)
--api-key <key>      API key (or set AGENTLINT_API_KEY env var)
--threshold <n>      Minimum score to pass (default: 0)
--api-url <url>      API base URL (default: https://agentlint.io)
--format <fmt>       Output: text, json, markdown (default: text)
```

Exit code `1` if score < threshold or on error.

### Output Formats

**Text** (default) — human-readable summary:
```
AgentLint Audit — 72/100
URL: https://example.com
Framework: Next.js · Render: SSR · Size: 42.1KB · Fetch: 340ms

  ✔ Crawler Access: 90/100
  ⚠ Markdown & LLMs: 60/100
  ✔ Structured Data: 85/100
  ✔ Rendering: 70/100
  ✘ Token Efficiency: 55/100

Report: https://agentlint.io/report/abc123
```

**JSON** (`--format json`) — machine-readable for scripting:
```json
{
  "score": 72,
  "passed": true,
  "threshold": 50,
  "reportUrl": "https://agentlint.io/report/abc123",
  "categories": { "crawlerAccess": 90, "markdownLlms": 60, ... }
}
```

**Markdown** (`--format markdown`) — for posting to PRs/issues.

## Get an API Key

1. Sign up at [agentlint.io](https://agentlint.io)
2. Go to Dashboard → API Keys
3. Create a key and add it as a CI secret

## License

MIT
