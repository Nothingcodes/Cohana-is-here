(function() {
    const State = {
        APP_VERSION: '6.2',
        shouldShowWhatsNew: false,
        memories: [],
        chatHistories: [],
        repositories: [],
        selectedRepositoryId: null,
        currentChatIndex: 0,
        editingMessageWrapper: null,
        isPanelOpen: false,
        isTemporaryChat: false,
        appMode: 'chat', // 'chat' | 'agent'
        chatReasoningEffort: 'instant', // 'instant' | 'medium' | 'high'
        selectedModelType: 'instant',
        attachments: [],
        isStreaming: false,
        abortController: null,
        lastRequest: null,
        memoryToEdit: null,
        MAX_CHATS: 25,
        MAX_REPOSITORIES: 3,
        DRAFT_KEY: 'cohana_input_draft',
        MEMORIES_KEY: 'cohana_memories',
        REPOSITORIES_KEY: 'cohana_repositories',
        DAILY_LIMIT: 100,
        RATE_KEY: 'cohana_rate_limit',
        browserControl: {
            awaitingUser: false,
            interactionId: null,
            browserSessionId: null,
            debugUrl: null,
            reason: null,
            userMessage: '',
            resumeInProgress: false,
            chatIndex: null,
            lastEventId: null
        }
    };
    const WelcomeMessages = [
        { text: "What would you like to explore?", icon: "fas fa-compass" },
        { text: "Ready to create something new?",  icon: "fas fa-pen-nib" },
        { text: "Ready to help! As Always",        icon: "fas fa-sparkles" },
        { text: "Let's solve a problem.",           icon: "fas fa-lightbulb" },
        { text: "New Ideas? Let's tackle them", icon: "fas fa-compass" }
    ];

    // ── Helpers ───────────────────────────────────────────────────────────────
function getNextNoon() {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    if (Date.now() >= d) d.setDate(d.getDate() + 1);
    return d.getTime();
}
const getChatDB = () => new Promise((resolve, reject) => {
    const req = indexedDB.open('cohana_chat_store', 1);
    req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('chats')) {
            db.createObjectStore('chats', { keyPath: 'id' });
        }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
});
function getRateState() {
    const raw = localStorage.getItem(State.RATE_KEY);
    const fresh = () => {
        const s = { used: 0, resetAt: getNextNoon() };
        localStorage.setItem(State.RATE_KEY, JSON.stringify(s));
        return s;
    };
    if (!raw) return fresh();
    try {
        const data = JSON.parse(raw);
        if (!data || typeof data.used !== 'number' || typeof data.resetAt !== 'number' || Date.now() >= data.resetAt) return fresh();
        return data;
    } catch { return fresh(); }
}

function getMessageText(msg) {
    const txt = msg?.parts?.[0]?.text;
    return typeof txt === 'string' ? txt : '';
}

    function consumePrompt() {
        const s = getRateState();
        s.used += 1;
        localStorage.setItem(State.RATE_KEY, JSON.stringify(s));
        return s;
    }

    // ── Vector Search ─────────────────────────────────────────────────────────
    const VectorSearch = {
        pipeline: null, modelId: 'Xenova/all-MiniLM-L6-v2', isLoaded: false,
        async init() {
            try {
                const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0');
                this.pipeline = await pipeline('feature-extraction', this.modelId, { quantized: true });
                this.isLoaded = true;
            } catch {}
        },
        cosineSimilarity(a, b) {
            let dot = 0, ma = 0, mb = 0;
            for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; ma += a[i]*a[i]; mb += b[i]*b[i]; }
            return dot / (Math.sqrt(ma) * Math.sqrt(mb));
        },
        async search(query, candidates) {
            if (!this.isLoaded || !query) return [];
            const qOut = await this.pipeline(query, { pooling: 'mean', normalize: true });
            const qEmb = qOut.data;
            const results = [];
            for (const item of candidates) {
                const txt = (item.title + ' ' + (item.snippet || '')).substring(0, 100);
                const iOut = await this.pipeline(txt, { pooling: 'mean', normalize: true });
                const score = this.cosineSimilarity(qEmb, iOut.data);
                if (score > 0.2) results.push({ ...item, score });
            }
            return results.sort((a, b) => b.score - a.score);
        }
    };
window.copyFileDownloadLink = async function(url, buttonEl) {
    if (!url) return;
    try {
        await navigator.clipboard.writeText(url);
        if (buttonEl) {
            const icon = buttonEl.querySelector('i');
            if (icon) icon.className = 'fa-solid fa-check';
            buttonEl.style.color = '#30d158';
            setTimeout(() => {
                if (icon) icon.className = 'fa-regular fa-copy';
                buttonEl.style.color = 'rgba(255, 255, 255, 0.75)';
            }, 2000);
        }
        if (window.UI?.showNotification) {
            window.UI.showNotification('Download link copied to clipboard');
        }
    } catch {
        if (window.UI?.showNotification) {
            window.UI.showNotification('Failed to copy download link');
        }
    }
};
    // ── Logic ─────────────────────────────────────────────────────────────────
    const Logic = {
        State,
        recognition: null,

async init() {
    this.checkUpdate();
    await this.loadChatHistories();
    this.loadMemories();
    this.loadRepositories();
    
    const currentLang = localStorage.getItem('appLanguage') || 'en';
    const langSelect = document.getElementById('appLanguageSelect');
    if (langSelect) {
        langSelect.value = currentLang;
    }
    
    const rate = getRateState();
    const delay = rate.resetAt - Date.now();
    if (delay > 0) setTimeout(() => { localStorage.removeItem(State.RATE_KEY); if (window.UI) UI.clearRateLimitHint(); }, delay);
    if (window.UI && UI.init) UI.init();
    this.renderUnifiedPanel();
    this.loadChat(State.currentChatIndex, false);
    this.checkOnboarding();
    this.restoreDraft();
    
    const currentChat = State.chatHistories[State.currentChatIndex];
    if (!currentChat?.messages?.length) {
        if (window.UI) UI.showWelcomePlaceholder();
    } else {
        if (window.UI) UI.hideWelcomePlaceholder();
    }
    
    this.bindEvents();
    if (window.UI && UI.updateAttachmentInputsState) {
        UI.updateAttachmentInputsState(State.selectedModelType);
    }
    if (window.UI && UI.updateRepoPillUI) {
        UI.updateRepoPillUI(this.getSelectedRepository());
    }
    this.setupVoiceInput();
    setTimeout(() => VectorSearch.init(), 1000);
    
    if (localStorage.getItem('cohana_auto_voice_mode') === 'true') {
        setTimeout(() => {
            if (window.LiveMode && !window.LiveMode.isActive) {
                window.LiveMode.start();
            }
        }, 350);
    }
    setTimeout(() => { if (UI.elements.userInput) UI.elements.userInput.focus(); }, 120);
    
    const triggerKeyboardOnFirstClick = (e) => {
        if (e.target.closest('button, a, select, textarea, .panel-icon-btn, .chats-masonry-card, .island-dropdown-trigger, .island-add-btn, .model-selector-trigger')) return;
        if (UI.elements.userInput) {
            UI.elements.userInput.focus();
            document.removeEventListener('click', triggerKeyboardOnFirstClick);
        }
    };
    
    document.addEventListener('click', triggerKeyboardOnFirstClick);
    if (window.UI && UI.hideLoader) UI.hideLoader();
},
renderFileCardHtml(data) {
    const rawFileName = data?.filename || data?.fileName || 'downloaded-file';
    const safeFileName = window.UI?.escapeHTML ? window.UI.escapeHTML(rawFileName) : rawFileName;
    const fileUrl = data?.url || '';
    const bytes = Number(data?.size) || 0;
    
    let formattedSize = '';
    if (bytes > 0) {
        if (bytes < 1024) formattedSize = `${bytes} B`;
        else if (bytes < 1024 * 1024) formattedSize = `${(bytes / 1024).toFixed(1)} KB`;
        else formattedSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    
    const ext = (rawFileName.includes('.') ? rawFileName.split('.').pop() : '').toLowerCase();
    
    let iconClass = 'fa-solid fa-file-lines';
    let accentColor = '#3898ec';
    let badgeText = 'File';
    
    switch (ext) {
        case 'pdf':
            iconClass = 'fa-solid fa-file-pdf';
            accentColor = '#ff453a';
            badgeText = 'PDF Document';
            break;
        case 'docx':
        case 'doc':
            iconClass = 'fa-solid fa-file-word';
            accentColor = '#2f80ed';
            badgeText = 'Word Document';
            break;
        case 'xlsx':
        case 'xls':
        case 'csv':
            iconClass = 'fa-solid fa-file-excel';
            accentColor = '#30d158';
            badgeText = 'Spreadsheet';
            break;
        case 'pptx':
        case 'ppt':
            iconClass = 'fa-solid fa-file-powerpoint';
            accentColor = '#ff9f0a';
            badgeText = 'Presentation';
            break;
        case 'zip':
        case 'tar':
        case 'gz':
        case 'rar':
        case '7z':
            iconClass = 'fa-solid fa-file-zipper';
            accentColor = '#bf5af2';
            badgeText = 'Archive';
            break;
        case 'py':
        case 'js':
        case 'ts':
        case 'jsx':
        case 'tsx':
        case 'json':
        case 'html':
        case 'css':
            iconClass = 'fa-solid fa-file-code';
            accentColor = '#0a84ff';
            badgeText = 'Code';
            break;
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'webp':
        case 'svg':
            iconClass = 'fa-solid fa-file-image';
            accentColor = '#ff375f';
            badgeText = 'Image';
            break;
        default:
            iconClass = 'fa-solid fa-file-lines';
            accentColor = '#64d2ff';
            badgeText = ext ? ext.toUpperCase() : 'Document';
            break;
    }
    
    return `
        <div class="cohana-file-card" style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 12px 36px -8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 18px;
            padding: 14px 18px;
            margin: 12px 0;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            user-select: none;
        ">
            <div style="display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1;">
                <div style="
                    width: 46px;
                    height: 46px;
                    border-radius: 13px;
                    background: ${accentColor}18;
                    border: 1px solid ${accentColor}33;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    color: ${accentColor};
                    font-size: 22px;
                    box-shadow: 0 4px 12px ${accentColor}22;
                ">
                    <i class="${iconClass}"></i>
                </div>
                <div style="min-width: 0; flex: 1;">
                    <div style="
                        font-size: 14.5px;
                        font-weight: 600;
                        color: #ffffff;
                        letter-spacing: -0.01em;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        line-height: 1.3;
                    " title="${safeFileName}">
                        ${safeFileName}
                    </div>
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-top: 4px;
                        font-size: 12px;
                        color: rgba(255, 255, 255, 0.55);
                        font-weight: 500;
                    ">
                        <span style="
                            display: inline-block;
                            padding: 1px 6px;
                            border-radius: 6px;
                            background: rgba(255, 255, 255, 0.08);
                            color: ${accentColor};
                            font-weight: 600;
                            font-size: 11px;
                        ">${badgeText}</span>
                        ${formattedSize ? `<span>•</span><span>${formattedSize}</span>` : ''}
                        <span style="display: inline-flex; align-items: center; gap: 4px; color: #30d158; font-size: 11px;">
                            <i class="fa-solid fa-circle-check" style="font-size: 10px;"></i> Ready
                        </span>
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                ${fileUrl ? `
                <button
                    onclick="window.copyFileDownloadLink && window.copyFileDownloadLink('${encodeURI(fileUrl)}', this)"
                    title="Copy download link"
                    style="
                        width: 36px;
                        height: 36px;
                        border-radius: 11px;
                        background: rgba(255, 255, 255, 0.06);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        color: rgba(255, 255, 255, 0.75);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s ease;
                    "
                    onmouseover="this.style.background='rgba(255, 255, 255, 0.12)'; this.style.color='#ffffff';"
                    onmouseout="this.style.background='rgba(255, 255, 255, 0.06)'; this.style.color='rgba(255, 255, 255, 0.75)';"
                >
                    <i class="fa-regular fa-copy"></i>
                </button>
                ` : ''}
                ${fileUrl ? `
                <a
                    href="${fileUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    download="${safeFileName}"
                    style="
                        display: inline-flex;
                        align-items: center;
                        gap: 7px;
                        background: linear-gradient(135deg, #0071e3 0%, #0077ed 100%);
                        color: #ffffff;
                        padding: 8px 16px;
                        border-radius: 12px;
                        font-size: 13px;
                        font-weight: 600;
                        text-decoration: none;
                        border: 1px solid rgba(255, 255, 255, 0.18);
                        box-shadow: 0 4px 14px rgba(0, 113, 227, 0.38);
                        cursor: pointer;
                        transition: transform 0.15s ease, box-shadow 0.15s ease;
                    "
                    onmouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 6px 18px rgba(0, 113, 227, 0.48)';"
                    onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 14px rgba(0, 113, 227, 0.38)';"
                >
                    <i class="fa-solid fa-arrow-down" style="font-size: 12px;"></i>
                    <span>Download</span>
                </a>
                ` : ''}
            </div>
        </div>
    `;
},
startEditMessage(targetWrapper, text) {
    if (State.isStreaming) return;
    window.AppleHaptics.selection();
    State.editingMessageWrapper = targetWrapper;
    UI.elements.userInput.value = text || '';
    UI.autoResizeInput();
    UI.elements.userInput.focus();
    UI.updateModePill(
        typeof t === 'function' ? t('editMessage') : 'Edit Mode',
        'fas fa-pen',
        () => this.cancelEditMode()
    );
    this.updateInputUI();
},

cancelEditMode() {
    window.AppleHaptics.selection();
    State.editingMessageWrapper = null;
    UI.updateModePill(null);
    UI.elements.userInput.value = '';
    UI.elements.userInput.style.height = '';
    UI.autoResizeInput();
    this.updateInputUI();
},
showWhatsNewModal() {
    const modal = UI.elements.onboardingModal;
    if (!modal) return;
    
    modal.className = 'action-sheet-backdrop';
    modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); z-index: 3000; display: flex; opacity: 0; transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1); justify-content: center; align-items: flex-end;';
    modal.innerHTML = '';
    
    // Ensure stylesheet is loaded
    if (UI.renderOnboarding) UI.renderOnboarding();
    modal.innerHTML = '';
    
    const sheet = document.createElement('div');
    sheet.className = 'apple-minimal-sheet';
    sheet.id = 'whatsnewSlideSheet';
    sheet.innerHTML = `
        <div class="apple-sheet-handle"></div>
        
        <div class="apple-sheet-glyph">
            <i class="fa-solid fa-brush"></i>
        </div>

        <div class="apple-sheet-header">
            <div class="apple-sheet-tag">Version ${State.APP_VERSION} • Release Notes</div>
            <div class="apple-sheet-title">What’s New</div>
            <div class="apple-sheet-desc">Plugins are everywhere!</div>
        </div>

        <div class="apple-sheet-features">
            <div class="apple-sheet-row">
                <div class="apple-sheet-iconbox">
                    <i class="fa-solid fa-graduation-cap"></i>
                </div>
                <div class="apple-sheet-content">
                    <div class="apple-sheet-row-title">@Study Plugin</div>
                    <div class="apple-sheet-row-desc">With new @Study plugin you can learn better , more and interactively</div>
                </div>
            </div>

            <div class="apple-sheet-row">
                <div class="apple-sheet-iconbox">
                    <i class="fa-solid fa-map"></i>
                </div>
                <div class="apple-sheet-content">
                    <div class="apple-sheet-row-title">@Maps Plugin</div>
                    <div class="apple-sheet-row-desc">@Maps plugin allows personalize your prompt with Google Maps to answer your questions much more precisely</div>
                </div>
            </div>

        <button class="apple-sheet-btn-primary" id="whatsNewContinueBtn">
            Continue
        </button>
    `;
    
    modal.appendChild(sheet);
    
    const dismissWhatsNew = () => {
        this.dismissUpdate();
        sheet.classList.remove('show');
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            UI.showNotification('App updated successfully');
        }, 350);
    };
    
    const continueBtn = sheet.querySelector('#whatsNewContinueBtn');
    if (continueBtn) continueBtn.onclick = dismissWhatsNew;
    
    modal.onclick = (e) => {
        if (e.target === modal) dismissWhatsNew();
    };
    
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        sheet.classList.add('show');
    });
},
checkUpdate() {
    const lastSeen = localStorage.getItem('cohana_last_version');
    if (!lastSeen) {
        localStorage.setItem('cohana_last_version', State.APP_VERSION);
        State.shouldShowWhatsNew = false;
    } else if (lastSeen !== State.APP_VERSION) {
        State.shouldShowWhatsNew = true;
        // Prompt user with the new floating Apple update card
        if (window.UI && window.UI.showUpdateNotification) {
            window.UI.showUpdateNotification({
                version: State.APP_VERSION,
                title: 'New Version Available',
                description: 'Interactive @ plugins for Study and Maps, fluid spring motions, and system stability updates.'
            });
        }
    }
},
dismissUpdate() {
    localStorage.setItem('cohana_last_version', State.APP_VERSION);
    State.shouldShowWhatsNew = false;
    if (window.UI && window.UI.hideUpdateNotification) {
        window.UI.hideUpdateNotification();
    }
},
setAppMode(mode) {
    State.appMode = mode;
    if (mode === 'agent') {
        State.selectedModelType = 'agent';
    } else {
        State.selectedModelType = State.chatReasoningEffort || 'instant';
    }
    
    if (window.UI) {
        if (UI.elements.modeSelectorBtn) {
            const isAgent = mode === 'agent';
            if (UI.elements.currentModeLabel) {
                UI.elements.currentModeLabel.textContent = isAgent ? 'Agent' : 'Chat';
            }
            if (UI.elements.modeItemChat) UI.elements.modeItemChat.classList.toggle('active', !isAgent);
            if (UI.elements.modeItemAgent) UI.elements.modeItemAgent.classList.toggle('active', isAgent);
        }
        
        const effortBtn = document.getElementById('reasoningEffortBtn');
        const effortPopup = document.getElementById('reasoningEffortPopup');
        if (effortBtn) {
            if (mode === 'agent') {
                effortBtn.style.setProperty('display', 'none', 'important');
                if (effortPopup) effortPopup.classList.remove('show');
            } else {
                effortBtn.style.setProperty('display', 'flex', 'important');
            }
        }
        
        if (UI.updateAttachmentInputsState) {
            UI.updateAttachmentInputsState(State.selectedModelType);
        }
        if (UI.updateRepoPillUI) {
            UI.updateRepoPillUI(this.getSelectedRepository());
        }
        if (UI._atMentionState?.isOpen && UI.handleInputAtMention && UI.elements.userInput) {
            UI.handleInputAtMention(UI.elements.userInput);
        }
    }
},
async renderUnifiedPanel(query = '') {
    const q = query.toLowerCase().trim();
    
    const candidates = Logic.State.chatHistories.map((chat, index) => {
        if (!chat) return null;
        if (chat.pinned === undefined) chat.pinned = false;
        
        let snippet = '';
        let fullSearchContent = (chat.title || '').toLowerCase();
        
        if (Array.isArray(chat.messages) && chat.messages.length > 0) {
            const lastMsgText = chat.messages[chat.messages.length - 1]?.parts?.[0]?.text;
            snippet = typeof lastMsgText === 'string' ? lastMsgText : '';
            
            // Search across entire message history
            for (const msg of chat.messages) {
                const text = msg?.parts?.[0]?.text;
                if (typeof text === 'string') {
                    fullSearchContent += ' ' + text.toLowerCase();
                }
            }
        }
        
        const isMatch = !q || fullSearchContent.includes(q);
        if (!isMatch) return null;
        
        return {
            chat,
            index,
            contextSnippet: snippet
        };
    }).filter(Boolean);
    
    // Sort pinned chats first, then by most recently active
    candidates.sort((a, b) => (b.chat.pinned ? 1 : 0) - (a.chat.pinned ? 1 : 0) || b.chat.lastActive - a.chat.lastActive);
    
    UI.renderChatsPanel(
        candidates,
        idx => this.loadChat(idx),
        (idx, title) => this.confirmDeleteChat(idx, title)
    );
},

        togglePanel(isOpen) {
            State.isPanelOpen = isOpen;
            UI.elements.slideLeftPanel.classList.toggle('show', isOpen);
            if (isOpen) this.renderUnifiedPanel(UI.elements.panelSearchInput.value);
        },
        closeActionSheet() { UI.elements.actionSheet?.classList.remove('show'); },

        // ── Chat Management ────────────────────────────────────────────────────
