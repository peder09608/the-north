import { GoogleAdsApi, enums, toMicros, MutateOperation, ResourceNames } from "google-ads-api";

// ─── Client Initialization (lazy) ────────────────────────────

let _client: GoogleAdsApi | null = null;

function getClient(): GoogleAdsApi {
  if (!_client) {
    if (!process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET || !process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
      throw new Error("Google Ads API credentials are not set");
    }
    _client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });
  }
  return _client;
}

function getMccId(): string {
  if (!process.env.GOOGLE_ADS_MCC_CUSTOMER_ID) {
    throw new Error("GOOGLE_ADS_MCC_CUSTOMER_ID is not set");
  }
  return process.env.GOOGLE_ADS_MCC_CUSTOMER_ID;
}

function getRefreshToken(): string {
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    throw new Error("GOOGLE_ADS_REFRESH_TOKEN is not set");
  }
  return process.env.GOOGLE_ADS_REFRESH_TOKEN;
}

/**
 * Get a Customer instance for the MCC manager account.
 */
export function getMccCustomer() {
  return getClient().Customer({
    customer_id: getMccId(),
    refresh_token: getRefreshToken(),
  });
}

/**
 * Get a Customer instance for a specific child account under the MCC.
 */
export function getChildCustomer(childCustomerId: string) {
  return getClient().Customer({
    customer_id: childCustomerId,
    refresh_token: getRefreshToken(),
    login_customer_id: getMccId(),
  });
}

// ─── Account Creation ───────────────────────────────────────

export interface CreateAccountInput {
  businessName: string;
  currencyCode?: string;
  timeZone?: string;
}

/**
 * Create a new Google Ads customer account under the MCC.
 * Returns the new customer ID (no dashes).
 */
export async function createChildAccount(input: CreateAccountInput): Promise<string> {
  const manager = getMccCustomer();

  const response = await manager.customers.createCustomerClient({
    customer_id: getMccId(),
    customer_client: {
      descriptive_name: input.businessName,
      currency_code: input.currencyCode || "USD",
      time_zone: input.timeZone || "America/New_York",
    },
  } as any);

  // Extract customer ID from resource name "customers/1234567890"
  const resourceName = response.resource_name!;
  const customerId = resourceName.split("/").pop()!;
  return customerId;
}

// ─── Campaign Creation ──────────────────────────────────────

export interface CampaignSetupInput {
  customerId: string;
  campaignName: string;
  dailyBudgetDollars: number;
  keywords: string[];
  negativeKeywords: string[];
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
  phoneNumber?: string;
  targetLocations?: string[]; // geo target constant resource names
}

/**
 * Create a full search campaign setup:
 * Budget → Campaign → Ad Group → Keywords → Responsive Search Ad
 */
