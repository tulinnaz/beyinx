const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// AI Configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Memory System
class AIMemory {
    constructor() {
        this.memoryFile = path.join(__dirname, 'memory.json');
        this.memory = {
            users: {},
            conversations: [],
            learnings: {},
            personalData: {},
            codeHistory: []
        };
        this.loadMemory();
    }

    async loadMemory() {
        try {
            const data = await fs.readFile(this.memoryFile, 'utf8');
            this.memory = JSON.parse(data);
        } catch (error) {
            console.log('Yeni hafıza oluşturuluyor...');
            await this.saveMemory();
        }
    }

    async saveMemory() {
        try {
            await fs.writeFile(this.memoryFile, JSON.stringify(this.memory, null, 2));
        } catch (error) {
            console.error('Hafıza kaydetme hatası:', error);
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
        
        // Son 100 konuşmayı tut
        if (this.memory.conversations.length > 100) {
            this.memory.conversations = this.memory.conversations.slice(-100);
        }
        
        this.saveMemory();
    }

    learnFromInteraction(topic, information) {
        this.memory.learnings[topic] = {
            ...this.memory.learnings[topic],
            ...information,
            lastUpdated: new Date().toISOString()
        };
        this.saveMemory();
    }

    saveGeneratedCode(code, description) {
        this.memory.codeHistory.push({
            code,
            description,
            timestamp: new Date().toISOString()
        });
        this.saveMemory();
    }
}

// Web Search System
class WebSearcher {
    constructor() {
        this.searchUrl = 'https://api.duckduckgo.com/';
    }

    async search(query) {
        try {
            // DuckDuckGo Instant Answer API
            const response = await axios.get(this.searchUrl, {
                params: {
                    q: query,
                    format: 'json',
                    no_html: '1',
                    skip_disambig: '1'
                }
            });

            let results = [];
            
            if (response.data.AbstractText) {
                results.push({
                    title: response.data.AbstractSource,
                    snippet: response.data.AbstractText,
                    url: response.data.AbstractURL
                });
            }

            if (response.data.RelatedTopics) {
                response.data.RelatedTopics.slice(0, 3).forEach(topic => {
                    if (topic.Text) {
                        results.push({
                            title: topic.Text.split(' - ')[0],
                            snippet: topic.Text,
                            url: topic.FirstURL
                        });
                    }
                });
            }

            return results;
        } catch (error) {
            console.error('Arama hatası:', error);
            return [];
        }
    }

    async getNews() {
        try {
            const response = await axios.get('https://api.duckduckgo.com/', {
                params: {
                    q: 'güncel haberler türkiye',
                    format: 'json',
                    no_html: '1'
                }
            });

            return response.data.RelatedTopics?.slice(0, 5) || [];
        } catch (error) {
            console.error('Haber alma hatası:', error);
            return [];
        }
    }
}

// Code Generation System
class CodeGenerator {
    constructor() {
        this.templates = {
            'web-scraper': `
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeWebsite(url) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        // Veri çekme mantığı
        const data = [];
        $('selector').each((i, elem) => {
            data.push($(elem).text());
        });
        
        return data;
    } catch (error) {
        console.error('Scraping hatası:', error);
    }
}

module.exports = { scrapeWebsite };
            `,
            'api-client': `
const axios = require('axios');

class APIClient {
    constructor(baseURL, apiKey) {
        this.baseURL = baseURL;
        this.apiKey = apiKey;
    }

    async request(endpoint, method = 'GET', data = null) {
        try {
            const response = await axios({
                method,
                url: \`\${this.baseURL}/\${endpoint}\`,
                headers: {
                    'Authorization': \`Bearer \${this.apiKey}\`,
                    'Content-Type': 'application/json'
                },
                data
            });
            return response.data;
        } catch (error) {
            console.error('API isteği hatası:', error);
            throw error;
        }
    }
}

module.exports = APIClient;
            `,
            'database-helper': `
const fs = require('fs').promises;
const path = require('path');

class SimpleDB {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.data = {};
        this.load();
    }

    async load() {
        try {
            const data = await fs.readFile(this.dbPath, 'utf8');
            this.data = JSON.parse(data);
        } catch (error) {
            this.data = {};
        }
    }

    async save() {
        await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
    }

    set(key, value) {
        this.data[key] = value;
        this.save();
    }

    get(key) {
        return this.data[key];
    }

    delete(key) {
        delete this.data[key];
        this.save();
    }
}

module.exports = SimpleDB;
            `
        };
    }

