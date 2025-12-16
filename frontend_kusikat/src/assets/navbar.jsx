import React, { useState, useEffect } from "react";
import { Menu, X, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Navbar = ({ isSidebarOpen, setIsSidebarOpen, currentTime }) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // State user dari API (bukan hanya localStorage)
  const [user, setUser] = useState({
    name: "Pengguna",
    phone: "",
    has_password: false,
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [newPhone, setNewPhone] = useState("");

  // Password states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tempPassword, setTempPassword] = useState(""); // untuk set password pertama kali

  const navigate = useNavigate();

  // === Ambil data user dari /api/me ===
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("http://localhost:8000/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const userData = {
            name: data.username || "Pengguna",
            phone: data.phone_number || "",
            has_password: data.has_password,
            email: data.email,
          };
          setUser(userData);
          setNewPhone(data.phone_number || "");
          // Simpan ke localStorage juga (opsional)
          localStorage.setItem("user", JSON.stringify(data));
        }
      } catch (err) {
        console.error("Gagal ambil data user:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  // === Simpan Nomor Telepon ===
  const handleSavePhone = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch("http://localhost:8000/api/user/phone", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // [PERBAIKAN 2]
        },
        body: JSON.stringify({ phone_number: newPhone }),
      });

      if (res.ok) {
        const updatedUser = { ...user, phone: newPhone };
        setUser(updatedUser);
        // Update localStorage
        const stored = localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          localStorage.setItem("user", JSON.stringify({ ...parsed, phone_number: newPhone }));
        }
        setIsEditing(false);
        alert("Nomor telepon berhasil diperbarui!");
      } else {
        const err = await res.json();
        alert(err.detail || "Gagal mengubah nomor telepon");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan");
    }
  };

  // === Simpan Password ===
  const handleSavePassword = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) return;

    // Validasi
    if (user.has_password) {
      if (newPassword !== confirmPassword) {
        alert("Password baru dan konfirmasi tidak cocok!");
        return;
      }
      if (newPassword.length < 6) {
        alert("Password minimal 6 karakter");
        return;
      }
    } else {
      if (tempPassword.length < 6) {
        alert("Password minimal 6 karakter");
        return;
      }
    }

    try {
      let res;
      if (user.has_password) {
        // Ganti password
        res = await fetch("http://localhost:8000/api/user/password", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // [PERBAIKAN 3]
          },
          body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        });
      } else {
        // Atur password pertama kali
        res = await fetch("http://localhost:8000/api/user/set-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // [PERBAIKAN 4]
          },
          body: JSON.stringify({ new_password: tempPassword }),
        });
      }

      if (res.ok) {
        if (!user.has_password) {
          setUser((prev) => ({ ...prev, has_password: true }));
        }
        setIsChangingPassword(false);
        // Reset form
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTempPassword("");
        alert("Password berhasil disimpan!");
      } else {
        const err = await res.json();
        alert(err.detail || "Gagal menyimpan password");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan");
    }
  };

  // === Dummy Notifikasi (tetap seperti asli) ===
  const notifications = [
    {
      id: 1,
      title: "Suhu Melebihi Batas",
      message: "Suhu di level 3 meningkat menjadi 8°C, harap periksa kontrol pendingin",
      time: "5 menit yang lalu",
      isRead: false,
    },
    {
      id: 2,
      title: "Kelembapan Rendah",
      message: "Kelembapan di level 2 turun menjadi 60% RH",
      time: "15 menit yang lalu",
      isRead: false,
    },
    {
      id: 3,
      title: "Stok Sayur Menipis",
      message: "Jumlah sayur di storage 3 tersisa 2 unit",
      time: "30 menit yang lalu",
      isRead: false,
    },
  ];

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getInitials = (name) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  if (loading) {
    return (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex items-center gap-4">
            <div className="w-24 h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm backdrop-blur-sm bg-opacity-95">
      <div className="flex items-center justify-between p-4">
        {/* Toggle Sidebar */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: "#192B0D" }}
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Waktu */}
        <div className="flex items-center gap-4 ml-auto">
          <div className="hidden md:block text-right">
            <p className="text-gray-500 text-xs">
              {currentTime.toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-gray-700 font-medium text-sm">
              {currentTime.toLocaleTimeString("id-ID")}
            </p>
          </div>

          {/* Notification */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:scale-110 transition-transform relative"
              style={{ backgroundColor: "#4ade80" }}
            >
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-800">Notifikasi</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {unreadCount} notifikasi belum dibaca
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notif.isRead ? "bg-blue-50" : ""
                      }`}
                    >
                      <h4 className="font-medium text-gray-800 text-sm">{notif.title}</h4>
                      <p className="text-gray-600 text-xs mt-1 line-clamp-2">{notif.message}</p>
                      <p className="text-gray-400 text-xs mt-2">{notif.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:scale-110 transition-transform overflow-hidden"
              style={{ backgroundColor: "#192B0D" }}
            >
              <span className="text-white font-bold">{getInitials(user.name)}</span>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                {/* Header User */}
                <div className="p-4 flex items-center gap-3 border-b border-gray-200">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-lg">
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.phone || "Belum ada nomor"}</p>
                  </div>
                </div>

                {/* Dropdown Options */}
                <div className="p-2 flex flex-col gap-1">
                  {!isEditing && !isChangingPassword ? (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                      >
                        Edit Profil
                      </button>
                      <button
                        onClick={() => setIsChangingPassword(true)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                      >
                        {user.has_password ? "Ubah Password" : "Atur Password"}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                      >
                        Logout
                      </button>
                    </>
                  ) : isEditing ? (
                    <form onSubmit={handleSavePhone} className="flex flex-col gap-2 px-4 py-2">
                      <label className="text-xs text-gray-500">Nomor HP</label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="Contoh: 081234567890"
                      />
                      <div className="flex justify-between gap-2 mt-2">
                        <button
                          type="submit"
                          className="flex-1 bg-green-500 text-white text-sm px-2 py-1 rounded hover:bg-green-600"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            setNewPhone(user.phone);
                          }}
                          className="flex-1 bg-gray-200 text-gray-700 text-sm px-2 py-1 rounded hover:bg-gray-300"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleSavePassword} className="flex flex-col gap-2 px-4 py-2">
                      {user.has_password ? (
                        <>
                          <label className="text-xs text-gray-500">Password Lama</label>
                          <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          />

                          <label className="text-xs text-gray-500">Password Baru</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          />

                          <label className="text-xs text-gray-500">Konfirmasi Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </>
                      ) : (
                        <>
                          <label className="text-xs text-gray-500">Buat Password Baru</label>
                          <input
                            type="password"
                            value={tempPassword}
                            onChange={(e) => setTempPassword(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="Minimal 6 karakter"
                          />
                        </>
                      )}

                      <div className="flex justify-between gap-2 mt-2">
                        <button
                          type="submit"
                          className="flex-1 bg-green-500 text-white text-sm px-2 py-1 rounded hover:bg-green-600"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsChangingPassword(false)}
                          className="flex-1 bg-gray-200 text-gray-700 text-sm px-2 py-1 rounded hover:bg-gray-300"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {(isNotificationOpen || isProfileOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsNotificationOpen(false);
            setIsProfileOpen(false);
            setIsEditing(false);
            setIsChangingPassword(false);
          }}
        />
      )}
    </header>
  );
};

export default Navbar;