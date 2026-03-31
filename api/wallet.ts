import apiClient from './client';
import type { Wallet, CoinTransaction, PaginatedResponse } from '@/types';

export const walletApi = {
  getWallet: async (): Promise<Wallet> => {
    const response = await apiClient.get('wallet/');
    return response.data;
  },

  // Creates a Razorpay order on the backend. Returns { order_id, key_id }.
  createOrder: async (amount: number, currency = 'INR'): Promise<{ order_id: string; key_id: string }> => {
    const response = await apiClient.post('wallet/create_order/', { amount, currency });
    return response.data;
  },

  getTransactions: async (): Promise<PaginatedResponse<CoinTransaction>> => {
    const response = await apiClient.get('wallet/transactions/');
    const data = response.data;
    const results = Array.isArray(data) ? data : (data?.results ?? []);
    return { ...data, results };
  },

  purchase: async (amount: number, coins: number, paymentData?: { razorpay_payment_id?: string, razorpay_order_id?: string, razorpay_signature?: string }): Promise<any> => {
    const response = await apiClient.post('wallet/purchase/', { amount, coins, ...paymentData });
    return response.data;
  },

  verifyPayment: async (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<{ success: boolean; new_balance?: number }> => {
    const response = await apiClient.post('wallet/verify-payment/', data);
    return response.data;
  },

  spendCoins: async (data: { amount: number; description: string }): Promise<{ success: boolean; new_balance?: number }> => {
    const response = await apiClient.post('wallet/spend/', data);
    return response.data;
  },

  refundCoins: async (data: { amount: number; description: string }): Promise<{ success: boolean; new_balance?: number }> => {
    const response = await apiClient.post('wallet/refund/', data);
    return response.data;
  },

  earnCoins: async (data: { amount: number; description: string }): Promise<{ success: boolean; new_balance?: number }> => {
    const response = await apiClient.post('wallet/earn/', data);
    return response.data;
  },

  transferCoins: async (data: { amount: number; receiver_id: number; description: string }): Promise<{ success: boolean; new_balance?: number }> => {
    const response = await apiClient.post('wallet/transfer/', data);
    return response.data;
  },
};