startNewChat() {
    this.cancelEditMode();
    this.disableTempChat();
    
    const current = State.chatHistories[State.currentChatIndex];
    if (current && current.messages.length === 0) {
        this.togglePanel(false);
        this.updateChips();
        return;
    }
    
    State.chatHistories.push({
        title: 'New Chat',
        messages: [],
        interactionId: null,
        environmentId: null,
        agent: null,
        repositoryId: State.selectedRepositoryId || null,
        lastActive: Date.now()
    });
    
    if (State.chatHistories.length > State.MAX_CHATS) {
        State.chatHistories.shift();
    }
    
    State.currentChatIndex = State.chatHistories.length - 1;
    this.loadChat(State.currentChatIndex, false);
    this.togglePanel(false);
},
        confirmDeleteChat(index) { this.deleteChat(index); },
        deleteChat(index) {
            const deleted = State.chatHistories[index], oldIdx = State.currentChatIndex;
            State.chatHistories.splice(index, 1);
            UI.showUndoToast({ message: 'Chat deleted', onUndo: () => {
                State.chatHistories.splice(index, 0, deleted);
                if (State.chatHistories.length === 1) State.currentChatIndex = 0;
                this.saveChatHistories(); this.renderUnifiedPanel(UI.elements.panelSearchInput.value);
                if (State.currentChatIndex === index) this.loadChat(index, false);
            }});
            if (State.chatHistories.length === 0) { State.currentChatIndex = -1; this.startNewChat(); return; }
            if (index < oldIdx) State.currentChatIndex = oldIdx - 1;
            else if (index === oldIdx) { State.currentChatIndex = State.chatHistories.length - 1; this.loadChat(State.currentChatIndex, false); }
            this.saveChatHistories();
            this.renderUnifiedPanel(UI.elements.panelSearchInput.value);
        },
getRandomWelcomeMessage() {
    const lang = (typeof i18next !== 'undefined' && i18next.language) || localStorage.getItem('appLanguage') || 'en';
    const messages = {
        en: [
            "What would you like to explore?",
            "Ready to create something new?",
            "Let's solve a problem.",
            "Ready to help! As Always",
            "New ideas? Let's tackle them"
        ],
        ru: [
            "Что бы вы хотели исследовать?",
            "Готовы создать что-то новое?",
            "Чем я могу помочь вам сегодня?",
            "Давайте решим какую-нибудь задачу.",
            "Как всегда готов помочь!"
        ],
        az: [
            "Nəyi araşdırmaq istərdiniz?",
            "Yeni bir şey yaratmağa hazırsınız?",
            "Bu gün sizə necə kömək edə bilərəm?",
            "Gəlin bir problemi həll edək.",
            "Həmşəki kimi hazıram!"
        ]
    };
    const pool = messages[lang.substring(0, 2)] || messages.en;
    return pool[Math.floor(Math.random() * pool.length)];
},
toggleTempChatMode() {
    // 1. Safety Check: If streaming, stop before switching states
    if (State.isStreaming) {
        this.stopGeneration();
    }
    
    this.cancelEditMode();
    State.isTemporaryChat = !State.isTemporaryChat;
    
    if (State.isTemporaryChat) {
        // Sensory feedback: medium impact on activating ephemeral state
        if (window.AppleHaptics) {
            window.AppleHaptics.impactMedium();
        }
        
        // Clean out live chat viewport smoothly
        if (UI.elements && UI.elements.chatContainer) {
            UI.elements.chatContainer.innerHTML = '';
        }
        
        UI.toggleTempChatIndicator(true);
        UI.showWelcomePlaceholder();
        
        if (window.UI && UI.showNotification) {
            UI.showNotification('Temporary Chat active — history is paused');
        }
    } else {
        // Sensory feedback: light impact on returning to persistent state
        if (window.AppleHaptics) {
            window.AppleHaptics.impactLight();
        }
        
        UI.toggleTempChatIndicator(false);
        this.loadChat(State.currentChatIndex, false);
        
        if (window.UI && UI.showNotification) {
            UI.showNotification('Returned to saved history');
        }
    }
    
    this.togglePanel(false);
    this.updateInputUI();
},
disableTempChat() {
    if (State.isTemporaryChat) {
        State.isTemporaryChat = false;
        if (window.UI && UI.toggleTempChatIndicator) {
            UI.toggleTempChatIndicator(false);
        }
    }
},
loadRepositories() {
    try {
        const raw = localStorage.getItem(State.REPOSITORIES_KEY);
        State.repositories = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(State.repositories)) State.repositories = [];
    } catch {
        State.repositories = [];
    }
},
saveRepositories() {
    try {
        localStorage.setItem(State.REPOSITORIES_KEY, JSON.stringify(State.repositories || []));
    } catch (e) {
        console.error('Failed to save repositories to localStorage', e);
    }
},
addRepository(name, url, token = null) {
    if (!name || !url) return null;
    if (State.repositories.length >= State.MAX_REPOSITORIES) {
        if (window.UI) UI.showNotification('Maximum 3 repositories allowed.');
        return null;
    }
    
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
    }
    
    const cleanToken = token ? token.trim() : null;
    const repo = {
        id: 'repo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: name.trim(),
        url: cleanUrl,
        token: cleanToken,
        environmentId: null,
        createdAt: Date.now()
    };
    
    State.repositories.push(repo);
    this.saveRepositories();
    this.selectRepository(repo.id);
    
    if (window.UI) {
        UI.showNotification(`Repository "${repo.name}" attached`);
    }
    
    return repo;
},
deleteRepository(id) {
    const idx = State.repositories.findIndex(r => r.id === id);
    if (idx === -1) return;
    
    const [deleted] = State.repositories.splice(idx, 1);
    
    if (State.selectedRepositoryId === id) {
        this.selectRepository(null);
    }
    
    // Clear repository and environment from chats that were using this repository
    State.chatHistories.forEach(chat => {
        if (chat.repositoryId === id) {
            chat.repositoryId = null;
            chat.environmentId = null;
            chat.interactionId = null;
        }
    });
    
    this.saveRepositories();
    this.saveChatHistories();
    
    if (window.UI) {
        UI.showUndoToast({
            message: `Deleted "${deleted.name}"`,
            onUndo: () => {
                if (State.repositories.length < State.MAX_REPOSITORIES) {
                    State.repositories.splice(idx, 0, deleted);
                    this.saveRepositories();
                    if (window.UI.renderRepoList) window.UI.renderRepoList();
                }
            }
        });
    }
},
selectRepository(id) {
    State.selectedRepositoryId = id;
    const currentChat = State.chatHistories[State.currentChatIndex];
    if (currentChat) {
        if (currentChat.repositoryId !== id) {
            currentChat.repositoryId = id;
            const repo = this.getSelectedRepository();
            currentChat.environmentId = repo ? (repo.environmentId || null) : null;
            currentChat.interactionId = null; // Reset turn chaining when switching sandboxes
        }
        this.saveChatHistories();
    }
    if (window.UI && UI.updateRepoPillUI) {
        UI.updateRepoPillUI(this.getSelectedRepository());
    }
},
getSelectedRepository() {
    if (!State.selectedRepositoryId) return null;
    return State.repositories.find(r => r.id === State.selectedRepositoryId) || null;
},

        // ── Send Message ──────────────────────────────────────────────────────
