import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  coins: number;
  onConfirm: () => void;
  status: 'idle' | 'processing' | 'success';
}

export function PaymentModal({ isOpen, onClose, amount, coins, onConfirm, status }: PaymentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => status !== 'processing' && status !== 'success' && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Secure Payment</DialogTitle>
          <DialogDescription>
            Complete your purchase of {coins} coins for ₹{amount}
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' && (
            <div className="py-6 space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                    <p className="text-3xl font-bold text-gray-900">₹{amount}</p>
                </div>

                <Button 
                    onClick={onConfirm} 
                    className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-lg" 
                >
                    Pay ₹{amount}
                </Button>
                
                <p className="text-xs text-center text-gray-500 flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Secured by Razorpay
                </p>
            </div>
        )}

        {status === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div>
              <h3 className="text-lg font-semibold">Verifying Payment</h3>
              <p className="text-sm text-gray-500">Please do not close this window...</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-600">Payment Successful!</h3>
              <p className="text-sm text-gray-500">Your coins have been added to your wallet.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
