import React, { useEffect, useState } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://weather-app-fullstack.onrender.com';

function History() {
  const [history, setHistory] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editLocation, setEditLocation] = useState('');

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/history`);
      const text = await res.text();
      console.log("📦 Raw history response:", text);

      if (!res.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = JSON.parse(text);
      setHistory(data);
    } catch (err) {
      console.error("❌ Error fetching history:", err.message);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/api/history/${id}`, { method: 'DELETE' });
      fetchHistory();
    } catch (err) {
      console.error("❌ Failed to delete record:", err.message);
    }
  };

  const handleEdit = (record) => {
    setEditId(record._id);
    setEditLocation(record.location);
  };

  const handleUpdate = async () => {
    try {
      await fetch(`${API_URL}/api/history/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: editLocation })
      });
      setEditId(null);
      setEditLocation('');
      fetchHistory();
    } catch (err) {
      console.error("❌ Failed to update record:", err.message);
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>📜 Search History</h2>
      {history.length === 0 ? (
        <p>No history yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {history.map((record) => (
            <li key={record._id} style={{ marginBottom: '10px' }}>
              {editId === record._id ? (
                <>
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                  />
                  <button onClick={handleUpdate}>Save</button>
                </>
              ) : (
                <>
                  <strong>{record.location}</strong> ({new Date(record.date).toLocaleString()})
                  <button onClick={() => handleEdit(record)} style={{ marginLeft: '10px' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(record._id)} style={{ marginLeft: '5px', color: 'red' }}>
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: '1rem' }}>
        <a
          href={`${API_URL}/api/history/export?format=json`}
          target="_blank"
          rel="noopener noreferrer"
        >
          📥 Export as JSON
        </a>
      </div>
    </div>
  );
}

export default History;
