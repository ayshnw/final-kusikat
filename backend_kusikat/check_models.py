# check_models.py
import os
from dotenv import load_dotenv

# Load .env
load_dotenv()

import google.generativeai as genai

# Konfigurasi API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Available models that support generateContent:")
try:
    for model in genai.list_models():
        if 'generateContent' in model.supported_generation_methods:
            print(f"✅ {model.name}")
except Exception as e:
    print("❌ Error:", e)
    print("Pastikan GEMINI_API_KEY di .env valid dan internet aktif.")