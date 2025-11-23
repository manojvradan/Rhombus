import os
import sys
from django.core.wsgi import get_wsgi_application

# 1. Add the current directory (backend/) to the start of the system path
# This is CRITICAL. It tells Python: "Look for 'api' and 'core' right here."
app_path = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, app_path)

# 2. Point to settings
# Since we added the path above, we just use 'core.settings', not
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = get_wsgi_application()
