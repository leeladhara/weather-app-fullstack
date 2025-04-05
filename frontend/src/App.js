import React, { useState } from 'react';
import './App.css';
import History from './History';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';

function App() {
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState('');

  const applyWeatherTheme = (condition) => {
    const body = document.body;
    body.className = ''; // reset
    const theme = condition.toLowerCase();

    if (theme.includes("cloud")) {
      body.classList.add('bg-cloudy');
    } else if (theme.includes("rain")) {
      body.classList.add('bg-rainy');
    } else if (theme.includes("clear")) {
      body.classList.add('bg-sunny');
    } else if (theme.includes("snow")) {
      body.classList.add('bg-snowy');
    } else {
      body.classList.add('bg-default');
    }
  };

  const fetchWeatherData = async (loc) => {
    try {
      const response = await fetch('http://localhost:8080/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: loc })
      });

      const weatherData = await response.json();
      if (!response.ok) throw new Error(weatherData.error || 'Error fetching weather');
      setWeather(weatherData);
      applyWeatherTheme(weatherData.weather[0].main);

      const forecastRes = await fetch('http://localhost:8080/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: loc })
      });

      const forecastData = await forecastRes.json();
      if (!forecastRes.ok) throw new Error(forecastData.error || 'Error fetching forecast');

      const dailyForecast = forecastData.list.filter(item =>
        item.dt_txt.includes("12:00:00")
      ).slice(0, 5);

      setForecast(dailyForecast);
    } catch (err) {
      console.error("❌", err.message);
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setWeather(null);
    setForecast(null);
    fetchWeatherData(location);
  };

  const handleDetectLocation = () => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = `${position.coords.latitude},${position.coords.longitude}`;
        setLocation(coords);
        fetchWeatherData(coords);
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
        setError("Geolocation not available or denied.");
      }
    );
  };

  const handleDownloadCSV = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/history/export?format=csv');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'weather-history.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("❌ Error downloading CSV:", err.message);
      setError("Failed to download CSV");
    }
  };

  // ⬇️ Prepare chart data
  const chartData = forecast?.map(day => ({
    date: new Date(day.dt_txt).toLocaleDateString(),
    temp: Math.round(day.main.temp)
  }));

  return (
    <div className="App">
      <h1>🌤️ Weather App</h1>

      <button onClick={handleDetectLocation} style={{ marginBottom: '1rem' }}>
        📍 Use My Location
      </button>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter city..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button type="submit">Get Weather</button>
      </form>

      {error && <p className="error">{error}</p>}

      {weather && (
        <div className="weather-result">
          <h2>{weather.name}</h2>
          <p><strong>Temp:</strong> {weather.main.temp}°C</p>
          <p><strong>Condition:</strong> {weather.weather[0].description}</p>
          <img
            src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
            alt="Weather icon"
          />
        </div>
      )}

      {forecast && (
        <div className="forecast">
          <h2>5-Day Forecast</h2>
          <div className="forecast-grid">
            {forecast.map((day, index) => (
              <div className="forecast-card" key={index}>
                <p><strong>{new Date(day.dt_txt).toLocaleDateString()}</strong></p>
                <img
                  src={`https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`}
                  alt="Weather icon"
                />
                <p>{Math.round(day.main.temp)}°C</p>
                <p>{day.weather[0].main}</p>
              </div>
            ))}
          </div>

          {/* 📈 Temperature Line Chart */}
          <h3 style={{ marginTop: '2rem' }}>Temperature Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis unit="°C" />
              <Tooltip />
              <Line type="monotone" dataKey="temp" stroke="#007bff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <button onClick={handleDownloadCSV} style={{ marginTop: '1.5rem' }}>
        📥 Download Weather History (CSV)
      </button>

      <History />
    </div>
  );
}

export default App;