stopGeneration() {
    if (State.abortController) {
        window.AppleHaptics.impactLight();
        State.abortController.abort();
        State.abortController = null;
        
        const elapsedMs = State._requestStartTime ? (Date.now() - State._requestStartTime) : 0;
        
        State.isStreaming = false;
        UI.hideTypingIndicator();
        UI.hideSkeletonLoader();
        UI.renderAbortedStatus(elapsedMs);
        UI.attachMessageActionsToLastBotMessage();
        this.updateInputUI();
        UI.finishThoughtAnimation();
    }
},
async runChat(prompt, attachments, signal) {
    State._requestStartTime = Date.now();
    UI.showSkeletonLoader();

    const chat = State.chatHistories[State.currentChatIndex];
    
    // 24-hour expiration check (86,400,000 ms)
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const isExpired = !chat?.lastActive || (Date.now() - chat.lastActive > ONE_DAY_MS);
    const previousId = (!isExpired && chat?.interactionId) ? chat.interactionId : '';

    // Capture clean preceding turns for fallback reconstruction
    const historyTurns = (chat?.messages || []).map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        content: getMessageText(m)
    })).filter(m => m.content);

    const uploadedMediaList = [];
    const atts = Array.isArray(attachments) ? attachments : [];

    for (const att of atts) {
        if (att?.file) {
            try {
                const uploadResult = await API.upload(att.file);
                if (uploadResult?.fileUri) {
                    uploadedMediaList.push({
                        fileUri: uploadResult.fileUri,
                        mimeType: uploadResult.mimeType || att.file.type,
                        name: uploadResult.name || att.file.name
                    });
                }
            } catch (uploadErr) {
                console.warn('[Files API Upload Failed]', uploadErr);
            }
        }
    }

    const formData = new FormData();
    formData.append('prompt', prompt);
    
    // Detect @Maps and @Study plugins explicitly in user's prompt
    const hasMapsPlugin = /@maps\b/i.test(prompt || '');
    if (hasMapsPlugin) {
        formData.append('use_maps', 'true');
    }

    const hasStudyPlugin = /@study\b/i.test(prompt || '');
    if (hasStudyPlugin) {
        formData.append('use_study', 'true');
    }

    // Attach user coordinates when available in settings for @maps grounding
    const isLocationEnabled = localStorage.getItem('cohana_location_enabled') === 'true';
    if (isLocationEnabled) {
        const storedLat = localStorage.getItem('cohana_user_lat');
        const storedLng = localStorage.getItem('cohana_user_lng');
        if (storedLat && storedLng) {
            formData.append('user_lat', storedLat);
            formData.append('user_lng', storedLng);
        }

        // Refresh location in background
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    localStorage.setItem('cohana_user_lat', String(pos.coords.latitude));
                    localStorage.setItem('cohana_user_lng', String(pos.coords.longitude));
                },
                () => {},
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
            );
        }
    }
    
    if (previousId) {
        formData.append('previous_interaction_id', previousId);
    }
    if (chat?.lastActive) {
        formData.append('last_active', String(chat.lastActive));
    }
    
    formData.append('history', JSON.stringify(historyTurns));
    formData.append('modelType', State.selectedModelType);

    if (uploadedMediaList.length > 0) {
        formData.append('persistentFiles', JSON.stringify(uploadedMediaList));
    }

    const memoryEnabled = this.isMemoryEnabled();
    formData.append('memoryEnabled', String(memoryEnabled));

    const userMemories = this.getEffectiveMemory();
    if (memoryEnabled && userMemories) {
        formData.append('userMemories', userMemories);
        formData.append('rawMemories', JSON.stringify(State.memories));
    }

    const internalState = {
        interactionId: previousId || null,
        lastEventId: null,
        thoughtSignature: null
    };

    let priorChatsContext = '';
    if (VectorSearch.isLoaded && prompt && State.chatHistories.length > 1) {
        const candidates = State.chatHistories.map((c, idx) => {
            if (idx === State.currentChatIndex) return null;
            const snippet = c.messages
                ?.slice(-3)
                .map(m => m.parts?.[0]?.text || '')
                .join('\n') || '';

            return {
                id: idx,
                title: c.title || 'Untitled Chat',
                snippet
            };
        }).filter(Boolean);

        if (candidates.length > 0) {
            try {
                const searchResults = await VectorSearch.search(prompt, candidates);
                const topMatches = searchResults.filter(r => r.score > 0.45).slice(0, 3);
                if (topMatches.length > 0) {
                    priorChatsContext = topMatches
                        .map(m => `[From prior conversation: "${m.title}"]: ${m.snippet}`)
                        .join('\n---\n');
                }
            } catch (err) {
                console.warn('[Vector Carry-Forward Error]', err);
            }
        }
    }

    if (priorChatsContext) {
        formData.append('priorChatsContext', priorChatsContext);
    }

    const otherChats = State.chatHistories
        .map((c, idx) => {
            if (idx === State.currentChatIndex) return null;
            return {
                index: idx,
                title: c.title || 'Untitled Chat',
                lastActive: c.lastActive,
                previewText: c.messages
                    ?.slice(0, 3)
                    .map(m => m.parts?.[0]?.text || '')
                    .join(' ') || ''
            };
        })
        .filter(Boolean);

    formData.append('otherChats', JSON.stringify(otherChats));

    let responseText = '';
    let thoughtBuffer = '';
    let thoughtTimeline = [];
    let citations = [];
    let groundingChunks = [];
    let hasInitializedBotMessage = false;

    const ensureBotMessage = () => {
        if (!hasInitializedBotMessage) {
            UI.hideSkeletonLoader();
            UI.addMessageToChat('bot', '', null, null, false);
            hasInitializedBotMessage = true;
        }
    };

    await API.chat(formData, {
        signal,

        onInteractionId: (id) => {
            if (!id) return;
            internalState.interactionId = id;

            const targetChat = State.chatHistories[State.currentChatIndex];
            if (targetChat) {
                targetChat.interactionId = id;
                targetChat.lastActive = Date.now();
                this.saveChatHistories();
            }
        },

        onEventId: (id) => {
            if (id) {
                internalState.lastEventId = id;
            }
        },

        onModeUpdate: (mode) => {
            State.selectedModelType = mode;
            if (window.Logic?.State) {
                window.Logic.State.selectedModelType = mode;
            }
            if (typeof window.UI?.updateAttachmentInputsState === 'function') {
                window.UI.updateAttachmentInputsState(mode);
            }
            if (typeof window.UI?.initModelSelector === 'function') {
                window.UI.initModelSelector();
            }
        },

        onContextEdit: (data) => this.handleContextEdit(data),

        onMemory: (c) => {
            if (State.isTemporaryChat || !this.isMemoryEnabled()) return;

            if (typeof c === 'object' && c !== null) {
                if (Array.isArray(c.memories)) {
                    State.memories = c.memories;
                    this.saveMemoriesToStorage();
                    this.renderMemoryUI();
                } else if (c.entry) {
                    this.saveMemory(
                        c.entry.id,
                        c.entry.title,
                        c.entry.content,
                        c.entry.type
                    );
                    this.renderMemoryUI();
                } else if ((c.action === 'delete' || c.action === 'remove') && c.id) {
                    this.deleteMemory(c.id);
                    this.renderMemoryUI();
                }
            } else if (typeof c === 'string') {
                this.saveMemory(null, 'Learned Fact', c, 'fact');
                this.renderMemoryUI();
            }
        },

        onThoughtSignature: (sig) => {
            internalState.thoughtSignature = sig;
        },

        onThought: (c, data) => {
            if (!c) return;
            ensureBotMessage();
            thoughtBuffer += c;
            const summary = data?.summary || null;
            let lastItem = thoughtTimeline[thoughtTimeline.length - 1];
            if (lastItem && lastItem.type === 'text' && lastItem.summary === summary) {
                lastItem.text += c;
            } else {
                lastItem = { type: 'text', text: c, summary };
                thoughtTimeline.push(lastItem);
            }
            UI.updateLastBotMessage({ timeline: thoughtTimeline, text: thoughtBuffer, summary }, 'thought');
        },

        onCodeExecutionCall: (data) => {
            ensureBotMessage();
            const item = {
                type: 'code_execution',
                id: data.id || ('code_exec_' + thoughtTimeline.length),
                language: data.language || 'python',
                code: data.code || ''
            };
            const idx = thoughtTimeline.findIndex(t => t.id === item.id || (t.type === 'code_execution' && !t.output && !data.id));
            if (idx >= 0) thoughtTimeline[idx] = { ...thoughtTimeline[idx], ...item };
            else thoughtTimeline.push(item);
            UI.updateLastBotMessage(item, 'code_execution_call');
        },

        onCodeExecutionResult: (data) => {
            ensureBotMessage();
            let item = data.id ? thoughtTimeline.find(t => t.id === data.id) : null;
            if (!item) {
                for (let i = thoughtTimeline.length - 1; i >= 0; i--) {
                    if (thoughtTimeline[i].type === 'code_execution' && thoughtTimeline[i].output === undefined) {
                        item = thoughtTimeline[i];
                        break;
                    }
                }
            }
            const images = data.images || (data.image ? [data.image] : []);
            if (item) {
                item.output = data.output || '';
                item.outcome = data.outcome || 'success';
                if (images.length) {
                    item.images = [...(item.images || []), ...images];
                }
            } else {
                item = {
                    type: 'code_execution',
                    id: data.id || ('code_exec_' + thoughtTimeline.length),
                    output: data.output || '',
                    outcome: data.outcome || 'success',
                    images: images.length ? images : []
                };
                thoughtTimeline.push(item);
            }
            UI.updateLastBotMessage(item, 'code_execution_result');
        },

        onUrlContextCall: (data) => {
            ensureBotMessage();
            const urls = data.urls || (data.url ? [data.url] : []);
            const item = {
                type: 'url_context',
                id: data.id || 'url_context',
                urls,
                query: data.query || ''
            };
            const idx = thoughtTimeline.findIndex(t => t.id === item.id);
            if (idx >= 0) {
                thoughtTimeline[idx].urls = [...new Set([...(thoughtTimeline[idx].urls || []), ...urls])];
            } else {
                thoughtTimeline.push(item);
            }
            UI.updateLastBotMessage(item, 'url_context_call');
        },

        onUrlContextResult: (data) => {
            ensureBotMessage();
            const urls = data.urls || [];
            const item = {
                type: 'url_context',
                id: data.id || 'url_context',
                urls,
                results: data.results || []
            };
            const existing = thoughtTimeline.find(t => t.id === item.id);
            if (existing) {
                existing.urls = [...new Set([...(existing.urls || []), ...urls])];
                existing.results = data.results || existing.results;
            } else {
                thoughtTimeline.push(item);
            }
            UI.updateLastBotMessage(item, 'url_context_result');
        },

        onGoogleSearchCall: (data) => {
            ensureBotMessage();
            const item = {
                type: 'url_context',
                id: data.id || 'google_search',
                query: data.query || ''
            };
            thoughtTimeline.push(item);
            UI.updateLastBotMessage(item, 'google_search_call');
        },

        onGoogleSearchResult: (data) => {
            ensureBotMessage();
            const item = {
                type: 'url_context',
                id: data.id || 'google_search',
                results: data.results || []
            };
            const existing = thoughtTimeline.find(t => t.id === item.id);
            if (existing) {
                existing.results = data.results || existing.results;
            } else {
                thoughtTimeline.push(item);
            }
            UI.updateLastBotMessage(item, 'google_search_result');
        },

        onToolCall: (data) => {
            ensureBotMessage();
            const item = {
                type: 'tool_call',
                id: data.id || ('tool_' + thoughtTimeline.length),
                name: data.name || 'tool',
                arguments: data.arguments || {},
                label: data.label || null
            };
            const idx = thoughtTimeline.findIndex(t => t.id === item.id);
            if (idx >= 0) thoughtTimeline[idx] = { ...thoughtTimeline[idx], ...item };
            else thoughtTimeline.push(item);
            UI.updateLastBotMessage(item, 'tool_call');
        },

        onToolResult: (data) => {
            ensureBotMessage();
            let item = data.id ? thoughtTimeline.find(t => t.id === data.id) : null;
            if (!item) {
                for (let i = thoughtTimeline.length - 1; i >= 0; i--) {
                    if (thoughtTimeline[i].type === 'tool_call' && thoughtTimeline[i].result === undefined) {
                        item = thoughtTimeline[i];
                        break;
                    }
                }
            }
            if (item) {
                item.result = data.result || data.output || '';
            } else {
                item = {
                    type: 'tool_call',
                    id: data.id || ('tool_' + thoughtTimeline.length),
                    name: data.name || 'tool',
                    result: data.result || data.output || ''
                };
                thoughtTimeline.push(item);
            }
            UI.updateLastBotMessage(item, 'tool_result');
        },

        onText: (c) => {
            if (!c) return;
            ensureBotMessage();

            const mapsRx = /https:\/\/www\.google\.com\/maps\/place\/[^\s")]+|https:\/\/maps\.google\.com\/[^\s")]+/g;
            const mapMatch = c.match(mapsRx);

            if (mapMatch) {
                mapMatch.forEach(link => {
                    const embed = link.replace('/place/', '/embed?pb=') + '&output=embed';
                    UI.addMessageToChat(
                        'bot',
                        `<div class="tool-widget-container">
                            <iframe class="map-embed" src="${embed}" loading="lazy"></iframe>
                            <a href="${link}" target="_blank" class="map-placeholder">
                                <i class="fas fa-map-marked-alt"></i> Open in Google Maps
                            </a>
                        </div>`,
                        null,
                        null,
                        false
                    );
                });
            }

            responseText += c;
            UI.updateLastBotMessage(responseText, 'text');
        },

        onCitation: (c) => {
            citations.push(c);
        },

        onCode: (data) => {
            ensureBotMessage();
            const item = {
                type: 'code_execution',
                id: data.id || ('code_exec_' + thoughtTimeline.length),
                language: data.language || 'python',
                code: data.code || ''
            };
            const idx = thoughtTimeline.findIndex(t => t.id === item.id || (t.type === 'code_execution' && !t.output && !data.id));
            if (idx >= 0) thoughtTimeline[idx] = { ...thoughtTimeline[idx], ...item };
            else thoughtTimeline.push(item);
            UI.updateLastBotMessage(item, 'code_execution_call');
        },

        onCodeResult: (data) => {
            ensureBotMessage();
            let item = data.id ? thoughtTimeline.find(t => t.id === data.id) : null;
            if (!item) {
                for (let i = thoughtTimeline.length - 1; i >= 0; i--) {
                    if (thoughtTimeline[i].type === 'code_execution' && thoughtTimeline[i].output === undefined) {
                        item = thoughtTimeline[i];
                        break;
                    }
                }
            }
            const images = data.images || (data.image ? [data.image] : []);
            if (item) {
                item.output = data.output || '';
                item.outcome = data.outcome || 'success';
                if (images.length) {
                    item.images = [...(item.images || []), ...images];
                }
            } else {
                item = {
                    type: 'code_execution',
                    id: data.id || ('code_exec_' + thoughtTimeline.length),
                    output: data.output || '',
                    outcome: data.outcome || 'success',
                    images: images.length ? images : []
                };
                thoughtTimeline.push(item);
            }
            UI.updateLastBotMessage(item, 'code_execution_result');
        },

        onCodeImage: (data) => {
            ensureBotMessage();
            const imgObj = {
                data: data.data,
                mimeType: data.mimeType || 'image/png'
            };

            let codeItem = null;
            for (let i = thoughtTimeline.length - 1; i >= 0; i--) {
                if (thoughtTimeline[i].type === 'code_execution') {
                    codeItem = thoughtTimeline[i];
                    break;
                }
            }

            if (codeItem) {
                if (!codeItem.images) codeItem.images = [];
                const exists = codeItem.images.some(img => img.data === imgObj.data);
                if (!exists) {
                    codeItem.images.push(imgObj);
                }
                UI.updateLastBotMessage(codeItem, 'code_execution_result');
            } else {
                const imgItem = {
                    type: 'code_image',
                    id: 'code_img_' + thoughtTimeline.length,
                    ...imgObj
                };
                thoughtTimeline.push(imgItem);
                UI.updateLastBotMessage(imgItem, 'code_image');
            }

            UI.updateLastBotMessage({ timeline: thoughtTimeline, text: thoughtBuffer }, 'thought');
        },

        onAudio: (data) => {
            ensureBotMessage();
            const audioHtml = `<audio controls src="data:${data.mimeType || 'audio/mp3'};base64,${data.data}" style="margin-top:10px;width:100%;"></audio>`;
            responseText += `\n${audioHtml}\n`;
            UI.updateLastBotMessage(responseText, 'text');
        },

        onGrounding: (meta) => {
            ensureBotMessage();

            if (meta.googleMapsWidgetContextToken) {
                responseText += `<div class="maps-widget-container"><gmp-place-contextual context-token="${meta.googleMapsWidgetContextToken}"></gmp-place-contextual></div>`;
                UI.updateLastBotMessage(responseText, 'text');
            }

            if (meta.groundingChunks?.length) {
                groundingChunks = meta.groundingChunks;
                UI.renderGroundingCitations(meta.groundingChunks);
            }
        },

        onUploadedFileMeta: (meta) => {
            const currentChat = State.chatHistories[State.currentChatIndex];
            if (!currentChat?.messages?.length) return;

            const lastMsg = currentChat.messages[currentChat.messages.length - 1];
            if (lastMsg?.role === 'user') {
                lastMsg.parts = lastMsg.parts || [];
                const alreadyLinked = lastMsg.parts.some(p =>
                    (meta.fileUri && p.fileData?.fileUri === meta.fileUri) ||
                    (meta.inlineData && p.inlineData?.data === meta.inlineData.data)
                );

                if (!alreadyLinked) {
                    if (meta.fileUri) {
                        lastMsg.parts.push({
                            fileData: {
                                fileUri: meta.fileUri,
                                mimeType: meta.mimeType
                            }
                        });
                    } else if (meta.inlineData) {
                        lastMsg.parts.push({
                            inlineData: {
                                data: meta.inlineData.data,
                                mimeType: meta.inlineData.mimeType
                            }
                        });
                    }
                    this.saveChatHistories();
                }
            }
        },

        onError: (err) => {
            UI.hideSkeletonLoader();
            const elapsedMs = State._requestStartTime ? Date.now() - State._requestStartTime : 0;

            if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                UI.renderAbortedStatus(elapsedMs);
            } else {
                const card = UI.renderErrorCard(err);
                if (!hasInitializedBotMessage) {
                    UI.addMessageToChat('bot', card, null, null, false);
                } else {
                    const lm = UI.elements.chatContainer.lastElementChild;
                    const txtEl = lm?.querySelector('.message-text');
                    if (txtEl) {
                        const errDiv = document.createElement('div');
                        errDiv.className = 'soft-error-container';
                        errDiv.style.cssText = 'margin-top: 14px; border-top: 1px dashed rgba(255, 69, 58, 0.25); padding-top: 8px; opacity: 0.95;';
                        errDiv.innerHTML = card;
                        txtEl.appendChild(errDiv);
                    }
                }
            }
            UI.attachMessageActionsToLastBotMessage();
        },

        onDone: () => {
            UI.hideSkeletonLoader();
            UI.finishThoughtAnimation();

            if (citations.length > 0) {
                UI.renderCitations(citations);
            }

            UI.attachMessageActionsToLastBotMessage();

            if (responseText.trim() && !State.isTemporaryChat) {
                const meta = {};
                if (thoughtTimeline.length > 0 || thoughtBuffer.trim()) {
                    meta.thoughts = { timeline: thoughtTimeline, text: thoughtBuffer };
                }
                if (citations.length) {
                    meta.citations = citations;
                }
                if (groundingChunks.length) {
                    meta.groundingChunks = groundingChunks;
                }

                this.addToMessageHistory('assistant', responseText, meta);
            }
        }
    }, internalState);
},
buildInteractiveBrowserUrl(url) {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        urlObj.searchParams.set('interactive', 'true');
        urlObj.searchParams.set('showControls', 'true');
        return urlObj.toString();
    } catch {
        const hasQuery = url.includes('?');
        return `${url}${hasQuery ? '&' : '?'}interactive=true&showControls=true`;
    }
},
async runAgent(prompt, attachments = null, userPlanFeedback = null, signal = null) {
    State._requestStartTime = Date.now();
    UI.showSkeletonLoader();

    const chat = State.chatHistories[State.currentChatIndex];
    const selectedRepo = this.getSelectedRepository();
    
    // Use repository's environment ID if one exists, or chat's environment ID
    const targetEnvId = selectedRepo ? (selectedRepo.environmentId || '') : (chat?.environmentId || '');
    
    // Check 24-hour expiration for storage retention
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const isExpired = !chat?.lastActive || (Date.now() - chat.lastActive > ONE_DAY_MS);
    
    // Chain previousInteractionId if valid and not expired
    const previousId = (!isExpired && chat?.interactionId) ? chat.interactionId : '';

    const formData = new FormData();
    formData.append('prompt', prompt || '');
    if (previousId) {
        formData.append('previous_interaction_id', previousId);
    }

    if (targetEnvId) {
        formData.append('environment_id', targetEnvId);
    }
    
    // Lock the agent selected for this conversation so orchestrator does not re-run
    if (chat?.agent) {
        formData.append('agent', chat.agent);
    }
    
    if (userPlanFeedback) {
        formData.append('user_plan_feedback', userPlanFeedback);
    }

    if (selectedRepo) {
        formData.append('repository', JSON.stringify({
            id: selectedRepo.id,
            name: selectedRepo.name,
            url: selectedRepo.url,
            token: selectedRepo.token || null,
            target: '/workspace/repo',
            environmentId: selectedRepo.environmentId || null
        }));
    }

    const hasPluginMention = /@([a-zA-Z0-9_-]+)/i.test(prompt || '');
    if (hasPluginMention) {
        try {
            const matchedSkills = await API.getSkills(prompt);
            if (matchedSkills && matchedSkills.length > 0) {
                formData.append('skills', JSON.stringify(matchedSkills));
            }
        } catch (pluginErr) {
            console.warn('[Plugin Resolution Failed]', pluginErr);
        }
    }

    const memoryEnabled = this.isMemoryEnabled();
    formData.append('memoryEnabled', String(memoryEnabled));

    const userMemories = this.getEffectiveMemory();
    if (memoryEnabled && userMemories) {
        formData.append('userMemories', userMemories);
        formData.append('rawMemories', JSON.stringify(State.memories));
    }

    // For a brand new turn, interactionId is null; previousInteractionId chains state
    const internalState = {
        previousInteractionId: previousId || null,
        interactionId: null,
        environmentId: targetEnvId || null,
        browserSessionId: State.browserControl.browserSessionId || null,
        lastEventId: null
    };

    const attachmentList = Array.isArray(attachments) ? attachments : [];
    let imageCount = 0;
    let fileCount = 0;

    for (const attachment of attachmentList) {
        if (!attachment?.file) continue;

        if (attachment.type === 'image') {
            formData.append(
                imageCount === 0 ? 'image' : `image_${imageCount}`,
                attachment.file,
                attachment.file.name
            );
            imageCount += 1;
        } else {
            formData.append(
                fileCount === 0 ? 'file' : `file_${fileCount}`,
                attachment.file,
                attachment.file.name
            );
            fileCount += 1;
        }
    }

    let responseText = '';
    let thoughtBuffer = '';
    let thoughtTimeline = [];
    let hasInitializedBotMessage = false;

    const ensureBotMessage = () => {
        if (hasInitializedBotMessage) return;
        UI.hideSkeletonLoader();
        UI.addMessageToChat('bot', '', null, null, false);
        hasInitializedBotMessage = true;
    };

    const persistInteractionState = () => {
        const targetChat = State.chatHistories[State.currentChatIndex];
        if (!targetChat) return;

        if (internalState.interactionId) {
            targetChat.interactionId = internalState.interactionId;
        }
        if (internalState.environmentId) {
            targetChat.environmentId = internalState.environmentId;
            if (selectedRepo) {
                selectedRepo.environmentId = internalState.environmentId;
                this.saveRepositories();
                if (window.UI && window.UI.renderRepoList) {
                    window.UI.renderRepoList();
                }
            }
        }
        targetChat.lastActive = Date.now();
        this.saveChatHistories();
    };

    await API.agent(
        formData,
        {
            signal,

            onStart: () => {
                UI.hideSkeletonLoader();
            },

            onAgentSelect: (data) => {
                if (data?.agent) {
                    const targetChat = State.chatHistories[State.currentChatIndex];
                    if (targetChat) {
                        targetChat.agent = data.agent;
                        this.saveChatHistories();
                    }
                }
            },

            onInteractionId: (id) => {
                if (!id) return;
                internalState.interactionId = id;
                State.browserControl.interactionId = id;
                persistInteractionState();
            },

            onEnvironmentId: (id) => {
                if (!id) return;
                internalState.environmentId = id;
                persistInteractionState();
            },

            onBrowserSessionId: (id) => {
                if (!id) return;
                internalState.browserSessionId = id;
                State.browserControl.browserSessionId = id;
            },

            onEventId: (id) => {
                if (!id) return;
                internalState.lastEventId = id;
                State.browserControl.lastEventId = id;
            },

            onStatus: (data) => {
                if (data?.status === 'incomplete') {
                    if (window.UI?.showNotification) {
                        window.UI.showNotification('Execution paused by budget. Continuing...');
                    }
                }
            },

            onIncomplete: (data) => {
                if (window.UI?.showNotification) {
                    window.UI.showNotification('Resuming task execution...');
                }
            },

            onPlanProposed: (data) => {
                ensureBotMessage();
                if (data.plan) {
                    UI.addMessageToChat('bot', `**Implementation Plan:**\n\n${data.plan}`, null, null, false);
                }
            },

            onThought: (content, data) => {
                if (!content) return;
                ensureBotMessage();
                thoughtBuffer += typeof content === 'string' ? content : '';
                const summary = data?.summary || null;
                let lastItem = thoughtTimeline[thoughtTimeline.length - 1];
                if (lastItem && lastItem.type === 'text' && lastItem.summary === summary) {
                    lastItem.text += content;
                } else {
                    lastItem = { type: 'text', text: content, summary };
                    thoughtTimeline.push(lastItem);
                }
                UI.updateLastBotMessage({ timeline: thoughtTimeline, text: thoughtBuffer, summary }, 'thought');
            },

            onCodeExecutionCall: (data) => {
                ensureBotMessage();
                const item = {
                    type: 'code_execution',
                    id: data.id || ('code_exec_' + thoughtTimeline.length),
                    language: data.language || 'python',
                    code: data.code || ''
                };
                const idx = thoughtTimeline.findIndex(t => t.id === item.id || (t.type === 'code_execution' && !t.output && !data.id));
                if (idx >= 0) thoughtTimeline[idx] = { ...thoughtTimeline[idx], ...item };
                else thoughtTimeline.push(item);
                UI.updateLastBotMessage(item, 'code_execution_call');
            },

            onCodeExecutionResult: (data) => {
                ensureBotMessage();
                let item = data.id ? thoughtTimeline.find(t => t.id === data.id) : null;
                if (!item) {
                    for (let i = thoughtTimeline.length - 1; i >= 0; i--) {
                        if (thoughtTimeline[i].type === 'code_execution' && thoughtTimeline[i].output === undefined) {
                            item = thoughtTimeline[i];
                            break;
                        }
                    }
                }
                const images = data.images || (data.image ? [data.image] : []);
                if (item) {
                    item.output = data.output || '';
                    item.outcome = data.outcome || 'success';
                    if (images.length) {
                        item.images = [...(item.images || []), ...images];
                    }
                } else {
                    item = {
                        type: 'code_execution',
                        id: data.id || ('code_exec_' + thoughtTimeline.length),
                        output: data.output || '',
                        outcome: data.outcome || 'success',
                        images: images.length ? images : []
                    };
                    thoughtTimeline.push(item);
                }
                UI.updateLastBotMessage(item, 'code_execution_result');
            },

            onUrlContextCall: (data) => {
                ensureBotMessage();
                const urls = data.urls || (data.url ? [data.url] : []);
                const item = {
                    type: 'url_context',
                    id: data.id || 'url_context',
                    urls,
                    query: data.query || ''
                };
                const idx = thoughtTimeline.findIndex(t => t.id === item.id);
                if (idx >= 0) {
                    thoughtTimeline[idx].urls = [...new Set([...(thoughtTimeline[idx].urls || []), ...urls])];
                } else {
                    thoughtTimeline.push(item);
                }
                UI.updateLastBotMessage(item, 'url_context_call');
            },

            onUrlContextResult: (data) => {
                ensureBotMessage();
                const urls = data.urls || [];
                const item = {
                    type: 'url_context',
                    id: data.id || 'url_context',
                    urls,
                    results: data.results || []
                };
                const existing = thoughtTimeline.find(t => t.id === item.id);
                if (existing) {
                    existing.urls = [...new Set([...(existing.urls || []), ...urls])];
                    existing.results = data.results || existing.results;
                } else {
                    thoughtTimeline.push(item);
                }
                UI.updateLastBotMessage(item, 'url_context_result');
            },

            onGoogleSearchCall: (data) => {
                ensureBotMessage();
                const item = {
                    type: 'url_context',
                    id: data.id || 'google_search',
                    query: data.query || ''
                };
                thoughtTimeline.push(item);
                UI.updateLastBotMessage(item, 'google_search_call');
            },

            onGoogleSearchResult: (data) => {
                ensureBotMessage();
                const item = {
                    type: 'url_context',
                    id: data.id || 'google_search',
                    results: data.results || []
                };
                const existing = thoughtTimeline.find(t => t.id === item.id);
                if (existing) {
                    existing.results = data.results || existing.results;
                } else {
                    thoughtTimeline.push(item);
                }
                UI.updateLastBotMessage(item, 'google_search_result');
            },

            onText: (content) => {
                if (typeof content !== 'string' || !content) return;
                ensureBotMessage();
                responseText += content;
                UI.updateLastBotMessage(responseText, 'text');
            },

            onToolCall: (data) => {
                if (data?.agent === 'computer_use') {
                    ensureBotMessage();
                    UI.renderToolCallStatus(data);
                }
            },

            onToolCallStart: (data) => {
                if (data?.agent === 'computer_use') {
                    ensureBotMessage();
                    UI.renderToolCallStatus({ ...data, phase: 'start' });
                }
            },

            onToolCallComplete: (data) => {
                if (data?.agent === 'computer_use') {
                    ensureBotMessage();
                    UI.renderToolCallStatus({ ...data, phase: 'complete' });
                }
            },

            onRequiresConfirmation: (data) => {
                ensureBotMessage();
                if (UI.showComputerUseConfirmation) {
                    UI.showComputerUseConfirmation(data);
                } else {
                    UI.renderToolCallStatus({
                        type: 'requires_confirmation',
                        name: data?.command?.name || data?.name || 'computer_use',
                        display: data?.command?.display || 'Confirmation required',
                        phase: 'confirmation'
                    });
                }
            },

            onYieldToUser: (data) => {
                this.handleYieldToUser(data, internalState);
            },

            onCodeImage: (data) => {
                ensureBotMessage();
                const imgObj = {
                    data: data.data,
                    mimeType: data.mimeType || 'image/png'
                };

                let codeItem = null;
                for (let i = thoughtTimeline.length - 1; i >= 0; i--) {
                    if (thoughtTimeline[i].type === 'code_execution') {
                        codeItem = thoughtTimeline[i];
                        break;
                    }
                }

                if (codeItem) {
                    if (!codeItem.images) codeItem.images = [];
                    const exists = codeItem.images.some(img => img.data === imgObj.data);
                    if (!exists) {
                        codeItem.images.push(imgObj);
                    }
                    UI.updateLastBotMessage(codeItem, 'code_execution_result');
                } else {
                    const imgItem = {
                        type: 'code_image',
                        id: 'code_img_' + thoughtTimeline.length,
                        ...imgObj
                    };
                    thoughtTimeline.push(imgItem);
                    UI.updateLastBotMessage(imgItem, 'code_image');
                }

                UI.updateLastBotMessage({ timeline: thoughtTimeline, text: thoughtBuffer }, 'thought');
            },

            onFile: (data) => {
                ensureBotMessage();
                const cardHtml = this.renderFileCardHtml(data);
                UI.addMessageToChat('bot', cardHtml, null, null, false);
                if (!State.isTemporaryChat) {
                    this.addToMessageHistory('assistant', cardHtml);
                }
            },

            onFileShared: (data) => {
                ensureBotMessage();
                const cardHtml = this.renderFileCardHtml(data);
                UI.addMessageToChat('bot', cardHtml, null, null, false);
                if (!State.isTemporaryChat) {
                    this.addToMessageHistory('assistant', cardHtml);
                }
            },

            onError: (error) => {
                UI.hideSkeletonLoader();
                UI.finishThoughtAnimation();

                const elapsedMs = State._requestStartTime ? Date.now() - State._requestStartTime : 0;
                const isAborted = error?.name === 'AbortError' || /aborted|abort/i.test(String(error?.message || ''));

                if (isAborted) {
                    UI.renderAbortedStatus(elapsedMs);
                    return;
                }

                const errorCard = UI.renderErrorCard(error);
                if (!hasInitializedBotMessage) {
                    UI.addMessageToChat('bot', errorCard, null, null, false);
                } else {
                    const lastMessage = UI.elements.chatContainer.lastElementChild;
                    const messageText = lastMessage?.querySelector('.message-text');
                    if (messageText) {
                        const errorContainer = document.createElement('div');
                        errorContainer.className = 'soft-error-container';
                        errorContainer.style.cssText = 'margin-top:14px;border-top:1px dashed rgba(255,69,58,0.25);padding-top:8px;opacity:0.95;';
                        errorContainer.innerHTML = errorCard;
                        messageText.appendChild(errorContainer);
                    }
                }
            },

            onDone: () => {
                UI.hideSkeletonLoader();
                UI.finishThoughtAnimation();
                State.browserControl.resumeInProgress = false;

                if (responseText.trim() && !State.isTemporaryChat) {
                    const metadata = {};
                    if (thoughtTimeline.length > 0 || thoughtBuffer.trim()) {
                        metadata.thoughts = { timeline: thoughtTimeline, text: thoughtBuffer };
                    }
                    this.addToMessageHistory('assistant', responseText, metadata);
                }
            }
        },
        internalState
    );

    return {
        interactionId: internalState.interactionId,
        environmentId: internalState.environmentId,
        browserSessionId: internalState.browserSessionId,
        lastEventId: internalState.lastEventId,
        responseText,
        thoughts: thoughtBuffer
    };
},

