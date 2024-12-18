import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        message: 'Access token is required'
      }, { status: 400 });
    }

    const shopifyGraphQLUrl = `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/api/2024-01/graphql.json`;

    const query = `
      query getCustomer($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          firstName
          lastName
          email
         }
      }
    `;

    const shopifyResponse = await fetch(shopifyGraphQLUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '',
      },
      body: JSON.stringify({ 
        query,
        variables: {
          customerAccessToken: accessToken
        }
      }),
    });

    const data = await shopifyResponse.json();

    if (!shopifyResponse.ok || data.errors) {
      console.error('Shopify API Error:', data);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch customer data',
        details: data.errors ? data.errors[0].message : 'Unknown error'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      customer: data.data.customer
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
