import os
from django.core.wsgi import get_wsgi_application

# CHANGE 'core' to the name of the folder containing settings.py
# Based on your image, it looks like 'core' or 'api' contains settings.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.core.settings')

app = get_wsgi_application()
