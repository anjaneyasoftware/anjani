const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });  // Update this line
const https = require('https');

const fs = require('fs');

// const options = {
//   key: fs.readFileSync('server.key'),
//   cert: fs.readFileSync('server.cert')
// };
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const generateTokenRoute = require('./routes/generateToken');


// app.use(express.static(path.join(__dirname, '../frontend')));

// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/login.html'));
// });

// app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/', generateTokenRoute);  // or '/api' if you prefer

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
});
