import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { accessToken, customer } = await req.json();

    if (!accessToken || !customer) {
      return NextResponse.json({
        success: false,
        message: 'Access token and customer data are required'
      }, { status: 400 });
    }

    const shopifyGraphQLUrl = `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/api/2024-01/graphql.json`;

    const mutation = `
      mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
        customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
          customer {
            firstName
            lastName
            email
            phone
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const variables = {
      customerAccessToken: accessToken,
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone
      }
    };

    const shopifyResponse = await fetch(shopifyGraphQLUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '',
      },
      body: JSON.stringify({
        query: mutation,
        variables
      }),
    });

    const data = await shopifyResponse.json();

    if (!shopifyResponse.ok || data.errors) {
      console.error('Shopify API Error:', data);
      return NextResponse.json({
        success: false,
        message: 'Failed to update customer data',
        details: data.errors ? data.errors[0].message : 'Unknown error'
      }, { status: 401 });
    }

    if (data.data.customerUpdate.customerUserErrors?.length > 0) {
      const error = data.data.customerUpdate.customerUserErrors[0];
      return NextResponse.json({
        success: false,
        message: error.message,
        details: error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      customer: data.data.customerUpdate.customer
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
