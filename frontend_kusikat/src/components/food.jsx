import React, { useState, useEffect, useRef } from "react";
import { Thermometer, Droplets, Clock, ChefHat, Zap, Send, Leaf, Trash2, X } from "lucide-react";
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

const getCategoryBgCount = (category) => {
  switch (category) {
    case "Segar": return "bg-emerald-100";
    case "Mulai Layu": return "bg-yellow-100";
    case "Hampir Busuk": return "bg-orange-100";
    case "Busuk": return "bg-rose-100";
    default: return "bg-gray-100";
  }
};

const normalizeStatus = (status) => {
  const lower = (status || "").toLowerCase().trim();
  if (lower === "segar") return "Segar";
  if (lower === "mulai layu") return "Mulai Layu";
  if (lower === "hampir busuk") return "Hampir Busuk";
  if (lower === "busuk") return "Busuk";
  return status;
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

function Food() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sayuran, setSayuran] = useState(null);
  const [latestSensor, setLatestSensor] = useState({
    temperature: null,
    humidity: null,
    voc: null,
    status: "Tidak diketahui"
  });

  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const messagesEndRef = useRef(null);
  const hasInitializedChat = useRef(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const formatTemperature = (temp) => temp != null ? `${temp}°C` : "–";
  const formatHumidity = (hum) => hum != null ? `${hum}%` : "–";
  const formatVoc = (voc) => voc != null ? voc : "–";

  const getRecommendationAndEstimate = (status) => {
    switch (status) {
      case "Busuk":
        return { recommendation: "Sayuran busuk. Segera buang.", daysDisplay: "Sudah busuk", estimatedDays: 0 };
      case "Hampir Busuk":
        return { recommendation: "Bahan hampir busuk. Bekukan atau masak hari ini.", daysDisplay: "Kurang dari 1 hari", estimatedDays: 0.5 };
      case "Mulai Layu":
        return { recommendation: "Sayuran mulai layu. Segera olah.", daysDisplay: "1–2 hari", estimatedDays: 1.5 };
      case "Segar":
        return { recommendation: "Sayuran masih segar.", daysDisplay: "3–5 hari", estimatedDays: 4 };
      default:
        return { recommendation: "Menunggu data sensor...", daysDisplay: "–", estimatedDays: null };
    }
  };

  const saveMessageToBackend = async (message, headers) => {
    try {
      const payload = {
        message_type: message.type,
        sender: message.sender,
        content: message.content || null,
        recipe_name: message.recipe_name || null,
        ingredients: message.ingredients || null,
        steps: message.steps || null
      };
      const res = await fetch("http://localhost:8000/api/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        return saved.created_at;
      }
    } catch (err) {
      console.error("Gagal menyimpan pesan ke backend:", err);
    }
    return new Date().toISOString();
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const sensorRes = await fetch("http://localhost:8000/api/sensors/latest", { headers });
      let sensorData = { temperature: null, humidity: null, voc: null, status: "Tidak diketahui" };
      if (sensorRes.ok) {
        const sensor = await sensorRes.json();
        sensorData = {
          temperature: typeof sensor.temperature === 'number' ? sensor.temperature : null,
          humidity: typeof sensor.humidity === 'number' ? sensor.humidity : null,
          voc: typeof sensor.voc === 'number' ? sensor.voc : null,
          status: sensor.status || "Tidak diketahui"
        };
      }
      setLatestSensor(sensorData);

      const statusInfo = getRecommendationAndEstimate(sensorData.status);
      const { recommendation, daysDisplay, estimatedDays } = statusInfo;
      setSayuran({
        category: sensorData.status,
        recommendation,
        TTI: sensorData.temperature,
        estimatedDaysLeft: estimatedDays,
        daysDisplay: daysDisplay || "–",
        image_path: null
      });

      const chatRes = await fetch("http://localhost:8000/api/chat-history", { headers });
      let initialChat = [];
      if (chatRes.ok) {
        const saved = await chatRes.json();
        initialChat = saved.map(msg => ({
          id: msg.id,
          type: msg.message_type,
          sender: msg.sender,
          content: msg.content,
          recipe_name: msg.recipe_name,
          ingredients: msg.ingredients || [],
          steps: msg.steps || [],
          created_at: msg.created_at,
          emoji: "🧑‍🍳"
        }));
      }

      if (!hasInitializedChat.current && initialChat.length === 0) {
        const now = new Date();
        const hours = now.getHours();
        let greeting = "Hai!";
        if (hours >= 5 && hours < 12) greeting = "Selamat pagi!";
        else if (hours >= 12 && hours < 15) greeting = "Selamat siang!";
        else if (hours >= 15 && hours < 18) greeting = "Selamat sore!";
        else if (hours >= 18 || hours < 5) greeting = "Halo malam!";

        const botGreeting1 = { type: "text", sender: "bot", content: `${greeting} 👋 Saya **Chef Sayuran**, asisten masak pintar Anda.` };
        const botGreeting2 = { type: "text", sender: "bot", content: `🔍 ${recommendation} • Diperkirakan layu dalam: ${daysDisplay}.` };

        const time1 = await saveMessageToBackend(botGreeting1, headers);
        const time2 = await saveMessageToBackend(botGreeting2, headers);

        setChatMessages([
          { ...botGreeting1, created_at: time1 },
          { ...botGreeting2, created_at: time2 }
        ]);
        hasInitializedChat.current = true;
      } else {
        setChatMessages(initialChat);
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Fetch Error:", err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => {
      clearInterval(interval);
      hasInitializedChat.current = false;
    };
  }, []);

  const handleSend = async () => {
    if (!userInput.trim()) return;

    const userMsg = { type: "text", sender: "user", content: userInput.trim(), created_at: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setChatMessages(prev => [...prev, { type: "text", sender: "bot", content: "🧑‍🍳 Menulis jawaban...", created_at: new Date().toISOString() }]);

    const token = localStorage.getItem("access_token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const userTime = await saveMessageToBackend(userMsg, headers);

    try {
      const isRecipe = /resep|masak|olah|tumis|cepat saji|menu/i.test(userMsg.content);

      if (isRecipe && sayuran) {
        const payload = {
          vegetable_name: "Bayam",
          freshness_status: normalizeStatus(sayuran.category),
          temperature: latestSensor.temperature,
          humidity: latestSensor.humidity,
          voc: latestSensor.voc,
          estimated_days_left: sayuran.estimatedDaysLeft
        };

        const response = await fetch("http://localhost:8000/api/ai/generate-recipe", {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });

        setChatMessages(prev => prev.slice(0, -1));

        if (response.ok) {
          const data = await response.json();
          const botTime = new Date().toISOString();
          const recipeMsg = {
            sender: "bot",
            type: "recipe",
            recipe_name: data.recipe_name || "Resep Tidak Diketahui",
            emoji: "🧑‍🍳",
            ingredients: Array.isArray(data.ingredients) ? data.ingredients : ["Bahan tidak tersedia"],
            steps: Array.isArray(data.steps) ? data.steps : ["Langkah tidak tersedia"],
            created_at: botTime
          };
          setChatMessages(prev => [...prev, recipeMsg]);
          await saveMessageToBackend(recipeMsg, headers);
        } else {
          const botTime = new Date().toISOString();
          const errorMsg = { type: "text", sender: "bot", content: "Maaf, saya kesulitan membuat resep saat ini 😓", created_at: botTime };
          setChatMessages(prev => [...prev, errorMsg]);
          await saveMessageToBackend(errorMsg, headers);
        }
      } else {
        const now = new Date();
        const hours = now.getHours();
        let timeOfDay = "pagi";
        if (hours >= 10 && hours < 15) timeOfDay = "siang";
        else if (hours >= 15 && hours < 18) timeOfDay = "sore";
        else if (hours >= 18 || hours < 5) timeOfDay = "malam";

        const chatPayload = {
          message: userMsg.content,
          time_context: `Saat ini jam ${now.toLocaleTimeString('id-ID')}, waktu ${timeOfDay} di Indonesia.`
        };

        const chatRes = await fetch("http://localhost:8000/api/ai/chat", {
          method: "POST",
          headers,
          body: JSON.stringify(chatPayload)
        });

        setChatMessages(prev => prev.slice(0, -1));

        if (chatRes.ok) {
          const data = await chatRes.json();
          const botTime = new Date().toISOString();
          const replyMsg = { type: "text", sender: "bot", content: data.reply || "Maaf, saya tidak mengerti.", created_at: botTime };
          setChatMessages(prev => [...prev, replyMsg]);
          await saveMessageToBackend(replyMsg, headers);
        } else {
          const botTime = new Date().toISOString();
          const errorMsg = { type: "text", sender: "bot", content: "Maaf, saya sedang offline. Coba lagi nanti.", created_at: botTime };
          setChatMessages(prev => [...prev, errorMsg]);
          await saveMessageToBackend(errorMsg, headers);
        }
      }
    } catch (err) {
      console.error("Error:", err);
      const botTime = new Date().toISOString();
      const errorMsg = { type: "text", sender: "bot", content: "Koneksi gagal. Periksa internet Anda.", created_at: botTime };
      setChatMessages(prev => [...prev.slice(0, -1), errorMsg]);
      await saveMessageToBackend(errorMsg, headers);
    }
  };

  const handleQuickReply = (text) => {
    setUserInput(text);
    setTimeout(handleSend, 100);
  };

  const confirmDelete = async () => {
    const token = localStorage.getItem("access_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      await fetch("http://localhost:8000/api/chat-history", {
        method: "DELETE",
        headers
      });
      setChatMessages([]);
      setShowConfirmModal(false);
    } catch (err) {
      console.error("Gagal menghapus riwayat:", err);
      setShowConfirmModal(false);
    }
  };

  const clearChatHistory = () => {
    setShowConfirmModal(true);
  };

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
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCategoryBgCount(sayuran?.category || "Tidak diketahui")} ${getCategoryColor(sayuran?.category || "Tidak diketahui")}`}>
                    {sayuran?.category || "Tidak diketahui"}
                  </span>
                </div>
                <p className="text-gray-700">
                  {sayuran?.category === "Busuk"
                    ? "Sayuran sudah busuk – segera buang"
                    : sayuran
                    ? `Masih ${sayuran.category.toLowerCase()}, diperkirakan layu dalam ${sayuran.daysDisplay}.`
                    : "Menunggu data dari sensor..."}
                </p>
              </div>
            </div>

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
                  <p className="text-xs text-gray-600">Status</p>
                  <p className="font-bold text-gray-900">{latestSensor.status}</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-amber-600" /> JUNBOT
                </h3>
                {chatMessages.length > 0 && (
                  <button
                    onClick={clearChatHistory}
                    className="text-xs text-gray-500 hover:text-rose-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Hapus Riwayat
                  </button>
                )}
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 h-96 overflow-y-auto mb-4">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">Belum ada percakapan.</p>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div key={msg.id || index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} mb-4`}>
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
                            <p className="text-xs text-gray-400 mt-2 text-right">{formatTime(msg.created_at)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[85%]">
                          <div className="bg-emerald-100 text-emerald-900 rounded-2xl rounded-br-sm p-4">
                            <p className="text-sm font-medium">{String(msg.content)}</p>
                            <p className="text-xs text-emerald-700 mt-2 text-right">{formatTime(msg.created_at)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <button onClick={() => handleQuickReply("Resep cepat saji?")} className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3.5 py-1.5 rounded-full font-medium transition">⚡ Cepat Saji</button>
                <button onClick={() => handleQuickReply("Menu sehat?")} className="text-xs bg-teal-100 hover:bg-teal-200 text-teal-800 px-3.5 py-1.5 rounded-full font-medium transition">🥣 Sehat & Hangat</button>
                {sayuran?.category === "Mulai Layu" && (
                  <button onClick={() => handleQuickReply("Sayuran mulai layu, resep apa?")} className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3.5 py-1.5 rounded-full font-medium transition">🍃 Mulai Layu?</button>
                )}
                {sayuran?.category === "Hampir Busuk" && (
                  <button onClick={() => handleQuickReply("Sayuran hampir busuk, resep apa?")} className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-3.5 py-1.5 rounded-full font-medium transition">⚠️ Prioritas Pakai</button>
                )}
                {sayuran?.category === "Busuk" && (
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

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative animate-fade-in">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Riwayat Chat?</h3>
              <p className="text-sm text-gray-600 mb-6">
                Aksi ini akan menghapus seluruh riwayat percakapan Anda secara permanen. Apakah Anda yakin?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blob { 
          0% { transform: translate(0,0) scale(1); } 
          33% { transform: translate(30px,-50px) scale(1.1); } 
          66% { transform: translate(-20px,20px) scale(0.95); } 
          100% { transform: translate(0,0) scale(1); } 
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}

export default Food;