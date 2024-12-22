const axios = require("axios");
const ncu = require("npm-check-updates");
const cron = require("node-cron");
const fs = require("fs");
require("dotenv").config(); // Load environment variables from .env

// Read the webhook URL from .env
const GOOGLE_CHAT_WEBHOOK = process.env.GOOGLE_CHAT_WEBHOOK;

if (!GOOGLE_CHAT_WEBHOOK) {
  console.error("❌ GOOGLE_CHAT_WEBHOOK not found in .env file");
  process.exit(1);
}

// Path to the dependencies file
const dependenciesFile = "./dependencies.json";

// Load dependencies from the JSON file
function loadDependencies() {
  if (!fs.existsSync(dependenciesFile)) {
    console.error("❌ dependencies.json file not found");
    process.exit(1);
  }
  const data = fs.readFileSync(dependenciesFile, "utf8");
  return JSON.parse(data);
}

// Save updated dependencies to the JSON file
function saveDependencies(updatedDependencies) {
  fs.writeFileSync(
    dependenciesFile,
    JSON.stringify(updatedDependencies, null, 2)
  );
}

// Check for updates
async function checkUpdates() {
  try {
    const dependencies = loadDependencies();

    // Run ncu for the specified dependencies
    const updates = await ncu.run({
      packageData: JSON.stringify({ dependencies }),
      jsonUpgraded: true, // Returns only the updates
    });

    const updatedDependencies = { ...dependencies }; // Copy current dependencies
    const updatesToNotify = [];
    const unchangedDependencies = [];

    for (const [pkg, currentVersion] of Object.entries(dependencies)) {
      const newVersion = updates[pkg];
      if (newVersion) {
        // There is an update for this library
        updatesToNotify.push(`* ${pkg}: ${currentVersion} → ${newVersion}`);
        updatedDependencies[pkg] = newVersion;
      } else {
        // No changes for this library
        unchangedDependencies.push(`* ${pkg}: ${currentVersion}`);
      }
    }

    // Save updated dependencies
    saveDependencies(updatedDependencies);

    if (updatesToNotify.length > 0) {
      // Create the message for Google Chat
      const message = {
        text: `🔄 Updates detected!\n\nUpdated:\n${updatesToNotify.join(
          "\n"
        )}\n\nNo changes:\n${unchangedDependencies.join("\n")}`,
      };

      // Send notification to Google Chat
      await axios.post(GOOGLE_CHAT_WEBHOOK, message);
      console.log("📤 Notification sent to Google Chat");
    } else {
      console.log("✅ No new updates");
    }
  } catch (error) {
    console.error("❌ Error checking updates or sending notification:", error);
  }
}

// Schedule the check every hour
cron.schedule("0 * * * *", () => {
  console.log("⏰ Running update check...");
  checkUpdates();
});

// You can also run the check manually
checkUpdates();
