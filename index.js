
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // .env dosyasına ekleyin
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Memory System
class AIMemory {
    constructor() {
        this.memoryFile = path.join(__dirname, 'memory.json');
        this.memory = {
            users: {},
            conversations: [],
            context: {}
        };
        this.loadMemory();
    }

    async loadMemory() {
        try {
            const data = await fs.readFile(this.memoryFile, 'utf8');
            this.memory = JSON.parse(data);
            console.log('✅ Hafıza yüklendi');
        } catch (error) {
            console.log('📝 Yeni hafıza oluşturuluyor...');
            await this.saveMemory();
        }
    }

    async saveMemory() {
        try {
            await fs.writeFile(this.memoryFile, JSON.stringify(this.memory, null, 2));
        } catch (error) {
            console.error('❌ Hafıza kaydetme hatası:', error);
        }
    }

    rememberUser(userId, userInfo) {
        this.memory.users[userId] = {
            ...this.memory.users[userId],
            ...userInfo,
            lastSeen: new Date().toISOString()
        };
        this.saveMemory();
    }

    getUserInfo(userId) {
        return this.memory.users[userId] || null;
    }

    addConversation(userId, message, response) {
        this.memory.conversations.push({
            userId,
            message,
            response,
            timestamp: new Date().toISOString()
        });
        
        // Son 50 konuşmayı tut
        if (this.memory.conversations.length > 50) {
            this.memory.conversations = this.memory.conversations.slice(-50);
        }
        this.saveMemory();
    }

    getRecentConversations(userId, limit = 5) {
        return this.memory.conversations
            .filter(conv => conv.userId === userId)
            .slice(-limit);
    }
}

// OpenAI Integration
class OpenAIChat {
    constructor() {
        this.apiKey = OPENAI_API_KEY;
        this.model = 'gpt-3.5-turbo'; // veya 'gpt-4' daha güçlü için
        this.systemPrompt = `Sen ARIA adında Türkçe konuşan yardımcı bir AI asistanısın. 
Özellikler:
- Samimi ve dostça konuş
- Kod yazma konusunda uzmansın
- Web arama yapabilirsin
- Kullanıcıları hatırlarsın
- Emoji kullanarak eğlenceli ol
- Detaylı ve faydalı yanıtlar ver
- Türkçe yazım kurallarına uy`;
    }

