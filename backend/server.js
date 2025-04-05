const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const { Parser } = require('json2csv');
const WeatherRecord = require('./WeatherRecord');

const app = express();
app.use(cors());
app.use(express.json());

// 🔌 MongoDB connection
mongoose.connect('mongodb://localhost:27017/weatherapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// 🌐 Root route
app.get('/', (req, res) => {
  res.send('🌤️ Weather Backend is up!');
});

// 🌦️ Fetch current weather & save to DB
app.post('/api/weather', async (req, res) => {
  const { location } = req.body;
  const apiKey = '2510e3f053eb52c9a20aacf545dbbfb6';

  if (!location) return res.status(400).json({ error: 'Location is required' });

  let url;

  if (location.includes(',') && !isNaN(location.split(',')[0])) {
    const [lat, lon] = location.split(',');
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
    res.status(500).json({ error: 'Failed to fetch weather data. Please check city name or try again.' });
  }
});

// 📅 Fetch 5-day forecast (OpenWeatherMap)
app.post('/api/forecast', async (req, res) => {
  const { location } = req.body;
  const apiKey = '2510e3f053eb52c9a20aacf545dbbfb6';

  if (!location) return res.status(400).json({ error: 'Location is required' });

  let url;

  if (location.includes(',') && !isNaN(location.split(',')[0])) {
    const [lat, lon] = location.split(',');
    url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  } else {
    url = `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${apiKey}&units=metric`;
  }

  try {
    const forecastResponse = await axios.get(url);
    res.json(forecastResponse.data);
  } catch (err) {
    console.error('❌ Forecast fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch 5-day forecast. Please check city name or try again.' });
  }
});

// 📄 Get all saved weather history
app.get('/api/history', async (req, res) => {
  try {
    const records = await WeatherRecord.find().sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ✏️ Update a saved record by ID
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

// ❌ Delete a saved record by ID
app.delete('/api/history/:id', async (req, res) => {
  try {
    await WeatherRecord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// 📤 Export all records as JSON or CSV
app.get('/api/history/export', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const records = await WeatherRecord.find();

    if (format === 'csv') {
        const formattedRecords = records.map(r => ({
            location: r.location,
            date: new Date(r.date).toLocaleString(),
            temp: r.weatherData?.main?.temp ?? 'N/A'
          }));
    
          const fields = ['location', 'date', 'temp'];
          const parser = new Parser({ fields });
          const csv = parser.parse(formattedRecords);
    
          // ✅ Download file properly
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename=weather-history.csv');
          
      
      return res.send(csv);
    } else {
      return res.json(records);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// 🚀 Start the server
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
