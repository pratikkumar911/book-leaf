import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { bookleafApi } from './api.js';

export const store = configureStore({
  reducer: { [bookleafApi.reducerPath]: bookleafApi.reducer },
  middleware: (getDefault) => getDefault().concat(bookleafApi.middleware),
});

setupListeners(store.dispatch);