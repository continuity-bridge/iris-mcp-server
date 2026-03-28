/**
 * Test Script: Google Drive Operations
 * Tests file creation, folder creation, and file moving
 */

import "dotenv/config";
import { google } from "googleapis";
import { getTokenStore } from "./dist/oauth/token-store.js";

const FEANNOG_FOLDER_ID = "1nvOE5pcR2-OhMiTfqMPmlIgDaAyaiKCU";

async function getDriveClient() {
  const tokenStore = getTokenStore();
  const userId = "ohmytallest@gmail.com";
  
  const credentials = tokenStore.getCredentials(userId);
  if (!credentials) {
    throw new Error("No credentials found for " + userId);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
    expiry_date: credentials.expiryDate,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

async function testDriveOperations() {
  console.log("🌈 Testing Google Drive Operations...\n");

  const drive = await getDriveClient();

  // Step 1: Create a test file in Feannog folder
  console.log("📝 Step 1: Creating test file...");
  const fileMetadata = {
    name: "OAuth-Test-File.txt",
    parents: [FEANNOG_FOLDER_ID],
  };
  const media = {
    mimeType: "text/plain",
    body: "This is a test file created via OAuth on " + new Date().toISOString() + "\n\nIris OAuth Dashboard is working! 🎉",
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, name, webViewLink",
  });

  console.log("✅ Created file:", file.data.name);
  console.log("   File ID:", file.data.id);
  console.log("   Link:", file.data.webViewLink);

  // Step 2: Create a subfolder
  console.log("\n📁 Step 2: Creating subfolder...");
  const folderMetadata = {
    name: "Test-Subfolder",
    mimeType: "application/vnd.google-apps.folder",
    parents: [FEANNOG_FOLDER_ID],
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: "id, name, webViewLink",
  });

  console.log("✅ Created folder:", folder.data.name);
  console.log("   Folder ID:", folder.data.id);
  console.log("   Link:", folder.data.webViewLink);

  // Step 3: Move file into subfolder
  console.log("\n🚚 Step 3: Moving file to subfolder...");
  const movedFile = await drive.files.update({
    fileId: file.data.id,
    addParents: folder.data.id,
    removeParents: FEANNOG_FOLDER_ID,
    fields: "id, name, parents, webViewLink",
  });

  console.log("✅ Moved file:", movedFile.data.name);
  console.log("   New parent:", movedFile.data.parents[0]);
  console.log("   Link:", movedFile.data.webViewLink);

  console.log("\n🎉 ALL TESTS PASSED!");
  console.log("\nResults:");
  console.log("- Created file: OAuth-Test-File.txt");
  console.log("- Created folder: Test-Subfolder");
  console.log("- Moved file into subfolder");
  console.log("\nCheck your Feannog folder in Google Drive!");
}

testDriveOperations().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
