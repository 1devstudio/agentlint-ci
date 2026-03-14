# CircleCI

## Quick Start

```yaml
version: 2.1

jobs:
  agentlint:
    docker:
      - image: cimg/node:20.0
    steps:
      - run:
          name: AgentLint Audit
          command: npx @1devstudio/agentlint audit --url "$SITE_URL" --api-key "$AGENTLINT_API_KEY" --threshold 50

workflows:
  audit:
    jobs:
      - agentlint
```

Add `AGENTLINT_API_KEY` in Project Settings → Environment Variables.

## JSON Output

```yaml
steps:
  - run:
      name: AgentLint Audit
      command: npx @1devstudio/agentlint audit --url "$SITE_URL" --api-key "$AGENTLINT_API_KEY" --format json > audit.json
  - store_artifacts:
      path: audit.json
```
