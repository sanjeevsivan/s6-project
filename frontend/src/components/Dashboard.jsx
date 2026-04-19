import { useState, useEffect } from 'react';
import { LogOut, Wallet, Send, Clock } from 'lucide-react';
import axios from 'axios';

function Dashboard({ user, onLogout }) {
  const [balance, setBalance] = useState(user?.balance || 0);
  const [transactions, setTransactions] = useState([]);
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [userRes, txRes] = await Promise.all([
        axios.get('http://localhost:5000/api/user', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/transactions', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setBalance(userRes.data.balance);
      setTransactions(txRes.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        onLogout();
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');

    if (amount <= 0) {
      return setTransferError('Amount must be greater than zero.');
    }

    if (receiver === user.username) {
      return setTransferError('Cannot transfer money to yourself.');
    }

    if (amount > balance) {
      return setTransferError('Insufficient balance.');
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/transfer', 
        { receiverUsername: receiver, amount: parseFloat(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTransferSuccess('Transaction completed successfully!');
      setReceiver('');
      setAmount('');
      
      // Refresh dashboard data
      fetchDashboardData();
    } catch (err) {
      setTransferError(err.response?.data?.error || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
      // Clear success message after 5 seconds
      setTimeout(() => setTransferSuccess(''), 5000);
    }
  };

  return (
    <div className="app-container">
      <div className="dashboard-header">
        <div>
          <h1 style={{ marginBottom: 0 }}>Welcome, {user?.username}</h1>
          <p>Your Trusted Digital Payment Dashboard</p>
        </div>
        <button onClick={onLogout} className="btn btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div className="dashboard-grid">
        {/* Left Column: Balance & Transfer Form */}
        <div>
          <div className="glass-card balance-card mb-4 text-center">
            <Wallet size={48} style={{ margin: '0 auto', opacity: 0.9 }} />
            <h2 className="mt-2 text-white">Total Balance</h2>
            <div className="balance-amount">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(balance)}</div>
            <p className="text-white" style={{ opacity: 0.8 }}>Available for transactions</p>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Send size={24} className="text-primary" style={{ color: 'var(--primary-color)' }} />
              <h2 style={{ marginBottom: 0 }}>Send Money</h2>
            </div>
            
            {transferError && <div className="text-danger mb-4 bg-red-50 p-2 rounded" style={{background: '#fee2e2'}}>{transferError}</div>}
            {transferSuccess && <div className="text-success mb-4 bg-green-50 p-2 rounded" style={{background: '#d1fae5'}}>{transferSuccess}</div>}

            <form onSubmit={handleTransfer}>
              <div className="form-group">
                <label>Receiver Username</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., john_doe"
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-control"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Processing...' : 'Confirm Transfer'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Transaction History */}
        <div>
          <div className="glass-card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Clock size={24} className="text-primary" style={{ color: 'var(--primary-color)' }} />
              <h2 style={{ marginBottom: 0 }}>Recent Transactions</h2>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center" style={{ padding: '3rem 0', color: 'var(--text-light)' }}>
                <p>No transactions found.</p>
                <p>Send money to get started!</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Details</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id}>
                        <td>
                          <span className={`badge ${tx.type === 'Sent' ? 'badge-sent' : 'badge-received'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td>
                          {tx.type === 'Sent' ? `To: ${tx.receiver}` : `From: ${tx.sender}`}
                        </td>
                        <td style={{ fontWeight: 600, color: tx.type === 'Sent' ? 'var(--danger)' : 'var(--success)' }}>
                          {tx.type === 'Sent' ? '-' : '+'}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tx.amount)}
                        </td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
