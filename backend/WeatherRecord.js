const mongoose = require('mongoose');

const WeatherRecordSchema = new mongoose.Schema({
  location: String,
  weatherData: Object,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WeatherRecord', WeatherRecordSchema);
