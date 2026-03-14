# GitLab CI

## Quick Start

```yaml
agentlint:
  image: node:20-slim
  script:
    - npx @1devstudio/agentlint audit --url "$SITE_URL" --api-key "$AGENTLINT_API_KEY" --threshold 50
  variables:
    SITE_URL: "https://your-site.com"
```

Add `AGENTLINT_API_KEY` as a CI/CD variable in Settings → CI/CD → Variables.

## JSON Output

```yaml
agentlint:
  script:
    - npx @1devstudio/agentlint audit --url "$SITE_URL" --api-key "$AGENTLINT_API_KEY" --format json > audit.json
  artifacts:
    paths:
      - audit.json
```

## Include Template

Add to your `.gitlab-ci.yml`:

```yaml
include:
  - remote: "https://raw.githubusercontent.com/1devstudio/agentlint-ci/main/gitlab/agentlint.yml"

agentlint:
  variables:
    AGENTLINT_URL: "https://your-site.com"
    AGENTLINT_THRESHOLD: "50"
```
