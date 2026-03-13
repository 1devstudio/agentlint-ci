# Bitbucket Pipelines

## Quick Start

```yaml
pipelines:
  default:
    - step:
        name: AgentLint Audit
        image: node:20-slim
        script:
          - npx agentlint-ci audit --url "$SITE_URL" --api-key "$AGENTLINT_API_KEY" --threshold 50
```

Add `AGENTLINT_API_KEY` as a repository variable in Repository Settings → Pipelines → Variables.

## JSON Output

```yaml
- step:
    name: AgentLint Audit
    script:
      - npx agentlint-ci audit --url "$SITE_URL" --api-key "$AGENTLINT_API_KEY" --format json > audit.json
    artifacts:
      - audit.json
```
