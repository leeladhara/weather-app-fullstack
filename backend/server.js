const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const { Parser } = require('json2csv');
const WeatherRecord = require('./WeatherRecord');
require('dotenv').config(); // Must be first

const app = express();
app.use(cors());
app.use(express.json());

// 🔌 MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB Atlas connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// 🌐 Root route
app.get('/', (req, res) => {
  res.send('🌤️ Weather Backend is up!');
});

// 🔄 Helper function to validate coordinates
const isValidCoordinates = (lat, lon) => {
  return !isNaN(lat) && !isNaN(lon);
};

// 🌦️ Current weather route
app.post('/api/weather', async (req, res) => {
  const { location } = req.body;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!location || location.trim() === '') {
    return res.status(400).json({ error: 'Location is required' });
  }

  let url;

  if (location.includes(',')) {
    const [lat, lon] = location.split(',').map(str => str.trim());
    if (!isValidCoordinates(lat, lon)) {
      return res.status(400).json({ error: 'Invalid coordinates provided' });
    }
    url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  } else {
    url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;
  }

  try {
    const weatherResponse = await axios.get(url);
    const weatherData = weatherResponse.data;

    const newRecord = new WeatherRecord({
      location: weatherData.name || location,
      weatherData
    });

    await newRecord.save();
    res.json(weatherData);
  } catch (err) {
    console.error('❌ Weather fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch weather data. Please check the city name or coordinates and try again.' });
  }
});

// 📅 5-Day forecast route
app.post('/api/forecast', async (req, res) => {
  const { location } = req.body;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!location || location.trim() === '') {
    return res.status(400).json({ error: 'Location is required' });
  }

  let url;

  if (location.includes(',')) {
    const [lat, lon] = location.split(',').map(str => str.trim());
    if (!isValidCoordinates(lat, lon)) {
      return res.status(400).json({ error: 'Invalid coordinates provided' });
    }
    url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  } else {
    url = `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${apiKey}&units=metric`;
  }

  try {
    const forecastResponse = await axios.get(url);
    res.json(forecastResponse.data);
  } catch (err) {
    console.error('❌ Forecast fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch forecast. Please check the city name or coordinates and try again.' });
  }
});

// 📄 Get weather history
app.get('/api/history', async (req, res) => {
  try {
    const records = await WeatherRecord.find().sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ✏️ Update history record
app.put('/api/history/:id', async (req, res) => {
  const { location } = req.body;
  try {
    const updated = await WeatherRecord.findByIdAndUpdate(
      req.params.id,
      { location },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// ❌ Delete history record
app.delete('/api/history/:id', async (req, res) => {
  try {
    await WeatherRecord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// 📤 Export history as CSV or JSON
app.get('/api/history/export', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const records = await WeatherRecord.find();

    if (format === 'csv') {
      const formatted = records.map(r => ({
        location: r.location,
        date: new Date(r.date).toLocaleString(),
        temp: r.weatherData?.main?.temp ?? 'N/A'
      }));

      const fields = ['location', 'date', 'temp'];
      const parser = new Parser({ fields });
      const csv = parser.parse(formatted);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=weather-history.csv');
      return res.send(csv);
    }

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// 🚀 Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend running at http://0.0.0.0:${PORT}`);
});