export async function createSearchCampaign(input: CampaignSetupInput) {
  const customer = getChildCustomer(input.customerId);
  const cid = input.customerId;

  // Step 1: Create budget + campaign atomically
  const budgetTempId = "-1";
  const campaignTempId = "-2";

  const budgetResourceName = ResourceNames.campaignBudget(cid, budgetTempId);
  const campaignResourceName = ResourceNames.campaign(cid, campaignTempId);

  const campaignOps: MutateOperation<
    | { _resource: "CampaignBudget"; _operation: "create" }
    | { _resource: "Campaign"; _operation: "create" }
  >[] = [
    {
      entity: "campaign_budget",
      operation: "create",
      resource: {
        resource_name: budgetResourceName,
        name: `${input.campaignName} Budget`,
        delivery_method: enums.BudgetDeliveryMethod.STANDARD,
        amount_micros: toMicros(input.dailyBudgetDollars),
      },
    } as any,
    {
      entity: "campaign",
      operation: "create",
      resource: {
        name: input.campaignName,
        advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
        status: enums.CampaignStatus.PAUSED, // Start paused, enable after review
        manual_cpc: { enhanced_cpc_enabled: true },
        campaign_budget: budgetResourceName,
        network_settings: {
          target_google_search: true,
          target_search_network: true,
          target_content_network: false,
        },
      },
    } as any,
  ];

  const campaignResult = await customer.mutateResources(campaignOps);

  // Extract campaign ID from response
  const campaignResponse = campaignResult.mutate_operation_responses?.[1];
  const campaignRN =
    campaignResponse?.campaign_result?.resource_name ||
    campaignResult.mutate_operation_responses?.[1]?.campaign_result?.resource_name;

  const campaignId = campaignRN?.split("/").pop() || "";

  // Step 2: Create ad group
  const adGroupTempId = "-3";
  const adGroupResourceName = ResourceNames.adGroup(cid, adGroupTempId);

  const adGroupOps: MutateOperation<any>[] = [
    {
      entity: "ad_group",
      operation: "create",
      resource: {
        resource_name: adGroupResourceName,
        name: `${input.campaignName} - Ad Group`,
        campaign: ResourceNames.campaign(cid, campaignId),
        status: enums.AdGroupStatus.ENABLED,
        type: enums.AdGroupType.SEARCH_STANDARD,
        cpc_bid_micros: toMicros(2.0), // Default $2 max CPC
      },
    },
  ];

  const adGroupResult = await customer.mutateResources(adGroupOps);
  const adGroupId =
    adGroupResult.mutate_operation_responses?.[0]?.ad_group_result?.resource_name
      ?.split("/")
      .pop() || "";

  const adGroupRN = ResourceNames.adGroup(cid, adGroupId);

  // Step 3: Create keywords
  const keywordOps: MutateOperation<any>[] = input.keywords.map((text) => ({
    entity: "ad_group_criterion",
    operation: "create",
    resource: {
      ad_group: adGroupRN,
      status: enums.AdGroupCriterionStatus.ENABLED,
      keyword: {
        text,
        match_type: enums.KeywordMatchType.PHRASE,
      },
    },
  }));

  if (keywordOps.length > 0) {
    await customer.mutateResources(keywordOps);
  }

  // Step 4: Create negative keywords at campaign level
  if (input.negativeKeywords.length > 0) {
    const negativeOps: MutateOperation<any>[] = input.negativeKeywords.map(
      (text) => ({
        entity: "campaign_criterion",
        operation: "create",
        resource: {
          campaign: ResourceNames.campaign(cid, campaignId),
          negative: true,
          keyword: {
            text,
            match_type: enums.KeywordMatchType.BROAD,
          },
        },
      })
    );
    await customer.mutateResources(negativeOps);
  }

  // Step 5: Create responsive search ad
  // Ensure we have at least 3 headlines and 2 descriptions
  const headlines = input.headlines.slice(0, 15).map((text) => ({ text }));
  const descriptions = input.descriptions.slice(0, 4).map((text) => ({ text }));

  // Pad if needed
  while (headlines.length < 3) {
    headlines.push({ text: `${input.campaignName} - Contact Us` });
  }
  while (descriptions.length < 2) {
    descriptions.push({ text: `Learn more at ${input.finalUrl}` });
  }

  const adOps: MutateOperation<any>[] = [
    {
      entity: "ad_group_ad",
      operation: "create",
      resource: {
        ad_group: adGroupRN,
        status: enums.AdGroupAdStatus.ENABLED,
        ad: {
          responsive_search_ad: {
            headlines,
            descriptions,
          },
          final_urls: [input.finalUrl],
        },
      },
    },
  ];

  await customer.mutateResources(adOps);

  return {
    campaignId,
    adGroupId,
    campaignResourceName: ResourceNames.campaign(cid, campaignId),
  };
}

// ─── Metrics Sync ───────────────────────────────────────────

export interface DailyMetricRow {
  campaignId: string;
  campaignName: string;
  date: string;
  impressions: number;
  clicks: number;
  costMicros: bigint;
  conversions: number;
  conversionValue: number;
}

/**
 * Fetch daily campaign metrics for a child account over a date range.
 */
