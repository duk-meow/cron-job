import cron from "node-cron";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

function updateFile() {
  const date = new Date();
  const formattedDate = date.toISOString();
  fs.writeFile("date.txt", `Last run: ${formattedDate}\n`, (err) => {
    if (err) {
      console.error("❌ Error writing to file:", err);
    } else {
      console.log("📄 File updated successfully");
      pushToGit(formattedDate);
    }
  });
}

async function pushToGit(formattedDate) {
  const message = `chore: automated update - ${formattedDate}`;
  console.log("🔄 Starting Git operations...");

  try {
    // Configure git identity as duk-meow
    await execPromise(
      'git config user.name "duk-meow" && git config user.email "insanetomm@gmail.com"'
    );
    console.log("✅ Git identity configured as duk-meow");

    // Git add
    await execPromise("git add .");
    console.log("✅ Git add successful");

    // Git commit
    try {
      const { stdout: commitOutput } = await execPromise(
        `git commit -m "${message}"`
      );
      console.log("✅ Git commit successful:", commitOutput.trim());
    } catch (commitError) {
      if (
        commitError.message.includes("nothing to commit") ||
        commitError.stderr?.includes("nothing to commit")
      ) {
        console.log("ℹ️ No changes to commit");
        return;
      }
      throw commitError;
    }

    // Pull with rebase before pushing to avoid conflicts
    try {
      await execPromise("git pull --rebase origin main");
      console.log("✅ Git pull successful");
    } catch (pullError) {
      console.log("⚠️ Pull not needed or already up to date");
    }

    // Git push
    const { stdout: pushOutput } = await execPromise("git push origin main");
    console.log("🚀 Git push complete!");
    console.log("Push output:", pushOutput);

  } catch (error) {
    console.error("❌ Git operation failed:", error.message);
    if (error.stderr) {
      console.error("Error details:", error.stderr);
    }
  }
}

// Configure git identity on startup
async function initializeGit() {
  try {
    await execPromise(
      'git config user.name "duk-meow" && git config user.email "insanetomm@gmail.com"'
    );
    console.log("✅ Git identity initialized as duk-meow");
  } catch (error) {
    console.error("❌ Failed to initialize git:", error.message);
  }
}

// Initialize git config when server starts
await initializeGit();

// Schedule the cron job
console.log("🚀 GitCron started - Running every minute");
console.log("📧 Commits will be made by: duk-meow <insanetomm@gmail.com>");

cron.schedule("* * * * *", () => {
  console.log("⏰ Running scheduled task...");
  updateFile();
});
