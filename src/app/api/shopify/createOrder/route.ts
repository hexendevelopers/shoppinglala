import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

interface LineItem {
  variant_id: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { razorpayPaymentId, amount, currency, customerDetails, lineItems } = body;

    // Validate required fields
    if (!razorpayPaymentId || !amount || !currency || !customerDetails || !lineItems) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Step 1: Verify Razorpay payment
    const payment = await razorpay.payments.fetch(razorpayPaymentId);

    if (payment.status !== 'captured') {
      return NextResponse.json(
        { error: 'Payment not captured' },
        { status: 400 }
      );
    }

    // Step 2: Create a Shopify order
    const shopifyOrderData = {
      order: {
        email: customerDetails.email,
        financial_status: 'paid',
        line_items: lineItems.map((item: LineItem) => ({
          variant_id: item.variant_id,
          quantity: item.quantity
        })),
        customer: {
          first_name: customerDetails.firstName,
          last_name: customerDetails.lastName,
          email: customerDetails.email,
        },
        billing_address: customerDetails.billingAddress,
        shipping_address: customerDetails.shippingAddress,
        transactions: [
          {
            kind: 'sale',
            status: 'success',
            amount: amount,
            gateway: 'Razorpay',
            gateway_transaction_id: razorpayPaymentId
          }
        ]
      }
    };

    console.log('Sending to Shopify:', shopifyOrderData); // For debugging

    // Make request to Shopify API
    const shopifyResponse = await fetch(
      `${process.env.SHOPIFY_STORE_URL}/admin/api/2023-10/orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN as string,
        },
        body: JSON.stringify(shopifyOrderData)
      }
    );

    if (!shopifyResponse.ok) {
      const errorData = await shopifyResponse.json();
      console.error('Shopify API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create Shopify order', details: errorData },
        { status: 500 }
      );
    }

    const createdOrder = await shopifyResponse.json();

    // Step 3: Return success response
    return NextResponse.json({
      success: true,
      shopifyOrderId: createdOrder.order.id,
      razorpayPaymentId: payment.id,
      orderStatus: createdOrder.order.financial_status,
    });

  } catch (error: any) {
    console.error('Error processing order:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}