export async function fetchDailyMetrics(
  customerId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string
): Promise<DailyMetricRow[]> {
  const customer = getChildCustomer(customerId);

  const rows = await customer.report({
    entity: "campaign",
    attributes: ["campaign.id", "campaign.name"],
    metrics: [
      "metrics.impressions",
      "metrics.clicks",
      "metrics.cost_micros",
      "metrics.conversions",
      "metrics.conversions_value",
    ],
    segments: ["segments.date"],
    constraints: {
      "campaign.status": [
        enums.CampaignStatus.ENABLED,
        enums.CampaignStatus.PAUSED,
      ],
    },
    from_date: startDate,
    to_date: endDate,
    order_by: "segments.date",
    sort_order: "ASC",
  });

  return rows.map((row: any) => ({
    campaignId: String(row.campaign.id),
    campaignName: row.campaign.name,
    date: row.segments.date,
    impressions: row.metrics.impressions || 0,
    clicks: row.metrics.clicks || 0,
    costMicros: BigInt(row.metrics.cost_micros || 0),
    conversions: row.metrics.conversions || 0,
    conversionValue: row.metrics.conversions_value || 0,
  }));
}

/**
 * Fetch account-level daily metrics (aggregated across all campaigns).
 */
export async function fetchAccountDailyMetrics(
  customerId: string,
  startDate: string,
  endDate: string
) {
  const customer = getChildCustomer(customerId);

  const rows = await customer.report({
    entity: "customer",
    metrics: [
      "metrics.impressions",
      "metrics.clicks",
      "metrics.cost_micros",
      "metrics.conversions",
      "metrics.conversions_value",
    ],
    segments: ["segments.date"],
    from_date: startDate,
    to_date: endDate,
    order_by: "segments.date",
    sort_order: "ASC",
  });

  return rows.map((row: any) => ({
    date: row.segments.date,
    impressions: row.metrics.impressions || 0,
    clicks: row.metrics.clicks || 0,
    costMicros: BigInt(row.metrics.cost_micros || 0),
    conversions: row.metrics.conversions || 0,
    conversionValue: row.metrics.conversions_value || 0,
  }));
}

/**
 * List all campaigns in a child account.
 */
export async function listCampaigns(customerId: string) {
  const customer = getChildCustomer(customerId);

  const rows = await customer.report({
    entity: "campaign",
    attributes: [
      "campaign.id",
      "campaign.name",
      "campaign.status",
      "campaign.advertising_channel_type",
      "campaign.campaign_budget",
    ],
  });

  return rows.map((row: any) => ({
    id: String(row.campaign.id),
    name: row.campaign.name,
    status: row.campaign.status,
    channelType: row.campaign.advertising_channel_type,
  }));
}

// ─── Geographic Metrics ─────────────────────────────────────

/**
 * Fetch geographic performance data (by country → region → city).
 */
export async function fetchGeographicMetrics(
  customerId: string,
  startDate: string,
  endDate: string
) {
  const customer = getChildCustomer(customerId);

  const rows = await customer.report({
    entity: "geographic_view",
    attributes: [
      "geographic_view.country_criterion_id",
      "geographic_view.location_type",
    ],
    metrics: [
      "metrics.impressions",
      "metrics.clicks",
      "metrics.cost_micros",
      "metrics.conversions",
    ],
    segments: ["segments.date", "segments.geo_target_city"],
    from_date: startDate,
    to_date: endDate,
  });

  return rows.map((row: any) => ({
    date: row.segments.date,
    cityName: row.segments.geo_target_city || "Unknown",
    locationType: row.geographic_view?.location_type || "city",
    impressions: row.metrics.impressions || 0,
    clicks: row.metrics.clicks || 0,
    costMicros: BigInt(row.metrics.cost_micros || 0),
    conversions: row.metrics.conversions || 0,
  }));
}

// ─── Test Connection ────────────────────────────────────────

/**
 * Simple test to verify MCC access — lists accessible customers.
 */
export async function testMccConnection() {
  const accessible = await getClient().listAccessibleCustomers(getRefreshToken());
  return accessible;
}

// Re-export useful types
export { enums, toMicros, ResourceNames };
