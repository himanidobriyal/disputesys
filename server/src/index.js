const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./db');
const disputeRoutes = require('./routes/disputeRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'dispute-backend' });
});

app.use('/api/disputes', disputeRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
