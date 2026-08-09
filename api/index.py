import os
import sys

# Add server directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "server"))

from main import app

# Export app for Vercel Serverless Function handler
