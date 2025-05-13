const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:64355',
    'https://joanexsurya.web.app',
    'https://joanexsurya.firebaseapp.com',
    'https://joanexsurya.web.app/',
    'https://joanexsurya.firebaseapp.com/',
    /http:\/\/localhost:\d+/
  ],
  credentials: true
}));

// Increase payload size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Claude API proxy endpoint
app.post('/api/claude', async (req, res) => {
  try {
    const claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!claudeApiKey) {
      return res.status(500).json({ error: 'Claude API key not configured' });
    }

    console.log('Received request to Claude API');
    console.log('Request body size:', JSON.stringify(req.body).length, 'bytes');

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        timeout: 120000, // 2 minutes
        maxBodyLength: 10 * 1024 * 1024, // 10MB
        maxContentLength: 10 * 1024 * 1024, // 10MB
      }
    );

    console.log('Claude API response received');
    res.json(response.data);
  } catch (error) {
    console.error('Error calling Claude API:', error);

    if (error.response) {
      console.error('Status Code:', error.response.status);
      console.error('Response Data:', error.response.data);
      res.status(error.response.status).json({
        error: error.response.data,
        message: error.message
      });
    } else if (error.request) {
      console.error('No response received from Claude API');
      res.status(500).json({
        error: 'No response received from Claude API',
        message: error.message
      });
    } else {
      console.error('Unexpected error:', error.message);
      res.status(500).json({
        error: 'Error setting up Claude API request',
        message: error.message
      });
    }
  }
});

// Catch-all error middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Claude API proxy server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
