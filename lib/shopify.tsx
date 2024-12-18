import { GraphQLError } from 'graphql';

// Define types for the function parameters and response
interface Variables {
  [key: string]: any;
}

interface ShopifyResponse {
  data?: any;
  errors?: GraphQLError[];
}

interface ShopifyFetchOptions {
  query: string;
  variables?: Variables;
}

/**
 * Fetches data from Shopify's Storefront API using GraphQL
 * @param query - GraphQL query string
 * @param variables - Variables for the GraphQL query
 * @returns Promise with the API response
 */
async function shopifyFetch(
  query: string,
  variables: Variables = {}
): Promise<ShopifyResponse> {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN;
  const storefrontAccessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  // Check if environment variables are missing
  if (!domain || !storefrontAccessToken) {
    throw new Error("Shopify domain or access token is missing.");
  }

  try {
    // Make the POST request to Shopify's GraphQL endpoint
    const response = await fetch(`https://${domain}/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    // Check if the response is successful (status 200-299)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse and return the JSON response
    const data: ShopifyResponse = await response.json();
    return data;
  } catch (error) {
    // Log the error for debugging
    console.error("Error fetching data from Shopify:", error);
    throw error; // Rethrow the error so the caller can handle it
  }
}

export default shopifyFetch;

// Export additional types if needed by other components
export type { ShopifyResponse, Variables, ShopifyFetchOptions };