import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../redux/store';

export const selectCartItemsCount = createSelector(
  (state: RootState) => state.cart.items,
  (items) => Object.values(items).reduce((sum, item) => sum + item.quantity, 0)
);

export const selectCartTotal = createSelector(
  (state: RootState) => state.cart.items,
  (items) =>
    Object.values(items).reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    )
); 