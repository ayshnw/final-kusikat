import { useState } from "react";
import { User, Phone, Mail, Lock } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import logo from "../assets/logo_kusikat.png";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../App";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "", 
    phoneNumber: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpPopup, setOtpPopup] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Hapus error untuk field yang sedang diedit
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
    // Jika mengedit password, hapus error konfirmasi
    if (name === 'password' && formErrors.confirmPassword) {
      setFormErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
    // Jika mengedit konfirmasi, hapus error konfirmasi
    if (name === 'confirmPassword' && formErrors.confirmPassword) {
      setFormErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setFormErrors({});

  // Validasi client
  const newErrors = {};
  if (!formData.username.trim()) newErrors.username = "Username wajib diisi";
  if (!formData.email.trim()) newErrors.email = "Email wajib diisi";
  if (!formData.password.trim()) newErrors.password = "Password wajib diisi";
  if (formData.password !== formData.confirmPassword)
    newErrors.confirmPassword = "Password tidak cocok";
  if (!formData.phoneNumber.trim())
    newErrors.phoneNumber = "Nomor telepon wajib diisi";

  if (Object.keys(newErrors).length > 0) {
    setFormErrors(newErrors);
    setIsSubmitting(false);
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/auth/request-otp?phone_number=${formData.phoneNumber}`,
      { method: "POST" }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.detail || "Gagal mengirim OTP");
      setIsSubmitting(false);
      return;
    }

    alert("📱 Kode OTP dikirim ke WhatsApp");
    setOtpPopup(true);

  } catch (err) {
    alert("❌ Gagal menghubungi server");
  } finally {
    setIsSubmitting(false);
  }
};


     

  const handleVerifyOtp = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: formData.username,
    email: formData.email,
    password: formData.password,
    phone_number: formData.phoneNumber,
    otp: otpCode,
  }),
});


    const data = await res.json();

if (!res.ok) {
  if (typeof data.detail === "string") {
    alert(`❌ ${data.detail}`);
  } 
  else if (Array.isArray(data.detail)) {
    // Ambil pesan error pertama dari FastAPI
    alert(`❌ ${data.detail[0]?.msg || "OTP salah atau data tidak valid"}`);
  } 
  else {
    alert("❌ Verifikasi OTP gagal");
  }
  return;
}


alert(data.message || "Verifikasi berhasil!");
setOtpPopup(false);
navigate("/login", { replace: true });

  } catch (err) {
    alert("❌ Verifikasi OTP gagal");
  }
};



  const handleGoogleSignUp = () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  const shouldShake = (field) => isSubmitting && !!formErrors[field]; // Fungsi ini tidak digunakan secara langsung, bisa dihapus jika tidak perlu

  return (
    <>
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shake {
          animation: shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-pink-100 via-purple-50 to-green-50">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-64 h-64 bg-green-600 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-500 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-purple-400 rounded-full blur-3xl"></div>
        </div>

        <div className="relative bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full">
          <div className="grid md:grid-cols-2">
            {/* Left Side */}
            <div className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm p-12 flex flex-col items-center justify-center relative">
              <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <svg className="w-full h-full" viewBox="0 0 400 600">
                  <path d="M50,100 Q100,50 150,100 T250,100" fill="#10b981" opacity="0.3"/>
                  <path d="M300,200 Q350,150 400,200 T500,200" fill="#10b981" opacity="0.3"/>
                  <circle cx="80" cy="450" r="30" fill="#10b981" opacity="0.2"/>
                  <circle cx="320" cy="500" r="40" fill="#10b981" opacity="0.2"/>
                </svg>
              </div>
              <div className="relative z-10 mb-8">
                <img src={logo} alt="KusiKat Logo" className="w-44 h-44 object-contain drop-shadow-lg" />
              </div>
              <h1 className="text-5xl font-bold text-gray-800 mb-2 relative z-10 text-center">
                ResQ<br />
                <span className="text-5xl">Freeze</span>
              </h1>
            </div>

            {/* Right Side - Form */}
            <div className="p-12 flex flex-col justify-center bg-white/70 backdrop-blur-sm">
              <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">User Sign Up</h2>

              <div className="space-y-6">
                {/* Username */}
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-white rounded-full p-2">
                    <User size={20} className="text-gray-600" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full px-6 py-4 pl-16 bg-gray-100 border-2 rounded-full focus:outline-none transition-colors placeholder-gray-500 ${
                      formErrors.username
                        ? "border-red-500 animate-shake"
                        : "border-gray-200 focus:border-blue-400"
                    }`}
                  />
                  {formErrors.username && (
                    <p className="mt-1 text-red-500 text-sm ml-2 animate-fade-in">
                      {formErrors.username}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-white rounded-full p-2">
                    <Mail size={20} className="text-gray-600" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-6 py-4 pl-16 bg-gray-100 border-2 rounded-full focus:outline-none transition-colors placeholder-gray-500 ${
                      formErrors.email
                        ? "border-red-500 animate-shake"
                        : "border-gray-200 focus:border-blue-400"
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-red-500 text-sm ml-2 animate-fade-in">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-white rounded-full p-2">
                    <Lock size={20} className="text-gray-600" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-6 py-4 pl-16 bg-gray-100 border-2 rounded-full focus:outline-none transition-colors placeholder-gray-500 ${
                      formErrors.password
                        ? "border-red-500 animate-shake"
                        : "border-gray-200 focus:border-blue-400"
                    }`}
                  />
                  {formErrors.password && (
                    <p className="mt-1 text-red-500 text-sm ml-2 animate-fade-in">
                      {formErrors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password - [TAMBAHAN] */}
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-white rounded-full p-2">
                    <Lock size={20} className="text-gray-600" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-6 py-4 pl-16 bg-gray-100 border-2 rounded-full focus:outline-none transition-colors placeholder-gray-500 ${
                      formErrors.confirmPassword
                        ? "border-red-500 animate-shake"
                        : "border-gray-200 focus:border-blue-400"
                    }`}
                  />
                  {formErrors.confirmPassword && (
                    <p className="mt-1 text-red-500 text-sm ml-2 animate-fade-in">
                      {formErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-white rounded-full p-2">
                    <Phone size={20} className="text-gray-600" />
                  </div>
                  <input
                    type="tel"
                    name="phoneNumber"
                    placeholder="Phone Number"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className={`w-full px-6 py-4 pl-16 bg-gray-100 border-2 rounded-full focus:outline-none transition-colors placeholder-gray-500 ${
                      formErrors.phoneNumber
                        ? "border-red-500 animate-shake"
                        : "border-gray-200 focus:border-blue-400"
                    }`}
                  />
                  {formErrors.phoneNumber && (
                    <p className="mt-1 text-red-500 text-sm ml-2 animate-fade-in">
                      {formErrors.phoneNumber}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleGoogleSignUp}
                  className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 rounded-full hover:bg-gray-100 transition-all"
                >
                  <FcGoogle size={24} />
                  <span className="font-medium text-gray-700">Sign Up with Google</span>
                </button>

                <div className="text-center">
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Already have an account?{" "}
                    <Link to="/login" className="text-blue-600 hover:underline font-semibold">
                      Sign in
                    </Link>
                  </p>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-bold py-4 rounded-full hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-105 shadow-lg uppercase tracking-wide disabled:opacity-80"
                >
                  {isSubmitting ? "Memproses..." : "Sign Up"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* OTP Popup */}
        {otpPopup && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-96 shadow-2xl text-center space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Verifikasi OTP</h2>
              <p className="text-gray-600 text-sm">
                Masukkan kode OTP yang dikirim ke WhatsApp:{" "}
                <span className="font-semibold">{formData.phoneNumber}</span>
              </p>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                className="w-full border-2 border-gray-300 rounded-full py-3 px-5 text-center text-lg tracking-widest focus:border-blue-400 outline-none"
                placeholder="______"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleVerifyOtp}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-full font-semibold transition-all"
                >
                  Verifikasi
                </button>
                <button
                  onClick={() => setOtpPopup(false)}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-full font-semibold transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}