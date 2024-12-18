import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem } from '../../types/cart';

interface CartState {
  items: Record<string, CartItem>;
  cartId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: {},
  cartId: null,
  isLoading: false,
  error: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCartItems: (state, action: PayloadAction<Record<string, CartItem>>) => {
      state.items = action.payload;
    },
    updateItemQuantity: (
      state,
      action: PayloadAction<{ productId: string; quantity: number }>
    ) => {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        delete state.items[productId];
      } else {
        state.items[productId] = {
          ...state.items[productId],
          quantity,
        };
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      delete state.items[action.payload];
    },
    setCartId: (state, action: PayloadAction<string | null>) => {
      state.cartId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCartItems,
  updateItemQuantity,
  removeItem,
  setCartId,
  setLoading,
  setError,
} = cartSlice.actions;
export default cartSlice.reducer; 