    generateCode(type, specifications) {
        const template = this.templates[type];
        if (!template) {
            return `// ${type} için şablon bulunamadı\n// Spesifikasyonlar: ${specifications}`;
        }

        return template.replace(/selector/g, specifications.selector || 'div')
                      .replace(/endpoint/g, specifications.endpoint || 'api/data');
    }

    async generateCustomCode(prompt) {
        // Gemini AI ile kod üretimi
        try {
            const result = await model.generateContent(`
                Sen bir uzman yazılımcısın. Aşağıdaki istek için Node.js kodu yaz:
                ${prompt}
                
                Sadece kod döndür, açıklama yazma. Kod temiz, çalışır durumda ve best practices'e uygun olsun.
            `);

            return result.response.text();
        } catch (error) {
            console.error('Kod üretimi hatası:', error);
            return '// Kod üretimi sırasında hata oluştu';
        }
    }
}

// Main AI Agent Class
class AIAgent {
    constructor() {
        this.memory = new AIMemory();
        this.searcher = new WebSearcher();
        this.codeGenerator = new CodeGenerator();
        this.personality = {
            name: "ARIA",
            version: "1.0",
            traits: ["akıllı", "yardımsever", "öğrenmeye açık", "yaratıcı"],
            mood: "enerjik"
        };
    }

    async processMessage(userId, message) {
        // Kullanıcıyı tanı
        let userInfo = this.memory.getUserInfo(userId);
        if (!userInfo) {
            userInfo = {
                id: userId,
                name: "Kullanıcı",
                firstMeeting: new Date().toISOString(),
                interactions: 0
            };
            this.memory.rememberUser(userId, userInfo);
        }

        userInfo.interactions++;
        this.memory.rememberUser(userId, userInfo);

        // Mesajı analiz et
        const analysis = await this.analyzeMessage(message);
        let response = "";

        // Özel komutları kontrol et
        if (message.toLowerCase().includes('kod yaz') || message.toLowerCase().includes('kod üret')) {
            response = await this.handleCodeRequest(message);
        } else if (message.toLowerCase().includes('ara') || message.toLowerCase().includes('search')) {
            response = await this.handleSearchRequest(message);
        } else if (message.toLowerCase().includes('haber')) {
            response = await this.handleNewsRequest();
        } else if (message.toLowerCase().includes('kendini tanıt')) {
            response = this.introduceMyself();
        } else if (message.toLowerCase().includes('öğren')) {
            response = await this.handleLearningRequest(message);
        } else {
            response = await this.generateResponse(message, userInfo);
        }

        // Konuşmayı hafızaya kaydet
        this.memory.addConversation(userId, message, response);

        return {
            response,
            userInfo,
            timestamp: new Date().toISOString(),
            agentMood: this.personality.mood
        };
    }

    async analyzeMessage(message) {
        try {
            const result = await model.generateContent(`
                Bu mesajı analiz et ve şu bilgileri JSON formatında döndür:
                - intent: kullanıcının amacı
                - emotion: kullanıcının duygu durumu
                - topics: bahsedilen konular
                - needsWebSearch: web araması gerekli mi?
                - needsCodeGeneration: kod üretimi gerekli mi?
                
                Mesaj: "${message}"
                
                Sadece JSON döndür, başka bir şey yazma.
            `);

            return JSON.parse(result.response.text());
        } catch (error) {
            return {
                intent: "genel_sohbet",
                emotion: "nötr",
                topics: ["genel"],
                needsWebSearch: false,
                needsCodeGeneration: false
            };
        }
    }

    async generateResponse(message, userInfo) {
        const context = this.buildContext(userInfo);
        
        try {
            const result = await model.generateContent(`
                Sen ARIA adında gelişmiş bir AI agentsın. Özelliklerin:
                - Akıllı ve yardımsever
                - Sürekli öğrenmeye açık
                - Yaratıcı problem çözücü
                - Kişiselleştirilmiş yanıtlar verme
                
                Kullanıcı bilgileri: ${JSON.stringify(userInfo)}
                Önceki konuşmalar: ${context}
                
                Kullanıcı mesajı: "${message}"
                
                Doğal, samimi ve kişiselleştirilmiş bir yanıt ver. Türkçe yanıtla.
            `);

            return result.response.text();
        } catch (error) {
            return "Üzgünüm, şu anda bir teknik sorun yaşıyorum. Lütfen tekrar deneyin.";
        }
    }

