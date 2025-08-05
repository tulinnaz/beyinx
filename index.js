// index.js
const express = require('express');
const dotenv = require('dotenv');
const fetch = require('node-fetch'); // API çağrıları için
const app = express();
const port = process.env.PORT || 3000;

// Ortam değişkenlerini yükle
dotenv.config();

// Middleware: JSON isteklerini işle
app.use(express.json());

// Basit bir doğrulama middleware'i
const validateInput = (req, res, next) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Geçerli bir mesaj gönderin.' });
  }
  next();
};

// Grok API ile iletişim kuran fonksiyon
async function getGrokResponse(userMessage) {
  const apiKey = process.env.XAI_API_KEY; // xAI API anahtarınızı .env dosyasından alın
  const apiUrl = 'https://api.x.ai/v1/grok'; // Örnek API endpoint'i

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: userMessage,
        max_tokens: 100, // Yanıt uzunluğunu sınırlı tutuyoruz
      }),
    });

    const data = await response.json();
    if (data && data.response) {
      return data.response; // Grok'un yanıtını döndür
    } else {
      throw new Error('Grok API yanıtı alınamadı.');
    }
  } catch (error) {
    console.error('Grok API hatası:', error.message);
    return 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin!';
  }
}

// POST endpoint: Kullanıcı mesajını al ve yanıt ver
app.post('/chat', validateInput, async (req, res) => {
  const { message } = req.body;

  // Kullanıcı "merhaba" yazarsa özel bir başlangıç yanıtı
  if (message.toLowerCase() === 'merhaba') {
    const grokResponse = await getGrokResponse('Merhaba! Nasılsın?');
    res.json({ reply: grokResponse || 'Merhaba! 😊 Nasılsın, ne konuşalım?' });
  } else {
    // Diğer mesajlar için Grok'a sor
    const grokResponse = await getGrokResponse(message);
    res.json({ reply: grokResponse });
  }
});

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});{
  "name": "aria-ai-agent",
  "version": "1.0.0",
  "description": "AI powered chat application",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "keywords": ["ai", "chat", "express", "nodejs"],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/aria-ai-agent.git"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.0.3",
    "@xai/grok": "^1.0.0" // Örnek AI bağımlılığı, gerekirse ekleyin
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.5.0",
    "eslint": "^8.0.0",
    "prettier": "^2.8.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}


   {
  "name": "aria-ai-agent",
  "version": "1.0.0",
  "description": "AI powered chat application",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "keywords": ["ai", "chat", "express", "nodejs"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
