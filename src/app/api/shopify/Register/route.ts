import { NextRequest, NextResponse } from 'next/server';

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN || !process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  throw new Error('Missing required environment variables');
}

const endpoint = `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/api/2024-10/graphql.json`;
const storefrontAccessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

// GraphQL mutation to create a new customer
const customerCreateMutation = `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        firstName
        lastName
        email
        phone
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// GraphQL mutation to create a customer access token
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

export async function POST(req: NextRequest) {
  try {
    // Input validation
    const { firstName, lastName, email, password, phone } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ 
        success: false,
        message: 'Email and password are required',
      }, { status: 400 });
    }

    // Step 1: Create the customer
    const createCustomerResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken || '',
      },
      body: JSON.stringify({
        query: customerCreateMutation,
        variables: {
          input: { firstName, lastName, email, password, phone },
        },
      }),
    });

    if (!createCustomerResponse.ok) {
      return NextResponse.json({ 
        success: false,
        message: 'Failed to connect to Shopify API',
      }, { status: 500 });
    }

    const createCustomerData = await createCustomerResponse.json();

    // Check for GraphQL errors and userErrors
    if (createCustomerData.errors || createCustomerData.data?.customerCreate?.userErrors?.length > 0) {
      const errors = createCustomerData.errors || createCustomerData.data?.customerCreate?.userErrors;
      return NextResponse.json({ 
        success: false,
        message: 'Failed to create customer',
        errors 
      }, { status: 400 });
    }

    const customer = createCustomerData.data?.customerCreate?.customer;
    if (!customer) {
      return NextResponse.json({ 
        success: false,
        message: 'Customer creation failed - no customer data returned',
      }, { status: 400 });
    }

    // Step 2: Create access token
    const createAccessTokenResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken || '',
      },
      body: JSON.stringify({
        query: customerAccessTokenCreateMutation,
        variables: {
          input: { email, password },
        },
      }),
    });

    if (!createAccessTokenResponse.ok) {
      return NextResponse.json({ 
        success: false,
        message: 'Failed to generate access token',
      }, { status: 500 });
    }

    const createAccessTokenData = await createAccessTokenResponse.json();

    // Check for access token creation errors
    if (createAccessTokenData.errors || createAccessTokenData.data?.customerAccessTokenCreate?.userErrors?.length > 0) {
      const errors = createAccessTokenData.errors || createAccessTokenData.data?.customerAccessTokenCreate?.userErrors;
      return NextResponse.json({ 
        success: false,
        message: 'Failed to create access token',
        errors 
      }, { status: 400 });
    }

    const accessTokenData = createAccessTokenData.data?.customerAccessTokenCreate?.customerAccessToken;
    if (!accessTokenData?.accessToken) {
      return NextResponse.json({ 
        success: false,
        message: 'Access token creation failed - no token returned',
      }, { status: 400 });
    }

    // Step 3: Return successful response
    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      data: {
        customer,
        customerId: customer.id,
        accessToken: accessTokenData.accessToken,
        expiresAt: accessTokenData.expiresAt,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'An unexpected error occurred during registration',
    }, { status: 500 });
  }
}