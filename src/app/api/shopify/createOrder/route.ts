import { NextRequest, NextResponse } from 'next/server';

interface LineItem {
  variant_id: number;
  quantity: number;
  title: string;
  price: string;
  requires_shipping: boolean;
  taxable: boolean;
  variant?: {
    title?: string;
    sku?: string;
    image?: {
      url?: string;
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SHOPIFY_STORE_URL || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
      throw new Error('Missing Shopify configuration');
    }

    const body = await req.json();
    console.log('Received request body:', body);

    const { razorpayPaymentId, amount, customerDetails, lineItems } = body;

    if (!razorpayPaymentId || !amount || !customerDetails || !lineItems) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const formattedAddress = {
      first_name: customerDetails.firstName,
      last_name: customerDetails.lastName,
      address1: customerDetails.shippingDetails.address1,
      address2: customerDetails.shippingDetails.address2 || '',
      city: customerDetails.shippingDetails.city,
      province: customerDetails.shippingDetails.province,
      zip: customerDetails.shippingDetails.zip,
      country: customerDetails.shippingDetails.country,
      phone: customerDetails.shippingDetails.phone,
    };

    const orderData = {
      order: {
        email: customerDetails.email,
        financial_status: 'paid',
        line_items: lineItems.map((item: LineItem) => ({
          variant_id: parseInt(item.variant_id.toString()),
          quantity: parseInt(item.quantity.toString()),
          price: item.price,
          requires_shipping: true,
          taxable: true,
          title: item.title,
          properties: [
            { name: "Image URL", value: item.variant?.image?.url || '' },
            { name: "Variant Title", value: item.variant?.title || '' },
            { name: "SKU", value: item.variant?.sku || '' }
          ]
        })),
        customer: {
          first_name: customerDetails.firstName,
          last_name: customerDetails.lastName,
          email: customerDetails.email,
        },
        shipping_address: formattedAddress,
        billing_address: formattedAddress,
        total_price: amount.toString(),
        currency: "INR",
        transactions: [
          {
            kind: 'sale',
            status: 'success',
            amount: amount.toString(),
            gateway: 'Razorpay',
            payment_id: razorpayPaymentId,
          },
        ],
      },
    };

    console.log('Sending to Shopify:', JSON.stringify(orderData, null, 2));

    const shopifyResponse = await fetch(
      `${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        },
        body: JSON.stringify(orderData),
      }
    );

    const responseData = await shopifyResponse.json();
    console.log('Shopify response:', responseData);

    if (!shopifyResponse.ok) {
      console.error('Shopify API Error:', responseData);
      return NextResponse.json(
        { error: 'Failed to create Shopify order', details: responseData },
        { status: shopifyResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      shopifyOrderId: responseData.order.id,
      razorpayPaymentId,
      orderStatus: responseData.order.financial_status,
    });

  } catch (error: any) {
    console.error('Error processing order:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}