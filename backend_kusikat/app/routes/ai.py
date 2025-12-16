# app/routes/ai.py
from fastapi import APIRouter, HTTPException
import google.generativeai as genai
import os
from app.schemas import RecipeRequest, RecipeResponse, ChatRequest, ChatResponse

router = APIRouter()

# ✅ Endpoint 1: Chat umum (untuk pertanyaan bebas)
@router.post("/ai/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-flash-latest")
        response = model.generate_content(
            f"Kamu adalah Chef Sayur, asisten masak yang ramah dan membantu. Jawab pertanyaan berikut dalam Bahasa Indonesia secara singkat dan jelas.\n\nPertanyaan: {request.message}"
        )
        return ChatResponse(reply=response.text.strip())
    except Exception as e:
        print("Chat Error:", str(e))
        return ChatResponse(reply="Maaf, saya sedang tidak bisa merespons. Coba lagi nanti.")

# ✅ Endpoint 2: Resep terstruktur (hanya untuk resep)
@router.post("/ai/generate-recipe", response_model=RecipeResponse)
async def generate_recipe(request: RecipeRequest):
    # Jika sayur busuk
    if request.freshness_status == "Busuk":
        return RecipeResponse(
            recipe_name="🚫 Tidak Layak Konsumsi",
            ingredients=["Sayuran busuk", "Wadah kompos organik"],
            steps=[
                "Jangan dikonsumsi dalam kondisi apapun.",
                "Masukkan ke dalam tempat kompos.",
                "Tutup rapat untuk hindari bau tidak sedap."
            ]
        )

    # Format prompt
    temp_str = f"{request.temperature}°C" if request.temperature is not None else "tidak diketahui"
    hum_str = f"{request.humidity}%" if request.humidity is not None else "tidak diketahui"
    voc_str = f"{request.voc}" if request.voc is not None else "tidak terdeteksi"

    prompt = f"""
Kamu adalah ahli gizi dan juru masak profesional. Berikan **satu rekomendasi resep spesifik** untuk sayuran "{request.vegetable_name}"
dengan kondisi "{request.freshness_status}".

Data sensor:
- Suhu: {temp_str}
- Kelembaban: {hum_str}
- VOC: {voc_str}

Petunjuk:
- Jika "Hampir Busuk", beri resep cepat saji (<15 menit).
- Jika "Segar", beri resep sehat dan variatif.
- Gunakan bahan umum di dapur Indonesia.
- **Respom hanya dalam JSON SAJA**, tanpa penjelasan:
{{
  "recipe_name": "Nama Resep",
  "ingredients": ["Bahan 1", "Bahan 2"],
  "steps": ["Langkah 1", "Langkah 2"]
}}
"""

    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-flash-latest")
        response = model.generate_content(prompt)

        # Coba parse JSON
        import json
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError:
            # Cari blok JSON
            start = response.text.find("{")
            end = response.text.rfind("}") + 1
            if start != -1 and end > start:
                json_str = response.text[start:end]
                data = json.loads(json_str)
            else:
                raise ValueError("Tidak ada JSON valid")

        # Validasi
        if not all(k in data for k in ["recipe_name", "ingredients", "steps"]):
            raise ValueError("Field JSON tidak lengkap")

        return RecipeResponse(**data)

    except Exception as e:
        print("Resep Error:", str(e))
        return RecipeResponse(
            recipe_name="⚠️ Gagal Generate Resep",
            ingredients=["Maaf, saya tidak bisa membuat resep saat ini."],
            steps=["Silakan coba pertanyaan lain."]
        )