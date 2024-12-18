import { NextResponse, NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Cancel API route hit');
    console.log('Order ID:', params.id);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Access token is required'
      }, { status: 401 });
    }

    const accessToken = authHeader.split(' ')[1];
    const orderId = params.id;

    // Use the Shopify Admin API endpoint
    const shopifyAdminUrl = `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/orders/${orderId}/cancel.json`;

    const response = await fetch(shopifyAdminUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.NEXT_PUBLIC_SHOPIFY_ADMIN_ACCESS_TOKEN || '' // Make sure to add this to your .env
      }
    });

    const data = await response.json();
    console.log('Shopify cancel response:', data);

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: data.errors || 'Failed to cancel order'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      order: data
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred'
    }, { status: 500 });
  }
}