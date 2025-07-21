import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES module support of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist folder

app.use(express.static(distPath));
app.get('/*', (_, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