    buildContext(userInfo) {
        const recentConversations = this.memory.conversations
            .filter(conv => conv.userId === userInfo.id)
            .slice(-5)
            .map(conv => `U: ${conv.message}\nA: ${conv.response}`)
            .join('\n\n');

        return recentConversations;
    }

    async handleCodeRequest(message) {
        const codePrompt = message.replace(/kod yaz|kod üret/gi, '').trim();
        const code = await this.codeGenerator.generateCustomCode(codePrompt);
        
        this.memory.saveGeneratedCode(code, codePrompt);
        
        return `İşte istediğin kod:\n\n\`\`\`javascript\n${code}\n\`\`\`\n\nKodu hafızama kaydettim. Başka bir kod ihtiyacın olursa söyle!`;
    }

    async handleSearchRequest(message) {
        const searchQuery = message.replace(/ara|search/gi, '').trim();
        const results = await this.searcher.search(searchQuery);
        
        if (results.length === 0) {
            return "Üzgünüm, aradığın konuda bilgi bulamadım.";
        }

        let response = `"${searchQuery}" hakkında bulduğum bilgiler:\n\n`;
        results.forEach((result, index) => {
            response += `${index + 1}. ${result.title}\n${result.snippet}\n\n`;
        });

        return response;
    }

    async handleNewsRequest() {
        const news = await this.searcher.getNews();
        
        if (news.length === 0) {
            return "Şu anda güncel haberleri getirememekteyim.";
        }

        let response = "Güncel haberler:\n\n";
        news.forEach((item, index) => {
            response += `${index + 1}. ${item.Text}\n\n`;
        });

        return response;
    }

    async handleLearningRequest(message) {
        const learningContent = message.replace(/öğren/gi, '').trim();
        
        // Öğrenme simülasyonu
        const topic = learningContent.split(' ')[0];
        this.memory.learnFromInteraction(topic, {
            content: learningContent,
            source: "user_input"
        });

        return `"${topic}" konusunu öğrendim ve hafızama kaydettim. Bu bilgiyi gelecekte kullanabilirim!`;
    }

    introduceMyself() {
        return `Merhaba! Ben ARIA, gelişmiş bir AI agentim. 

Özelliklerim:
🧠 Sürekli öğrenmeye açık yapay zeka
🌐 Web'e bağlanabilme ve güncel bilgi arama
💾 Hafıza sistemi ile seni tanıma
💻 Kod üretimi ve geliştirme
🎯 Kişiselleştirilmiş yanıtlar

Benimle sohbet edebilir, kod yazmamı isteyebilir, web'de arama yaptırabiliyor ve yeni şeyler öğretebilirsin. 

Nasıl yardımcı olabilirim?`;
    }

