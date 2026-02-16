import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key')
DEBUG = True
ALLOWED_HOSTS = ['*', '74.220.48.249', '192.168.1.4']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt.token_blacklist',
    'api',
]

MIDDLEWARE = [
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

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    )
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
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')

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
