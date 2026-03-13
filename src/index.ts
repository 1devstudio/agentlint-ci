import * as core from "@actions/core";
import * as github from "@actions/github";

interface AuditCategory {
  score: number;
  label: string;
  findings: Array<{
    status: "pass" | "warn" | "fail";
    title: string;
    description: string;
  }>;
}

interface AuditResult {
  url: string;
  overallScore: number;
  categories: {
    crawlerAccess: AuditCategory;
    markdownLlms: AuditCategory;
    structuredData: AuditCategory;
    rendering: AuditCategory;
    tokenEfficiency: AuditCategory;
  };
  recommendations: Array<{
    priority: string;
    title: string;
    description: string;
  }>;
  meta: {
    framework: string | null;
    renderType: string;
    htmlSize: number;
    fetchTimeMs: number;
  };
}

interface ApiResponse {
  success: boolean;
  reportId: string;
  result: AuditResult;
  error?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  crawlerAccess: "Crawler Access",
  markdownLlms: "Markdown & LLMs",
  structuredData: "Structured Data",
  rendering: "Rendering",
  tokenEfficiency: "Token Efficiency",
};

function scoreEmoji(score: number): string {
  if (score >= 70) return "🟢";
  if (score >= 40) return "🟡";
  return "🔴";
}

function statusIcon(status: string): string {
  if (status === "pass") return "✅";
  if (status === "warn") return "⚠️";
  return "❌";
}

function buildMarkdownComment(
  result: AuditResult,
  reportUrl: string,
  threshold: number,
  passed: boolean
): string {
  const { overallScore, categories, meta } = result;
  const emoji = scoreEmoji(overallScore);

  let md = `## ${emoji} AgentLint Audit — ${overallScore}/100\n\n`;

  if (!passed) {
    md += `> ⛔ **Score ${overallScore} is below the threshold of ${threshold}**\n\n`;
  }

  // Meta info
  const metaParts = [
    `**URL:** \`${result.url}\``,
    meta.framework && `**Framework:** ${meta.framework}`,
    `**Render:** ${meta.renderType}`,
    `**Size:** ${(meta.htmlSize / 1024).toFixed(1)}KB`,
    `**Fetch:** ${meta.fetchTimeMs}ms`,
  ].filter(Boolean);
  md += `${metaParts.join(" · ")}\n\n`;

  // Category scores table
  md += "| Category | Score | Pass | Warn | Fail |\n";
  md += "|---|:---:|:---:|:---:|:---:|\n";

  for (const [key, cat] of Object.entries(categories)) {
    const label = CATEGORY_LABELS[key] || key;
    const passes = cat.findings.filter((f) => f.status === "pass").length;
    const warns = cat.findings.filter((f) => f.status === "warn").length;
    const fails = cat.findings.filter((f) => f.status === "fail").length;
    md += `| ${label} | ${scoreEmoji(cat.score)} ${cat.score} | ${passes} | ${warns} | ${fails} |\n`;
  }

  md += "\n";

  // Failing checks
  const failingChecks: string[] = [];
  for (const [key, cat] of Object.entries(categories)) {
    for (const finding of cat.findings) {
      if (finding.status === "fail") {
        failingChecks.push(
          `- ${statusIcon(finding.status)} **${finding.title}** — ${finding.description}`
        );
      }
    }
  }

  if (failingChecks.length > 0) {
    md += `<details>\n<summary>❌ ${failingChecks.length} failing check${failingChecks.length > 1 ? "s" : ""}</summary>\n\n`;
    md += `${failingChecks.join("\n")}\n`;
    md += "\n</details>\n\n";
  }

  // Warnings
  const warningChecks: string[] = [];
  for (const cat of Object.values(categories)) {
    for (const finding of cat.findings) {
      if (finding.status === "warn") {
        warningChecks.push(
          `- ${statusIcon(finding.status)} **${finding.title}** — ${finding.description}`
        );
      }
    }
  }

  if (warningChecks.length > 0) {
    md += `<details>\n<summary>⚠️ ${warningChecks.length} warning${warningChecks.length > 1 ? "s" : ""}</summary>\n\n`;
    md += `${warningChecks.join("\n")}\n`;
    md += "\n</details>\n\n";
  }

  md += `[📄 Full Report](${reportUrl})\n\n`;
  md += `---\n*Audited by [AgentLint.io](https://agentlint.io)*`;

  return md;
}

