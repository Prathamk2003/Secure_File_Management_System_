const express = require('express');
const app = express();
const mongoose = require('mongoose');
const reportsRouter = require('./routes/reports');

// Middleware
app.use(express.json());

// DB Config
const db = 'mongodb://localhost:27017/yourdbname'; // Update with your MongoDB connection string

// Connect to MongoDB
mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Routes
app.use('/api/reports', reportsRouter);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});