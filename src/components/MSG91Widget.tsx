import React, { useEffect } from 'react';
import { authApi } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

// Extend window interface to include MSG91 function
declare global {
  interface Window {
    initSendOTP: (config: any) => void;
  }
}

interface MSG91WidgetProps {
  onSuccess: (data: any) => void;
  onFailure?: (error: any) => void;
  identifier?: string; // Optional: phone number/email
}

const MSG91Widget: React.FC<MSG91WidgetProps> = ({ onSuccess, onFailure, identifier }) => {
  const WIDGET_ID = "3662696a4945333030313031";
  
  useEffect(() => {
    const configuration = {
      widgetId: WIDGET_ID,
      identifier: identifier || undefined,
      exposeMethods: false,
      success: (data: any) => {
        console.log('MSG91 Success:', data);
        onSuccess(data);
      },
      failure: (error: any) => {
        console.log('MSG91 Failure:', error);
        if (onFailure) onFailure(error);
      }
    };

    const loadScript = () => {
      const urls = [
        'https://verify.msg91.com/otp-provider.js',
        'https://verify.phone91.com/otp-provider.js'
      ];

      let i = 0;
      const attempt = () => {
        if (document.querySelector(`script[src="${urls[i]}"]`)) {
             // Script already loaded, just init
             if (window.initSendOTP) {
                 window.initSendOTP(configuration);
             }
             return;
        }

        const s = document.createElement('script');
        s.src = urls[i];
        s.async = true;
        s.onload = () => {
          if (typeof window.initSendOTP === 'function') {
            window.initSendOTP(configuration);
          }
        };
        s.onerror = () => {
          i++;
          if (i < urls.length) {
            attempt();
          }
        };
        document.body.appendChild(s);
      };
      attempt();
    };

    loadScript();

    // Cleanup not really possible for global script, but we can try to remove script tag if needed
    // Usually widgets stay.
  }, [identifier]); // Re-run if identifier changes

  return (
    <div id="msg91-otp-widget-container" style={{ marginTop: '20px' }}>
      {/* The widget will likely render here or as a modal depending on its internal logic */}
      {/* If it renders in a specific container, we might need to provide a div id in config, but the snippet doesn't show one. */}
      {/* It often renders a button or attaches to body. */}
    </div>
  );
};

export default MSG91Widget;
