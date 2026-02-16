import React, { useState, useEffect } from 'react';
import { Delete, Check } from 'lucide-react';

interface PinPadProps {
  length?: number;
  onComplete: (pin: string) => void;
  title?: string;
  error?: boolean;
  onBack?: () => void;
}

export default function PinPad({ 
  length = 4, 
  onComplete, 
  title = "Enter PIN", 
  error = false,
  onBack 
}: PinPadProps) {
  const [pin, setPin] = useState("");

  const handleNumberClick = (num: number) => {
    if (pin.length < length) {
      const newPin = pin + num;
      setPin(newPin);
      if (navigator.vibrate) navigator.vibrate(10);
      
      if (newPin.length === length) {
        setTimeout(() => {
          onComplete(newPin);
          setPin(""); // Reset after submission (optional, depends on flow)
        }, 100);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    if (navigator.vibrate) navigator.vibrate(10);
  };

  useEffect(() => {
    if (error) {
      // Shake animation or clear pin
      const timer = setTimeout(() => setPin(""), 400);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center w-full max-w-xs mx-auto animate-in fade-in zoom-in duration-300">
      <h2 className="text-xl font-bold mb-8 text-gray-800">{title}</h2>

      {/* Dots display */}
      <div className={`flex gap-4 mb-10 ${error ? 'animate-shake' : ''}`}>
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              i < pin.length 
                ? 'bg-primary scale-110' 
                : 'bg-gray-200 border border-gray-300'
            } ${error ? 'bg-red-500' : ''}`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-6 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-primary/10 active:text-primary flex items-center justify-center text-2xl font-semibold text-gray-700 transition-all shadow-sm mx-auto"
          >
            {num}
          </button>
        ))}
        
        <div className="flex items-center justify-center">
           {/* Placeholder or Back button if needed */}
           {onBack && (
             <button onClick={onBack} className="text-sm text-gray-500 font-medium hover:text-gray-800">
               Cancel
             </button>
           )}
        </div>
        
        <button
          onClick={() => handleNumberClick(0)}
          className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-primary/10 active:text-primary flex items-center justify-center text-2xl font-semibold text-gray-700 transition-all shadow-sm mx-auto"
        >
          0
        </button>

        <button
          onClick={handleDelete}
          className="w-16 h-16 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 active:scale-95 transition-all mx-auto"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
