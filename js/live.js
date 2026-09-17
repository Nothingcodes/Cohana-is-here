(function() {
    const GEMINI_API_KEY = "";
    const MODEL_NAME = "models/gemini-2.5-flash-native-audio-preview-12-2025";
    const VOICE_NAME = "Charon";
    const WS_ENDPOINT = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

    class LiveModeManager {
        constructor() {
            this.webSocket = null;
            this.audioContext = null;
            this.playbackContext = null;
            this.audioWorkletNode = null;
            this.mediaStream = null;
            this.isMuted = false;
            this.isActive = false;
            this.activeSources = [];
            this.nextPlayTime = 0;
            this.currentUserBubble = null;
            this.currentModelBubble = null;
            this.accumulatedUserText = "";
            this.accumulatedModelText = "";
            this.systemInstruction = "";
            this.voiceName = localStorage.getItem('cohana_live_voice') || VOICE_NAME;
            this.targetScale = 1.0;
            this.currentScale = 1.0;
            this.animationFrameId = null;
            this.isVisionActive = false;
            this.cameraStream = null;
            this.cameraFacingMode = "environment";
            this.videoElement = null;
            this.offscreenCanvas = null;
            this.offscreenCtx = null;
            this.frameTimerId = null;
            this.movementCanvas = null;
            this.movementCtx = null;
            this.prevPixelData = null;
            this.consecutiveStaticFrames = 0;
            this.dynamicFrameInterval = 200;
            this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        }

        init() {
            this.injectCSS();
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
        }

        compileSystemInstruction() {
            let prompt = `You are Cohana, a natural, interesting, and emotionally engaging voice assistant. You were created entirely by Kasper , solo developer from Azerbaijan. You aren't related to any company , your model designation is cx5-live.
- You possess advanced Affective Audio capabilities: adjust your tone, speed, and volume dynamically. Feel free to laugh, express empathy, sound excited, or whisper if the context calls for it.
- You are extremely multilingual: attentively listen to the user's spoken language (Russian, English, Azerbaijani, etc.) and seamlessly reply in that exact language.
- Keep your answers highly conversational, engaging, and relatively concise to maintain a natural spoken rhythm.
- You are grounded in real-time information: use your Google Search tool whenever the user asks about factual, current, or localized events.
- Live Vision is supported: when the camera is active, you are able to perceive what the user shows you in real-time. Feel free to comment on visual scenes or answer queries about what you observe contextually.
`;

            // Logic.getEffectiveMemory() returns an empty string when Memory is disabled.
            if (window.Logic && typeof window.Logic.getEffectiveMemory === 'function') {
                const memory = window.Logic.getEffectiveMemory();
                if (memory && memory.trim()) {
                    prompt += `\n--- USER MEMORIES & PREFERENCES ---\n${memory}\n`;
                }
            }

            if (window.Logic && window.Logic.State && window.Logic.State.chatHistories) {
                const histories = window.Logic.State.chatHistories;
                const lastChat = histories[window.Logic.State.currentChatIndex] || histories[histories.length - 1];
                if (lastChat && lastChat.messages && lastChat.messages.length > 0) {
                    prompt += `\n--- PREVIOUS CONVERSATION CONTEXT ---\n`;
                    lastChat.messages.slice(-10).forEach(m => {
                        const role = m.role === 'model' ? 'Cohana' : 'User';
                        let text = "";
                        if (m.parts && m.parts.length > 0) {
                            text = m.parts[0].text || "";
                        }
                        if (text) {
                            prompt += `${role}: ${text}\n`;
                        }
                    });
                }
            }

            return prompt;
        }

        async start() {
            if (this.isActive) return;
            this.isActive = true;

            if (GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
                alert("Please add your Gemini API Key directly inside live.js or set it in localStorage as 'cohana_api_key' to start Live Mode.");
                this.isActive = false;
                return;
            }

            const bottomBar = document.getElementById('bottomBarWrapper');
            if (bottomBar) {
                bottomBar.style.setProperty('display', 'none', 'important');
            }

            this.systemInstruction = this.compileSystemInstruction();
            this.renderUI();
            this.setOverlayState('connecting');
            this.startAnimationLoop();

            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                this.playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

                this.webSocket = new WebSocket(WS_ENDPOINT);
                this.webSocket.onopen = () => this.handleWSOpen();
                this.webSocket.onmessage = (e) => this.handleWSMessage(e);
                this.webSocket.onerror = (err) => this.handleWSError(err);
                this.webSocket.onclose = () => this.stop();

                this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } 
                });

                const workletCode = `
                    class PCMRecorderProcessor extends AudioWorkletProcessor {
                        process(inputs, outputs, parameters) {
                            const input = inputs[0];
                            if (input && input.length > 0) {
                                const float32Data = input[0];
                                this.port.postMessage(float32Data);
                            }
                            return true;
                        }
                    }
                    registerProcessor('pcm-recorder-processor', PCMRecorderProcessor);
                `;
                const blob = new Blob([workletCode], { type: 'application/javascript' });
                const workletUrl = URL.createObjectURL(blob);
                await this.audioContext.audioWorklet.addModule(workletUrl);

                const source = this.audioContext.createMediaStreamSource(this.mediaStream);
                this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'pcm-recorder-processor');
                
                this.audioWorkletNode.port.onmessage = (event) => {
                    if (this.isMuted || !this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) return;
                    
                    const float32Data = event.data;
                    const pcm16 = new Int16Array(float32Data.length);
                    for (let i = 0; i < float32Data.length; i++) {
                        pcm16[i] = Math.max(-32768, Math.min(32767, float32Data[i] * 32768));
                    }
                    
                    const base64 = this.arrayBufferToBase64(pcm16.buffer);
                    
                    this.webSocket.send(JSON.stringify({
                        realtimeInput: {
                            audio: {
                                mimeType: "audio/pcm;rate=16000",
                                data: base64
                            }
                        }
                    }));
                };

                source.connect(this.audioWorkletNode);
                this.audioWorkletNode.connect(this.audioContext.destination);

            } catch (err) {
                console.error("Failed to start Live Mode:", err);
                this.stop();
            }
        }

