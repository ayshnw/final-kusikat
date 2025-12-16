import React, { useState, useEffect, useRef } from "react";
import { Thermometer, Droplets, Clock, ChefHat, Zap, Send, Leaf } from "lucide-react";
import Sidebar from "../assets/sidebar";
import Navbar from "../assets/navbar";

const VegetableImage = ({ image_path }) => {
  const imageUrl = image_path
    ? `http://localhost:8000${image_path.startsWith('/') ? image_path : `/${image_path}`}`
    : `/assets/bayam.jpg`;

  return (
    <img
      src={imageUrl}
      alt="Sayuran"
      className="w-20 h-20 rounded-2xl object-cover shadow-lg border-2 border-emerald-200"
      onError={(e) => (e.target.src = "/api/placeholder/80/80")}
    />
  );
};

const getCategoryColor = (category) => {
  switch (category) {
    case "Segar": return "text-emerald-700";
    case "Mulai Layu": return "text-yellow-600";
    case "Hampir Busuk": return "text-orange-600";
    case "Busuk": return "text-rose-700";
    default: return "text-gray-700";
  }
};

const getCategoryBgColor = (category) => {
  switch (category) {
    case "Segar": return "bg-emerald-100";
    case "Mulai Layu": return "bg-yellow-100";
    case "Hampir Busuk": return "bg-orange-100";
    case "Busuk": return "bg-rose-100";
    default: return "bg-gray-100";
  }
};

// 🔥 LOGIKA UTAMA: Sensor-only + estimasi hari
const calculateStatusFromSensors = (voc, temperature, humidity) => {
  if (voc == null || temperature == null || humidity == null) {
    return {
      category: "Tidak diketahui",
      recommendation: "Menunggu data sensor...",
      TTI: null,
      estimatedDaysLeft: null,
      daysDisplay: "–"
    };
  }

  const TTI = temperature; // karena tidak ada waktu nyata

  // Aturan prioritas dari permintaanmu
  if (voc > 250) {
    return {
      category: "Hampir Busuk",
      recommendation: "Periksa makanan. Buat menu cepat seperti tumis/sup.",
      TTI,
      estimatedDaysLeft: 0.5,
      daysDisplay: "Kurang dari 1 hari"
    };
  } else if (voc > 180 && TTI > 24) {
    return {
      category: "Hampir Busuk",
      recommendation: "Bahan hampir busuk. Bekukan atau masak.",
      TTI,
      estimatedDaysLeft: 0.5,
      daysDisplay: "Kurang dari 1 hari"
    };
  } else if (TTI > 24) {
    return {
      category: "Mulai Layu",
      recommendation: "Kondisi suhu buruk. Gunakan dalam 1 hari.",
      TTI,
      estimatedDaysLeft: 1,
      daysDisplay: "1 hari"
    };
  }

  // Fallback ke logika tabel sensor
  if (voc > 400 && temperature > 15 && humidity < 85) {
    return {
      category: "Busuk",
      recommendation: "Sayuran busuk. Segera buang.",
      TTI,
      estimatedDaysLeft: 0,
      daysDisplay: "Sudah busuk"
    };
  } else if (voc > 150 && temperature > 10 && temperature <= 15 && humidity < 90) {
    return {
      category: "Hampir Busuk",
      recommendation: "Sayuran hampir busuk. Masak hari ini.",
      TTI,
      estimatedDaysLeft: 0.5,
      daysDisplay: "Kurang dari 1 hari"
    };
  } else if (voc > 50 && temperature > 5 && temperature <= 10 && humidity >= 90 && humidity <= 95) {
    return {
      category: "Mulai Layu",
      recommendation: "Sayuran mulai layu. Segera olah.",
      TTI,
      estimatedDaysLeft: 1.5,
      daysDisplay: "1–2 hari"
    };
  } else if (voc <= 50 && temperature >= 0 && temperature <= 5 && humidity >= 95 && humidity <= 98) {
    return {
      category: "Segar",
      recommendation: "Sayuran masih segar.",
      TTI,
      estimatedDaysLeft: 4,
      daysDisplay: "3–5 hari"
    };
  }

  // Default aman
  return {
    category: "Segar",
    recommendation: "Kondisi penyimpanan baik.",
    TTI,
    estimatedDaysLeft: 3,
    daysDisplay: "2–4 hari"
  };
};

