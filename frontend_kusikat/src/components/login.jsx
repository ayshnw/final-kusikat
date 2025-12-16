import React, { useState } from "react";
import { User, Lock, Mail, KeyRound } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo_kusikat.png"; 
import { API_BASE_URL } from "../App";

export default function LoginForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [formErrors, setFormErrors] = useState({
    username: "",
    password: "",
  });

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const API_BASE = "http://127.0.0.1:8000";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error saat user mulai mengetik
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async () => {
    // Reset error
    setFormErrors({ username: "", password: "" });

    let hasError = false;
    if (!formData.username.trim()) {
      setFormErrors((prev) => ({ ...prev, username: "Username wajib diisi" }));
      hasError = true;
    }
    if (!formData.password.trim()) {
      setFormErrors((prev) => ({ ...prev, password: "Password wajib diisi" }));
      hasError = true;
    }

    if (hasError) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(`❌ ${errorData.detail || "Username atau password salah!"}`);
        return;
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      alert(`✅ Login berhasil! Selamat datang, ${data.user.username}`);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("❌ Gagal menghubungi server. Cek koneksi backend FastAPI!");
    }
  };

  // === LOGIN DENGAN GOOGLE ===
  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google/login`;
  };

  // Kirim OTP ke backend
  const handleSendOTP = async () => {
    if (!email) {
      alert("⚠️ Masukkan email Anda!");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      });
      const data = await res.json();
      alert(data.message);
      if (res.ok) setForgotStep("otp");
    } catch (err) {
      alert("❌ Gagal menghubungi server.");
    }
  };

  // Verifikasi OTP ke backend
  const handleVerifyOTP = async () => {
    if (!otpCode) {
      alert("⚠️ Masukkan kode OTP!");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, otp: otpCode }),
      });

      if (res.ok) {
        setForgotStep("newPassword");
      } else {
        const data = await res.json();
        alert(`❌ ${data.detail || "OTP salah!"}`);
      }
    } catch (err) {
      alert("❌ Gagal verifikasi OTP.");
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("❌ Password tidak cocok!");
      return;
    }
    if (newPassword.length < 6) {
      alert("⚠️ Password minimal 6 karakter!");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, new_password: newPassword }),
      });

      if (res.ok) {
        alert("✅ Password berhasil diubah! Silakan login.");
        closeForgotModal();
      } else {
        const data = await res.json();
        alert(`❌ ${data.detail || "Gagal reset password"}`);
      }
    } catch (err) {
      alert("❌ Gagal reset password.");
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep("email");
    setEmail("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-pink-100 via-purple-50 to-green-50">
      {/* Background blur */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-64 h-64 bg-green-600 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-purple-400 rounded-full blur-3xl"></div>
      </div>

      {/* Main card */}
      <div className="relative bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full">
        <div className="grid md:grid-cols-2">
          {/* Left side */}
          <div className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm p-12 flex flex-col items-center justify-center relative">
            <img
              src={logo}
              alt="Logo KusiKat"
              className="w-48 h-48 object-contain mb-8 drop-shadow-md"
            />
            <h1 className="text-5xl font-bold text-gray-800 mb-2 text-center">
              ResQ<br />
              <span className="text-5xl">Freeze</span>
            </h1>
          </div>

          {/* Right side - login form */}
          <div className="p-12 flex flex-col justify-center bg-white/70 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
              User Login
            </h2>

            <div className="space-y-6">
              {/* Username */}
              <div className="relative">
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2">
                  <User size={20} className="text-gray-600" />
                </div>
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-6 py-4 pl-16 bg-gray-100 border-2 rounded-full focus:outline-none transition-colors placeholder-gray-500 ${
                    formErrors.username ? "border-red-500" : "border-gray-200 focus:border-blue-400"
                  }`}
                />
                {formErrors.username && (
                  <p className="mt-2 text-red-500 text-sm font-medium ml-2">{formErrors.username}</p>
                )}
              </div>

              {/* Password */}
              <div className="relative">
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2">
                  <Lock size={20} className="text-gray-600" />
                </div>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-6 py-4 pl-16 bg-gray-100 border-2 rounded-full focus:outline-none transition-colors placeholder-gray-500 ${
                    formErrors.password ? "border-red-500" : "border-gray-200 focus:border-blue-400"
                  }`}
                />
                {formErrors.password && (
                  <p className="mt-2 text-red-500 text-sm font-medium ml-2">{formErrors.password}</p>
                )}
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm text-blue-600 hover:underline font-semibold"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 rounded-full hover:bg-gray-100 transition-all"
              >
                <FcGoogle size={24} />
                <span className="font-medium text-gray-700">
                  Login with Google
                </span>
              </button>

              {/* Register Link */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mt-4">
                  Don't have an account?{" "}
                  <Link
                    to="/register"
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    Sign up
                  </Link>
                </p>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-bold py-4 rounded-full hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-105 shadow-lg uppercase tracking-wide"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md relative">
            {/* Step 1: Email Input */}
            {forgotStep === "email" && (
              <>
                <h3 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
                  Reset Password
                </h3>
                <p className="text-gray-600 text-center mb-6 text-sm">
                  Masukkan alamat email Anda, kami akan mengirimkan kode OTP.
                </p>
                <div className="relative mb-6">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-full">
                    <Mail size={20} className="text-gray-600" />
                  </div>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-3 pl-14 bg-gray-100 border-2 border-gray-200 rounded-full focus:outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={closeForgotModal}
                    className="px-6 py-3 bg-gray-300 rounded-full hover:bg-gray-400 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendOTP}
                    className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all font-semibold"
                  >
                    Send OTP
                  </button>
                </div>
              </>
            )}

            {/* Step 2: OTP Verification */}
            {forgotStep === "otp" && (
              <>
                <h3 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
                  Verifikasi OTP
                </h3>
                <p className="text-gray-600 text-center mb-6 text-sm">
                  Masukkan kode OTP 6 digit yang telah dikirim ke<br />
                  <span className="font-semibold text-gray-800">{email}</span>
                </p>
                <div className="relative mb-6">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-full">
                    <KeyRound size={20} className="text-gray-600" />
                  </div>
                  <input
                    type="text"
                    placeholder="Masukkan kode OTP"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    maxLength={6}
                    className="w-full px-5 py-3 pl-14 bg-gray-100 border-2 border-gray-200 rounded-full focus:outline-none focus:border-blue-400 transition-colors text-center text-2xl font-bold tracking-widest"
                  />
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={closeForgotModal}
                    className="px-6 py-3 bg-gray-300 rounded-full hover:bg-gray-400 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyOTP}
                    className="px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all font-semibold"
                  >
                    Verify OTP
                  </button>
                </div>
                <div className="text-center mt-4">
                  <button
                    onClick={handleSendOTP}
                    className="text-sm text-blue-600 hover:underline font-semibold"
                  >
                    Kirim ulang OTP
                  </button>
                </div>
              </>
            )}

            {/* Step 3: New Password */}
            {forgotStep === "newPassword" && (
              <>
                <h3 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
                  Buat Password Baru
                </h3>
                <p className="text-gray-600 text-center mb-6 text-sm">
                  Masukkan password baru untuk akun Anda.
                </p>
                <div className="space-y-4 mb-6">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-full">
                      <Lock size={20} className="text-gray-600" />
                    </div>
                    <input
                      type="password"
                      placeholder="Password baru"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-5 py-3 pl-14 bg-gray-100 border-2 border-gray-200 rounded-full focus:outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-full">
                      <Lock size={20} className="text-gray-600" />
                    </div>
                    <input
                      type="password"
                      placeholder="Konfirmasi password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-5 py-3 pl-14 bg-gray-100 border-2 border-gray-200 rounded-full focus:outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={closeForgotModal}
                    className="px-6 py-3 bg-gray-300 rounded-full hover:bg-gray-400 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    className="px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all font-semibold"
                  >
                    Reset Password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}