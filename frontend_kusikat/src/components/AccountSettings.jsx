// src/components/AccountSettings.jsx
import React, { useState, useEffect } from 'react';

const AccountSettings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [phone, setPhone] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) throw new Error('Token tidak ditemukan');

        const res = await fetch('http://localhost:8000/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Gagal memuat data pengguna');
        const data = await res.json();
        setUser(data);
        setPhone(data.phone_number || '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const showMessage = (msg, isError = false) => {
    setMessage({ text: msg, isError });
    setTimeout(() => setMessage(''), 4000);
  };

  const handleUpdatePhone = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/user/phone', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phone_number: phone })
      });

      if (res.ok) {
        showMessage('Nomor telepon berhasil diperbarui!');
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const updatedUser = { ...JSON.parse(userStr), phone_number: phone };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } else {
        const err = await res.json();
        showMessage(err.detail || 'Gagal mengubah nomor', true);
      }
    } catch (err) {
      showMessage('Terjadi kesalahan jaringan', true);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (tempPassword.length < 6) {
      return showMessage('Kata sandi minimal 6 karakter', true);
    }

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/user/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: tempPassword })
      });

      if (res.ok) {
        showMessage('Kata sandi berhasil diatur!');
        setUser((prev) => ({ ...prev, has_password: true }));
      } else {
        const err = await res.json();
        showMessage(err.detail || 'Gagal mengatur kata sandi', true);
      }
    } catch (err) {
      showMessage('Terjadi kesalahan jaringan', true);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return showMessage('Kata sandi baru dan konfirmasi tidak cocok', true);
    }
    if (newPassword.length < 6) {
      return showMessage('Kata sandi minimal 6 karakter', true);
    }

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });

      if (res.ok) {
        showMessage('Kata sandi berhasil diubah!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json();
        showMessage(err.detail || 'Gagal mengganti kata sandi', true);
      }
    } catch (err) {
      showMessage('Terjadi kesalahan jaringan', true);
    }
  };

  if (loading) return <div className="text-white">Memuat data akun...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-8">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20">
        <h3 className="text-white text-xl font-bold mb-4">Nomor Telepon</h3>
        <form onSubmit={handleUpdatePhone} className="space-y-3">
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Masukkan nomor telepon"
            className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            type="submit"
            className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium transition"
          >
            Simpan Nomor Telepon
          </button>
        </form>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20">
        <h3 className="text-white text-xl font-bold mb-4">
          {user.has_password ? 'Ganti Kata Sandi' : 'Atur Kata Sandi'}
        </h3>

        {user.has_password ? (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Kata sandi lama"
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Kata sandi baru"
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Konfirmasi kata sandi baru"
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              type="submit"
              className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium transition"
            >
              Ganti Kata Sandi
            </button>
          </form>
        ) : (
          <form onSubmit={handleSetPassword} className="space-y-3">
            <input
              type="password"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder="Buat kata sandi baru"
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              type="submit"
              className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium transition"
            >
              Atur Kata Sandi
            </button>
          </form>
        )}
      </div>

      {message && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white font-medium shadow-lg ${
            message.isError ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};

export default AccountSettings;