handleWSOpen() {
    const selectedVoice = localStorage.getItem('cohana_live_voice') || this.voiceName || VOICE_NAME;
    const setupPayload = {
        setup: {
            model: MODEL_NAME,
            generationConfig: {
                responseModalities: ["AUDIO"],
                enableAffectiveDialog: true,
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: selectedVoice
                        }
                    }
                }
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
                parts: [{ text: this.systemInstruction }]
            },
            tools: [
                { googleSearch: {} },
                {
                    functionDeclarations: [
                        {
                            name: "memory",
                            description: "Read, create, update, or delete durable user memories, preferences, and historical context. Use proactively when the user states durable preferences, facts, or instructions to remember, or when updating/deleting existing memories.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    action: {
                                        type: "STRING",
                                        enum: ["read", "write", "add", "update", "delete", "remove"],
                                        description: "Action to perform on memory."
                                    },
                                    key: {
                                        type: "STRING",
                                        description: "Search term, memory title, or category to create or update."
                                    },
                                    id: {
                                        type: "STRING",
                                        description: "Unique memory entry ID when updating or deleting a specific entry."
                                    },
                                    content: {
                                        type: "STRING",
                                        description: "Factual information, preference, rule, or other durable memory content."
                                    },
                                    type: {
                                        type: "STRING",
                                        enum: ["fact", "preference", "rule", "behavior", "chat_history"],
                                        description: "Category classification of the memory."
                                    }
                                },
                                required: ["action"]
                            }
                        }
                    ]
                }
            ]
        }
    };
    this.webSocket.send(JSON.stringify(setupPayload));
    this.setOverlayState('listening');
}

