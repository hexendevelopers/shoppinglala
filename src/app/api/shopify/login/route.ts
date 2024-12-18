import { NextRequest, NextResponse } from 'next/server';

// Environment validation and constants
if (!process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN || !process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  throw new Error('Missing required environment variables');
}

const endpoint = `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/api/2024-01/graphql.json`;
const storefrontAccessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

// GraphQL mutation for customer access token
const customerAccessTokenCreateMutation = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Add query to get customer details
const customerQuery = `
  query getCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      email
      phone
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Email and password are required'
      }, { status: 400 });
    }

    console.log('Attempting to create access token for:', email);
    
    // Step 1: Create access token
    const createAccessTokenResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({
        query: customerAccessTokenCreateMutation,
        variables: {
          input: { email, password },
        },
      }),
    });

    // Log the raw response for debugging
    console.log('Shopify API Response Status:', createAccessTokenResponse.status);
    console.log('Shopify API Response Headers:', Object.fromEntries(createAccessTokenResponse.headers));

    if (!createAccessTokenResponse.ok) {
      const errorText = await createAccessTokenResponse.text();
      console.error('Shopify API Error:', {
        status: createAccessTokenResponse.status,
        statusText: createAccessTokenResponse.statusText,
        body: errorText
      });
      
      return NextResponse.json({ 
        success: false,
        message: 'Failed to connect to Shopify API',
        details: errorText
      }, { status: 500 });
    }

    const data = await createAccessTokenResponse.json();
    console.log('Shopify API Response Data:', JSON.stringify(data, null, 2));

    // Check for errors
    if (data.errors || data.data?.customerAccessTokenCreate?.userErrors?.length > 0) {
      const errors = data.errors || data.data?.customerAccessTokenCreate?.userErrors;
      return NextResponse.json({ 
        success: false,
        message: 'Authentication failed',
        errors 
      }, { status: 401 });
    }

    const accessToken = data.data?.customerAccessTokenCreate?.customerAccessToken;
    if (!accessToken?.accessToken) {
      return NextResponse.json({ 
        success: false,
        message: 'Authentication failed - no token returned',
      }, { status: 401 });
    }

    // Step 2: Fetch customer details using the access token
    const customerResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({
        query: customerQuery,
        variables: {
          customerAccessToken: accessToken.accessToken,
        },
      }),
    });

    const customerData = await customerResponse.json();
    const customer = customerData.data?.customer;

    if (!customer) {
      return NextResponse.json({ 
        success: false,
        message: 'Failed to fetch customer details',
      }, { status: 500 });
    }

    // Log the response data for debugging
    console.log('Response data structure:', {
      success: true,
      message: 'Login successful',
      data: {
        customer: customerData.data?.customer,
        accessToken: accessToken.accessToken,
        expiresAt: accessToken.expiresAt
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        customer: customerData.data?.customer,
        accessToken: accessToken.accessToken,
        expiresAt: accessToken.expiresAt
      }
    });

  } catch (error) {
    console.error('Detailed login error:', error);
    return NextResponse.json({
      success: false,
      message: 'An unexpected error occurred during login',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
