import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { LogIn, ShieldAlert } from 'lucide-react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState(null);
  const [tempAuthData, setTempAuthData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/login`, { username, password });
      // Simulate OTP step
      setSimulatedOtp(res.data.simulatedOTP);
      setTempAuthData({ token: res.data.token, user: res.data.user });
      setShowOtp(true);
      // In a real app we wouldn't show the OTP in an alert, but for this prototype demo:
      alert(`[SIMULATED OTP RECEIVED via SMS]: ${res.data.simulatedOTP}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (parseInt(otpInput) === simulatedOtp) {
      onLogin(tempAuthData.token, tempAuthData.user);
    } else {
      setError('Invalid OTP. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card">
        <div className="text-center mb-4">
          <LogIn size={48} className="text-primary mt-2" style={{ color: 'var(--primary-color)' }} />
          <h2>Welcome Back</h2>
          <p>Login to your secure account</p>
        </div>

        {error && <div className="text-danger mb-4 text-center bg-red-50 p-2 rounded" style={{background: '#fee2e2'}}>{error}</div>}

        {!showOtp ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit}>
            <div className="text-center mb-4">
              <ShieldAlert size={32} style={{ color: 'var(--success)', margin: '0 auto' }} />
              <p className="mt-2 text-sm">Please enter the 4-digit OTP sent to your registered device.</p>
            </div>
            <div className="form-group">
              <label>Enter OTP</label>
              <input
                type="text"
                className="form-control text-center"
                style={{ letterSpacing: '0.5em', fontSize: '1.25rem' }}
                maxLength="4"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Verify & Login
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          <p>Don't have an account? <Link to="/register" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '600' }}>Register</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
