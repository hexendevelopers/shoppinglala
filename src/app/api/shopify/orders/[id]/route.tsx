import { NextResponse, NextRequest } from 'next/server';


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Authorization header missing or invalid');
      return NextResponse.json({
        success: false,
        message: 'Access token is required'
      }, { status: 401 });
    }

    const accessToken = authHeader.split(' ')[1];
    const orderNumber = params.id;
    if (!orderNumber || orderNumber === 'undefined') {
      return NextResponse.json({
        success: false,
        message: 'Invalid order number'
      }, { status: 400 });
    }
 
    console.log('Access token extracted:', accessToken.substring(0, 10) + '...');
    console.log('Order number:', orderNumber);
    console.log("My order number isssssssssssssssssssssssssssss:", orderNumber);

    const shopifyGraphQLUrl = `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/api/2024-01/graphql.json`;
    console.log('Shopify URL:', shopifyGraphQLUrl);

    console.log('API Route - Received order number:', params.id);
    console.log('API Route - Full params:', params);

    const query = `
      query GetOrderDetails($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          orders(first: 100) {
            edges {
              node {
                id
                name
                orderNumber
                processedAt
                financialStatus
                fulfillmentStatus
                totalPriceV2 {
                  amount
                  currencyCode
                }
                shippingAddress {
                  address1
                  address2
                  city
                  province
                  zip
                  country
                }
                successfulFulfillments(first: 10) {
                  trackingCompany
                  trackingInfo {
                    number
                    url
                  }
                }
                lineItems(first: 50) {
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

    const response = await fetch(shopifyGraphQLUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || ''
      },
      body: JSON.stringify({
        query,
        variables: {
          customerAccessToken: accessToken,
        }
      })
    });

    const data = await response.json();
    console.log('Shopify API response status:', response.status);
    console.log('Shopify API response data:', JSON.stringify(data, null, 2));

    if (data.errors) {
      console.error('Shopify API returned errors:', data.errors);
      return NextResponse.json({
        success: false,
        message: data.errors[0].message
      }, { status: 400 });
    }

    if (data.data?.customer?.orders?.edges) {
      const orderEdge = data.data.customer.orders.edges.find(
        (edge: any) => edge.node.orderNumber.toString() === orderNumber
      );
      
      if (!orderEdge) {
        return NextResponse.json({
          success: false,
          message: 'Order not found'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        order: orderEdge.node
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Order not found'
    }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred'
    }, { status: 500 });
  }
}