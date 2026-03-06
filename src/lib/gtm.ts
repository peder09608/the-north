import { google } from "googleapis";

const GTM_ACCOUNT_ID = process.env.GTM_ACCOUNT_ID || "";

/**
 * Get authenticated Tag Manager client using service account credentials.
 */
function getTagManagerClient() {
  const keyJson = process.env.GTM_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    throw new Error("GTM_SERVICE_ACCOUNT_KEY environment variable is not set");
  }

  const credentials = JSON.parse(keyJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/tagmanager.edit.containers",
      "https://www.googleapis.com/auth/tagmanager.readonly",
    ],
  });

  return google.tagmanager({ version: "v2", auth });
}

/**
 * Create a GTM container for a client under the parent GTM account.
 * Returns the container details including the public ID (GTM-XXXXXXX).
 */
export async function createGtmContainer(clientName: string): Promise<{
  accountId: string;
  containerId: string;
  publicId: string;
}> {
  if (!GTM_ACCOUNT_ID) {
    throw new Error("GTM_ACCOUNT_ID environment variable is not set");
  }

  const tagmanager = getTagManagerClient();

  const response = await tagmanager.accounts.containers.create({
    parent: `accounts/${GTM_ACCOUNT_ID}`,
    requestBody: {
      name: clientName,
      usageContext: ["web"],
    },
  });

  const container = response.data;

  if (!container.containerId || !container.publicId) {
    throw new Error("GTM container creation returned incomplete data");
  }

  return {
    accountId: GTM_ACCOUNT_ID,
    containerId: container.containerId,
    publicId: container.publicId,
  };
}

/**
 * Get the install snippet for a GTM container.
 * Returns the head (<script>) and body (<noscript>) snippets.
 */
export async function getContainerSnippet(
  containerId: string
): Promise<{ head: string; body: string }> {
  if (!GTM_ACCOUNT_ID) {
    throw new Error("GTM_ACCOUNT_ID environment variable is not set");
  }

  const tagmanager = getTagManagerClient();

  // The snippet endpoint returns the install code
  const response = await tagmanager.accounts.containers.snippet({
    path: `accounts/${GTM_ACCOUNT_ID}/containers/${containerId}`,
  });

  const snippet = response.data.snippet || "";

  // The snippet comes as a single string with both head and body parts.
  // Split into head (<script>) and body (<noscript>) portions.
  const headMatch = snippet.match(
    /<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/
  );
  const bodyMatch = snippet.match(
    /<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/
  );

  return {
    head: headMatch?.[0] || snippet,
    body: bodyMatch?.[0] || "",
  };
}

/**
 * Create a GTM container and fetch its install snippet in one call.
 * This is the main function used during onboarding.
 */
export async function provisionGtmContainer(clientName: string): Promise<{
  accountId: string;
  containerId: string;
  publicId: string;
  snippetHead: string;
  snippetBody: string;
}> {
  const container = await createGtmContainer(clientName);
  const snippet = await getContainerSnippet(container.containerId);

  return {
    ...container,
    snippetHead: snippet.head,
    snippetBody: snippet.body,
  };
}
