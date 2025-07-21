import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES module support of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist folder
app.use(express.static(path.resolve(__dirname, 'dist')));

// Handle client-side routes by always serving index.html
app.get('/*', function (req, res) {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