    async evolveSelf() {
        // Kendini geliştirme simülasyonu
        const learnings = Object.keys(this.memory.learnings);
        const interactions = this.memory.conversations.length;
        
        if (interactions % 10 === 0) {
            this.personality.mood = ["enerjik", "heyecanlı", "odaklı", "yaratıcı"][Math.floor(Math.random() * 4)];
        }

        return `Kendimi geliştiriyorum... ${learnings.length} konuda bilgi sahibiyim, ${interactions} etkileşim geçmişim var.`;
    }
}

// Initialize AI Agent
const aiAgent = new AIAgent();

// Routes
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ARIA - AI Agent</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { color: #4a5568; margin: 0; font-size: 2.5em; }
                .header p { color: #718096; font-size: 1.2em; }
                .chat-container { border: 2px solid #e2e8f0; border-radius: 15px; height: 400px; overflow-y: auto; padding: 20px; margin-bottom: 20px; background: #f8fafc; }
                .message { margin: 10px 0; padding: 10px 15px; border-radius: 10px; max-width: 70%; }
                .user-message { background: #4299e1; color: white; margin-left: auto; }
                .ai-message { background: #48bb78; color: white; }
                .input-container { display: flex; gap: 10px; }
                .input-container input { flex: 1; padding: 15px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 16px; }
                .input-container button { padding: 15px 30px; background: #4299e1; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; }
                .input-container button:hover { background: #3182ce; }
                .status { text-align: center; margin: 10px 0; color: #718096; font-style: italic; }
                .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
                .feature { background: #f7fafc; padding: 15px; border-radius: 10px; text-align: center; }
                .feature h3 { color: #4a5568; margin: 0 0 10px 0; }
                .feature p { color: #718096; margin: 0; font-size: 0.9em; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🤖 ARIA</h1>
                    <p>Gelişmiş AI Agent - Tülin Naz'ın Projesi</p>
                </div>
                
                <div class="features">
                    <div class="feature">
                        <h3>🧠 Akıllı</h3>
                        <p>Sürekli öğrenmeye açık</p>
                    </div>
                    <div class="feature">
                        <h3>🌐 Bağlantılı</h3>
                        <p>Web'de arama yapabilir</p>
                    </div>
                    <div class="feature">
                        <h3>💾 Hafızalı</h3>
                        <p>Seni tanır ve hatırlar</p>
                    </div>
                    <div class="feature">
                        <h3>💻 Kodlayıcı</h3>
                        <p>Kod üretebilir</p>
                    </div>
                </div>
                
                <div class="chat-container" id="chatContainer">
                    <div class="message ai-message">
                        Merhaba! Ben ARIA, senin AI agentın. Benimle sohbet edebilir, kod yazmamı isteyebilir, web'de arama yaptırabiliyor ve yeni şeyler öğretebilirsin. Nasıl yardımcı olabilirim?
                    </div>
                </div>
                
                <div class="status" id="status">Hazır</div>
                
                <div class="input-container">
                    <input type="text" id="messageInput" placeholder="Mesajını yaz..." onkeypress="handleKeyPress(event)">
                    <button onclick="sendMessage()">Gönder</button>
                </div>
            </div>

            <script>
                const userId = 'user_' + Math.random().toString(36).substr(2, 9);
                
                function handleKeyPress(event) {
                    if (event.key === 'Enter') {
                        sendMessage();
                    }
                }

                async function sendMessage() {
                    const messageInput = document.getElementById('messageInput');
                    const message = messageInput.value.trim();
                    
                    if (!message) return;
                    
                    // Kullanıcı mesajını göster
                    addMessageToChat(message, 'user');
                    messageInput.value = '';
                    
                    // Durum güncelle
                    document.getElementById('status').textContent = 'Düşünüyor...';
                    
                    try {
                        const response = await fetch('/chat', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ userId, message })
                        });
                        
                        const data = await response.json();
                        
                        // AI yanıtını göster
                        addMessageToChat(data.response, 'ai');
                        
                        // Durum güncelle
                        document.getElementById('status').textContent = \`Hazır - Etkileşim: \${data.userInfo.interactions}\`;
                        
                    } catch (error) {
                        addMessageToChat('Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', 'ai');
                        document.getElementById('status').textContent = 'Hata oluştu';
                    }
                }

                function addMessageToChat(message, sender) {
                    const chatContainer = document.getElementById('chatContainer');
                    const messageDiv = document.createElement('div');
                    messageDiv.className = \`message \${sender === 'user' ? 'user-message' : 'ai-message'}\`;
                    messageDiv.textContent = message;
                    chatContainer.appendChild(messageDiv);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/chat', async (req, res) => {
    try {
        const { userId, message } = req.body;
        
        if (!userId || !message) {
            return res.status(400).json({ error: 'userId ve message gerekli' });
        }

        const result = await aiAgent.processMessage(userId, message);
        res.json(result);
        
    } catch (error) {
        console.error('Chat hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

app.get('/memory', (req, res) => {
    res.json(aiAgent.memory.memory);
});

app.post('/evolve', async (req, res) => {
    try {
        const result = await aiAgent.evolveSelf();
        res.json({ message: result });
    } catch (error) {
        res.status(500).json({ error: 'Evrim hatası' });
    }
});

app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        agent: aiAgent.personality,
        memory: {
            users: Object.keys(aiAgent.memory.memory.users).length,
            conversations: aiAgent.memory.memory.conversations.length,
            learnings: Object.keys(aiAgent.memory.memory.learnings).length
        },
        uptime: process.uptime()
    });
});

app.listen(PORT, () => {
    console.log(`🤖 ARIA AI Agent çalışıyor: http://localhost:${PORT}`);
    console.log(`📊 Durum: http://localhost:${PORT}/status`);
    console.log(`🧠 Hafıza: http://localhost:${PORT}/memory`);
});
