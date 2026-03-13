import apiClient from './client';

export interface Gift {
  id: number;
  name: string;
  icon: string;
  cost: number;
}

export const giftsApi = {
  getGifts: async (): Promise<Gift[]> => {
    const response = await apiClient.get('gifts/');
    return response.data;
  },
  sendGift: async (giftId: number, receiverId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('gifts/send/', { gift_id: giftId, receiver_id: receiverId });
    return response.data;
  }
};
