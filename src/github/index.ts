import * as core from "@actions/core";
import * as github from "@actions/github";
import { buildMarkdown, runAudit, scoreEmoji, CATEGORY_LABELS } from "../core";

async function run(): Promise<void> {
  try {
    const url = core.getInput("url", { required: true });
    const apiKey = core.getInput("api-key", { required: true });
    const threshold = Number.parseInt(core.getInput("threshold") || "0", 10);
    const apiUrl = core.getInput("api-url") || "https://agentlint.io";
    const shouldComment = core.getInput("comment") !== "false";

    core.info(`🔍 Running AgentLint audit on ${url}...`);

    const outcome = await runAudit({ url, apiKey, apiUrl, threshold });
    const { result, reportUrl, passed } = outcome;

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
        const commentBody = buildMarkdown(outcome);

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
    const summary = buildMarkdown(outcome);
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