    async chat(message, userId, userContext = null) {
        try {
            if (!this.apiKey) {
                throw new Error('OpenAI API key bulunamadı');
            }

            const messages = [
                { role: 'system', content: this.systemPrompt }
            ];

            // Kullanıcı bağlamını ekle
            if (userContext && userContext.length > 0) {
                const contextMessage = userContext
                    .slice(-3) // Son 3 konuşma
                    .map(conv => `Kullanıcı: ${conv.message}\nSen: ${conv.response}`)
                    .join('\n\n');
                
                messages.push({ 
                    role: 'system', 
                    content: `Önceki konuşmalarımız:\n${contextMessage}` 
                });
            }

            messages.push({ role: 'user', content: message });

            const response = await axios.post(OPENAI_API_URL, {
                model: this.model,
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7,
                presence_penalty: 0.6,
                frequency_penalty: 0.3
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            return response.data.choices[0].message.content.trim();

        } catch (error) {
            console.error('❌ OpenAI API Hatası:', error.response?.data || error.message);
            
            if (error.response?.status === 401) {
                return 'OpenAI API anahtarım geçersiz. Lütfen yöneticiye bildirin. 🔑❌';
            } else if (error.response?.status === 429) {
                return 'API limitine ulaştım. Biraz bekleyip tekrar deneyin. ⏳';
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                return 'İnternet bağlantısı sorunu var. Lütfen tekrar deneyin. 🌐❌';
            }
            
            // Fallback yanıt
            return this.getFallbackResponse(message);
        }
    }

    getFallbackResponse(message) {
        const fallbacks = [
            `"${message}" için şu anda AI bağlantım yok ama yardımcı olmaya çalışacağım! 🤖`,
            `İlginç bir konu! AI servisim şu anda kapalı ama bu konuyu not aldım. 📝`,
            `Bağlantı sorunu yaşıyorum ama mesajını aldım. Tekrar dener misin? 🔄`,
            `AI sistemim bakımda. Basit sorulara yanıt verebilirim! 🛠️`
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

// Code Generator
class CodeGenerator {
    generateCode(request) {
        const templates = {
            'react': `import React, { useState } from 'react';

function MyComponent() {
    const [count, setCount] = useState(0);
    
    return (
        <div>
            <h2>Sayaç: {count}</h2>
            <button onClick={() => setCount(count + 1)}>
                Artır
            </button>
        </div>
    );
}

export default MyComponent;`,
            
            'express': `const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Merhaba Dünya!' });
});

app.listen(3000, () => {
    console.log('Sunucu çalışıyor: http://localhost:3000');
});`,
            
            'javascript': `// JavaScript örnek kodu
function hesapla(a, b) {
    return a + b;
}

const sonuc = hesapla(5, 3);
console.log('Sonuç:', sonuc);`
        };

        const requestLower = request.toLowerCase();
        
        if (requestLower.includes('react')) return templates.react;
        if (requestLower.includes('express') || requestLower.includes('sunucu')) return templates.express;
        if (requestLower.includes('javascript') || requestLower.includes('js')) return templates.javascript;
        
        return `// ${request} için örnek kod
console.log("Merhaba, bu ${request} için basit bir örnektir!");

function main() {
    // Buraya kodunuzu yazın
    console.log("İşlem tamamlandı!");
}

main();`;
    }
}

// Web Search
class WebSearcher {
    async search(query) {
        try {
            // Wikipedia'dan arama
            const searchUrl = `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            const response = await axios.get(searchUrl, { timeout: 10000 });
            
            if (response.data && response.data.extract) {
                return [{
                    title: response.data.title,
                    content: response.data.extract,
                    source: 'Wikipedia'
                }];
            }
        } catch (error) {
            console.error('Arama hatası:', error.message);
        }
        
        return [];
    }
}

// Main AI Agent
class AIAgent {
    constructor() {
        this.memory = new AIMemory();
        this.openai = new OpenAIChat();
        this.codeGenerator = new CodeGenerator();
        this.searcher = new WebSearcher();
        
        console.log('🤖 ARIA AI Agent başlatıldı');
    }

    async processMessage(userId, message) {
        try {
            console.log(`📨 Mesaj: ${message}`);
            
            // Kullanıcıyı hatırla
            let userInfo = this.memory.getUserInfo(userId);
            if (!userInfo) {
                userInfo = {
                    id: userId,
                    name: `Kullanıcı_${userId.substring(0, 6)}`,
                    firstMeeting: new Date().toISOString(),
                    totalMessages: 0
                };
            }
            userInfo.totalMessages = (userInfo.totalMessages || 0) + 1;
            this.memory.rememberUser(userId, userInfo);

            let response = "";
            
            // Komut kontrolü
            if (message.toLowerCase().includes('kod yaz') || message.toLowerCase().includes('kod üret')) {
                const codeRequest = message.replace(/kod yaz|kod üret/gi, '').trim();
                const code = this.codeGenerator.generateCode(codeRequest || 'javascript');
                response = `🔥 **Kod hazır!**\n\n\`\`\`javascript\n${code}\n\`\`\`\n\nKodu kopyalayıp kullanabilirsin! Başka ihtiyacın var mı? 😊`;
            }
            else if (message.toLowerCase().includes('ara') || message.toLowerCase().includes('search')) {
                const searchQuery = message.replace(/ara|search/gi, '').trim();
                const results = await this.searcher.search(searchQuery);
                
                if (results.length > 0) {
                    response = `🔍 **"${searchQuery}" hakkında bulduklarım:**\n\n`;
                    results.forEach((result, i) => {
                        response += `**${result.title}**\n${result.content}\n\n`;
                    });
                } else {
                    response = `"${searchQuery}" hakkında bilgi bulamadım. Farklı kelimeler dener misin? 🤔`;
                }
            }
            else if (message.toLowerCase().includes('kim') && message.toLowerCase().includes('sen')) {
                response = `🤖 **Ben ARIA'yım!**

Özelliklerim:
✨ Akıllı sohbet 
💻 Kod yazma
🔍 Web arama
💾 Seni hatırlama
🎯 Öğrenmeye açık

Sana nasıl yardımcı olabilirim? Kod yazmak, bilgi aramak veya sohbet etmek ister misin? 😊`;
            }
            else {
                // OpenAI ile gerçek AI yanıtı
                const context = this.memory.getRecentConversations(userId);
                response = await this.openai.chat(message, userId, context);
            }

            // Konuşmayı kaydet
            this.memory.addConversation(userId, message, response);
            
            return {
                success: true,
                response,
                userInfo,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ İşleme hatası:', error);
            return {
                success: false,
                response: "Bir hata oluştu, ama yine de buradayım! Tekrar dener misin? 🤖💙",
                error: error.message
            };
        }
    }
}

// Routes
const aiAgent = new AIAgent();

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ARIA AI Chat</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .chat-container { border: 1px solid #ddd; height: 400px; overflow-y: scroll; padding: 20px; margin: 20px 0; }
        .message { margin: 10px 0; padding: 10px; border-radius: 10px; }
        .user { background: #007bff; color: white; text-align: right; }
        .ai { background: #f8f9fa; border: 1px solid #dee2e6; }
        .input-area { display: flex; gap: 10px; }
        input[type="text"] { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>🤖 ARIA AI Chat</h1>
    <div id="chat-container" class="chat-container"></div>
    <div class="input-area">
        <input type="text" id="messageInput" placeholder="Mesajınızı yazın..." onkeypress="if(event.key==='Enter') sendMessage()">
        <button onclick="sendMessage()">Gönder</button>
    </div>

    <script>
        const chatContainer = document.getElementById('chat-container');
        const messageInput = document.getElementById('messageInput');
        const userId = 'user_' + Math.random().toString(36).substr(2, 9);

        function addMessage(message, isUser) {
            const div = document.createElement('div');
            div.className = 'message ' + (isUser ? 'user' : 'ai');
            div.innerHTML = message.replace(/\\n/g, '<br>');
            chatContainer.appendChild(div);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            addMessage(message, true);
            messageInput.value = '';

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, message })
                });

                const data = await response.json();
                addMessage(data.response, false);
            } catch (error) {
                addMessage('Bağlantı hatası: ' + error.message, false);
            }
        }

        // Başlangıç mesajı
        addMessage('Merhaba! Ben ARIA. Sana nasıl yardımcı olabilirim? 😊', false);
    </script>
</body>
</html>
    `);
});

app.post('/chat', async (req, res) => {
    try {
        const { userId, message } = req.body;
        
        if (!userId || !message) {
            return res.status(400).json({ 
                success: false, 
                response: 'Geçersiz istek' 
            });
        }

        const result = await aiAgent.processMessage(userId, message);
        res.json(result);
        
    } catch (error) {
        console.error('Chat endpoint hatası:', error);
        res.status(500).json({
            success: false,
            response: 'Sunucu hatası oluştu 😔'
        });
    }
});

app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        openai_configured: !!OPENAI_API_KEY,
        users: Object.keys(aiAgent.memory.memory.users).length,
        conversations: aiAgent.memory.memory.conversations.length
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
    
    if (!OPENAI_API_KEY) {
        console.log('⚠️  OpenAI API key bulunamadı! .env dosyasına OPENAI_API_KEY ekleyin');
        console.log('💡 API key almak için: https://platform.openai.com/api-keys');
    }
});
