import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, addressId, address, action } = body;

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        message: 'Access token is required'
      }, { status: 400 });
    }

    const shopifyGraphQLUrl = `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/api/2024-01/graphql.json`;

    let mutation;
    let variables;

    if (action === 'delete') {
      mutation = `
        mutation customerAddressDelete($customerAccessToken: String!, $id: ID!) {
          customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
            customerUserErrors {
              code
              field
              message
            }
            deletedCustomerAddressId
          }
        }
      `;
      variables = {
        customerAccessToken: accessToken,
        id: addressId
      };
    } else if (addressId) {
      // Update address
      mutation = `
        mutation customerAddressUpdate($customerAccessToken: String!, $id: ID!, $address: MailingAddressInput!) {
          customerAddressUpdate(customerAccessToken: $customerAccessToken, id: $id, address: $address) {
            customerAddress {
              id
              address1
              address2
              city
              province
              country
              zip
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
      variables = {
        customerAccessToken: accessToken,
        id: addressId,
        address: {
          address1: address.address1,
          address2: address.address2 || '',
          city: address.city,
          province: address.province,
          country: address.country,
          zip: address.zip,
          phone: address.phone || ''
        }
      };
    } else {
      // Create new address
      mutation = `
        mutation customerAddressCreate($customerAccessToken: String!, $address: MailingAddressInput!) {
          customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
            customerAddress {
              id
              address1
              address2
              city
              province
              country
              zip
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
      variables = {
        customerAccessToken: accessToken,
        address: {
          address1: address.address1,
          address2: address.address2 || '',
          city: address.city,
          province: address.province,
          country: address.country,
          zip: address.zip,
          phone: address.phone || ''
        }
      };
    }

    const response = await fetch(shopifyGraphQLUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || ''
      },
      body: JSON.stringify({
        query: mutation,
        variables
      })
    });

    const data = await response.json();

    if (data.errors) {
      return NextResponse.json({
        success: false,
        message: data.errors[0].message
      }, { status: 400 });
    }

    if (action === 'delete') {
      const result = data.data?.customerAddressDelete;
      if (result?.customerUserErrors?.length > 0) {
        return NextResponse.json({
          success: false,
          message: result.customerUserErrors[0].message
        }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        deletedId: result.deletedCustomerAddressId
      });
    } else {
      const result = addressId ? data.data?.customerAddressUpdate : data.data?.customerAddressCreate;
      if (result?.customerUserErrors?.length > 0) {
        return NextResponse.json({
          success: false,
          message: result.customerUserErrors[0].message
        }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        address: result.customerAddress
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred'
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, addressId } = body;

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        message: 'Access token is required'
      }, { status: 400 });
    }

    const shopifyGraphQLUrl = `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/api/2024-01/graphql.json`;

    const mutation = `
      mutation customerAddressDelete($customerAccessToken: String!, $id: ID!) {
        customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
          customerUserErrors {
            code
            field
            message
          }
          deletedCustomerAddressId
        }
      }
    `;
    const variables = {
      customerAccessToken: accessToken,
      id: addressId
    };

    const response = await fetch(shopifyGraphQLUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || ''
      },
      body: JSON.stringify({
        query: mutation,
        variables
      })
    });

    const data = await response.json();

    if (data.errors) {
      return NextResponse.json({
        success: false,
        message: data.errors[0].message
      }, { status: 400 });
    }

    const result = data.data?.customerAddressDelete;
    if (result?.customerUserErrors?.length > 0) {
      return NextResponse.json({
        success: false,
        message: result.customerUserErrors[0].message
      }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      deletedId: result.deletedCustomerAddressId
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Access token is required'
      }, { status: 401 });
    }

    const accessToken = authHeader.split(' ')[1];
    const shopifyGraphQLUrl = `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/api/2024-01/graphql.json`;

    const query = `
      query getCustomerAddresses($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          addresses(first: 10) {
            edges {
              node {
                id
                address1
                address2
                city
                province
                country
                zip
                phone
              }
            }
          }
        }
      }
    `;

    const response = await fetch(shopifyGraphQLUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || ''
      },
      body: JSON.stringify({
        query,
        variables: {
          customerAccessToken: accessToken
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      return NextResponse.json({
        success: false,
        message: data.errors[0].message
      }, { status: 400 });
    }

    const addresses = data.data?.customer?.addresses?.edges?.map((edge: any) => edge.node) || [];

    return NextResponse.json({
      success: true,
      addresses
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred'
    }, { status: 500 });
  }
}
