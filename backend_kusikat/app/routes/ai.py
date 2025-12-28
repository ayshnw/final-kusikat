# app/routes/ai.py
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import httpx
import os
import json
import jwt
from dotenv import load_dotenv

from app.schemas import RecipeRequest, RecipeResponse, ChatRequest, ChatResponse

load_dotenv()

router = APIRouter()

# === Groq Config ===
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "llama-3.1-8b-instant"

if not GROQ_API_KEY:
    print("⚠️ WARNING: GROQ_API_KEY tidak ditemukan di .env")

async def call_groq(prompt: str) -> str:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY belum dikonfigurasi")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": DEFAULT_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 600,
        "top_p": 1,
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GROQ_API_URL, json=payload, headers=headers)
            if response.status_code != 200:
                error_detail = response.json().get("error", {}).get("message", response.text)
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Groq API error: {error_detail}"
                )
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Koneksi ke Groq gagal: {str(e)}")


def get_user_name_from_token(authorization: Optional[str]) -> str:
    """Ambil username dari token JWT (manual atau Google), fallback ke 'Pengguna'."""
    if not authorization or not authorization.startswith("Bearer "):
        return "Pengguna"

    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get("username", "Pengguna")
    except Exception:
        return "Pengguna"


@router.post("/ai/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest, authorization: Optional[str] = Header(None)):
    time_hint = f"\n[{request.time_context}]" if request.time_context else ""
    user_name = get_user_name_from_token(authorization)

    prompt = (
        f"Kamu adalah JUNBOT, asisten AI yang cerdas, membantu, dan ramah dalam Bahasa Indonesia. "
        f"Kamu bisa menjawab berbagai pertanyaan — mulai dari resep masakan, tips harian, "
        f"penjelasan ilmiah sederhana, hingga saran praktis untuk kehidupan sehari-hari. "
        f"Selalu berikan jawaban yang jelas, ringkas, dan relevan. "
        f"Gunakan nama '{user_name}' jika sesuai untuk personalisasi. "
        f"{time_hint}\n\n"
        f"Pertanyaan pengguna: {request.message}"
    )
    
    try:
        reply = await call_groq(prompt)
        return ChatResponse(reply=reply.strip())
    except Exception as e:
        print("Chat Error:", str(e))
        return ChatResponse(reply="Maaf, saya sedang tidak bisa merespons. Coba lagi nanti.")


@router.post("/ai/generate-recipe", response_model=RecipeResponse)
async def generate_recipe(request: RecipeRequest, authorization: Optional[str] = Header(None)):
    user_name = get_user_name_from_token(authorization)

    # Jika item sudah busuk
    if request.freshness_status == "Busuk":
        return RecipeResponse(
            recipe_name="🚫 Tidak Layak Konsumsi",
            ingredients=["Makanan busuk", "Wadah kompos organik"],
            steps=[
                "Jangan dikonsumsi dalam kondisi apapun.",
                "Masukkan ke dalam tempat kompos.",
                "Tutup rapat untuk hindari bau tidak sedap."
            ]
        )

    # Format data sensor (opsional)
    temp_str = f"{request.temperature}°C" if request.temperature is not None else "tidak diketahui"
    hum_str = f"{request.humidity}%" if request.humidity is not None else "tidak diketahui"
    voc_str = f"{request.voc}" if request.voc is not None else "tidak terdeteksi"
    estimated_str = f"Makanan diperkirakan tidak segar dalam {request.estimated_days_left:.1f} hari." if request.estimated_days_left is not None else ""

    food_item = request.food_item or "bahan makanan ini"

    prompt = f"""
Hai Chef! Kamu sedang membantu {user_name} yang ingin memasak atau menggunakan **{food_item}**.

Status kesegaran: "{request.freshness_status}". {estimated_str}

Data lingkungan (jika relevan):
- Suhu: {temp_str}
- Kelembaban: {hum_str}
- VOC (gas organik): {voc_str}

Instruksi:
- Jika status "Hampir Busuk", berikan resep CEPAT SAJI (<15 menit) yang bisa menghabiskan bahan tersebut.
- Jika "Segar", berikan resep sehat, lezat, dan variatif (boleh tradisional atau modern).
- Gunakan bahan yang umum di dapur Indonesia (bawang, cabai, kecap, telur, dll).
- Sapa {user_name} dengan hangat di awal resep.
- **Hanya keluarkan JSON murni tanpa teks tambahan**, dalam format:
{{
  "recipe_name": "Nama Resep",
  "ingredients": ["Bahan 1", "Bahan 2", "..."],
  "steps": ["Langkah 1", "Langkah 2", "..."]
}}
"""

    try:
        response_text = await call_groq(prompt)

        # Coba ekstrak JSON dari respons (beberapa model menyisipkan penjelasan)
        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if start != -1 and end > start:
                json_str = response_text[start:end]
                data = json.loads(json_str)
            else:
                raise ValueError("Tidak ada JSON valid dalam respons")

        required_keys = {"recipe_name", "ingredients", "steps"}
        if not required_keys.issubset(data.keys()):
            raise ValueError("Field JSON tidak lengkap")

        return RecipeResponse(**data)

    except Exception as e:
        print("Resep Error:", str(e))
        return RecipeResponse(
            recipe_name="⚠️ Gagal Generate Resep",
            ingredients=["Maaf, saya tidak bisa membuat resep saat ini."],
            steps=["Silakan coba dengan bahan lain atau tanyakan sesuatu yang berbeda."]
        )