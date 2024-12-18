import { NextRequest, NextResponse } from 'next/server';
import shopifyFetch from '../../../../../lib/shopify';

const CREATE_ADDRESS_MUTATION = `
  mutation customerAddressCreate($address: MailingAddressInput!, $customerAccessToken: String!) {
    customerAddressCreate(address: $address, customerAccessToken: $customerAccessToken) {
      customerAddress {
        id
        firstName
        lastName
        address1
        address2
        city
        province
        zip
        country
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      firstName, 
      lastName, 
      address, 
      apartment, 
      city, 
      state, 
      postalCode, 
      country, 
      phone 
    } = body;

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const customerAccessToken = authHeader.split('Bearer ')[1];
    console.log('Received token:', customerAccessToken); // Debug log

    const variables = {
      customerAccessToken,
      address: {
        firstName,
        lastName,
        address1: address,
        address2: apartment || '',
        city,
        province: state,
        zip: postalCode,
        country,
        phone: phone || ''
      }
    };

    console.log('Sending to Shopify:', variables); // Debug log

    const response = await shopifyFetch(CREATE_ADDRESS_MUTATION, variables);
    console.log('Shopify response:', response); // Debug log

    if (response.data?.customerAddressCreate?.customerUserErrors?.length > 0) {
      const errors = response.data.customerAddressCreate.customerUserErrors;
      console.log('Validation errors:', errors); // Debug log
      return NextResponse.json({
        success: false,
        errors: errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Shipping address saved successfully',
      address: response.data?.customerAddressCreate?.customerAddress
    });

  } catch (error) {
    console.error('Detailed API error:', error); // Debug log
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error saving shipping address',
        error: error instanceof Error ? error.toString() : 'Unknown error'
      },
      { status: 500 }
    );
  }
}