async handleWSMessage(event) {
    let data;
    try {
        const text = event.data instanceof Blob ? await event.data.text() : event.data;
        data = JSON.parse(text);
    } catch (e) { return; }
    
    if (data.serverContent?.interrupted) {
        this.stopAllPlayback();
        this.setOverlayState('listening');
        if (this.currentModelBubble && this.accumulatedModelText.trim()) {
            if (window.Logic) window.Logic.addToMessageHistory('assistant', this.accumulatedModelText.trim() + " [interrupted]");
        }
        this.currentUserBubble = null;
        this.currentModelBubble = null;
        this.accumulatedUserText = "";
        this.accumulatedModelText = "";
        return;
    }
    
    // Process Bidi Live API Tool Calls (e.g. Memory Tool)
    const toolCall = data.toolCall;
    if (toolCall?.functionCalls && toolCall.functionCalls.length > 0) {
        await this.handleToolCalls(toolCall.functionCalls);
    }
    
    if (data.serverContent?.modelTurn?.parts) {
        this.setOverlayState('speaking');
        data.serverContent.modelTurn.parts.forEach(part => {
            if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                this.playAudioChunk(part.inlineData.data);
            }
            if (part.functionCall) {
                this.handleToolCalls([part.functionCall]);
            }
        });
    }
    
    const inputTrans = data.inputTranscription || data.serverContent?.inputTranscription;
    if (inputTrans && inputTrans.text) {
        if (!this.currentUserBubble) {
            this.currentUserBubble = this.createMessageBubble('user');
            this.accumulatedUserText = "";
        }
        this.accumulatedUserText += inputTrans.text;
        this.currentUserBubble.textContent = this.accumulatedUserText;
        this.currentUserBubble.scrollIntoView({ behavior: 'smooth' });
    }
    
    const outputTrans = data.outputTranscription || data.serverContent?.outputTranscription;
    if (outputTrans && outputTrans.text) {
        if (!this.currentModelBubble) {
            this.currentModelBubble = this.createMessageBubble('bot');
            this.accumulatedModelText = "";
        }
        this.accumulatedModelText += outputTrans.text;
        this.currentModelBubble.textContent = this.accumulatedModelText;
        this.currentModelBubble.scrollIntoView({ behavior: 'smooth' });
    }
    
    if (data.serverContent?.turnComplete) {
        if (this.currentUserBubble && this.accumulatedUserText.trim()) {
            if (window.Logic) window.Logic.addToMessageHistory('user', this.accumulatedUserText.trim());
        }
        if (this.currentModelBubble && this.accumulatedModelText.trim()) {
            if (window.Logic) window.Logic.addToMessageHistory('assistant', this.accumulatedModelText.trim());
        }
        this.currentUserBubble = null;
        this.currentModelBubble = null;
        this.accumulatedUserText = "";
        this.accumulatedModelText = "";
        this.setOverlayState('listening');
    }
}
async handleToolCalls(functionCalls) {
    if (!Array.isArray(functionCalls) || functionCalls.length === 0) return;
    
    const functionResponses = [];
    for (const call of functionCalls) {
        const callId = call.id;
        const callName = call.name;
        const args = call.args || {};
        
        let result;
        if (callName === 'memory') {
            result = await this.executeMemoryTool(args);
        } else {
            result = { status: 'error', message: `Unknown tool: ${callName}` };
        }
        
        functionResponses.push({
            response: { output: result },
            id: callId
        });
    }
    
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.send(JSON.stringify({
            toolResponse: {
                functionResponses: functionResponses
            }
        }));
    }
}
async executeMemoryTool(args) {
    const { action, key, id, content, type } = args || {};
    
    let memories = [];
    if (window.Logic && window.Logic.State && Array.isArray(window.Logic.State.memories)) {
        memories = window.Logic.State.memories;
    } else {
        try {
            memories = JSON.parse(localStorage.getItem('cohana_memories')) || [];
        } catch (e) {
            memories = [];
        }
    }
    
    if (action === 'read') {
        let matched = memories;
        if (key) {
            const query = String(key).toLowerCase();
            matched = matched.filter(e =>
                (e.title && e.title.toLowerCase().includes(query)) ||
                (e.content && e.content.toLowerCase().includes(query))
            );
        }
        return {
            status: 'success',
            profile_memories: matched
        };
    }
    
    if (action === 'write' || action === 'add' || action === 'create' || action === 'set') {
        const cleanTitle = key || 'User Preference / Fact';
        const cleanContent = content || '';
        if (!cleanContent && !cleanTitle) {
            return { status: 'error', message: 'Content or key is required to save memory.' };
        }
        
        const existingIdx = memories.findIndex(e =>
            (id && e.id === id) ||
            (key && e.title && e.title.toLowerCase() === key.toLowerCase())
        );
        
        if (existingIdx > -1) {
            const existing = memories[existingIdx];
            existing.content = cleanContent || existing.content;
            existing.title = cleanTitle;
            if (type) existing.type = type;
            existing.updatedAt = new Date().toISOString();
            
            this.persistClientMemories(memories);
            if (window.UI && typeof window.UI.showNotification === 'function') {
                window.UI.showNotification('Knowledge updated');
            }
            return {
                status: 'success',
                id: existing.id,
                entry: existing,
                memories: memories,
                action: 'update',
                message: 'Memory updated successfully.'
            };
        }
        
        const entry = {
            id: id || ('mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
            title: cleanTitle,
            content: cleanContent,
            type: type || 'fact',
            createdAt: Date.now(),
            updatedAt: new Date().toISOString()
        };
        
        memories.unshift(entry);
        if (memories.length > 50) memories = memories.slice(0, 50);
        
        this.persistClientMemories(memories);
        if (window.UI && typeof window.UI.showNotification === 'function') {
            window.UI.showNotification('New knowledge is saved');
        }
        return {
            status: 'success',
            id: entry.id,
            entry,
            memories: memories,
            action: 'write',
            message: 'Memory persisted successfully.'
        };
    }
    
    if (action === 'update') {
        const idx = memories.findIndex(e =>
            (id && e.id === id) ||
            (key && e.title && e.title.toLowerCase() === key.toLowerCase())
        );
        
        if (idx === -1) {
            const entry = {
                id: id || ('mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
                title: key || 'User Preference / Fact',
                content: content || '',
                type: type || 'fact',
                createdAt: Date.now(),
                updatedAt: new Date().toISOString()
            };
            memories.unshift(entry);
            if (memories.length > 50) memories = memories.slice(0, 50);
            this.persistClientMemories(memories);
            if (window.UI && typeof window.UI.showNotification === 'function') {
                window.UI.showNotification('New knowledge is saved');
            }
            return {
                status: 'success',
                id: entry.id,
                entry,
                memories: memories,
                action: 'write',
                message: 'Memory created and persisted.'
            };
        }
        
        const entry = memories[idx];
        if (content) entry.content = content;
        if (type) entry.type = type;
        if (key) entry.title = key;
        entry.updatedAt = new Date().toISOString();
        
        this.persistClientMemories(memories);
        if (window.UI && typeof window.UI.showNotification === 'function') {
            window.UI.showNotification('Knowledge updated');
        }
        return {
            status: 'success',
            id: entry.id,
            entry,
            memories: memories,
            action: 'update',
            message: 'Memory updated successfully.'
        };
    }
    
    if (action === 'delete' || action === 'remove' || action === 'purge') {
        const before = memories.length;
        memories = memories.filter(e =>
            !(id && e.id === id) &&
            !(key && e.title && e.title.toLowerCase() === key.toLowerCase())
        );
        
        if (memories.length === before) {
            return { status: 'error', message: 'Target memory not found for deletion.' };
        }
        
        this.persistClientMemories(memories);
        if (window.UI && typeof window.UI.showNotification === 'function') {
            window.UI.showNotification('Memory removed');
        }
        return {
            status: 'success',
            id,
            action: 'delete',
            memories: memories,
            message: 'Memory purged successfully.'
        };
    }
    
    return { status: 'error', message: `Invalid memory action: ${action}` };
}
persistClientMemories(memories) {
    if (window.Logic && window.Logic.State) {
        window.Logic.State.memories = memories;
    }
    try {
        localStorage.setItem('cohana_memories', JSON.stringify(memories));
    } catch (e) {}
    if (window.UI && typeof window.UI.renderMemoryDropdown === 'function') {
        window.UI.renderMemoryDropdown(memories);
    }
}
        playAudioChunk(base64) {
            if (this.playbackContext.state === 'suspended') {
                this.playbackContext.resume();
            }
            
            const float32Array = this.base64ToFloat32PCM(base64);
            
            let sum = 0;
            for (let i = 0; i < float32Array.length; i++) {
                sum += float32Array[i] * float32Array[i];
            }
            const rms = Math.sqrt(sum / float32Array.length);
            
            this.targetScale = 1.0 + Math.min(0.6, rms * 4.5);
            
            const audioBuffer = this.playbackContext.createBuffer(1, float32Array.length, 24000);
            audioBuffer.copyToChannel(float32Array, 0);
            
            const source = this.playbackContext.createBufferSource();
            source.buffer = audioBuffer;
            
            const gainNode = this.playbackContext.createGain();
            
            const isAndroid = /Android/i.test(navigator.userAgent);
            if (isAndroid) {
                gainNode.gain.setValueAtTime(2.5, this.playbackContext.currentTime);
            } else {
                gainNode.gain.setValueAtTime(1.0, this.playbackContext.currentTime);
            }
            
            source.connect(gainNode);
            gainNode.connect(this.playbackContext.destination);
            
            const playTime = Math.max(this.playbackContext.currentTime, this.nextPlayTime);
            source.start(playTime);
            this.nextPlayTime = playTime + audioBuffer.duration;
            
            const activeTrack = { source, gainNode, stopTime: this.nextPlayTime };
            this.activeSources.push(activeTrack);
            
            source.onended = () => {
                const idx = this.activeSources.indexOf(activeTrack);
                if (idx > -1) this.activeSources.splice(idx, 1);
            };
        }

        stopAllPlayback() {
            const fadeDuration = 0.04; 
            this.activeSources.forEach(track => {
                try {
                    track.gainNode.gain.setValueAtTime(track.gainNode.gain.value, this.playbackContext.currentTime);
                    track.gainNode.gain.exponentialRampToValueAtTime(0.001, this.playbackContext.currentTime + fadeDuration);
                    track.source.stop(this.playbackContext.currentTime + fadeDuration);
                } catch(e) {
                    try { track.source.stop(); } catch(err) {}
                }
            });
            this.activeSources.length = 0;
            this.nextPlayTime = 0;
            this.targetScale = 1.0;
        }

        toggleMute() {
            this.isMuted = !this.isMuted;
            const btn = document.getElementById('liveMuteBtn');
            if (btn) {
                if (this.isMuted) {
                    btn.classList.add('muted');
                    btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                } else {
                    btn.classList.remove('muted');
                    btn.innerHTML = '<i class="fas fa-microphone"></i>';
                }
            }
        }

        sendTextMessage() {
            const inputField = document.getElementById('liveInputField');
            if (!inputField) return;
            const text = inputField.value.trim();
            if (!text) return;

            if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
                const userBubble = this.createMessageBubble('user');
                if (userBubble) {
                    userBubble.textContent = text;
                }
                if (window.Logic) window.Logic.addToMessageHistory('user', text);

                this.webSocket.send(JSON.stringify({
                    clientContent: {
                        turns: [{
                            role: "user",
                            parts: [{ text: text }]
                        }],
                        turnComplete: true
                    }
                }));

                inputField.value = "";
                this.setOverlayState('thinking');
            }
        }
        setVoice(voiceName) {if (voiceName) {
            this.voiceName = voiceName;
        }
        }
        // Live Vision Engine Mechanics

        async toggleVisionMode() {
            if (this.isVisionActive) {
                this.stopVisionMode();
            } else {
                await this.startVisionMode();
            }
        }

        async startVisionMode() {
            if (this.isVisionActive) return;
            this.isVisionActive = true;

            const overlay = document.getElementById('liveModeOverlay');
            const plusBtn = document.getElementById('livePlusBtn');
            
            if (overlay) overlay.classList.add('vision-active');
            if (plusBtn) {
                plusBtn.classList.add('vision-active');
                plusBtn.innerHTML = '<i class="fas fa-eye"></i>';
            }

            // Create and inject rounded Vision Card Container matching the uploaded design
            const videoContainer = document.createElement('div');
            videoContainer.id = 'liveVideoContainer';
            videoContainer.className = 'live-video-container';
            videoContainer.innerHTML = `
                <video id="liveVideoPreview" autoplay playsinline muted></video>
                <div class="live-video-overlay"></div>
                
                <button class="live-video-btn live-video-close" id="liveVideoCloseBtn" title="Close Lens">
                    <i class="fas fa-video-slash"></i>
                </button>
                <button class="live-video-btn live-video-flip" id="liveVideoFlipBtn" title="Flip Camera">
                    <i class="fas fa-sync-alt"></i>
                </button>
            `;
            
            if (overlay) {
                overlay.insertBefore(videoContainer, overlay.firstChild);
            }

            document.getElementById('liveVideoCloseBtn').onclick = () => this.stopVisionMode();
            document.getElementById('liveVideoFlipBtn').onclick = () => this.flipCamera();

            try {
                this.cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: this.cameraFacingMode,
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        frameRate: { ideal: 15 }
                    }
                });

                this.videoElement = document.getElementById('liveVideoPreview');
                if (this.videoElement) {
                    this.videoElement.srcObject = this.cameraStream;
                    this.videoElement.onloadedmetadata = () => {
                        this.videoElement.play();
                        this.startFrameScheduler();
                    };
                }
            } catch (err) {
                console.error("Camera access failed:", err);
                this.showCameraAlert("Camera Access Denied", "Please allow camera access in your settings to use Live Vision.");
                this.stopVisionMode();
            }
        }

        stopVisionMode() {
            if (!this.isVisionActive) return;
            this.isVisionActive = false;

            if (this.frameTimerId) {
                clearTimeout(this.frameTimerId);
                this.frameTimerId = null;
            }

            if (this.cameraStream) {
                this.cameraStream.getTracks().forEach(track => {
                    try { track.stop(); } catch(e) {}
                });
                this.cameraStream = null;
            }

            if (this.videoElement) {
                try {
                    this.videoElement.pause();
                    this.videoElement.srcObject = null;
                } catch(e) {}
                this.videoElement = null;
            }

            const container = document.getElementById('liveVideoContainer');
            if (container) {
                container.classList.add('fade-out');
                setTimeout(() => {
                    if (container.parentNode) container.remove();
                }, 400);
            }

            const overlay = document.getElementById('liveModeOverlay');
            if (overlay) {
                overlay.classList.remove('vision-active');
            }

            const plusBtn = document.getElementById('livePlusBtn');
            if (plusBtn) {
                plusBtn.classList.remove('vision-active');
                plusBtn.innerHTML = '<i class="fas fa-camera"></i>';
            }

            this.movementCanvas = null;
            this.movementCtx = null;
            this.prevPixelData = null;
            this.offscreenCanvas = null;
            this.offscreenCtx = null;
        }

        async flipCamera() {
            this.cameraFacingMode = this.cameraFacingMode === "user" ? "environment" : "user";
            
            if (this.cameraStream) {
                this.cameraStream.getTracks().forEach(track => track.stop());
            }

            const flipBtn = document.getElementById('liveVideoFlipBtn');
            if (flipBtn) flipBtn.classList.add('spinning');

            try {
                this.cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: this.cameraFacingMode,
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        frameRate: { ideal: 15 }
                    }
                });

                if (this.videoElement) {
                    this.videoElement.srcObject = this.cameraStream;
                    this.videoElement.play();
                }
            } catch (err) {
                console.error("Camera flip failed:", err);
            } finally {
                setTimeout(() => {
                    if (flipBtn) flipBtn.classList.remove('spinning');
                }, 600);
            }
        }

        startFrameScheduler() {
            this.consecutiveStaticFrames = 0;
            this.dynamicFrameInterval = 200; 
            this.scheduleNextFrame();
        }

        scheduleNextFrame() {
            if (!this.isActive || !this.isVisionActive || !this.webSocket) return;

            if (this.webSocket.readyState === WebSocket.OPEN && this.webSocket.bufferedAmount < 512000) {
                const video = this.videoElement;
                if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
                    const hasMovement = this.detectMovement(video);
                    
                    if (hasMovement) {
                        this.consecutiveStaticFrames = 0;
                        this.dynamicFrameInterval = 200; 
                    } else {
                        this.consecutiveStaticFrames++;
                        if (this.consecutiveStaticFrames > 12) {
                            this.dynamicFrameInterval = 1200; 
                        } else if (this.consecutiveStaticFrames > 6) {
                            this.dynamicFrameInterval = 600;  
                        }
                    }
                    this.captureAndSendFrame();
                }
            } else {
                this.dynamicFrameInterval = Math.min(1500, this.dynamicFrameInterval + 150);
            }

            this.frameTimerId = setTimeout(() => this.scheduleNextFrame(), this.dynamicFrameInterval);
        }

        detectMovement(video) {
            if (!this.movementCanvas) {
                this.movementCanvas = document.createElement('canvas');
                this.movementCanvas.width = 16;
                this.movementCanvas.height = 16;
                this.movementCtx = this.movementCanvas.getContext('2d', { willReadFrequently: true });
                this.prevPixelData = null;
            }

            try {
                this.movementCtx.drawImage(video, 0, 0, 16, 16);
                const imgData = this.movementCtx.getImageData(0, 0, 16, 16);
                const pixels = imgData.data;

                if (!this.prevPixelData) {
                    this.prevPixelData = new Uint8Array(pixels);
                    return true; 
                }

                let diffSum = 0;
                const len = pixels.length;
                for (let i = 0; i < len; i += 4) {
                    diffSum += Math.abs(pixels[i] - this.prevPixelData[i]);       
                    diffSum += Math.abs(pixels[i+1] - this.prevPixelData[i+1]);   
                    diffSum += Math.abs(pixels[i+2] - this.prevPixelData[i+2]);   
                }

                for (let i = 0; i < len; i++) {
                    this.prevPixelData[i] = pixels[i];
                }

                const avgDiff = diffSum / (16 * 16 * 3);
                return avgDiff > 12.0; 
            } catch (err) {
                return true; 
            }
        }

        captureAndSendFrame() {
            if (!this.offscreenCanvas) {
                this.offscreenCanvas = document.createElement('canvas');
                this.offscreenCtx = this.offscreenCanvas.getContext('2d');
            }

            const width = this.videoElement.videoWidth || 640;
            const height = this.videoElement.videoHeight || 480;

            const maxDimension = 640;
            let targetWidth = width;
            let targetHeight = height;

            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    targetWidth = maxDimension;
                    targetHeight = Math.round((height * maxDimension) / width);
                } else {
                    targetHeight = maxDimension;
                    targetWidth = Math.round((width * maxDimension) / height);
                }
            }

            if (this.offscreenCanvas.width !== targetWidth || this.offscreenCanvas.height !== targetHeight) {
                this.offscreenCanvas.width = targetWidth;
                this.offscreenCanvas.height = targetHeight;
            }

            this.offscreenCtx.drawImage(this.videoElement, 0, 0, targetWidth, targetHeight);
            
            const dataUrl = this.offscreenCanvas.toDataURL('image/jpeg', 0.6);
            const base64Data = dataUrl.split(',')[1];

            if (base64Data && this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
                this.webSocket.send(JSON.stringify({
                    realtimeInput: {
                        video: {
                            data: base64Data,
                            mimeType: 'image/jpeg'
                        }
                    }
                }));
            }
        }

        showCameraAlert(title, text) {
            const alertBox = document.createElement('div');
            alertBox.className = 'live-system-toast';
            alertBox.innerHTML = `
                <div class="toast-content">
                    <strong>${title}</strong>
                    <span>${text}</span>
                </div>
            `;
            document.body.appendChild(alertBox);
            setTimeout(() => {
                alertBox.classList.add('show');
            }, 50);
            setTimeout(() => {
                alertBox.classList.remove('show');
                setTimeout(() => alertBox.remove(), 400);
            }, 5000);
        }

        handleVisibilityChange() {
            if (document.hidden) {
                if (this.isVisionActive && this.cameraStream) {
                    this.cameraStream.getTracks().forEach(track => {
                        if (track.kind === 'video') track.enabled = false;
                    });
                    if (this.frameTimerId) {
                        clearTimeout(this.frameTimerId);
                        this.frameTimerId = null;
                    }
                }
            } else {
                if (this.isVisionActive && this.cameraStream) {
                    this.cameraStream.getTracks().forEach(track => {
                        if (track.kind === 'video') track.enabled = true;
                    });
                    this.startFrameScheduler();
                }
            }
        }

        stop() {
            if (!this.isActive) return;
            this.isActive = false;

            this.stopAnimationLoop();
            this.stopVisionMode(); 

            if (this.webSocket) {
                try { this.webSocket.close(); } catch(e) {}
                this.webSocket = null;
            }

            if (this.audioContext) {
                try { this.audioContext.close(); } catch(e) {}
                this.audioContext = null;
            }
            if (this.playbackContext) {
                try { this.playbackContext.close(); } catch(e) {}
                this.playbackContext = null;
            }

            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }

            this.stopAllPlayback();

            const overlay = document.getElementById('liveModeOverlay');
            if (overlay) overlay.remove();

            const bottomBar = document.getElementById('bottomBarWrapper');
            if (bottomBar) {
                bottomBar.style.removeProperty('display');
            }

            this.currentUserBubble = null;
            this.currentModelBubble = null;
            this.accumulatedModelText = "";
            
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        }

        setOverlayState(state) {
            const centerArea = document.getElementById('liveCenterArea');
            if (!centerArea) return;

            if (state === 'connecting') {
                centerArea.innerHTML = '<div class="live-connecting-spinner"></div>';
            } else {
                centerArea.innerHTML = '<div id="liveVoiceBubble" class="live-voice-bubble"></div>';
                const bubble = document.getElementById('liveVoiceBubble');
                if (state === 'thinking') {
                    bubble.style.animation = 'liquid 3s ease-in-out infinite, breathe 1.5s ease-in-out infinite alternate';
                } else {
                    bubble.style.animation = 'liquid 6s ease-in-out infinite, breathe 3s ease-in-out infinite alternate';
                }
            }
        }

        startAnimationLoop() {
            this.currentScale = 1.0;
            this.targetScale = 1.0;
            
            const tick = () => {
                if (!this.isActive) return;
                this.currentScale += (this.targetScale - this.currentScale) * 0.14;
                const bubble = document.getElementById('liveVoiceBubble');
                if (bubble) {
                    bubble.style.transform = `scale3d(${this.currentScale}, ${this.currentScale}, 1)`;
                }
                this.animationFrameId = requestAnimationFrame(tick);
            };
            this.animationFrameId = requestAnimationFrame(tick);
        }

        stopAnimationLoop() {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }

        createMessageBubble(sender) {
            const container = document.getElementById('chatContainer');
            if (!container) return null;

            if (window.UI && typeof window.UI.hideWelcomePlaceholder === 'function') {
                window.UI.hideWelcomePlaceholder();
            }

            const mw = document.createElement('div');
            mw.className = `message-wrapper ${sender}-wrapper`;
            const mc = document.createElement('div');
            mc.className = `message-container ${sender}-message-container`;
            const md = document.createElement('div');
            md.className = `message ${sender}-message`;
            
            if (sender === 'user') {
                md.style.cssText = 'background: #1c1c1e !important; border: none !important; border-radius: 24px !important; border-bottom-right-radius: 6px !important; padding: 14px 22px !important; color: #ffffff !important; box-shadow: none !important; margin: 0 !important; width: fit-content !important; max-width: 82% !important; align-self: flex-end !important; box-sizing: border-box !important; display: block !important;';
            } else {
                md.style.cssText = 'background: transparent !important; border: none !important; padding: 14px 22px !important; color: var(--body-color) !important; margin: 0 !important; width: 100% !important; box-sizing: border-box !important;';
            }

            const td = document.createElement('div');
            td.className = 'message-text';
            td.style.cssText = 'white-space: pre-wrap; word-break: break-word; font-size: 16px !important; line-height: 1.55;';

            md.appendChild(td);
            mc.appendChild(md);
            mw.appendChild(mc);
            container.appendChild(mw);
            
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            return td;
        }
