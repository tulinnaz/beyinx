<!DOCTYPE html>
<html>
<head>
    <title>ARIA - AI Agent</title>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="styles.css">
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
                Merhaba! Ben ARIA, senin AI agentın. Benimle sohbet edebilir, kod yazmamı isteyebilir, web'de arama yaptırabilirsin. Nasıl yardımcı olabilirim?
            </div>
        </div>
        
        <div class="status" id="status">Hazır</div>
        
        <div class="input-container">
            <input type="text" id="messageInput" placeholder="Mesajını yaz..." onkeypress="handleKeyPress(event)">
            <button onclick="sendMessage()">Gönder</button>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
