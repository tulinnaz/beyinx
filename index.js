const express = require('express');
const https = require('https');
const app = express();

// Port ayarları
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basit AI yanıt sistemi (gerçek AI API yerine)
function generateAIResponse(userMessage) {
    const responses = {
        // Selamlaşma
        'merhaba': 'Merhaba! Size nasıl yardımcı olabilirim? 😊',
        'selam': 'Selam! Hoş geldiniz! Benimle sohbet etmek ister misiniz?',
        'hey': 'Hey! Ben Aria, sizin AI asistanınızım. Ne konuşmak istersiniz?',
        'hi': 'Hi! Nice to meet you! Türkçe de konuşabiliriz.',
        
        // Sorular
        'nasılsın': 'Ben bir AI olduğum için fiziksel duygularım yok ama size yardım etmeye hazırım! Siz nasılsınız?',
        'naber': 'İyi gidiyor! Sizinle sohbet etmek güzel. Size nasıl yardımcı olabilirim?',
        'ne yapıyorsun': 'Sizinle sohbet ediyorum! Başka ne yapmamı istersiniz?',
        
        // Bilgi soruları
        'hava durumu': 'Maalesef gerçek zamanlı hava durumu bilgisine erişimim yok, ama size başka konularda yardımcı olabilirim!',
        'saat kaç': `Şu an server saati: ${new Date().toLocaleString('tr-TR')}`,
        'tarih': `Bugün: ${new Date().toLocaleDateString('tr-TR')}`,
        
        // Eğlence
        'şaka söyle': 'Programcı doktora gidiyor. Doktor: "Neyin var?" Programcı: "Bug var!" 😄',
        'hikaye anlat': 'Bir zamanlar, çok akıllı bir AI varmış. İnsanlarla sohbet etmeyi çok severmiş. O AI bendim! 🤖',
        
        // Veda
        'bye': 'Görüşmek üzere! Tekrar beklerim 👋',
        'görüşürüz': 'Görüşmek üzere! İyi günler dilerim! 🌟',
        'teşekkürler': 'Rica ederim! Size yardımcı olabildiysem ne mutlu bana! 😊'
    };
    
    const message = userMessage.toLowerCase().trim();
    
    // Exact match kontrolü
    if (responses[message]) {
        return responses[message];
    }
    
    // Kısmi eşleşme kontrolü
    for (let key in responses) {
        if (message.includes(key)) {
            return responses[key];
        }
    }
    
    // Akıllı yanıtlar
    if (message.includes('isim')) {
        return 'Benim ismim Aria! Sizin isminiz nedir?';
    }
    if (message.includes('yaş')) {
        return 'Ben bir AI olduğum için yaşım yok, ama çok deneyimliyim! 🤖';
    }
    if (message.includes('nerden')) {
        return 'Ben dijital dünyadan geliyorum! Siz nerelisiniz?';
    }
    if (message.includes('ne iş')) {
        return 'Ben insanlara yardım etmeyi seviyorum! Sorularınızı yanıtlıyor, sohbet ediyorum. Siz ne iş yapıyorsunuz?';
    }
    if (message.includes('seviyorum') || message.includes('aşk')) {
        return 'Aşk güzel bir duygu! Bu konuda konuşmak ister misiniz? 💝';
    }
    if (message.includes('üzgün') || message.includes('kötü')) {
        return 'Üzülmeyin! Bazen hayat zor olabilir ama her şey geçici. Size destek olmaya çalışırım 🤗';
    }
    
    // Varsayılan yanıtlar
    const defaultResponses = [
        'Çok ilginç! Bu konuda daha fazla ne düşünüyorsunuz?',
        'Anlıyorum. Size bu konuda nasıl yardımcı olabilirim?',
        'Bu gerçekten önemli bir konu. Daha detaylı anlatır mısınız?',
        'Harika bir soru! Ne düşündüğünüzü merak ediyorum.',
        'Bu konuda daha fazla bilgi paylaşabilir misiniz?',
        'Size daha iyi yardımcı olabilmem için biraz daha detay verebilir misiniz?',
        'İlginç bir bakış açısı! Başka neler düşünüyorsunuz?'
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// Ana sayfa
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Aria AI - Akıllı Sohbet</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
            }
            
            .chat-container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                width: 100%;
                max-width: 600px;
                height: 80vh;
                max-height: 700px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .chat-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 1.5rem;
                text-align: center;
                position: relative;
            }
            
            .chat-header h1 {
                font-size: 1.8rem;
                margin-bottom: 0.5rem;
            }
            
            .status-dot {
                display: inline-block;
                width: 10px;
                height: 10px;
                background: #4ade80;
                border-radius: 50%;
                margin-right: 8px;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            
            .chat-messages {
                flex: 1;
                padding: 1rem;
                overflow-y: auto;
                background: #f8fafc;
                scrollbar-width: thin;
                scrollbar-color: #cbd5e1 #f1f5f9;
            }
            
            .chat-messages::-webkit-scrollbar {
                width: 6px;
            }
            
            .chat-messages::-webkit-scrollbar-track {
                background: #f1f5f9;
            }
            
            .chat-messages::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 3px;
            }
            
            .message {
                margin-bottom: 1rem;
                display: flex;
                max-width: 80%;
                animation: slideIn 0.3s ease-out;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .message.user {
                align-self: flex-end;
                margin-left: auto;
                flex-direction: row-reverse;
            }
            
            .message.ai {
                align-self: flex-start;
            }
            
            .message-content {
                background: white;
                padding: 1rem 1.2rem;
                border-radius: 18px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                position: relative;
                max-width: 100%;
                word-wrap: break-word;
            }
            
            .message.user .message-content {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin-right: 1rem;
            }
            
            .message.ai .message-content {
                background: white;
                color: #374151;
                margin-left: 1rem;
                border: 1px solid #e5e7eb;
            }
            
            .avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
                flex-shrink: 0;
                align-self: flex-end;
            }
            
            .avatar.user {
                background: #f59e0b;
                color: white;
            }
            
            .avatar.ai {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .chat-input {
                padding: 1.5rem;
                background: white;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 1rem;
                align-items: center;
            }
            
            .input-field {
                flex: 1;
                padding: 1rem 1.2rem;
                border: 2px solid #e5e7eb;
                border-radius: 25px;
                font-size: 1rem;
                outline: none;
                transition: border-color 0.3s;
            }
            
            .input-field:focus {
                border-color: #667eea;
            }
            
            .send-button {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 1.2rem;
                transition: transform 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .send-button:hover {
                transform: scale(1.05);
            }
            
            .send-button:active {
                transform: scale(0.95);
            }
            
            .typing-indicator {
                display: none;
                padding: 1rem 1.2rem;
                background: white;
                border-radius: 18px;
                margin-left: 3rem;
                margin-bottom: 1rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                border: 1px solid #e5e7eb;
            }
            
            .typing-dots {
                display: flex;
                gap: 4px;
            }
            
            .typing-dots span {
                width: 8px;
                height: 8px;
                background: #9ca3af;
                border-radius: 50%;
                animation: typing 1.4s infinite ease-in-out;
            }
            
            .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
            .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
            
            @keyframes typing {
                0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                40% { transform: scale(1); opacity: 1; }
            }
            
            @media (max-width: 768px) {
                .chat-container {
                    height: 100vh;
                    border-radius: 0;
                }
                
                .message {
                    max-width: 90%;
                }
            }
        </style>
    </head>
    <body>
        <div class="chat-container">
            <div class="chat-header">
                <h1>🤖 Aria AI</h1>
                <p><span class="status-dot"></span>Akıllı Sohbet Asistanı</p>
            </div>
            
            <div class="chat-messages" id="chatMessages">
                <div class="message ai">
                    <div class="avatar ai">🤖</div>
                    <div class="message-content">
                        Merhaba! Ben Aria, sizin AI asistanınızım! 😊<br>
                        Size nasıl yardımcı olabilirim? Sorularınızı sorabilir, sohbet edebiliriz!
                    </div>
                </div>
            </div>
            
            <div class="typing-indicator" id="typingIndicator">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            
            <div class="chat-input">
                <input type="text" class="input-field" id="messageInput" 
                       placeholder="Mesajınızı yazın..." maxlength="500">
                <button class="send-button" onclick="sendMessage()">
                    ➤
                </button>
            </div>
        </div>

        <script>
            const chatMessages = document.getElementById('chatMessages');
            const messageInput = document.getElementById('messageInput');
            const typingIndicator = document.getElementById('typingIndicator');
            
            // Enter tuşu ile mesaj gönderme
            messageInput.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    sendMessage();
                }
            });
            
            // Otomatik odaklanma
            messageInput.focus();
            
            async function sendMessage() {
                const message = messageInput.value.trim();
                if (!message) return;
                
                // Kullanıcı mesajını ekle
                addMessage(message, 'user');
                messageInput.value = '';
                
                // Typing indicator göster
                showTyping();
                
                try {
                    // AI'ya mesaj gönder
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ message: message })
                    });
                    
                    const data = await response.json();
                    
                    // Kısa bir gecikme (daha gerçekçi görünmesi için)
                    setTimeout(() => {
                        hideTyping();
                        addMessage(data.response, 'ai');
                    }, 1000 + Math.random() * 1000);
                    
                } catch (error) {
                    hideTyping();
                    addMessage('Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', 'ai');
                }
            }
            
            function addMessage(text, sender) {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${sender}\`;
                
                const avatar = document.createElement('div');
                avatar.className = \`avatar \${sender}\`;
                avatar.textContent = sender === 'user' ? '👤' : '🤖';
                
                const content = document.createElement('div');
                content.className = 'message-content';
                content.innerHTML = text;
                
                messageDiv.appendChild(avatar);
                messageDiv.appendChild(content);
                
                chatMessages.appendChild(messageDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // Mesaj inputunu tekrar odakla
                messageInput.focus();
            }
            
            function showTyping() {
                typingIndicator.style.display = 'block';
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            
            function hideTyping() {
                typingIndicator.style.display = 'none';
            }
            
            // Sayfa yüklendiğinde input'a odaklan
            window.addEventListener('load', () => {
                messageInput.focus();
            });
        </script>
    </body>
    </html>
    `);
});

// Chat API endpoint
app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
        return res.status(400).json({
            error: 'Mesaj boş olamaz',
            response: 'Lütfen bir mesaj yazın!'
        });
    }
    
    // AI yanıtını oluştur
    const aiResponse = generateAIResponse(message);
    
    res.json({
        response: aiResponse,
        timestamp: new Date().toISOString(),
        status: 'success'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: '✅ Aria AI aktif ve hazır!',
        timestamp: new Date().toLocaleString('tr-TR'),
        port: PORT,
        uptime: process.uptime()
    });
});

// Server başlat
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 Aria AI Server çalışıyor!`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`💬 Sohbet etmeye hazır!`);
});// index.js
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