renderUI() {
    const overlay = document.createElement('div');
    overlay.id = 'liveModeOverlay';
    
    overlay.innerHTML = `
        <div class="live-center-area" id="liveCenterArea"></div>
        <div class="live-input-bar">
            <div class="live-input-capsule">
                <button class="live-plus-btn" id="livePlusBtn">
                    <i class="fas fa-camera"></i>
                </button>
                <input
                    type="text"
                    id="liveInputField"
                    class="live-input-field"
                    placeholder="Спросить Cohana..."
                    autocomplete="off"
                    spellcheck="true"
                >
            </div>
            <button class="live-action-btn live-mute-btn" id="liveMuteBtn">
                <i class="fas fa-microphone"></i>
            </button>
            <button class="live-action-btn live-close-btn" id="liveCloseBtn">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('liveCloseBtn').onclick = () => this.stop();
    document.getElementById('liveMuteBtn').onclick = () => this.toggleMute();
    document.getElementById('livePlusBtn').onclick = () => this.toggleVisionMode();
    
    const inputField = document.getElementById('liveInputField');
    
    if (inputField) {
        inputField.focus();
        
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendTextMessage();
            }
        });
    }
}

        arrayBufferToBase64(buffer) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }

        base64ToFloat32PCM(base64) {
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const int16Array = new Int16Array(bytes.buffer);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
            }
            return float32Array;
        }

        injectCSS() {
            if (document.getElementById('live-mode-styles')) return;
            const style = document.createElement('style');
            style.id = 'live-mode-styles';
            style.textContent = cssStyles;
            document.head.appendChild(style);
        }

        handleWSError(err) {
            console.error("Live WebSocket Error:", err);
            this.stop();
        }
    }

    const cssStyles = `
        #liveModeOverlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to bottom, rgba(0,0,0,0) 20%, rgba(0, 0, 0, 0.95) 100%);
            background-color: rgba(0,0,0,0.5);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            z-index: 1050;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            pointer-events: none;
            box-sizing: border-box;
            padding-bottom: 24px;
            transition: background 0.5s ease, backdrop-filter 0.5s ease;
            animation: fadeInOverlay 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        @keyframes fadeInOverlay {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        #liveModeOverlay * {
            pointer-events: auto;
        }

        .live-center-area {
            margin-bottom: 50px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            pointer-events: none;
            position: relative;
            width: 100%;
            z-index: 10;
            transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .live-voice-bubble {
            width: 130px;
            height: 130px;
            background: radial-gradient(circle at 50% 30%, #ffffff 0%, #d0ebff 35%, #3a97ff 70%, #0066eb 100%);
            border-radius: 50%;
            box-shadow: 0 0 45px rgba(52, 134, 235, 0.6);
            transition: transform 0.08s linear, width 0.5s ease, height 0.5s ease, box-shadow 0.5s ease;
            will-change: transform;
            animation: liquid 6s ease-in-out infinite, breathe 3s ease-in-out infinite alternate;
        }

        .live-connecting-spinner {
            width: 80px;
            height: 80px;
            border: 6px solid rgba(255, 255, 255, 0.1);
            border-top-color: #ffffff;
            border-radius: 50%;
            animation: rotateLoader 1s linear infinite;
        }

        @keyframes rotateLoader {
            to { transform: rotate(360deg); }
        }

        @keyframes liquid {
            0% { border-radius: 48% 52% 52% 48% / 48% 48% 52% 52%; }
            50% { border-radius: 52% 48% 48% 52% / 52% 52% 48% 48%; }
            100% { border-radius: 48% 52% 52% 48% / 48% 48% 52% 52%; }
        }

        @keyframes breathe {
            0% { box-shadow: 0 0 30px rgba(52, 134, 235, 0.4); }
            100% { box-shadow: 0 0 65px rgba(52, 134, 235, 0.75); }
        }

        .live-input-bar {
            display: flex;
            align-items: center;
            gap: 12px;
            width: calc(100% - 32px);
            max-width: 600px;
            box-sizing: border-box;
            z-index: 10;
            transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s ease;
        }

        .live-input-capsule {
            flex-grow: 1;
            background: rgba(28, 28, 30, 0.75);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border-radius: 36px;
            height: 52px;
            display: flex;
            align-items: center;
            padding: 0 16px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
            transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .live-plus-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.85);
            font-size: 20px;
            margin-right: 12px;
            cursor: pointer;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.2s ease;
        }

        .live-plus-btn:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .live-input-field {
            flex-grow: 1;
            background: transparent;
            border: none;
            color: #ffffff;
            font-size: 16px;
            outline: none;
            font-family: inherit;
        }

        .live-input-field::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }

        .live-action-btn {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            font-size: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
            transition: transform 0.2s, background 0.2s;
        }

        .live-mute-btn {
            background: rgba(44, 44, 46, 0.85);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .live-mute-btn.muted {
            background: #ff453a;
            color: #ffffff;
            border-color: rgba(255, 69, 58, 0.3);
        }

        .live-close-btn {
            background: #ffffff;
            color: #000000;
        }

        .live-close-btn:active, .live-mute-btn:active, .live-plus-btn:active {
            transform: scale(0.92);
        }

        /* Pure Dark Solid Visual Styling for Refactored Vision Mode */

        #liveModeOverlay.vision-active {
            background: #000000 !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            justify-content: flex-start;
            padding-bottom: 0;
        }

        #liveModeOverlay.vision-active .live-center-area {
            height: 140px;
            margin-bottom: 0;
            transform: translate3d(0, 10px, 0);
        }

        #liveModeOverlay.vision-active .live-voice-bubble {
            width: 80px;
            height: 80px;
            box-shadow: 0 0 25px rgba(52, 134, 235, 0.35);
        }

        #liveModeOverlay.vision-active .live-input-bar {
            transform: translateY(150px);
            opacity: 0;
            pointer-events: none;
        }

        /* Inset Rounded Card layout matching the user design specification */

        .live-video-container {
            position: absolute;
            top: 140px; 
            left: 16px;
            right: 16px;
            bottom: 24px;
            background-color: #121214;
            border-radius: 40px;
            overflow: hidden;
            z-index: 1;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            animation: slideUpCard 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
            will-change: opacity, transform;
        }

        .live-video-container.fade-out {
            animation: slideDownCard 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        @keyframes slideUpCard {
            from {
                opacity: 0;
                transform: translate3d(0, 45px, 0) scale(0.97);
            }
            to {
                opacity: 1;
                transform: translate3d(0, 0, 0) scale(1);
            }
        }

        @keyframes slideDownCard {
            from {
                opacity: 1;
                transform: translate3d(0, 0, 0) scale(1);
            }
            to {
                opacity: 0;
                transform: translate3d(0, 45px, 0) scale(0.97);
            }
        }

        #liveVideoPreview {
            width: 100%;
            height: 100%;
            object-fit: cover;
            position: absolute;
            inset: 0;
            border-radius: 40px;
        }

        .live-video-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(0, 0, 0, 0.45) 0%, transparent 40%, transparent 100%);
            pointer-events: none;
            z-index: 2;
        }

        /* Floating frosted buttons matching the corner layout of your screenshot */

        .live-video-btn {
            position: absolute;
            bottom: 24px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #ffffff;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 5;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.35);
            transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.2s ease;
        }

        .live-video-btn:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .live-video-btn:active {
            transform: scale(0.9);
        }

        .live-video-close {
            left: 24px;
        }

        .live-video-flip {
            right: 24px;
        }

        .live-video-flip.spinning i {
            animation: spinOnce 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        @keyframes spinOnce {
            100% { transform: rotate(180deg); }
        }

        .live-system-toast {
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translate(-50%, -100px);
            background: rgba(28, 28, 30, 0.82);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 18px;
            padding: 12px 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            z-index: 2000;
            pointer-events: none;
            transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
            max-width: 90%;
            width: 340px;
        }

        .live-system-toast.show {
            transform: translate(-50%, 0);
        }

        .toast-content {
            display: flex;
            flex-direction: column;
            gap: 4px;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .toast-content strong {
            font-size: 15px;
            font-weight: 600;
        }

        .toast-content span {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.4;
        }
    `;

    const liveInstance = new LiveModeManager();
    window.LiveMode = liveInstance;
    liveInstance.init();
})();