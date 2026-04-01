const express = require('express');

const runRoutes = require('./src/routes/run');
const debugRoutes = require('./src/routes/debug');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/run', runRoutes);
app.use('/api/debug', debugRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
