// ── Types ────────────────────────────────────────────────────────────────

export interface AuditCategory {
  score: number;
  label: string;
  findings: Array<{
    status: "pass" | "warn" | "fail";
    title: string;
    description: string;
  }>;
}

export interface AuditResult {
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

export interface ApiResponse {
  success: boolean;
  reportId: string;
  result: AuditResult;
  error?: string;
}

export interface AuditOptions {
  url: string;
  apiKey: string;
  apiUrl?: string;
  threshold?: number;
}

export interface AuditOutcome {
  result: AuditResult;
  reportId: string;
  reportUrl: string;
  passed: boolean;
  threshold: number;
}

// ── Constants ────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  crawlerAccess: "Crawler Access",
  markdownLlms: "Markdown & LLMs",
  structuredData: "Structured Data",
  rendering: "Rendering",
  tokenEfficiency: "Token Efficiency",
};

// ── Helpers ──────────────────────────────────────────────────────────────

export function scoreEmoji(score: number): string {
  if (score >= 70) return "🟢";
  if (score >= 40) return "🟡";
  return "🔴";
}

export function statusIcon(status: string): string {
  if (status === "pass") return "✅";
  if (status === "warn") return "⚠️";
  return "❌";
}

// ── API Call ─────────────────────────────────────────────────────────────

export async function runAudit(options: AuditOptions): Promise<AuditOutcome> {
  const { url, apiKey, apiUrl = "https://agentlint.io", threshold = 0 } = options;

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
    throw new Error(errorMsg);
  }

  const data = (await response.json()) as ApiResponse;

  if (!data.success || !data.result) {
    throw new Error(data.error || "Audit failed with unknown error");
  }

  const reportUrl = `${apiUrl}/report/${data.reportId}`;
  const passed = data.result.overallScore >= threshold;

  return {
    result: data.result,
    reportId: data.reportId,
    reportUrl,
    passed,
    threshold,
  };
}

// ── Markdown Output ─────────────────────────────────────────────────────

export function buildMarkdown(outcome: AuditOutcome): string {
  const { result, reportUrl, threshold, passed } = outcome;
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
  for (const cat of Object.values(categories)) {
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

// ── Plain Text Output (for CLI) ─────────────────────────────────────────

export function buildPlainText(outcome: AuditOutcome): string {
  const { result, reportUrl, threshold, passed } = outcome;
  const { overallScore, categories, meta } = result;

  const lines: string[] = [];

  lines.push(`AgentLint Audit — ${overallScore}/100`);
  lines.push(`URL: ${result.url}`);

  const metaParts = [
    meta.framework && `Framework: ${meta.framework}`,
    `Render: ${meta.renderType}`,
    `Size: ${(meta.htmlSize / 1024).toFixed(1)}KB`,
    `Fetch: ${meta.fetchTimeMs}ms`,
  ].filter(Boolean);
  lines.push(metaParts.join(" · "));
  lines.push("");

  // Category scores
  for (const [key, cat] of Object.entries(categories)) {
    const label = CATEGORY_LABELS[key] || key;
    const fails = cat.findings.filter((f) => f.status === "fail").length;
    const warns = cat.findings.filter((f) => f.status === "warn").length;
    const indicator = fails > 0 ? "✘" : warns > 0 ? "⚠" : "✔";
    lines.push(`  ${indicator} ${label}: ${cat.score}/100`);
  }

  lines.push("");

  // Failing checks
  const failingChecks: string[] = [];
  for (const cat of Object.values(categories)) {
    for (const finding of cat.findings) {
      if (finding.status === "fail") {
        failingChecks.push(`  ✘ ${finding.title} — ${finding.description}`);
      }
    }
  }
  if (failingChecks.length > 0) {
    lines.push(`Failing checks (${failingChecks.length}):`);
    lines.push(...failingChecks);
    lines.push("");
  }

  lines.push(`Report: ${reportUrl}`);

  if (!passed) {
    lines.push("");
    lines.push(
      `FAILED: Score ${overallScore} is below threshold ${threshold}`
    );
  }

  return lines.join("\n");
}

// ── JSON Output (for scripting) ─────────────────────────────────────────

export function buildJsonOutput(outcome: AuditOutcome): string {
  return JSON.stringify(
    {
      score: outcome.result.overallScore,
      passed: outcome.passed,
      threshold: outcome.threshold,
      reportUrl: outcome.reportUrl,
      reportId: outcome.reportId,
      url: outcome.result.url,
      categories: Object.fromEntries(
        Object.entries(outcome.result.categories).map(([k, v]) => [k, v.score])
      ),
      meta: outcome.result.meta,
    },
    null,
    2
  );
}
