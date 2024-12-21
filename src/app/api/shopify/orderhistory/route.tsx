import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Extract Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Authorization header missing or invalid');
      return NextResponse.json(
        {
          success: false,
          message: 'Access token is required',
        },
        { status: 401 }
      );
    }

    const accessToken = authHeader.split(' ')[1];
    console.log('Access token extracted:', accessToken.substring(0, 10) + '...');

    // Shopify URL and token validation
    const shopifyGraphQLUrl = `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/api/2024-01/graphql.json`;
    if (!process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN || !process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      console.error('Missing Shopify environment variables');
      return NextResponse.json(
        {
          success: false,
          message: 'Shopify API configuration is missing. Contact support.',
        },
        { status: 500 }
      );
    }

    console.log('Shopify GraphQL URL:', shopifyGraphQLUrl);

    // Shopify GraphQL query
    const query = `
      query GetCustomerOrders($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          orders(first: 20) {
            edges {
              node {
                id
                orderNumber
                processedAt
                financialStatus
                fulfillmentStatus
                totalPriceV2 {
                  amount
                  currencyCode
                }
                lineItems(first: 5) {
                  edges {
                    node {
                      title
                      quantity
                      variant {
                        image {
                          url
                        }
                        price {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    // Send the request to Shopify
    const response = await fetch(shopifyGraphQLUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '',
      },
      body: JSON.stringify({
        query,
        variables: { customerAccessToken: accessToken },
      }),
    });

    const data = await response.json();
    console.log('Shopify API response status:', response.status);

    if (response.status !== 200 || data.errors) {
      console.error('Shopify API errors:', data.errors || data);
      return NextResponse.json(
        {
          success: false,
          message: data.errors?.[0]?.message || 'Failed to fetch orders from Shopify.',
        },
        { status: response.status }
      );
    }

    const orders = data.data?.customer?.orders?.edges?.map((edge: any) => edge.node) || [];
    console.log('Number of orders found:', orders.length);

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      },
      { status: 500 }
    );
  }
}
