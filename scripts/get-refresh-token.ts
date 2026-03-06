/**
 * One-time script to get a Google Ads API refresh token.
 *
 * Usage: npx tsx scripts/get-refresh-token.ts
 *
 * This will:
 * 1. Open a browser for you to sign into the Google account that owns the MCC
 * 2. Ask you to authorize access
 * 3. Redirect to localhost where we capture the auth code
 * 4. Exchange the auth code for a refresh token
 * 5. Print the refresh token for you to paste into .env
 */

import http from "http";
import open from "open";
import "dotenv/config";

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET!;
const REDIRECT_URI = "http://localhost:3001/callback";
const SCOPES = "https://www.googleapis.com/auth/adwords";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GOOGLE_ADS_CLIENT_ID or GOOGLE_ADS_CLIENT_SECRET in .env");
  process.exit(1);
}

// Build the OAuth URL
const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPES);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("\n=== Google Ads Refresh Token Generator ===\n");
console.log("Opening browser for authorization...\n");
console.log("If the browser doesn't open, visit this URL manually:");
console.log(authUrl.toString());
console.log("");

// Start a temporary server to catch the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:3001`);

  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<h1>Error: ${error}</h1><p>You can close this window.</p>`);
      console.error(`Authorization error: ${error}`);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>No code received</h1><p>You can close this window.</p>");
      server.close();
      process.exit(1);
    }

    // Exchange code for tokens
    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.refresh_token) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<h1>Success!</h1><p>Refresh token obtained. You can close this window and go back to your terminal.</p>"
        );

        console.log("✅ Success! Here is your refresh token:\n");
        console.log(tokens.refresh_token);
        console.log("\nAdd this to your .env file as:");
        console.log(`GOOGLE_ADS_REFRESH_TOKEN="${tokens.refresh_token}"`);
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          `<h1>Error</h1><pre>${JSON.stringify(tokens, null, 2)}</pre><p>You can close this window.</p>`
        );
        console.error("No refresh token in response:", tokens);
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`<h1>Error exchanging code</h1><pre>${err}</pre>`);
      console.error("Error exchanging code:", err);
    }

    server.close();
  }
});

server.listen(3001, async () => {
  try {
    await open(authUrl.toString());
  } catch {
    // open() might fail in some environments, that's ok — URL is already printed
  }
});
