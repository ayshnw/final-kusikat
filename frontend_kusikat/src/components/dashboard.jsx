import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, Zap } from 'lucide-react';
import Sidebar from "../assets/sidebar";
import Header from "../assets/navbar";

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState('home');
  const [animateCards, setAnimateCards] = useState(false);

  const [latestSensor, setLatestSensor] = useState({ 
    temperature: 0, 
    humidity: 0, 
    voc: 0,
    status: "segar"
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Ambil data dari backend FastAPI
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = token 
        ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } 
        : { "Content-Type": "application/json" };

      // Ambil data terbaru
      const latestRes = await fetch("http://localhost:8000/api/sensors/latest", { headers });
      if (!latestRes.ok) throw new Error(`Gagal ambil data terbaru: ${latestRes.status}`);
      const latest = await latestRes.json();

      // Ambil 30 data historis terbaru
      const historyRes = await fetch("http://localhost:8000/api/sensors/history?limit=30", { headers });
      if (!historyRes.ok) throw new Error(`Gagal ambil data historis: ${historyRes.status}`);
      const history = await historyRes.json();

      // Update state
      setLatestSensor({
        temperature: latest.temperature ?? 0,
        humidity: latest.humidity ?? 0,
        voc: latest.voc ?? 0,
        status: latest.status ?? "segar"
      });

      // Format data untuk grafik
      const formattedHistory = history.map(entry => ({
        time: entry.time, // format: "HH:MM"
        suhu: entry.suhu ?? 0,
        kelembapan: entry.kelembapan ?? 0,
        voc: entry.voc ?? 0
      }));

      setChartData(formattedHistory);
      setError(null);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Gagal mengambil data dari server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000); // refresh tiap 5 detik
    setTimeout(() => setAnimateCards(true), 100);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(timer);
      clearInterval(interval);
    };
  }, []);

  const getGreeting = () => 'Selamat Datang';
  const getUserName = () => {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) return "Pengguna";
    try {
      const user = JSON.parse(userRaw);
      return user?.username || "Pengguna";
    } catch {
      return "Pengguna";
    }
  };

  if (loading && chartData.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Memuat data sensor dari database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="text-red-600">Error: {error}</p>
        <button 
          onClick={fetchDashboardData}
          className="ml-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu} 
      />

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
        <Header isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} currentTime={currentTime} />

        <div className="p-4 md:p-8 space-y-6">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 shadow-2xl transform hover:scale-[1.02] transition-transform duration-300"
               style={{
                 background: 'linear-gradient(135deg, rgba(25, 43, 13, 0.85), rgba(45, 74, 24, 0.75))',
                 backdropFilter: 'blur(20px)',
               }}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -ml-32 -mb-32 blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 bg-white bg-opacity-15 backdrop-blur-md rounded-2xl flex items-center justify-center animate-bounce-slow shadow-lg">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-white text-3xl md:text-4xl font-bold">
                    {getGreeting()}, {getUserName()}
                  </h2>
                  <p className="text-green-100 mt-1 text-sm">
                    Status: <span className="font-semibold">{latestSensor.status}</span> • Terakhir update: {currentTime.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex gap-4 md:grid md:grid-cols-3 md:gap-6 overflow-x-auto px-2 md:px-0">
            {/* Suhu */}
            <div className={`min-w-[250px] rounded-2xl p-6 shadow-xl transform transition-all duration-500 hover:scale-105 hover:shadow-2xl ${animateCards ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                 style={{ backgroundColor: '#2d4a18', transitionDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-white bg-opacity-15 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg">
                  <Thermometer className="w-7 h-7 text-white" />
                </div>
                <div className="px-3 py-1 bg-white bg-opacity-15 backdrop-blur-md rounded-full">
                  <span className="text-white text-xs font-medium">Live</span>
                </div>
              </div>
              <h3 className="text-green-200 text-sm font-medium mb-2">Suhu</h3>
              <p className="text-white text-4xl font-bold">{latestSensor.temperature.toFixed(1)}°C</p>
            </div>

            {/* Kelembapan */}
            <div className={`min-w-[250px] rounded-2xl p-6 shadow-xl transform transition-all duration-500 hover:scale-105 hover:shadow-2xl ${animateCards ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                 style={{ backgroundColor: '#2d4a18', transitionDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-white bg-opacity-15 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg">
                  <Droplets className="w-7 h-7 text-white" />
                </div>
                <div className="px-3 py-1 bg-white bg-opacity-15 backdrop-blur-md rounded-full">
                  <span className="text-white text-xs font-medium">Live</span>
                </div>
              </div>
              <h3 className="text-green-200 text-sm font-medium mb-2">Kelembapan</h3>
              <p className="text-white text-4xl font-bold">{latestSensor.humidity.toFixed(1)} %RH</p>
            </div>

            {/* VOC */}
            <div className={`min-w-[250px] rounded-2xl p-6 shadow-xl transform transition-all duration-500 hover:scale-105 hover:shadow-2xl ${animateCards ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                 style={{ backgroundColor: '#2d4a18', transitionDelay: '0.3s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-white bg-opacity-15 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div className="px-3 py-1 bg-white bg-opacity-15 backdrop-blur-md rounded-full">
                  <span className="text-white text-xs font-medium">Live</span>
                </div>
              </div>
              <h3 className="text-green-200 text-sm font-medium mb-2">VOC</h3>
              <p className="text-white text-4xl font-bold">{latestSensor.voc.toFixed(1)}</p>
              <p className="text-green-300 text-xs mt-1 opacity-80">ppm</p>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-200"
               style={{ backgroundColor: '#5a7052' }}>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h3 className="text-white text-xl md:text-2xl font-bold">Grafik 30 Data Sensor Terakhir</h3>
              <div className="flex gap-2 flex-wrap">
                <div className="px-4 py-2 bg-white bg-opacity-15 backdrop-blur-md rounded-lg flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ec9bb6' }} />
                  <span className="text-white text-sm font-medium">Suhu (°C)</span>
                </div>
                <div className="px-4 py-2 bg-white bg-opacity-15 backdrop-blur-md rounded-lg flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#93c5fd' }} />
                  <span className="text-white text-sm font-medium">Kelembapan (%)</span>
                </div>
                <div className="px-4 py-2 bg-white bg-opacity-15 backdrop-blur-md rounded-lg flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }} />
                  <span className="text-white text-sm font-medium">VOC (ppm)</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-inner">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSuhu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec9bb6" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#ec9bb6" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="colorKelembapan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="colorVOC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#6b7280" 
                      tick={{ fill: '#6b7280' }} 
                      style={{ fontSize: '11px' }} 
                    />
                    <YAxis 
                      domain={[0, 'auto']} 
                      stroke="#6b7280" 
                      tick={{ fill: '#6b7280' }} 
                      style={{ fontSize: '11px' }} 
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'voc') return [parseFloat(value).toFixed(1), 'VOC (ppm)'];
                        if (name === 'suhu') return [`${parseFloat(value).toFixed(1)}°C`, 'Suhu'];
                        if (name === 'kelembapan') return [`${parseFloat(value).toFixed(1)}%`, 'Kelembapan'];
                        return [value, name];
                      }}
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                      }} 
                    />
                    <Area type="monotone" dataKey="suhu" stroke="#ec9bb6" strokeWidth={2.5} fill="url(#colorSuhu)" />
                    <Area type="monotone" dataKey="kelembapan" stroke="#93c5fd" strokeWidth={2.5} fill="url(#colorKelembapan)" />
                    <Area type="monotone" dataKey="voc" stroke="#fbbf24" strokeWidth={2.5} fill="url(#colorVOC)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">Tidak ada data historis</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp { 
          from { opacity: 0; transform: translateY(30px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes bounce-slow { 
          0%, 100% { transform: translateY(-5%); } 
          50% { transform: translateY(0); } 
        }
        .animate-bounce-slow { 
          animation: bounce-slow 2s infinite; 
        }
      `}</style>
    </div>
  );
};

export default Dashboard;