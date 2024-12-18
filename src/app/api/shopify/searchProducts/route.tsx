import { NextResponse } from 'next/server';

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export async function POST(request: Request) {
  try {
    const { searchQuery } = await request.json();

    if (!searchQuery) {
      return NextResponse.json({ products: [] });
    }

    const response = await fetch(
      `https://${domain}/api/2023-07/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontAccessToken!,
        },
        body: JSON.stringify({
          query: `
            query searchProducts($query: String!) {
              products(first: 10, query: $query) {
                edges {
                  node {
                    id
                    title
                    handle
                    priceRange {
                      minVariantPrice {
                        amount
                        currencyCode
                      }
                    }
                    featuredImage {
                      url
                      altText
                    }
                    variants(first: 1) {
                      edges {
                        node {
                          id
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
          `,
          variables: {
            query: searchQuery,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Shopify API request failed');
    }

    const data = await response.json();

    // Transform the data to a simpler format
    const products = data.data.products.edges.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      handle: edge.node.handle,
      price: edge.node.variants.edges[0]?.node.price.amount || 
             edge.node.priceRange.minVariantPrice.amount,
      currency: edge.node.variants.edges[0]?.node.price.currencyCode || 
                edge.node.priceRange.minVariantPrice.currencyCode,
      image: edge.node.featuredImage?.url || null,
      imageAlt: edge.node.featuredImage?.altText || edge.node.title,
    }));

    return NextResponse.json({ products });

  } catch (error) {
    console.error('Error in search products:', error);
    return NextResponse.json(
      { error: 'Error searching products' },
      { status: 500 }
    );
  }
}