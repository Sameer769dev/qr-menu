'use client';

import { createContext, useContext } from 'react';

export const RestaurantContext = createContext(null);

export function useRestaurant() {
  return useContext(RestaurantContext);
}
