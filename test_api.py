import requests
import json

url = "https://loveable-backend-url.onrender.com/api/auth/send-otp/"
data = {"phone_number": "+919999999999"}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        otp = response.json().get('otp')
        if otp:
            print(f"OTP received: {otp}")
            # Step 2: Verify OTP
            verify_url = "https://loveable-backend-url.onrender.com/api/auth/verify-otp/"
            verify_data = {"phone_number": "+919999999999", "otp_code": otp}
            verify_response = requests.post(verify_url, json=verify_data)
            print(f"Verify Status: {verify_response.status_code}")
            print(f"Verify Response: {verify_response.text}")
        else:
            print("No OTP in response (expected in prod, but this is for test)")
except Exception as e:
    print(f"Error: {e}")
