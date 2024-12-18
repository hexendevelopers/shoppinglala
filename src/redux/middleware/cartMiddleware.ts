import { createListenerMiddleware } from '@reduxjs/toolkit';
import { updateItemQuantity } from '../slices/cartSlice';

export const cartMiddleware = createListenerMiddleware();

cartMiddleware.startListening({
  actionCreator: updateItemQuantity,
  effect: async (action, listenerApi) => {
    // Add debounce to prevent rapid updates
    await listenerApi.delay(300);
    // You can add additional logic here to handle cart updates
  },
}); 