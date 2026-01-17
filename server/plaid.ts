import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

// Initialize Plaid client
function createPlaidClient(): PlaidApi | null {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV || "sandbox";

  if (!clientId || !secret) {
    console.warn("Plaid credentials not configured. Plaid features will be disabled.");
    return null;
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

export const plaidClient = createPlaidClient();

/**
 * Create a Link token for Plaid Link initialization
 */
export async function createLinkToken(userId: string): Promise<string | null> {
  if (!plaidClient) {
    return null;
  }

  try {
    const request = {
      user: {
        client_user_id: userId,
      },
      client_name: "Sila",
      products: [Products.Investments, Products.InvestmentsAuth] as Products[],
      country_codes: [CountryCode.Us],
      language: "en",
    };

    const response = await plaidClient.linkTokenCreate(request);
    return response.data.link_token;
  } catch (error: any) {
    console.error("Error creating Plaid link token:", error);
    throw new Error(error.response?.data?.error_message || "Failed to create link token");
  }
}

/**
 * Exchange public token for access token
 */
export async function exchangePublicToken(publicToken: string): Promise<{
  accessToken: string;
  itemId: string;
}> {
  if (!plaidClient) {
    throw new Error("Plaid client not configured");
  }

  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  } catch (error: any) {
    console.error("Error exchanging public token:", error);
    throw new Error(error.response?.data?.error_message || "Failed to exchange public token");
  }
}

/**
 * Get institution information
 */
export async function getInstitution(institutionId: string): Promise<{
  name: string;
  logo?: string;
  primaryColor?: string;
}> {
  if (!plaidClient) {
    throw new Error("Plaid client not configured");
  }

  try {
    const response = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
    });

    const institution = response.data.institution;
    return {
      name: institution.name,
      logo: institution.logo || undefined,
      primaryColor: institution.primary_color || undefined,
    };
  } catch (error: any) {
    console.error("Error fetching institution:", error);
    throw new Error(error.response?.data?.error_message || "Failed to fetch institution");
  }
}

/**
 * Get accounts from Plaid item
 */
export async function getAccounts(accessToken: string): Promise<Array<{
  accountId: string;
  name: string;
  type?: string;
  subtype?: string;
  mask?: string;
}>> {
  if (!plaidClient) {
    throw new Error("Plaid client not configured");
  }

  try {
    // Try Investments API first
    try {
      const investmentsResponse = await plaidClient.investmentsHoldingsGet({
        access_token: accessToken,
      });

      return investmentsResponse.data.accounts.map((account) => ({
        accountId: account.account_id,
        name: account.name,
        type: account.type,
        subtype: account.subtype || undefined,
        mask: account.mask || undefined,
      }));
    } catch (investmentsError: any) {
      // Fallback to Accounts API if Investments API fails
      console.warn("Investments API failed, trying Accounts API:", investmentsError);
      
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      return accountsResponse.data.accounts.map((account) => ({
        accountId: account.account_id,
        name: account.name,
        type: account.type,
        subtype: account.subtype || undefined,
        mask: account.mask || undefined,
      }));
    }
  } catch (error: any) {
    console.error("Error fetching accounts:", error);
    throw new Error(error.response?.data?.error_message || "Failed to fetch accounts");
  }
}

/**
 * Get holdings from Plaid (Investments API)
 */
export async function getHoldings(accessToken: string): Promise<Array<{
  accountId: string;
  securityId: string;
  ticker?: string;
  name: string;
  quantity: number;
  costBasis?: number;
  price: number;
  value: number;
  sector?: string;
  industry?: string;
}>> {
  if (!plaidClient) {
    throw new Error("Plaid client not configured");
  }

  try {
    const response = await plaidClient.investmentsHoldingsGet({
      access_token: accessToken,
    });

    const holdings: Array<{
      accountId: string;
      securityId: string;
      ticker?: string;
      name: string;
      quantity: number;
      costBasis?: number;
      price: number;
      value: number;
      sector?: string;
      industry?: string;
    }> = [];

    for (const holding of response.data.holdings) {
      const security = response.data.securities.find(
        (s) => s.security_id === holding.security_id
      );

      if (security) {
        const ticker = security.ticker_symbol ? security.ticker_symbol : undefined;
        const costBasis = holding.cost_basis ? (typeof holding.cost_basis === 'number' 
          ? holding.cost_basis 
          : (holding.cost_basis as any)?.value || undefined) : undefined;
        const priceNum = (holding as any).price;
        const price = priceNum ? (typeof priceNum === 'number' ? priceNum : (priceNum as any)?.value || 0) : 0;
        const valueNum = (holding as any).institution_value;
        const value = valueNum ? (typeof valueNum === 'number' ? valueNum : (valueNum as any)?.value || 0) : 0;
        const securityName = security.name ? security.name : "Unknown Security";
        
        holdings.push({
          accountId: holding.account_id,
          securityId: holding.security_id,
          ticker: ticker || undefined,
          name: securityName,
          quantity: holding.quantity || 0,
          costBasis: costBasis,
          price: price,
          value: value,
          sector: security.type as string | undefined,
          industry: undefined, // Plaid doesn't provide industry in Investments API
        });
      }
    }

    return holdings;
  } catch (error: any) {
    console.error("Error fetching holdings:", error);
    // Return empty array if Investments API is not available
    if (error.response?.data?.error_code === "INVALID_PRODUCT") {
      return [];
    }
    throw new Error(error.response?.data?.error_message || "Failed to fetch holdings");
  }
}

/**
 * Get item metadata
 */
export async function getItem(accessToken: string): Promise<{
  itemId: string;
  institutionId: string;
}> {
  if (!plaidClient) {
    throw new Error("Plaid client not configured");
  }

  try {
    const response = await plaidClient.itemGet({
      access_token: accessToken,
    });

    return {
      itemId: response.data.item.item_id,
      institutionId: response.data.item.institution_id || "",
    };
  } catch (error: any) {
    console.error("Error fetching item:", error);
    throw new Error(error.response?.data?.error_message || "Failed to fetch item");
  }
}
