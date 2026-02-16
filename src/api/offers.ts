import client from './client';

export interface Offer {
  id: number;
  title: string;
  description: string;
  offer_type: string;
  price: string;
  currency: string;
  coins_awarded: number;
  gender_target?: 'M' | 'F' | 'O';
  level_min: number;
  discount_coins: number;
  start_time?: string;
  end_time?: string;
  is_active: boolean;
}

export const offersApi = {
  listOffers: () => client.get<Offer[]>('/offers/'),
  purchaseOffer: (offerId: number) => client.post<{success: boolean, payment_id: number, new_balance?: number}>('/offers/purchase/', { offer_id: offerId }),
};
