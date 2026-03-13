import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# --- DIAGNOSTIC MIDDLEWARE ---
class AuthDebugMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION', 'NONE')
        # Only log first 20 chars of token for security
        bearer = auth[:20] if len(auth) > 20 else auth
        print(f"AG_DEBUG: [{request.method}] {request.path} | Auth: {bearer}")
        response = self.get_response(request)
        print(f"AG_DEBUG: Response: {response.status_code}")
        # If 401, check if user was authenticated
        if response.status_code == 401:
            print(f"AG_DEBUG: 401 Detail - User: {request.user}")
        return response
# -----------------------------

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key')
DEBUG = True
ALLOWED_HOSTS = ['*', '74.220.48.249', '192.168.1.4', '10.130.45.184', 'preflagellate-agnus-timidly.ngrok-free.dev']
CSRF_TRUSTED_ORIGINS = ['https://preflagellate-agnus-timidly.ngrok-free.dev']
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt.token_blacklist',
    'channels',
    'api',
]

MIDDLEWARE = [
    'vibely_backend.settings.AuthDebugMiddleware', # Diagnostic first
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'vibely_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'vibely_backend.wsgi.application'
ASGI_APPLICATION = 'vibely_backend.asgi.application'

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

from datetime import timedelta

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    )
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# Email Settings (Gmail)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'harishprabu2003@gmail.com'
# Generate App Password: https://myaccount.google.com/apppasswords
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', 'your-app-password-here')
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Media (uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Razorpay Configuration
# Replace with your actual keys from Razorpay Dashboard
# RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_YourKeyHere')
# RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'YourSecretHere')

# Razorpay Settings
# RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
# RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
RAZORPAY_KEY_ID = 'rzp_test_SNqKIEWV9NSYuU'
RAZORPAY_KEY_SECRET = '0OMicPadM4h7denXPCIF9Jd6'

# SMS Settings (Twilio)
# NOTE: TWILIO_ACCOUNT_SID must start with 'AC'.
# Ensure TWILIO_AUTH_TOKEN is updated to match the new SID.
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '')
TWILIO_WHATSAPP_NUMBER = os.environ.get('TWILIO_WHATSAPP_NUMBER', '')
TWILIO_PHONE_NUMBER_SID = os.environ.get('TWILIO_PHONE_NUMBER_SID', '')
TWILIO_VERIFY_SID = os.environ.get('TWILIO_VERIFY_SID', '')

# MSG91 Settings
MSG91_AUTH_KEY = os.environ.get('MSG91_AUTH_KEY', '')
MSG91_TEMPLATE_ID = os.environ.get('MSG91_TEMPLATE_ID', '')

# 2Factor Settings
TWOFACTOR_API_KEY = os.environ.get('TWOFACTOR_API_KEY', '')

# PrismSwift (WhatsApp OTP) Settings
# Get token from: https://dbuddyz.prismswift.com/dashboard/
PRISMSWIFT_TOKEN = os.environ.get('PRISMSWIFT_TOKEN', '')

# eBDSMS Settings
EBDSMS_API_KEY = os.environ.get('EBDSMS_API_KEY', '')
EBDSMS_DEVICE_ID = os.environ.get('EBDSMS_DEVICE_ID', '')

# Fast2SMS Settings
FAST2SMS_API_KEY = os.environ.get('FAST2SMS_API_KEY', '')

# Application definition