async function run(): Promise<void> {
  try {
    const url = core.getInput("url", { required: true });
    const apiKey = core.getInput("api-key", { required: true });
    const threshold = Number.parseInt(core.getInput("threshold") || "0", 10);
    const apiUrl = core.getInput("api-url") || "https://agentlint.io";
    const shouldComment = core.getInput("comment") !== "false";

    core.info(`🔍 Running AgentLint audit on ${url}...`);

    // Call the API
    const response = await fetch(`${apiUrl}/api/audit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMsg =
        (errorBody as { error?: string }).error ||
        `API returned ${response.status}`;
      core.setFailed(`AgentLint API error: ${errorMsg}`);
      return;
    }

    const data = (await response.json()) as ApiResponse;

    if (!data.success || !data.result) {
      core.setFailed(`Audit failed: ${data.error || "Unknown error"}`);
      return;
    }

    const { result, reportId } = data;
    const reportUrl = `${apiUrl}/report/${reportId}`;
    const passed = result.overallScore >= threshold;

    // Set outputs
    core.setOutput("score", result.overallScore.toString());
    core.setOutput("report-url", reportUrl);
    core.setOutput(
      "categories",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(result.categories).map(([k, v]) => [k, v.score])
        )
      )
    );
    core.setOutput("pass", passed.toString());

    // Log summary
    core.info(`\n📊 Score: ${result.overallScore}/100`);
    for (const [key, cat] of Object.entries(result.categories)) {
      core.info(
        `  ${scoreEmoji(cat.score)} ${CATEGORY_LABELS[key] || key}: ${cat.score}/100`
      );
    }
    core.info(`\n📄 Report: ${reportUrl}`);

    // Post PR comment if enabled and in a PR context
    if (shouldComment && github.context.payload.pull_request) {
      const token = process.env.GITHUB_TOKEN;
      if (token) {
        const octokit = github.getOctokit(token);
        const prNumber = github.context.payload.pull_request.number;
        const commentBody = buildMarkdownComment(
          result,
          reportUrl,
          threshold,
          passed
        );

        // Find existing AgentLint comment to update (avoid spam)
        const { data: comments } = await octokit.rest.issues.listComments({
          ...github.context.repo,
          issue_number: prNumber,
          per_page: 50,
        });

        const existingComment = comments.find(
          (c) =>
            c.user?.login === "github-actions[bot]" &&
            c.body?.includes("AgentLint Audit")
        );

        if (existingComment) {
          await octokit.rest.issues.updateComment({
            ...github.context.repo,
            comment_id: existingComment.id,
            body: commentBody,
          });
          core.info("📝 Updated existing PR comment");
        } else {
          await octokit.rest.issues.createComment({
            ...github.context.repo,
            issue_number: prNumber,
            body: commentBody,
          });
          core.info("📝 Posted PR comment");
        }
      } else {
        core.warning(
          "GITHUB_TOKEN not available — skipping PR comment. Add `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` to your workflow."
        );
      }
    }

    // Write job summary
    const summary = buildMarkdownComment(
      result,
      reportUrl,
      threshold,
      passed
    );
    await core.summary.addRaw(summary).write();

    // Fail if below threshold
    if (!passed) {
      core.setFailed(
        `AgentLint score ${result.overallScore} is below the threshold of ${threshold}`
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    core.setFailed(`AgentLint action failed: ${message}`);
  }
}

run();
