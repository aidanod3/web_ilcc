const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Mount routes
app.use('/api/run', require('./routes/run'));
app.use('/api', require('./routes/autograder'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/debug', require('./routes/debugger'));

app.listen(port, () => {
  console.log(`WebLCC backend listening on http://localhost:${port}`);
});