function Food() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sayuran, setSayuran] = useState(null);
  const [latestSensor, setLatestSensor] = useState({
    temperature: null,
    humidity: null,
    voc: null
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const messagesEndRef = useRef(null);

  const formatTemperature = (temp) => temp != null ? `${temp}°C` : "–";
  const formatHumidity = (hum) => hum != null ? `${hum}%` : "–";
  const formatVoc = (voc) => voc != null ? voc : "–";
  const formatTTI = (tti) => tti != null ? tti.toFixed(1) : "–";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Ambil sensor terkini
      const sensorRes = await fetch("http://localhost:8000/api/sensors/latest", { headers });
      let sensorData = { temperature: null, humidity: null, voc: null };
      if (sensorRes.ok) {
        const sensor = await sensorRes.json();
        sensorData = {
          temperature: typeof sensor.temperature === 'number' ? sensor.temperature : null,
          humidity: typeof sensor.humidity === 'number' ? sensor.humidity : null,
          voc: typeof sensor.voc === 'number' ? sensor.voc : null
        };
      }
      setLatestSensor(sensorData);

      // 🔥 Hitung status + estimasi hari
      const { category, recommendation, TTI, estimatedDaysLeft, daysDisplay } = calculateStatusFromSensors(
        sensorData.voc,
        sensorData.temperature,
        sensorData.humidity
      );

      setSayuran({
        category,
        recommendation,
        TTI,
        estimatedDaysLeft,
        daysDisplay,
        image_path: null
      });

      setChatMessages([
        { 
          type: "text", 
          sender: "bot", 
          content: "Hai! 👋 Saya **Chef Sayuran**, asisten masak pintar Anda." 
        },
        {
          type: "text",
          sender: "bot",
          content: `🔍 ${recommendation} • Diperkirakan layu dalam: ${daysDisplay}.`
        }
      ]);

      setIsLoading(false);
    } catch (err) {
      console.error("Fetch Error:", err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!userInput.trim()) return;

    const userMsg = userInput.trim();
    setChatMessages(prev => [...prev, { type: "text", sender: "user", content: userMsg }]);
    setUserInput("");
    setChatMessages(prev => [...prev, { type: "text", sender: "bot", content: "🧑‍🍳 Menulis jawaban..." }]);

    try {
      const token = localStorage.getItem("access_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const isRecipe = /resep|masak|olah|tumis|cepat saji|menu/i.test(userMsg);

      if (isRecipe && sayuran) {
        const payload = {
          user_message: userMsg,
          vegetable_name: "Bayam",
          freshness_status: sayuran.category,
          temperature: latestSensor.temperature,
          humidity: latestSensor.humidity,
          voc: latestSensor.voc
        };

        const response = await fetch("http://localhost:8000/api/ai/generate-recipe", {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });

        setChatMessages(prev => prev.slice(0, -1));

        if (response.ok) {
          const data = await response.json();
          setChatMessages(prev => [
            ...prev,
            {
              sender: "bot",
              type: "recipe",
              recipe_name: data.recipe_name || "Resep Tidak Diketahui",
              emoji: "🧑‍🍳",
              ingredients: Array.isArray(data.ingredients) ? data.ingredients : ["Bahan tidak tersedia"],
              steps: Array.isArray(data.steps) ? data.steps : ["Langkah tidak tersedia"]
            }
          ]);
        } else {
          setChatMessages(prev => [...prev, { type: "text", sender: "bot", content: "Maaf, saya kesulitan membuat resep saat ini 😓" }]);
        }
      } else {
        const chatRes = await fetch("http://localhost:8000/api/ai/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({ message: userMsg })
        });

        setChatMessages(prev => prev.slice(0, -1));

        if (chatRes.ok) {
          const data = await chatRes.json();
          setChatMessages(prev => [...prev, { type: "text", sender: "bot", content: data.reply || "Maaf, saya tidak mengerti." }]);
        } else {
          setChatMessages(prev => [...prev, { type: "text", sender: "bot", content: "Maaf, saya sedang offline. Coba lagi nanti." }]);
        }
      }
    } catch (err) {
      console.error("Error:", err);
      setChatMessages(prev => [
        ...prev.slice(0, -1),
        { type: "text", sender: "bot", content: "Koneksi gagal. Periksa internet Anda." }
      ]);
    }
  };

  const handleQuickReply = (text) => {
    setUserInput(text);
    setTimeout(handleSend, 100);
  };

  const currentTime = new Date();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="text-center">
          <Leaf className="w-12 h-12 text-emerald-600 mx-auto animate-pulse" />
          <p className="text-lg text-gray-700 mt-3">Memuat data sensor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" style={{ backgroundColor: 'rgba(16, 185, 129, 0.4)' }}></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" style={{ backgroundColor: 'rgba(6, 182, 212, 0.3)' }}></div>
      </div>

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeMenu="food"
        setActiveMenu={() => {}}
      />

      <div className="flex-1 flex flex-col relative z-10">
        <Navbar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          currentTime={currentTime}
        />

        <div className="flex-1 px-6 py-6 overflow-auto">
          <div className="text-center py-4 mb-8">
            <div className="flex items-center justify-center gap-2">
              <Leaf className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-700">
                Smart Sayuran
              </h1>
            </div>
            <p className="text-sm text-gray-600 mt-1">Pantau & olah sayuran Anda secara cerdas</p>
          </div>

          <div className="max-w-3xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl p-7 shadow-xl border border-emerald-100">
            <div className="flex items-start gap-6 mb-8">
              <VegetableImage image_path={null} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">Bayam</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCategoryBgColor(sayuran.category)} ${getCategoryColor(sayuran.category)}`}>
                    {sayuran.category}
                  </span>
                </div>
                <p className="text-gray-700">
                  {sayuran.category === "Busuk"
                    ? "Sayuran sudah busuk – segera buang"
                    : `Masih ${sayuran.category.toLowerCase()}, diperkirakan layu dalam ${sayuran.daysDisplay}.`}
                </p>
              </div>
            </div>

            {/* Sensor + TTI */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3 border border-blue-100">
                <Thermometer className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">Suhu</p>
                  <p className="font-bold text-gray-900">{formatTemperature(latestSensor.temperature)}</p>
                </div>
              </div>
              <div className="bg-cyan-50 p-4 rounded-xl flex items-center gap-3 border border-cyan-100">
                <Droplets className="w-6 h-6 text-cyan-600" />
                <div>
                  <p className="text-xs text-gray-600">Kelembaban</p>
                  <p className="font-bold text-gray-900">{formatHumidity(latestSensor.humidity)}</p>
                </div>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl flex items-center gap-3 border border-amber-100">
                <Zap className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="text-xs text-gray-600">VOC</p>
                  <p className="font-bold text-gray-900">{formatVoc(latestSensor.voc)}</p>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl flex items-center gap-3 border border-purple-100">
                <Clock className="w-6 h-6 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-600">TTI</p>
                  <p className="font-bold text-gray-900">{formatTTI(sayuran.TTI)}</p>
                </div>
              </div>
            </div>

            {/* Chat */}
            <div className="mt-6">
              <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-600" /> Chef Sayuran
              </h3>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 h-96 overflow-y-auto mb-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} mb-4`}>
                    {msg.sender === "bot" ? (
                      <div className="max-w-[85%]">
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm p-4 shadow-sm">
                          {msg.type === "text" ? (
                            <p className="text-sm text-gray-800 leading-relaxed">{String(msg.content)}</p>
                          ) : msg.type === "recipe" ? (
                            <div>
                              <p className="text-sm font-semibold text-gray-900 mb-2">
                                {msg.emoji} <strong>{msg.recipe_name}</strong>
                              </p>
                              <div className="mt-2">
                                <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                                  <Leaf className="w-3 h-3" /> Bahan:
                                </p>
                                <ul className="list-disc pl-5 text-xs text-gray-700 mt-1 space-y-0.5">
                                  {msg.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                                </ul>
                              </div>
                              <div className="mt-3">
                                <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                                  <ChefHat className="w-3 h-3" /> Langkah:
                                </p>
                                <ol className="list-decimal pl-5 text-xs text-gray-700 mt-1 space-y-0.5">
                                  {msg.steps.map((step, i) => <li key={i}>{step}</li>)}
                                </ol>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[85%]">
                        <div className="bg-emerald-100 text-emerald-900 rounded-2xl rounded-br-sm p-4">
                          <p className="text-sm font-medium">{String(msg.content)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <button onClick={() => handleQuickReply("Resep cepat saji?")} className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3.5 py-1.5 rounded-full font-medium transition">⚡ Cepat Saji</button>
                <button onClick={() => handleQuickReply("Menu sehat?")} className="text-xs bg-teal-100 hover:bg-teal-200 text-teal-800 px-3.5 py-1.5 rounded-full font-medium transition">🥣 Sehat & Hangat</button>
                {sayuran.category === "Mulai Layu" && (
                  <button onClick={() => handleQuickReply("Sayuran mulai layu, resep apa?")} className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3.5 py-1.5 rounded-full font-medium transition">🍃 Mulai Layu?</button>
                )}
                {sayuran.category === "Hampir Busuk" && (
                  <button onClick={() => handleQuickReply("Sayuran hampir busuk, resep apa?")} className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-3.5 py-1.5 rounded-full font-medium transition">⚠️ Prioritas Pakai</button>
                )}
                {sayuran.category === "Busuk" && (
                  <button onClick={() => handleQuickReply("Sayuran sudah busuk, apa yang harus saya lakukan?")} className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-800 px-3.5 py-1.5 rounded-full font-medium transition">🚫 Buang & Kompos</button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ketik pesan tentang sayuran Anda..."
                  className="flex-1 border border-gray-300 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  onClick={handleSend}
                  disabled={!userInput.trim()}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-2.5 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob { 0% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-50px) scale(1.1); } 66% { transform: translate(-20px,20px) scale(0.95); } 100% { transform: translate(0,0) scale(1); } }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  );
}

export default Food;