handleYieldToUser(data, internalState = null) {
    UI.hideSkeletonLoader();
    UI.finishThoughtAnimation();

    State.isStreaming = false;

    State.browserControl.awaitingUser = true;
    State.browserControl.interactionId = data.interaction_id || internalState?.interactionId || State.browserControl.interactionId;
    State.browserControl.browserSessionId = data.browser_session_id || internalState?.browserSessionId || State.browserControl.browserSessionId;
    State.browserControl.debugUrl = data.debug_url || State.browserControl.debugUrl;
    State.browserControl.reason = data.reason || 'Cohana needs your help in the live browser.';
    State.browserControl.chatIndex = State.currentChatIndex;
    State.browserControl.resumeInProgress = false;

    this.updateInputUI();

    if (window.UI) {
        UI.renderToolCallStatus({ type: 'yield_to_user', name: 'yield_to_user', label: 'Waiting for your help' });
        if (UI.showBrowserTakeover) {
            UI.showBrowserTakeover(State.browserControl);
        }
        if (UI.renderBrowserTakeoverBanner) {
            UI.renderBrowserTakeoverBanner(State.browserControl);
        }
    }
},

async resumeBrowserAgent(userReportText = '') {
    if (!State.browserControl.awaitingUser || State.browserControl.resumeInProgress) {
        return;
    }

    const interactionId = State.browserControl.interactionId;
    const browserSessionId = State.browserControl.browserSessionId;
    const lastEventId = State.browserControl.lastEventId;

    if (!interactionId || !browserSessionId) {
        if (window.UI) {
            UI.showNotification('Unable to resume: browser session state is missing.');
        }
        return;
    }

    const reportMessage = String(userReportText || '').trim() || 'The user completed the manual browser action.';

    State.browserControl.resumeInProgress = true;
    State.browserControl.userMessage = reportMessage;
    State.isStreaming = true;

    if (window.UI) {
        if (UI.updateBrowserTakeoverResuming) UI.updateBrowserTakeoverResuming();
        UI.showSkeletonLoader();
    }

    State.abortController = new AbortController();
    const signal = State.abortController.signal;

    const internalState = {
        interactionId,
        browserSessionId,
        lastEventId
    };

    let responseText = '';
    let thoughtBuffer = '';
    let thoughtTimeline = [];
    let hasInitializedBotMessage = false;

    const ensureBotMessage = () => {
        if (hasInitializedBotMessage) return;
        UI.hideSkeletonLoader();
        UI.addMessageToChat('bot', '', null, null, false);
        hasInitializedBotMessage = true;
    };

    try {
        await API.resumeAgentAfterUserControl(
            {
                interactionId,
                browserSessionId,
                lastEventId,
                userMessage: reportMessage,
                userMemories: this.getEffectiveMemory()
            },
            {
                signal,

                onStart: () => {
                    UI.hideSkeletonLoader();
                },

                onInteractionId: (id) => {
                    if (!id) return;
                    internalState.interactionId = id;
                    State.browserControl.interactionId = id;

                    const targetChat = State.chatHistories[State.currentChatIndex];
                    if (targetChat) {
                        targetChat.interactionId = id;
                        this.saveChatHistories();
                    }
                },

                onBrowserSessionId: (id) => {
                    if (!id) return;
                    internalState.browserSessionId = id;
                    State.browserControl.browserSessionId = id;
                },

                onEventId: (id) => {
                    if (!id) return;
                    internalState.lastEventId = id;
                    State.browserControl.lastEventId = id;
                },

                onThought: (content, data) => {
                    if (!content) return;
                    ensureBotMessage();
                    thoughtBuffer += typeof content === 'string' ? content : '';
                    const summary = data?.summary || null;
                    let lastItem = thoughtTimeline[thoughtTimeline.length - 1];
                    if (lastItem && lastItem.type === 'text' && lastItem.summary === summary) {
                        lastItem.text += content;
                    } else {
                        lastItem = { type: 'text', text: content, summary };
                        thoughtTimeline.push(lastItem);
                    }
                    UI.updateLastBotMessage({ timeline: thoughtTimeline, text: thoughtBuffer, summary }, 'thought');
                },

                onCodeExecutionCall: (data) => {
                    ensureBotMessage();
                    const item = {
                        type: 'code_execution',
                        id: data.id || ('code_exec_' + thoughtTimeline.length),
                        language: data.language || 'python',
                        code: data.code || ''
                    };
                    const idx = thoughtTimeline.findIndex(t => t.id === item.id || (t.type === 'code_execution' && !t.output && !data.id));
                    if (idx >= 0) thoughtTimeline[idx] = { ...thoughtTimeline[idx], ...item };
                    else thoughtTimeline.push(item);
                    UI.updateLastBotMessage(item, 'code_execution_call');
                },

                onCodeExecutionResult: (data) => {
                    ensureBotMessage();
                    let item = data.id ? thoughtTimeline.find(t => t.id === data.id) : null;
                    if (!item) {
                        for (let i = thoughtTimeline.length - 1; i >= 0; i--) {
                            if (thoughtTimeline[i].type === 'code_execution' && thoughtTimeline[i].output === undefined) {
                                item = thoughtTimeline[i];
                                break;
                            }
                        }
                    }
                    const images = data.images || (data.image ? [data.image] : []);
                    if (item) {
                        item.output = data.output || '';
                        item.outcome = data.outcome || 'success';
                        if (images.length) {
                            item.images = [...(item.images || []), ...images];
                        }
                    } else {
                        item = {
                            type: 'code_execution',
                            id: data.id || ('code_exec_' + thoughtTimeline.length),
                            output: data.output || '',
                            outcome: data.outcome || 'success',
                            images: images.length ? images : []
                        };
                        thoughtTimeline.push(item);
                    }
                    UI.updateLastBotMessage(item, 'code_execution_result');
                },

                onCodeImage: (data) => {
                    ensureBotMessage();
                    const imgObj = {
                        data: data.data,
                        mimeType: data.mimeType || 'image/png'
                    };

                    let codeItem = null;
                    for (let i = thoughtTimeline.length - 1; i >= 0; i--) {
                        if (thoughtTimeline[i].type === 'code_execution') {
                            codeItem = thoughtTimeline[i];
                            break;
                        }
                    }

                    if (codeItem) {
                        if (!codeItem.images) codeItem.images = [];
                        const exists = codeItem.images.some(img => img.data === imgObj.data);
                        if (!exists) {
                            codeItem.images.push(imgObj);
                        }
                        UI.updateLastBotMessage(codeItem, 'code_execution_result');
                    } else {
                        const imgItem = {
                            type: 'code_image',
                            id: 'code_img_' + thoughtTimeline.length,
                            ...imgObj
                        };
                        thoughtTimeline.push(imgItem);
                        UI.updateLastBotMessage(imgItem, 'code_image');
                    }

                    UI.updateLastBotMessage({ timeline: thoughtTimeline, text: thoughtBuffer }, 'thought');
                },

                onUrlContextCall: (data) => {
                    ensureBotMessage();
                    const urls = data.urls || (data.url ? [data.url] : []);
                    const item = {
                        type: 'url_context',
                        id: data.id || 'url_context',
                        urls,
                        query: data.query || ''
                    };
                    const idx = thoughtTimeline.findIndex(t => t.id === item.id);
                    if (idx >= 0) {
                        thoughtTimeline[idx].urls = [...new Set([...(thoughtTimeline[idx].urls || []), ...urls])];
                    } else {
                        thoughtTimeline.push(item);
                    }
                    UI.updateLastBotMessage(item, 'url_context_call');
                },

                onUrlContextResult: (data) => {
                    ensureBotMessage();
                    const urls = data.urls || [];
                    const item = {
                        type: 'url_context',
                        id: data.id || 'url_context',
                        urls,
                        results: data.results || []
                    };
                    const existing = thoughtTimeline.find(t => t.id === item.id);
                    if (existing) {
                        existing.urls = [...new Set([...(existing.urls || []), ...urls])];
                        existing.results = data.results || existing.results;
                    } else {
                        thoughtTimeline.push(item);
                    }
                    UI.updateLastBotMessage(item, 'url_context_result');
                },

                onGoogleSearchCall: (data) => {
                    ensureBotMessage();
                    const item = {
                        type: 'url_context',
                        id: data.id || 'google_search',
                        query: data.query || ''
                    };
                    thoughtTimeline.push(item);
                    UI.updateLastBotMessage(item, 'google_search_call');
                },

                onGoogleSearchResult: (data) => {
                    ensureBotMessage();
                    const item = {
                        type: 'url_context',
                        id: data.id || 'google_search',
                        results: data.results || []
                    };
                    const existing = thoughtTimeline.find(t => t.id === item.id);
                    if (existing) {
                        existing.results = data.results || existing.results;
                    } else {
                        thoughtTimeline.push(item);
                    }
                    UI.updateLastBotMessage(item, 'google_search_result');
                },

                onText: (content) => {
                    if (typeof content !== 'string' || !content) return;
                    ensureBotMessage();
                    responseText += content;
                    UI.updateLastBotMessage(responseText, 'text');
                },

                onToolCall: (data) => {
                    ensureBotMessage();
                    UI.renderToolCallStatus(data);
                },

                onToolCallStart: (data) => {
                    ensureBotMessage();
                    UI.renderToolCallStatus({ ...data, phase: 'start' });
                },

                onToolCallComplete: (data) => {
                    ensureBotMessage();
                    UI.renderToolCallStatus({ ...data, phase: 'complete' });
                },

                onRequiresConfirmation: (data) => {
                    ensureBotMessage();
                    if (UI.showComputerUseConfirmation) {
                        UI.showComputerUseConfirmation(data);
                    } else {
                        UI.renderToolCallStatus({
                            type: 'requires_confirmation',
                            name: data?.command?.name || data?.name || 'computer_use',
                            display: data?.command?.display || 'Confirmation required',
                            phase: 'confirmation'
                        });
                    }
                },

                onYieldToUser: (data) => {
                    this.handleYieldToUser(data, internalState);
                },

                onFileShared: (data) => {
                    ensureBotMessage();
                    const fileName = data?.filename || data?.fileName || 'download';
                    const fileUrl = data?.url || '';

                    const safeFileName = UI.escapeHTML ? UI.escapeHTML(fileName) : fileName;
                    const fileHtml = `
                        <div class="shared-file-card" style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);padding:12px 16px;border-radius:14px;margin-top:10px;">
                            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                                <i class="fas fa-file-arrow-down" style="color:#ffffff;font-size:20px;flex-shrink:0;opacity:0.8;"></i>
                                <span style="font-weight:600;font-size:14px;color:#ffffff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                    ${safeFileName}
                                </span>
                            </div>
                            ${fileUrl ? `<a href="${fileUrl}" target="_blank" rel="noopener noreferrer" download style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.18);color:#fff;text-decoration:none;padding:6px 14px;border-radius:16px;font-size:13px;font-weight:600;flex-shrink:0;">Download</a>` : ''}
                        </div>
                    `;

                    UI.addMessageToChat('bot', fileHtml, null, null, false);
                    if (!State.isTemporaryChat) {
                        this.addToMessageHistory('assistant', fileHtml);
                    }
                },

                onError: (error) => {
                    UI.hideSkeletonLoader();
                    UI.finishThoughtAnimation();

                    State.browserControl.resumeInProgress = false;
                    const message = String(error?.message || '').toLowerCase();
                    const browserSessionExpired = message.includes('expired') || message.includes('invalid') || message.includes('steel');

                    if (browserSessionExpired) {
                        if (window.UI) {
                            UI.showNotification('This live browser session has expired.');
                            if (UI.hideBrowserTakeover) UI.hideBrowserTakeover();
                            if (UI.hideBrowserTakeoverBanner) UI.hideBrowserTakeoverBanner();
                        }
                        State.browserControl.awaitingUser = false;
                        return;
                    }

                    const isAborted = error?.name === 'AbortError' || /aborted|abort/i.test(message);
                    if (isAborted) return;

                    if (window.UI) {
                        UI.showNotification('Cohana could not resume the browser task. Tap Resume to try again.');
                        if (UI.resetBrowserTakeoverButtons) UI.resetBrowserTakeoverButtons();
                    }

                    const errorCard = UI.renderErrorCard(error);
                    if (!hasInitializedBotMessage) {
                        UI.addMessageToChat('bot', errorCard, null, null, false);
                    }
                },

                onDone: () => {
                    UI.hideSkeletonLoader();
                    UI.finishThoughtAnimation();

                    State.browserControl.resumeInProgress = false;
                    State.browserControl.awaitingUser = false;

                    if (window.UI) {
                        if (UI.hideBrowserTakeover) UI.hideBrowserTakeover();
                        if (UI.hideBrowserTakeoverBanner) UI.hideBrowserTakeoverBanner();
                    }

                    if (responseText.trim() && !State.isTemporaryChat) {
                        const metadata = {};
                        if (thoughtTimeline.length > 0 || thoughtBuffer.trim()) {
                            metadata.thoughts = { timeline: thoughtTimeline, text: thoughtBuffer };
                        }
                        this.addToMessageHistory('assistant', responseText, metadata);
                    }
                }
            },
            internalState
        );
    } catch (error) {
        State.browserControl.resumeInProgress = false;
        if (error?.name !== 'AbortError' && window.UI) {
            UI.showNotification('Connection error during resume. Try again.');
            if (UI.resetBrowserTakeoverButtons) UI.resetBrowserTakeoverButtons();
        }
    } finally {
        UI.hideSkeletonLoader();
        State.isStreaming = false;
        State.abortController = null;
        this.updateInputUI();
    }

    return {
        interactionId: internalState.interactionId,
        browserSessionId: internalState.browserSessionId,
        lastEventId: internalState.lastEventId,
        responseText,
        thoughts: thoughtBuffer
    };
},
// Add this helper method inside the Logic object
removeUnansweredMessages() {
        if (State.isTemporaryChat) {
            const container = UI.elements.chatContainer;
            if (container) {
                let lastChild = container.lastElementChild;
                while (lastChild && (lastChild.classList.contains('user-wrapper') || lastChild.classList.contains('typing-indicator') || lastChild.classList.contains('thinking-text-container'))) {
                    const prev = lastChild.previousElementSibling;
                    lastChild.remove();
                    lastChild = prev;
                }
            }
            return;
        }
        
        const chat = State.chatHistories[State.currentChatIndex];
        if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) return;
        
        let removedCount = 0;
        while (chat.messages.length > 0 && chat.messages[chat.messages.length - 1].role === 'user') {
            chat.messages.pop();
            removedCount++;
        }
        
        if (removedCount > 0) {
            const container = UI.elements.chatContainer;
            if (container) {
                let lastChild = container.lastElementChild;
                while (lastChild && (lastChild.classList.contains('user-wrapper') || lastChild.classList.contains('typing-indicator') || lastChild.classList.contains('thinking-text-container'))) {
                    const prev = lastChild.previousElementSibling;
                    lastChild.remove();
                    lastChild = prev;
                }
            }
            this.saveChatHistories();
        }
    },

setupVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        this.recognition = null;
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    let baseText = '';
    
    recognition.onstart = () => {
        State.isDictating = true;
        baseText = UI.elements.userInput ? UI.elements.userInput.value : '';
        if (baseText && !baseText.endsWith(' ')) {
            baseText += ' ';
        }
        if (window.UI?.setDictationState) {
            window.UI.setDictationState(true);
        }
    };
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        if (UI.elements.userInput) {
            UI.elements.userInput.value = baseText + finalTranscript + interimTranscript;
            UI.autoResizeInput();
            this.updateInputUI();
            if (!State.isTemporaryChat) {
                localStorage.setItem(State.DRAFT_KEY, UI.elements.userInput.value);
            }
        }
    };
    
    recognition.onerror = (event) => {
        console.warn('[Dictation Error]', event.error);
        if (event.error !== 'no-speech' && window.UI) {
            UI.showNotification(`Dictation error: ${event.error}`);
        }
    };
    
    recognition.onend = () => {
        State.isDictating = false;
        if (window.UI?.setDictationState) {
            window.UI.setDictationState(false);
        }
    };
    
    this.recognition = recognition;
},

toggleDictation() {
    if (!this.recognition) {
        this.setupVoiceInput();
    }
    
    if (!this.recognition) {
        if (window.UI) UI.showNotification('Speech recognition is not supported in this browser');
        return;
    }
    
    if (State.isDictating) {
        try {
            this.recognition.stop();
        } catch (_) {}
    } else {
        try {
            const lang = localStorage.getItem('appLanguage') || 'en';
            const langMap = {
                en: 'en-US',
                ru: 'ru-RU',
                az: 'az-AZ'
            };
            this.recognition.lang = langMap[lang] || lang || 'en-US';
            this.recognition.start();
        } catch (err) {
            console.warn('Speech recognition start error:', err);
        }
    }
},

toggleVoiceRecording() {
    this.toggleDictation();
},

bindEvents() {
    const el = UI.elements;
    const toggleDict = () => Logic.toggleDictation();
    
    [document.getElementById('audioInputButton'), el.voiceInputButton, el.audioInputButton].forEach(btn => {
        if (btn) btn.onclick = toggleDict;
    });
    
    const langSelect = document.getElementById('appLanguageSelect');
    if (langSelect) {
        langSelect.onchange = () => {
            const selected = langSelect.value;
            localStorage.setItem('appLanguage', selected);
            if (typeof i18next !== 'undefined') {
                i18next.changeLanguage(selected, (err) => {
                    if (!err) {
                        UI.updateDOMTranslations();
                        this.renderUnifiedPanel();
                        if (!State.chatHistories[State.currentChatIndex]?.messages?.length) {
                            UI.showWelcomePlaceholder();
                        }
                        this.setupVoiceInput();
                    }
                });
            }
        };
    }
    
    el.panelToggleBtn.onclick = () => this.togglePanel(true);
    el.topSettingsBtn.onclick = () => {
        if (window.UI?.renderMemoryDropdown) UI.renderMemoryDropdown();
        el.slideInSettingsPanel.classList.add('show');
    };
    
    // Temporary Chat Button Wiring
    const tempBtn = el.tempChatBtn || document.getElementById('tempChatBtn');
    if (tempBtn) {
        tempBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleTempChatMode();
        };
    }
    
    el.panelCloseBtn.onclick = () => this.togglePanel(false);
    el.panelSearchInput.oninput = () => this.renderUnifiedPanel(el.panelSearchInput.value);
    if (el.panelNewChatBtn) el.panelNewChatBtn.onclick = () => this.startNewChat();
    el.closeSettingsButton.onclick = () => el.slideInSettingsPanel.classList.remove('show');
    
    el.sendButton.onclick = () => {
        if (State.isDictating && this.recognition) {
            try { this.recognition.stop(); } catch (_) {}
        }
        if (el.userInput.value.trim() || State.attachments.length) {
            this.sendMessage();
        } else if (window.LiveMode) {
            window.LiveMode.start();
        }
    };
    
    el.stopButton.onclick = () => this.stopGeneration();
    
    // Keyboard navigation & @ mention interceptor
    el.userInput.onkeydown = (e) => {
        // Intercept Arrow keys, Tab, Enter and Escape when @ mention popup is active
        if (UI._atMentionState?.isOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                UI.navigateAtMention(1);
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                UI.navigateAtMention(-1);
                return;
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    const confirmed = UI.confirmAtMention();
                    if (confirmed) {
                        e.preventDefault();
                        return;
                    }
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                UI.closeAtMentionPopup();
                return;
            }
        }
        
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (State.isDictating && this.recognition) {
                try { this.recognition.stop(); } catch (_) {}
            }
            this.sendMessage();
        }
    };
    
    el.userInput.oninput = () => {
        UI.autoResizeInput();
        this.updateInputUI();
        if (UI.handleInputAtMention) {
            UI.handleInputAtMention(el.userInput);
        }
        if (!State.isTemporaryChat) {
            localStorage.setItem(State.DRAFT_KEY, el.userInput.value);
        }
    };
    
    el.userInput.onfocus = () => {
        UI.autoResizeInput();
        if (UI.handleInputAtMention) {
            UI.handleInputAtMention(el.userInput);
        }
    };
    
    el.userInput.onblur = () => {
        // Small grace period to allow pointer-down selection on popup items
        setTimeout(() => {
            if (document.activeElement !== el.userInput && !UI.elements.atMentionPopup?.contains(document.activeElement)) {
                UI.closeAtMentionPopup();
            }
        }, 180);
    };
    
    el.plusButton.onclick = (e) => {
        e.stopPropagation();
        if (window.UI && UI.updateAttachmentInputsState) {
            UI.updateAttachmentInputsState(State.selectedModelType);
        }
        el.actionSheet.classList.toggle('show');
    };
    
    el.sheetBackdrop.onclick = () => el.actionSheet.classList.remove('show');
    if (el.sheetDragHandle) el.sheetDragHandle.onclick = () => el.actionSheet.classList.remove('show');
    
    el.cameraInput.onchange = (e) => this.handleFileSelect(e.target.files[0], 'camera');
    el.galleryInput.onchange = (e) => {
        Array.from(e.target.files || []).slice(0, 5 - State.attachments.length).forEach(f => this.handleFileSelect(f, 'image'));
        e.target.value = '';
    };
    el.fileInput.onchange = (e) => {
        Array.from(e.target.files || []).slice(0, 5 - State.attachments.length).forEach(f => this.handleFileSelect(f, 'file'));
        e.target.value = '';
    };
    
    if (el.sheetButtons.camera) {
        el.sheetButtons.camera.onclick = () => {
            el.actionSheet.classList.remove('show');
            if (window.UI && window.UI.openCustomCamera) {
                window.UI.openCustomCamera();
            } else if (el.cameraInput) {
                el.cameraInput.click();
            }
        };
    }
    
    if (el.sheetButtons.photos) {
        el.sheetButtons.photos.onclick = () => {
            el.actionSheet.classList.remove('show');
            el.galleryInput.click();
        };
    }
    
    if (el.sheetButtons.files) {
        el.sheetButtons.files.onclick = () => {
            if (State.selectedModelType === 'agent') {
                if (window.UI) UI.showNotification('File input is disabled in Agent mode');
                return;
            }
            el.actionSheet.classList.remove('show');
            el.fileInput.click();
        };
    }
    
    if (el.sheetButtons.plugins) {
        el.sheetButtons.plugins.onclick = () => {
            el.actionSheet.classList.remove('show');
            if (window.UI && window.UI.openPluginsModal) {
                window.UI.openPluginsModal();
            }
        };
    }
    
    el.chatContainer.addEventListener('scroll', () => {
        const c = el.chatContainer;
        UI.toggleScrollButton(c.scrollHeight - c.scrollTop - c.clientHeight > 150);
    });
    
    el.scrollToBottomBtn.onclick = () => el.chatContainer.scrollTo({
        top: el.chatContainer.scrollHeight,
        behavior: 'smooth'
    });
    
    el.expandInputBtn.onclick = () => {
        el.fullInputTextarea.value = el.userInput.value;
        el.fullInputModal.classList.add('show');
        setTimeout(() => el.fullInputTextarea.focus(), 150);
    };
    
    el.closeFullInput.onclick = () => {
        el.userInput.value = el.fullInputTextarea.value;
        el.fullInputModal.classList.remove('show');
        el.userInput.dispatchEvent(new Event('input'));
    };
    
    if (el.fullInputTextarea) {
        el.fullInputTextarea.oninput = () => {
            if (UI.handleInputAtMention) {
                UI.handleInputAtMention(el.fullInputTextarea);
            }
        };
        el.fullInputTextarea.onkeydown = (e) => {
            if (UI._atMentionState?.isOpen) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    UI.navigateAtMention(1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    UI.navigateAtMention(-1);
                } else if (e.key === 'Enter' || e.key === 'Tab') {
                    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                        const confirmed = UI.confirmAtMention();
                        if (confirmed) e.preventDefault();
                    }
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    UI.closeAtMentionPopup();
                }
            }
        };
    }
},

renderAttachmentPreviews() {
    const area = UI.elements.previewArea;
    const container = UI.elements.inputContainer;
    area.innerHTML = '';
    
    if (!State.attachments.length) {
        area.classList.remove('has-content');
        container.classList.remove('preview-active');
        if (UI.elements.userInput.value.length <= 46) {
            container.classList.remove('expanded-state');
        }
        if (UI.updateAssetsRowVisibility) UI.updateAssetsRowVisibility();
        if (window.updateBottomBarHeight) window.updateBottomBarHeight();
        return;
    }
    
    area.classList.add('has-content');
    container.classList.add('preview-active', 'expanded-state');
    
    const reversed = [...State.attachments].reverse();
    reversed.forEach(att => {
        const card = document.createElement('div');
        
        if (att.type === 'image') {
            card.className = 'preview-card-image';
            card.innerHTML = `
                <img src="${att.previewUrl}" alt="Preview">
                <button class="preview-card-close" aria-label="Remove image"><i class="fas fa-times"></i></button>
            `;
        } else if (att.type === 'video') {
            card.className = 'preview-card-video';
            card.innerHTML = `
                <video src="${att.previewUrl}" muted style="width:100%; height:100%; object-fit:cover; border-radius:28px; pointer-events:none;"></video>
                <span class="preview-video-timeline">${att.durationStr || '0:12'}</span>
                <button class="preview-card-close" aria-label="Remove video"><i class="fas fa-times"></i></button>
            `;
        } else {
            const fileName = att.file ? att.file.name : 'File';
            const ext = fileName.includes('.') ? fileName.split('.').pop().toUpperCase() : 'FILE';
            const fileTypeLabel = ext === 'MD' ? 'Markdown' : ext === 'PDF' ? 'PDF' : ext === 'TXT' ? 'Text' : ext === 'PY' || ext === 'JS' || ext === 'HTML' || ext === 'CSS' ? 'Code' : ext;
            
            card.className = 'preview-card-file';
            card.innerHTML = `
                <div class="doc-preview-page">
                    <div class="doc-preview-lines">
                        <div class="doc-line header"></div>
                        <div class="doc-line"></div>
                        <div class="doc-line"></div>
                        <div class="doc-line short"></div>
                        <div class="doc-line"></div>
                        <div class="doc-line short"></div>
                    </div>
                </div>
                <div class="preview-file-type-pill">${fileTypeLabel}</div>
                <button class="preview-card-close" aria-label="Remove file"><i class="fas fa-times"></i></button>
            `;
        }
        
        card.querySelector('.preview-card-close').onclick = (e) => {
            e.stopPropagation();
            const prev = [...State.attachments];
            State.attachments = State.attachments.filter(a => a.id !== att.id);
            this.renderAttachmentPreviews(); 
            this.updateInputUI();
            UI.showUndoToast({ message: 'File removed', onUndo: () => { State.attachments = prev; this.renderAttachmentPreviews(); this.updateInputUI(); } });
        };
        
        area.appendChild(card);
    });

    area.scrollLeft = 0;
    if (UI.updateAssetsRowVisibility) UI.updateAssetsRowVisibility();
    if (window.updateBottomBarHeight) window.updateBottomBarHeight();
},

async sendMessage() {
    if (State.isDictating && this.recognition) {
        try { this.recognition.stop(); } catch (_) {}
    }
    
    const text = UI.elements.userInput.value.trim();
    const rate = getRateState();
    if (rate.used >= State.DAILY_LIMIT) {
        window.AppleHaptics.notificationError();
        UI.showRateLimitHint(rate.resetAt);
        return;
    }
    if (!text && State.attachments.length === 0) return;
    
    window.AppleHaptics.impactMedium();
    
    if (State.editingMessageWrapper) {
        const targetWrapper = State.editingMessageWrapper;
        State.editingMessageWrapper = null;
        UI.updateModePill(null);
        
        const container = UI.elements.chatContainer;
        const allWrappers = Array.from(container.querySelectorAll('.message-wrapper'));
        const targetIndex = allWrappers.indexOf(targetWrapper);
        
        if (targetIndex >= 0) {
            for (let i = allWrappers.length - 1; i >= targetIndex; i--) {
                allWrappers[i].remove();
            }
            if (!State.isTemporaryChat) {
                const chat = State.chatHistories[State.currentChatIndex];
                if (chat?.messages) {
                    chat.messages = chat.messages.slice(0, targetIndex);
                    this.saveChatHistories();
                }
            }
        }
    } else {
        this.removeUnansweredMessages();
    }
    
    UI.animateSendButton();
    UI.hideWelcomePlaceholder();
    State.isStreaming = true;
    
    const attachmentSnapshot = [...State.attachments];
    
    consumePrompt();
    UI.updateRateLimitUI();
    
    // Instant commit to UI
    UI.addMessageToChat('user', text, null, null, false, attachmentSnapshot);
    
    if (!State.isTemporaryChat) {
        this.addToMessageHistory('user', text, { attachments: attachmentSnapshot });
    }
    
    UI.elements.userInput.value = '';
    UI.elements.userInput.style.height = '';
    localStorage.removeItem(State.DRAFT_KEY);
    State.attachments = [];
    this.renderAttachmentPreviews();
    this.updateInputUI();
    
    State.abortController = new AbortController();
    const signal = State.abortController.signal;
    
    try {
        State.lastRequest = { type: 'chat', prompt: text, attachments: attachmentSnapshot };
        if (State.appMode === 'agent' || State.selectedModelType === 'agent') {
            await this.runAgent(text, attachmentSnapshot, null, signal);
        } else {
            await this.runChat(text, attachmentSnapshot, signal);
        }
    } catch (err) {
        if (err.name !== 'AbortError' && window.UI) {
            window.AppleHaptics.notificationError();
            UI.showNotification(UI.friendlyError ? UI.friendlyError(err) : err.message);
        }
    } finally {
        State.isStreaming = false;
        State.abortController = null;
        this.updateInputUI();
    }
},
async retryMessage(targetWrapper) {
    if (State.isStreaming) return;
    
    const container = UI.elements.chatContainer;
    const allWrappers = Array.from(container.querySelectorAll('.message-wrapper'));
    
    let targetIndex = -1;
    if (targetWrapper && container.contains(targetWrapper)) {
        targetIndex = allWrappers.indexOf(targetWrapper);
    } else {
        for (let i = allWrappers.length - 1; i >= 0; i--) {
            if (allWrappers[i].classList.contains('bot-wrapper') || allWrappers[i].querySelector('.error-card')) {
                targetIndex = i;
                break;
            }
        }
    }
    
    if (targetIndex < 0) {
        targetIndex = allWrappers.length - 1;
    }
    
    if (targetIndex < 0) return;
    
    for (let i = allWrappers.length - 1; i >= targetIndex; i--) {
        allWrappers[i].remove();
    }
    
    if (!State.isTemporaryChat) {
        const chat = State.chatHistories[State.currentChatIndex];
        if (chat && chat.messages) {
            chat.messages = chat.messages.slice(0, targetIndex);
            chat.interactionId = null;
            chat.lastActive = Date.now();
            this.saveChatHistories();
        }
    }
    
    const history = this.getMessageHistory();
    let promptToRetry = '';
    let attachmentsToRetry = [];
    
    if (history.length > 0) {
        const lastMsg = history[history.length - 1];
        if (lastMsg.role === 'user') {
            promptToRetry = getMessageText(lastMsg);
            attachmentsToRetry = lastMsg.attachments || [];
        }
    } else if (State.lastRequest) {
        promptToRetry = State.lastRequest.prompt || '';
        attachmentsToRetry = State.lastRequest.attachments || [];
    }
    
    if (!promptToRetry && attachmentsToRetry.length === 0) return;
    
    State.isStreaming = true;
    State.abortController = new AbortController();
    const signal = State.abortController.signal;
    this.updateInputUI();
    
    try {
        State.lastRequest = { type: 'chat', prompt: promptToRetry, attachments: attachmentsToRetry };
        if (State.appMode === 'agent' || State.selectedModelType === 'agent') {
            await this.runAgent(promptToRetry, attachmentsToRetry, null, signal);
        } else {
            await this.runChat(promptToRetry, attachmentsToRetry, signal);
        }
    } catch (err) {
        if (err.name !== 'AbortError' && window.UI) {
            UI.showNotification(UI.friendlyError ? UI.friendlyError(err) : err.message);
        }
    } finally {
        State.isStreaming = false;
        State.abortController = null;
        this.updateInputUI();
    }
},
// Logic.retryLastAction
retryLastAction() {
    this.retryMessage(null);
},

        // ── Attachment Handling ────────────────────────────────────────────────
async compressImageFile(file, maxDim = 900, quality = 0.78) {
    if (!file.type.startsWith('image/') || file.size < 80_000) return file;

    // Dynamically downscale max dimension on RAM-constrained hardware to avoid OOM crashes
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const isLowEndDevice = memory <= 2 || cores <= 4;
    const targetMaxDim = isLowEndDevice ? Math.min(maxDim, 720) : maxDim;

    const legacyCompress = (f, maxD, qual, resolveFn) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(f);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const scale = Math.min(1, maxD / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(
                blob => {
                    canvas.width = 0; canvas.height = 0; // Immediate memory cleanup
                    if (!blob) { resolveFn(f); return; }
                    resolveFn(new File([blob], f.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                },
                'image/jpeg', qual
            );
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); resolveFn(f); };
        img.src = objectUrl;
    };

    return new Promise((resolve) => {
        if (typeof createImageBitmap === 'function') {
            createImageBitmap(file)
                .then(bitmap => {
                    const scale = Math.min(1, targetMaxDim / Math.max(bitmap.width, bitmap.height));
                    const targetW = Math.round(bitmap.width * scale);
                    const targetH = Math.round(bitmap.height * scale);

                    if (typeof OffscreenCanvas !== 'undefined') {
                        const canvas = new OffscreenCanvas(targetW, targetH);
                        const ctx = canvas.getContext('2d', { alpha: false });
                        ctx.drawImage(bitmap, 0, 0, targetW, targetH);
                        bitmap.close();

                        canvas.convertToBlob({ type: 'image/jpeg', quality })
                            .then(blob => {
                                resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                            })
                            .catch(() => legacyCompress(file, targetMaxDim, quality, resolve));
                    } else {
                        const canvas = document.createElement('canvas');
                        canvas.width = targetW;
                        canvas.height = targetH;
                        const ctx = canvas.getContext('2d', { alpha: false });
                        ctx.drawImage(bitmap, 0, 0, targetW, targetH);
                        bitmap.close();

                        canvas.toBlob(blob => {
                            canvas.width = 0; canvas.height = 0;
                            if (!blob) { resolve(file); return; }
                            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                        }, 'image/jpeg', quality);
                    }
                })
                .catch(() => legacyCompress(file, targetMaxDim, quality, resolve));
        } else {
            legacyCompress(file, targetMaxDim, quality, resolve);
        }
    });
},

        _ATTACH_PER_FILE_LIMIT:    3_500_000,
        _ATTACH_COMBINED_LIMIT:   10_000_000,
async getVideoDetails(file) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        const url = URL.createObjectURL(file);
        video.src = url;
        video.onloadedmetadata = () => {
            const duration = video.duration || 0;
            const mins = Math.floor(duration / 60);
            const secs = Math.floor(duration % 60).toString().padStart(2, '0');
            resolve({
                durationStr: `${mins}:${secs}`,
                previewUrl: url
            });
        };
        video.onerror = () => {
            resolve({ durationStr: '0:00', previewUrl: url });
        };
    });
},

async handleFileSelect(file, type) {
    if (!file) return;
    if (State.selectedModelType === 'agent' && type !== 'image' && type !== 'camera') {
        if (window.UI) UI.showNotification('Only image uploads are allowed in Agent mode');
        return;
    }
    if (State.attachments.length >= 5) {
        if (window.UI) UI.showNotification('Maximum 5 files allowed');
        return;
    }
    
    if (file.size > this._ATTACH_PER_FILE_LIMIT) {
        if (window.UI) UI.showNotification(`File too large (${Math.round(file.size / 1e6)} MB). Maximum is ${Math.round(this._ATTACH_PER_FILE_LIMIT / 1e6)} MB per file.`);
        return;
    }
    
    const currentTotal = State.attachments.reduce((acc, a) => acc + (a.file?.size || 0), 0);
    if (currentTotal + file.size > this._ATTACH_COMBINED_LIMIT) {
        if (window.UI) UI.showNotification(`Total attachments too large. Remove a file before adding more.`);
        return;
    }
    
    UI.elements.actionSheet.classList.remove('show');
    
    const id = Date.now() + Math.random();
    if (file.type.startsWith('video/')) {
        const details = await this.getVideoDetails(file);
        State.attachments.push({ file, type: 'video', previewUrl: details.previewUrl, durationStr: details.durationStr, id });
    } else if (type === 'image' || type === 'camera') {
        const compressed = await this.compressImageFile(file);
        const previewUrl = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(compressed);
        });
        State.attachments.push({ file: compressed, type: 'image', previewUrl, id });
    } else {
        State.attachments.push({ file, type: 'file', previewUrl: null, id });
    }
    
    this.renderAttachmentPreviews();
    this.updateInputUI();
},

        // ── Memory ─────────────────────────────────────────────────────────────
        loadMemories() {
            try {
                State.memories = JSON.parse(localStorage.getItem(State.MEMORIES_KEY) || '[]');
                if (!State.memories.length && this.isMemoryEnabled()) {
                    const legacy = localStorage.getItem('chatMemory');
                    if (legacy?.trim()) this.saveMemory(null, 'Legacy Memory', legacy.trim(), 'fact');
                }
            } catch { State.memories = []; }
        },
        saveMemoriesToStorage() {
            localStorage.setItem(State.MEMORIES_KEY, JSON.stringify(State.memories));
        },
        isMemoryEnabled() {
            return localStorage.getItem('cohana_memory_enabled') !== 'false';
        },
saveMemory(id, title, content, type = 'fact') {
    if (State.isTemporaryChat || !this.isMemoryEnabled()) return;
    
    const cleanTitle = title || 'User Preference / Fact';
    const cleanContent = content || '';
    
    if (id) {
        const idx = State.memories.findIndex(m => m.id === id);
        if (idx > -1) {
            State.memories[idx] = {
                ...State.memories[idx],
                title: cleanTitle,
                content: cleanContent,
                type,
                updatedAt: Date.now()
            };
        } else {
            State.memories.unshift({
                id,
                title: cleanTitle,
                content: cleanContent,
                type,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        }
    } else {
        State.memories.unshift({
            id: 'mem-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            title: cleanTitle,
            content: cleanContent,
            type,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    }
    
    if (State.memories.length > 50) State.memories = State.memories.slice(0, 50);
    this.saveMemoriesToStorage();
},
        deleteMemory(id) {
            const mem = State.memories.find(m => m.id === id);
            if (!mem) return;
            const orig = [...State.memories];
            State.memories = State.memories.filter(m => m.id !== id);
            this.saveMemoriesToStorage();
            UI.showUndoToast({ message: `Deleted "${mem.title}"`, onUndo: () => { this.undoDeleteMemory(orig); } });
        },
        undoDeleteMemory(orig) {
            State.memories = orig;
            this.saveMemoriesToStorage();
            if (this.isMemoryEnabled() && window.UI?.renderMemoryDropdown) UI.renderMemoryDropdown();
        },
        clearAllMemories() {
            State.memories = [];
            State.memoryToEdit = null;
            localStorage.removeItem('chatMemory');
            this.saveMemoriesToStorage();
            if (window.UI?.renderMemoryDropdown) UI.renderMemoryDropdown([]);
        },
        filterMemories(q) {
            if (!q) return State.memories;
            const lq = q.toLowerCase();
            return State.memories.filter(m => (m.title || '').toLowerCase().includes(lq) || (m.content || '').toLowerCase().includes(lq));
        },
        getEffectiveMemory() {
            if (!this.isMemoryEnabled()) return '';
            return State.memories.map(m => `[${String(m.type || 'fact').toUpperCase()}] ${m.content}`).join('\n\n');
        },
        renderMemoryUI() {
            if (window.UI?.renderMemoryDropdown) UI.renderMemoryDropdown();
        },
        // ── History ────────────────────────────────────────────────────────────
async loadChatHistories() {
    try {
        const db = await getChatDB();
        const tx = db.transaction('chats', 'readonly');
        const req = tx.objectStore('chats').get('active_histories');
        
        const dbResult = await new Promise((resolve) => {
            req.onsuccess = () => resolve(req.result?.data || null);
            req.onerror = () => resolve(null);
        });
        
        if (Array.isArray(dbResult)) {
            State.chatHistories = dbResult;
        } else {
            try {
                const legacy = JSON.parse(localStorage.getItem('chatHistories') || '[]');
                if (Array.isArray(legacy) && legacy.length > 0) {
                    State.chatHistories = legacy;
                    await this.saveChatHistories();
                } else {
                    State.chatHistories = [];
                }
            } catch {
                State.chatHistories = [];
            }
        }
    } catch (err) {
        console.warn('Failed to load chat histories from IndexedDB, falling back to localStorage', err);
        try {
            State.chatHistories = JSON.parse(localStorage.getItem('chatHistories') || '[]');
        } catch {
            State.chatHistories = [];
        }
    }
    
    if (!Array.isArray(State.chatHistories)) {
        State.chatHistories = [];
    }
    
    try {
        State.currentChatIndex = parseInt(localStorage.getItem('currentChatIndex') || '0', 10);
    } catch {
        State.currentChatIndex = 0;
    }
    
    if (!State.chatHistories.length) {
        State.chatHistories.push({
            title: 'New Chat',
            messages: [],
            projectId: null,
            lastActive: Date.now()
        });
        State.currentChatIndex = 0;
    }
},
async saveChatHistories() {
    if (State.isTemporaryChat) return;
    
    try {
        localStorage.setItem('currentChatIndex', State.currentChatIndex);
    } catch (e) {
        console.error('Failed to save currentChatIndex to localStorage', e);
    }
    
    if (this._saveStorageTimer) {
        clearTimeout(this._saveStorageTimer);
    }
    
    // Debounce IndexedDB writes to idle periods to keep animation frame rates solid
    this._saveStorageTimer = setTimeout(async () => {
        const executeWrite = async () => {
            try {
                const db = await getChatDB();
                const tx = db.transaction('chats', 'readwrite');
                tx.objectStore('chats').put({ id: 'active_histories', data: State.chatHistories });
                
                await new Promise((resolve, reject) => {
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                });
            } catch (err) {
                console.error('Failed to write chat histories to IndexedDB, falling back to localStorage', err);
                try {
                    localStorage.setItem('chatHistories', JSON.stringify(State.chatHistories));
                } catch (e) {
                    console.error('LocalStorage write fallback failed', e);
                }
            }
        };
        
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => executeWrite(), { timeout: 1000 });
        } else {
            executeWrite();
        }
    }, 300);
},

extractSourcesFromMessage(msg) {
    const text = typeof msg.parts?.[0]?.text === 'string' ? msg.parts[0].text : '';
    return Logic.extractSources(text, msg.citations, msg.groundingChunks);
},

addToMessageHistory(role, content, meta = {}) {
    if (State.isTemporaryChat) return;
    const chat = State.chatHistories[State.currentChatIndex];
    if (!chat) return;
    if (role === 'user' && !chat.messages.length && content.trim()) chat.title = content.trim().substring(0,40) + (content.length>40?'...':'');
    const entry = { role: role === 'assistant' ? 'model' : 'user', parts: [{ text: content }] };
    if (meta.imageUrl)      entry.imageUrl      = meta.imageUrl;
    if (meta.fileName)      entry.fileName      = meta.fileName;
    if (meta.attachments)   entry.attachments   = meta.attachments;
    if (meta.thoughts)      entry.thoughts      = meta.thoughts;
    if (meta.citations)     entry.citations     = meta.citations;
    if (meta.groundingChunks) entry.groundingChunks = meta.groundingChunks;
    
    Object.keys(meta).forEach(key => {
        if (!(key in entry)) {
            entry[key] = meta[key];
        }
    });
    
    chat.messages.push(entry); chat.lastActive = Date.now();
    this.saveChatHistories();
    
    // Incremental cache update of the global Sources index
    if (entry.role === 'model') {
        this.addMessageSourcesToCache(entry);
    }
    
    if (State.isPanelOpen) this.renderUnifiedPanel(UI.elements.panelSearchInput.value);
},
addMessageSourcesToCache(msg) {
    if (msg.role !== 'model') return;
    const extracted = this.extractSourcesFromMessage(msg);
    extracted.forEach(src => {
        const cleanUri = src.uri.trim();
        const existing = State.currentSourcesList.find(s => s.uri.toLowerCase() === cleanUri.toLowerCase());
        if (!existing) {
            State.currentSourcesList.push({
                title: src.title ? src.title.trim() : '',
                uri: cleanUri
            });
        } else if (!existing.title && src.title) {
            existing.title = src.title.trim();
        }
    });
},
        getMessageHistory() { return State.isTemporaryChat ? [] : (State.chatHistories[State.currentChatIndex]?.messages || []); },
loadChat(index, showNotif = true) {
    this.cancelEditMode();
    this.disableTempChat();
    
    if (index < 0 || index >= State.chatHistories.length) index = 0;
    if (!State.chatHistories.length) {
        this.startNewChat();
        return;
    }
    
    State.currentChatIndex = index;
    const chat = State.chatHistories[index];
    chat.lastActive = Date.now();
    
    State.selectedRepositoryId = chat.repositoryId || null;
    if (window.UI && UI.updateRepoPillUI) {
        UI.updateRepoPillUI(this.getSelectedRepository());
    }
    
    UI.elements.chatContainer.innerHTML = '';
    State.currentSourcesList = [];
    
    const fragment = document.createDocumentFragment();
    if (UI.elements.welcomePlaceholder) {
        fragment.appendChild(UI.elements.welcomePlaceholder);
    }
    
    const messages = this.getMessageHistory();
    
    if (messages.length) {
        UI.hideWelcomePlaceholder();
    } else {
        UI.showWelcomePlaceholder();
        this.updateChips();
    }
    
    UI.elements.chatContainer.appendChild(fragment);
    
    messages.forEach(msg => {
        const role = msg.role === 'model' ? 'bot' : 'user';
        const atts = msg.attachments ? msg.attachments.map(a => ({
            type: a.type,
            file: a.name ? { name: a.name } : null,
            previewUrl: a.previewUrl
        })) : null;
        
        if (role === 'bot') {
            this.addMessageSourcesToCache(msg);
        }
        
        UI.addMessageToChat(role, getMessageText(msg), msg.imageUrl || null, msg.fileName || null, true, atts);
        if (role === 'bot' && msg.thoughts) {
            UI.updateLastBotMessage(msg.thoughts, 'thought');
            UI.finishThoughtAnimation();
        }
        if (role === 'bot' && msg.citations?.length) {
            UI.renderCitations(msg.citations);
        }
        if (role === 'bot' && msg.groundingChunks?.length) {
            UI.renderGroundingCitations(msg.groundingChunks);
        }
    });
    
    this.saveChatHistories();
    this.togglePanel(false);
},
updateChips() {
    if (this.getMessageHistory().length > 0) { if (window.UI) return; }
},

        // ── Input UI ──────────────────────────────────────────────────────────
        updateInputUI() {
            const hasText = UI.elements.userInput.value.trim().length > 0;
            UI.updateInputButtons(hasText, State.attachments.length > 0, false, State.isStreaming);
        },
        restoreDraft() {
            const draft = localStorage.getItem(State.DRAFT_KEY);
            if (draft) { UI.elements.userInput.value = draft; UI.elements.userInput.dispatchEvent(new Event('input')); UI.showDraftRestoredHint(); UI.autoResizeInput(); }
        },

handleContextEdit(instruction) {
    if (State.isTemporaryChat) return;
    const chat = State.chatHistories[State.currentChatIndex];
    if (!chat || chat.messages.length <= 4) return;
    const beforeCount = chat.messages.length;
    if (instruction.action === 'summarize_old' && instruction.summary) {
        const recent = chat.messages.slice(-4);
        const summaryMsg = {
            role: 'model',
            parts: [{ text: `_[Context Compressed to prevent rot]: ${instruction.summary}_` }]
        };
        chat.messages = [summaryMsg, ...recent];
    }
    else if (instruction.action === 'clear_tool_results') {
        const recent = chat.messages.slice(-2);
        const older = chat.messages.slice(0, -2).map(msg => {
            const cleanMsg = { ...msg };
            delete cleanMsg.groundingChunks;
            delete cleanMsg.citations;
            delete cleanMsg.imageUrl;
            return cleanMsg;
        });
        chat.messages = [...older, ...recent];
    }
    else if (instruction.action === 'remove_turns') {
        const cutoff = Math.floor(chat.messages.length / 2);
        chat.messages = chat.messages.slice(cutoff);
    }
    if (chat.messages.length < beforeCount || instruction.action === 'clear_tool_results') {
        this.saveChatHistories();
    }
},
checkOnboarding() {
    if (!localStorage.getItem('cohana_visited')) {
        if (window.UI && UI.renderOnboarding) UI.renderOnboarding();
        const modal = UI.elements.onboardingModal;
        const sheet = document.getElementById('onboardingSlideSheet');
        if (modal) {
            modal.style.display = 'flex';
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                if (sheet) sheet.classList.add('show');
            });
        }
    } else if (State.shouldShowWhatsNew) {
        this.showWhatsNewModal();
    } else {
        if (UI.elements.onboardingModal) {
            UI.elements.onboardingModal.style.display = 'none';
        }
    }
},
        
    }
Logic.extractSources = (text, citations, groundingChunks) => {
    const sources = [];
    if (!text) return sources;
    
    const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;
    let match;
    while ((match = mdLinkRegex.exec(text)) !== null) {
        if (!sources.some(s => s.uri === match[2])) {
            sources.push({ title: match[1], uri: match[2] });
        }
    }
    
    const urlRegex = /(https?:\/\/[^\s$.?#].[^\s]*)/gi;
    const plainMatches = text.match(urlRegex);
    if (plainMatches) {
        plainMatches.forEach(url => {
            const cleanUrl = url.replace(/[).,;:]+$/, '');
            if (!sources.some(s => s.uri === cleanUrl)) {
                sources.push({ title: '', uri: cleanUrl });
            }
        });
    }
    
    if (Array.isArray(citations)) {
        citations.forEach(c => {
            if (c.uri && !sources.some(s => s.uri === c.uri)) {
                sources.push({ title: c.title || '', uri: c.uri });
            }
        });
    }
    
    if (Array.isArray(groundingChunks)) {
        groundingChunks.forEach(chunk => {
            if (chunk.web) {
                if (!sources.some(s => s.uri === chunk.web.uri)) {
                    sources.push({ title: chunk.web.title || '', uri: chunk.web.uri });
                }
            } else if (chunk.maps) {
                const uri = chunk.maps.googleMapsUri || chunk.maps.uri;
                if (uri && !sources.some(s => s.uri === uri)) {
                    sources.push({ title: chunk.maps.title || 'Google Maps', uri });
                }
            }
        });
    }
    
    return sources;
};
    window.Logic = Logic;
    document.addEventListener('DOMContentLoaded', () => Logic.init());
})();