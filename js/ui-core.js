(function() {
  // -------------------------------------------------------------------------
  // CONSTANTS & STATE
  // -------------------------------------------------------------------------
  const DAILY_LIMIT = 100;
  const RATE_KEY = 'cohana_rate_limit';
  // -------------------------------------------------------------------------
  // TRANSLATIONS SETUP (i18next)
  // -------------------------------------------------------------------------
const translationResources = {
    en: {
        translation: {
            settings: "Settings",
            memories: "Memories",
            searchPlaceholder: "Search...",
            askAnything: "Ask Cohana...",
            history: "History",
            camera: "Camera",
            photos: "Photos",
            files: "Files",
            cancel: "Cancel",
            save: "Save",
            edit: "Edit",
            delete: "Delete",
            rename: "Rename",
            renameChat: "Rename Chat",
            pin: "Pin",
            unpin: "Unpin",
            newVersion: "New version available",
            update: "Update",
            knowledgeSaved: "New knowledge is saved",
            itemDeleted: "Item deleted",
            undo: "Undo",
            editMessage: "Edit Message",
            done: "Done",
            newChat: "New Chat",
            modelOptionInstantTitle: "Instant",
            modelOptionInstantDesc: "Best for daily tasks, homework and multimodal work",
            modelOptionThinkingTitle: "Thinking",
            modelOptionThinkingDesc: "Best for complex, reasoning required work, such as Medicine or Law",
            modelOptionAgentTitle: "Agent",
            modelOptionAgentDesc: "Autonomous Cohana Computer agent with browser & tools",
            welcomeUser: "Hi! What are you interested in?",
            emptyChatStateTitle: "No chats yet",
            emptyChatStateDesc: "Start a chat below",
            customizationTitle: "Customization",
            appLanguageLabel: "App Language",
            appLanguageDescription: "Choose the language used throughout Cohana.",
            liveVoiceLabel: "Live Voice",
            liveVoiceDescription: "Choose the voice model used in Live Voice Mode.",
            copy: "Copy",
            retry: "Retry",
            reasoning: "Reasoning",
            sources: "Sources",
            errConnection: "Connection error — Cohana is already coding to fix it 🛠️",
            errTimeout: "Cohana took too long thinking — please try again",
            errRateLimit: "You've reached today's limit — resets at noon",
            errServer: "Server hiccup — give it a moment and retry",
            errAborted: "Stopped",
            errGeneric: "Something went wrong — tap retry to try again",
            errUpload: "File upload failed — check your connection",
            maxFiles: "Maximum 5 files allowed",
            notWorkingToday: "Sorry, Cohana is not working today!",
            chatButtonText: "Chat"
        }
    },
    
    ru: {
        translation: {
            settings: "Настройки",
            memories: "Воспоминания",
            searchPlaceholder: "Поиск...",
            askAnything: "Спросите Cohana...",
            history: "История",
            camera: "Камера",
            photos: "Фотографии",
            files: "Файлы",
            cancel: "Отмена",
            save: "Сохранить",
            edit: "Изменить",
            delete: "Удалить",
            rename: "Переименовать",
            renameChat: "Переименовать чат",
            pin: "Закрепить",
            unpin: "Открепить",
            uploadFile: "Загрузить постоянный файл",
            saveChanges: "Сохранить изменения",
            chooseIcon: "Выбрать иконку",
            deleteForever: "Удалить навсегда",
            newVersion: "Доступна новая версия",
            update: "Обновить",
            knowledgeSaved: "Новые знания сохранены",
            itemDeleted: "Элемент удалён",
            undo: "Отменить",
            editMessage: "Редактировать сообщение",
            done: "Готово",
            newChat: "Новый чат",
            modelOptionInstantTitle: "Instant",
            modelOptionInstantDesc: "Подходит для повседневных задач, домашней работы и мультимодальных запросов",
            modelOptionThinkingTitle: "Thinking",
            modelOptionThinkingDesc: "Лучше всего подходит для сложной работы, требующей глубоких рассуждений",
            modelOptionAgentTitle: "Agent",
            modelOptionAgentDesc: "Автономный агент Cohana Computer с браузером, планированием и инструментами",
            welcomeUser: "Привет! Что вас интересует?",
            emptyChatStateTitle: "Чатов пока нет",
            emptyChatStateDesc: "Начните чат ниже",
            customizationTitle: "Кастомизация",
            appLanguageLabel: "Язык приложения",
            appLanguageDescription: "Выберите язык приложения Cohana.",
            liveVoiceLabel: "Голос Live режима",
            liveVoiceDescription: "Выберите голос для интерактивного голосового режима.",
            copy: "Копировать",
            retry: "Повторить",
            reasoning: "Рассуждение",
            sources: "Источники",
            errConnection: "Ошибка соединения — Cohana уже пишет исправление 🛠️",
            errTimeout: "Cohana думала слишком долго — попробуйте еще раз",
            errRateLimit: "Вы достигли дневного лимита — сбросится в полдень",
            errServer: "Сбой сервера — подождите и повторите попытку",
            errAborted: "Остановлено",
            errGeneric: "Что-то пошло не так — нажмите «Повторить»",
            errUpload: "Загрузка файла не удалась — проверьте соединение",
            maxFiles: "Максимум 5 файлов",
            notWorkingToday: "Извините, сегодня Cohana не работает!",
            chatButtonText: "Чат"
        }
    },
    
    az: {
        translation: {
            settings: "Parametrlər",
            memories: "Xatirələr",
            searchPlaceholder: "Axtarış...",
            askAnything: "Cohana-dan soruşun...",
            history: "Tarixçə",
            camera: "Kamera",
            photos: "Fotolar",
            files: "Fayllar",
            cancel: "Ləğv et",
            save: "Yadda saxla",
            edit: "Redaktə et",
            delete: "Sil",
            rename: "Adını dəyiş",
            renameChat: "Söhbətin adını dəyiş",
            pin: "Bərkit",
            unpin: "Sərbəst burax",
            uploadFile: "Daimi Fayl Yüklə",
            saveChanges: "Dəyişiklikləri Yadda Saxla",
            chooseIcon: "İkon Seç",
            deleteForever: "Həmişəlik Sil",
            newVersion: "Yeni versiya mövcuddur",
            update: "Yenilə",
            knowledgeSaved: "Yeni bilik yadda saxlanıldı",
            itemDeleted: "Element silindi",
            undo: "Geri al",
            editMessage: "Mesajı Redaktə Et",
            done: "Hazırdır",
            newChat: "Yeni Söhbət",
            modelOptionInstantTitle: "Sürətli",
            modelOptionInstantDesc: "Gündəlik tapşırıqlar, ev tapşırığı və multimodal işlər üçün idealdır",
            modelOptionThinkingTitle: "Düşünən",
            modelOptionThinkingDesc: "Mürəkkəb, analitik və məntiq tələb edən işlər üçün idealdır",
            modelOptionAgentTitle: "Agent",
            modelOptionAgentDesc: "Brauzer, planlaşdırma və alətlərlə avtonom Cohana Computer agenti",
            welcomeUser: "Salam! Sizi nə maraqlandırır?",
            emptyChatStateTitle: "Hələ söhbət yoxdur",
            emptyChatStateDesc: "Aşağıdan söhbətə başlayın",
            customizationTitle: "Fərdiləşdirmə",
            appLanguageLabel: "Tətbiq dili",
            appLanguageDescription: "Cohana tətbiqinin dilini seçin.",
            liveVoiceLabel: "Canlı Səs",
            liveVoiceDescription: "Canlı Səs Rejimi üçün səs modelini seçin.",
            copy: "Kopyala",
            retry: "Yenidən cəhd et",
            reasoning: "Düşünmə prosesi",
            sources: "Mənbələr",
            errConnection: "Bağlantı xətası — Cohana artıq xətanı düzəltməyə çalışır 🛠️",
            errTimeout: "Cohana çox uzun müddət düşündü — zəhmət olmasa yenidən cəhd edin",
            errRateLimit: "Bu günlük limitinizə çatdınız — günorta sıfırlanacaq",
            errServer: "Server xətası — bir az gözləyin və yenidən cəhd edin",
            errAborted: "Dayandırıldı",
            errGeneric: "Xəta baş verdi — yenidən cəhd et düyməsinə toxunun",
            errUpload: "Fayl yüklənməsi uğursuz oldu — bağlantınızı yoxlayın",
            maxFiles: "Maksimum 5 fayla icazə verilir",
            notWorkingToday: "Təəssüf ki, Cohana bu gün işləmir!",
            chatButtonText: "Söhbət"
        }
    }
};
  const savedLanguage = localStorage.getItem('appLanguage') || 'en';
  
  if (typeof i18next !== 'undefined') {
    i18next.init({
      lng: savedLanguage,
      fallbackLng: 'en',
      resources: translationResources
    }, function(err, t) {
      if (!err) {
        window.addEventListener('DOMContentLoaded', () => {
          if (window.UI && window.UI.updateDOMTranslations) {
            window.UI.updateDOMTranslations();
          }
        });
      }
    });
  }
  
  // Global translation helper function
  window.t = function(key) {
    if (typeof i18next !== 'undefined' && i18next.exists(key)) {
      return i18next.t(key);
    }
    return ({
      copy: "Copy",
      retry: "Retry",
      reasoning: "Reasoning",
      sources: "Sources",
      newChat: "New Chat",
      camera: "Camera",
      photos: "Photos",
      files: "Files",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      settings: "Settings",
      memories: "Memories",
      searchPlaceholder: "Search...",
      askAnything: "Ask Cohana...",
      history: "History",
      uploadFile: "Upload Persistent File",
      saveChanges: "Save Changes",
      chooseIcon: "Choose Icon",
      deleteForever: "Delete Forever",
      newVersion: "New version available",
      update: "Update",
      knowledgeSaved: "New knowledge is saved",
      itemDeleted: "Item deleted",
      undo: "Undo",
      editMessage: "Edit Message",
      done: "Done",
      welcomeUser: "Hi! What are you interested in?",
      emptyChatStateTitle: "No chats yet",
      emptyChatStateDesc: "Start a chat below",
      customizationTitle: "Customization",
      appLanguageLabel: "App Language",
      errConnection: "Connection error — Cohana is already coding to fix it 🛠️",
      errTimeout: "Cohana took too long thinking — please try again",
      errRateLimit: "You've reached today's limit — resets at noon",
      errServer: "Server hiccup — give it a moment and retry",
      errAborted: "Stopped",
      errGeneric: "Something went wrong — tap retry to try again",
      errUpload: "File upload failed — check your connection",
      maxFiles: "Maximum 5 files allowed",
      notWorkingToday: "Sorry, Cohana is not working today!",
      chatButtonText: "Chat"
    } [key] || key);
  };
  
  function getRateState() {
    const raw = localStorage.getItem(RATE_KEY);
    if (!raw) return { used: 0 };
    try { return JSON.parse(raw); } catch { return { used: 0 }; }
  }
/**
 * Apple Motion Engine
 * Analytical damped harmonic oscillator conforming to WWDC Designing Fluid Interfaces.
 */
window.AppleMotion = {
    // Exponential momentum projection
    project(velocity, decelerationRate = 0.998) {
        return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
    },
    
    // Progressive resistance rubber-banding
    rubberband(overshoot, dimension = 300, constant = 0.55) {
        return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
    },
    
    // Reads current presentation value from the DOM to eliminate visual jumps on interrupt
    getLivePresentationTranslateY(element) {
        if (!element) return 0;
        const style = window.getComputedStyle(element);
        const transform = style.transform || style.webkitTransform;
        if (!transform || transform === 'none') return 0;
        try {
            const matrix = new DOMMatrixReadOnly(transform);
            return matrix.m42 || matrix.f || 0;
        } catch {
            return 0;
        }
    },
    
    /**
     * Continuous interruptible spring animation
     * @param {Object} opts
     * @param {number} opts.from - Initial position (live on-screen presentation value)
     * @param {number} opts.to - Target rest position
     * @param {number} [opts.velocity=0] - Initial velocity in px/s (inherited from gesture)
     * @param {number} [opts.damping=1.0] - Damping ratio: 1.0 = critically damped, 0.8 = bounce
     * @param {number} [opts.response=0.35] - Response period in seconds
     * @param {Function} opts.onUpdate - Callback invoked each frame with (value)
     * @param {Function} [opts.onComplete] - Callback on settle
     */
    spring({ from, to, velocity = 0, damping = 1.0, response = 0.35, onUpdate, onComplete }) {
        // Accessibility check: instantly jump if user prefers reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            onUpdate(to);
            if (onComplete) onComplete();
            return { stop: () => {} };
        }
        
        const x0 = from - to;
        const v0 = velocity;
        const omega0 = (2 * Math.PI) / Math.max(0.01, response);
        const startTime = performance.now();
        let animId = null;
        let stopped = false;
        
        const tick = (now) => {
            if (stopped) return;
            const t = (now - startTime) / 1000;
            
            let position = 0;
            let currentVelocity = 0;
            
            if (damping === 1.0) {
                // Critically damped (Zero overshoot default)
                const envelope = Math.exp(-omega0 * t);
                const c1 = x0;
                const c2 = v0 + omega0 * x0;
                position = (c1 + c2 * t) * envelope;
                currentVelocity = (c2 - omega0 * (c1 + c2 * t)) * envelope;
            } else if (damping < 1.0) {
                // Underdamped (Physical momentum flick / throw)
                const omegaD = omega0 * Math.sqrt(1 - damping * damping);
                const envelope = Math.exp(-damping * omega0 * t);
                const c1 = x0;
                const c2 = (v0 + damping * omega0 * x0) / omegaD;
                const cosVal = Math.cos(omegaD * t);
                const sinVal = Math.sin(omegaD * t);
                position = envelope * (c1 * cosVal + c2 * sinVal);
                currentVelocity = envelope * ((-damping * omega0 * (c1 * cosVal + c2 * sinVal)) +
                    (omegaD * (-c1 * sinVal + c2 * cosVal)));
            } else {
                // Overdamped
                const gamma1 = omega0 * (-damping + Math.sqrt(damping * damping - 1));
                const gamma2 = omega0 * (-damping - Math.sqrt(damping * damping - 1));
                const c2 = (v0 - gamma1 * x0) / (gamma2 - gamma1);
                const c1 = x0 - c2;
                position = c1 * Math.exp(gamma1 * t) + c2 * Math.exp(gamma2 * t);
                currentVelocity = c1 * gamma1 * Math.exp(gamma1 * t) + c2 * gamma2 * Math.exp(gamma2 * t);
            }
            
            const currentActual = to + position;
            onUpdate(currentActual);
            
            // Settle threshold check: within 0.25px and moving slower than 5px/s
            if (Math.abs(position) < 0.25 && Math.abs(currentVelocity) < 5.0) {
                onUpdate(to);
                if (onComplete) onComplete();
            } else {
                animId = requestAnimationFrame(tick);
            }
        };
        
        animId = requestAnimationFrame(tick);
        
        return {
            stop: () => {
                stopped = true;
                if (animId) cancelAnimationFrame(animId);
            }
        };
    }
};

/**
 * Apple Haptics Engine
 * Provides precise physical causality aligned with visual frames.
 */
window.AppleHaptics = {
    selection() {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    },
    impactLight() {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
        }
    },
    impactMedium() {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(28);
        }
    },
    impactHeavy() {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(45);
        }
    },
    notificationSuccess() {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([12, 40, 18]);
        }
    },
    notificationError() {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([30, 50, 30, 50, 40]);
        }
    }
};
  // -------------------------------------------------------------------------
  // DOM ELEMENTS CACHE
  // -------------------------------------------------------------------------
const elements = {
    topBar: document.getElementById('topBar'),
    panelToggleBtn: document.getElementById('panelToggleBtn'),
    topActionsContainer: document.getElementById('topActionsContainer'),
    tempChatBtn: document.getElementById('tempChatBtn'),
    topSettingsBtn: document.getElementById('topSettingsBtn'),
    modeSelectorBtn: document.getElementById('modeSelectorBtn'),
    modeDropdownMenu: document.getElementById('modeDropdownMenu'),
    currentModeLabel: document.getElementById('currentModeLabel'),
    modeItemChat: document.getElementById('modeItemChat'),
    modeItemAgent: document.getElementById('modeItemAgent'),
    reasoningEffortBtn: document.getElementById('reasoningEffortBtn'),
    dismissUpdateBtn: document.getElementById('dismissUpdateBtn'),
    atMentionPopup: document.getElementById('atMentionPopup'),
    atMentionList: document.getElementById('atMentionList'),
    reasoningEffortPopup: document.getElementById('reasoningEffortPopup'),
    slideLeftPanel: document.getElementById('slideLeftPanel'),
    panelCloseBtn: document.getElementById('panelCloseBtn'),
    panelSearchInput: document.getElementById('panelSearchInput'),
    panelNewChatBtn: document.getElementById('panelNewChatBtn'),
    panelChatsList: document.getElementById('panelChatsList'),
    chatContainer: document.getElementById('chatContainer'),
    userInput: document.getElementById('userInput'),
    sendButton: document.getElementById('sendButton'),
    stopButton: document.getElementById('stopButton'),
    inputContainer: document.getElementById('inputContainer'),
    inputAssetsRow: document.getElementById('inputAssetsRow'),
    previewArea: document.getElementById('previewArea'),
    plusButton: document.getElementById('plusButton'),
    audioInputButton: document.getElementById('audioInputButton'),
    voiceNavButton: document.getElementById('voiceNavButton'),
    voiceModeButton: document.getElementById('voiceNavButton'),
    expandInputBtn: document.getElementById('expandInputBtn'),
    scrollToBottomBtn: document.getElementById('scrollToBottomBtn'),
    activeModePill: document.getElementById('activeModePill'),
    topNotification: document.getElementById('topNotification'),
    undoToast: document.getElementById('undoToast'),
    undoBtn: document.getElementById('undoBtn'),
    updateNotification: document.getElementById('updateNotification'),
    updateAppBtn: document.getElementById('updateAppBtn'),
    cameraInput: document.getElementById('cameraInput'),
    galleryInput: document.getElementById('galleryInput'),
    fileInput: document.getElementById('fileInput'),
    actionSheet: document.getElementById('actionSheet'),
    sheetBackdrop: document.getElementById('sheetBackdrop'),
    sheetDragHandle: document.querySelector('.drag-handle'),
    sheetButtons: {
        camera: document.getElementById('sheetCameraBtn'),
        photos: document.getElementById('sheetPhotosBtn'),
        files: document.getElementById('sheetFilesBtn'),
    },
    slideInSettingsPanel: document.getElementById('slideInSettingsPanel'),
    closeSettingsButton: document.getElementById('closeSettingsButton'),
    settingsNavButtons: document.querySelectorAll('.panel-nav-button'),
    settingsSections: document.querySelectorAll('.settings-section'),
    autoVoiceToggle: document.getElementById('cohanaAutoVoiceToggle'),
    memoryToggle: document.getElementById('cohanaMemoryToggle'),
    memoryControls: document.getElementById('cohanaMemoryControls'),
    memoryDropdownTrigger: document.getElementById('cohanaMemoryDropdownTrigger'),
    memoryDropdownList: document.getElementById('cohanaMemoryDropdownList'),
    memoryCount: document.getElementById('cohanaMemoryCount'),
    memoryInfoButton: document.getElementById('cohanaMemoryInfoButton'),
    deleteAllMemoryButton: document.getElementById('cohanaDeleteAllMemoryButton'),
    welcomePlaceholder: document.getElementById('welcomePlaceholder'),
    welcomeText: document.getElementById('welcomeText'),
    welcomeIcon: document.getElementById('welcomeIcon'),
    onboardingModal: document.getElementById('onboardingModal'),
    fullInputModal: document.getElementById('fullInputModal'),
    fullInputTextarea: document.getElementById('fullInputTextarea'),
    closeFullInput: document.getElementById('closeFullInput')
};
  
  // Initialize UI Namespace
  window.UI = window.UI || {};
  
  // -------------------------------------------------------------------------
  // CORE UI METHODS
  // -------------------------------------------------------------------------
  Object.assign(window.UI, {
    elements,
init() {
    // Refresh cached elements to ensure dynamic elements are registered
    this.elements.locationToggle = document.getElementById('cohanaLocationToggle');
    this.elements.autoVoiceToggle = document.getElementById('cohanaAutoVoiceToggle');
    this.elements.memoryToggle = document.getElementById('cohanaMemoryToggle');
    this.elements.modeSelectorBtn = document.getElementById('modeSelectorBtn');
    this.elements.modeDropdownMenu = document.getElementById('modeDropdownMenu');
    this.elements.currentModeLabel = document.getElementById('currentModeLabel');
    this.elements.modeItemChat = document.getElementById('modeItemChat');
    this.elements.modeItemAgent = document.getElementById('modeItemAgent');
    this.elements.reasoningEffortBtn = document.getElementById('reasoningEffortBtn');
    this.elements.reasoningEffortPopup = document.getElementById('reasoningEffortPopup');
    this.elements.inputRepoRow = document.getElementById('inputRepoRow');
    this.elements.repoSelectorBtn = document.getElementById('repoSelectorBtn');
    this.elements.repoSelectorLabel = document.getElementById('repoSelectorLabel');
    this.elements.updateNotification = document.getElementById('updateNotification');
    this.elements.updateAppBtn = document.getElementById('updateAppBtn');
    this.elements.dismissUpdateBtn = document.getElementById('dismissUpdateBtn');
    
    this.bindGlobalEvents();
    this.setupSettingsControls();
    this.renderOnboarding();
    this.injectStyles();
    this.initTopModeSelector();
    this.initModelSelector();
    this.initRepoModal();
    this.initAtMentionPopup();
    this.initUpdateNotification();
    this.updateModePill(null);
    this.setupSearchPopupElements();
    this.initCustomCamera();
    this.initPluginsModal();
    
    const initialModel = (window.State && window.State.selectedModelType) || (window.Logic && window.Logic.State && window.Logic.State.selectedModelType) || 'instant';
    this.updateAttachmentInputsState(initialModel);
    
    if (this.elements.repoSelectorBtn) {
        this.elements.repoSelectorBtn.onclick = (e) => {
            e.stopPropagation();
            this.openRepoModal();
        };
    }
    
    if (!document.getElementById('slideInSourcesPanel')) {
        const sourcesPanelHtml = `
            <div id="slideInSourcesPanel" class="slide-in-panel" style="z-index: 2020; padding: 24px 20px;">
                <div class="drag-handle" style="margin-top: 0; margin-bottom: 20px;"></div>
                <div class="panel-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span class="title" id="sourcesPanelTitle" style="font-size: 26px; font-weight: 700; color: var(--header-color);">Sources</span>
                        <span style="font-size: 13.5px; color: var(--muted-color, #8e8e93); font-weight: 400;">Used throughout this conversation</span>
                    </div>
                    <button id="closeSourcesPanelBtn" class="panel-close-circle-btn" style="position: static !important; width: 44px !important; height: 44px !important; margin: 0 !important; background: rgba(255, 255, 255, 0.08) !important; border-radius: 50% !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #ffffff !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; font-size: 18px !important;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="panel-content" id="sourcesPanelContent" style="width: 100%; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding: 0; box-sizing: border-box;">
                </div>
            </div>
        `;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sourcesPanelHtml;
        document.body.appendChild(tempDiv.firstElementChild);
    }
    
    const closeBtn = document.getElementById('closeSourcesPanelBtn');
    if (closeBtn) {
        closeBtn.onclick = () => UI.closeSourcesPanel();
    }
},
initTopModeSelector() {
    const selectorBtn = document.getElementById('modeSelectorBtn');
    const dropdownMenu = document.getElementById('modeDropdownMenu');
    const modeLabel = document.getElementById('currentModeLabel');
    const chatItem = document.getElementById('modeItemChat');
    const agentItem = document.getElementById('modeItemAgent');
    
    if (!selectorBtn || !dropdownMenu) return;
    
    const setMode = (mode, shouldNotifyLogic = true) => {
        const isAgent = mode === 'agent';
        
        if (modeLabel) {
            modeLabel.textContent = isAgent ? 'Agent' : 'Chat';
        }
        
        if (chatItem) chatItem.classList.toggle('active', !isAgent);
        if (agentItem) agentItem.classList.toggle('active', isAgent);
        
        // Hide or show reasoning effort button
        const effortBtn = document.getElementById('reasoningEffortBtn');
        const effortPopup = document.getElementById('reasoningEffortPopup');
        if (effortBtn) {
            if (isAgent) {
                effortBtn.style.setProperty('display', 'none', 'important');
                if (effortPopup) effortPopup.classList.remove('show');
            } else {
                effortBtn.style.setProperty('display', 'flex', 'important');
            }
        }
        
        dropdownMenu.classList.remove('show');
        selectorBtn.classList.remove('open');
        selectorBtn.setAttribute('aria-expanded', 'false');
        
        if (shouldNotifyLogic && window.Logic && window.Logic.setAppMode) {
            window.Logic.setAppMode(mode);
        } else if (shouldNotifyLogic) {
            if (window.State) {
                window.State.appMode = mode;
                window.State.selectedModelType = isAgent ? 'agent' : (window.State.chatReasoningEffort || 'instant');
            }
            if (window.Logic?.State) {
                window.Logic.State.appMode = mode;
                window.Logic.State.selectedModelType = isAgent ? 'agent' : (window.Logic.State.chatReasoningEffort || 'instant');
            }
            if (typeof this.updateAttachmentInputsState === 'function') {
                this.updateAttachmentInputsState(isAgent ? 'agent' : 'instant');
            }
        }
    };
    
    selectorBtn.onclick = (e) => {
        e.stopPropagation();
        const isOpen = dropdownMenu.classList.toggle('show');
        selectorBtn.classList.toggle('open', isOpen);
        selectorBtn.setAttribute('aria-expanded', String(isOpen));
        
        // Close reasoning popup if open
        const effortPopup = document.getElementById('reasoningEffortPopup');
        if (effortPopup) effortPopup.classList.remove('show');
    };
    
    if (chatItem) {
        chatItem.onclick = (e) => {
            e.stopPropagation();
            setMode('chat');
        };
    }
    
    if (agentItem) {
        agentItem.onclick = (e) => {
            e.stopPropagation();
            setMode('agent');
        };
    }
    
    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && e.target !== selectorBtn && !selectorBtn.contains(e.target)) {
            dropdownMenu.classList.remove('show');
            selectorBtn.classList.remove('open');
            selectorBtn.setAttribute('aria-expanded', 'false');
        }
    });
    
    // Initial sync
    const currentModel = (window.State && window.State.selectedModelType) || (window.Logic?.State?.selectedModelType) || 'instant';
    setMode(currentModel === 'agent' ? 'agent' : 'chat', false);
},
    hideLoader() {
            const loader = document.getElementById('appLoader');
            if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 400); }
        },
    bindGlobalEvents() {
          this.setupPanelDragGestures();
          this.setupVoiceRedirectHandler();
        },
    updateDOMTranslations() {
  if (typeof i18next === 'undefined') return;
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18next.exists(key)) {
      el.textContent = i18next.t(key);
    }
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18next.exists(key)) {
      el.setAttribute('placeholder', i18next.t(key));
    }
  });
  
  const modelOptionInstantTitle = document.querySelector('.model-option[data-model="instant"] .model-option-title');
  const modelOptionInstantDesc = document.querySelector('.model-option[data-model="instant"] .model-option-desc');
  if (modelOptionInstantTitle) modelOptionInstantTitle.textContent = i18next.t('modelOptionInstantTitle');
  if (modelOptionInstantDesc) modelOptionInstantDesc.textContent = i18next.t('modelOptionInstantDesc');
  
  const modelOptionThinkingTitle = document.querySelector('.model-option[data-model="thinking"] .model-option-title');
  const modelOptionThinkingDesc = document.querySelector('.model-option[data-model="thinking"] .model-option-desc');
  if (modelOptionThinkingTitle) modelOptionThinkingTitle.textContent = i18next.t('modelOptionThinkingTitle');
  if (modelOptionThinkingDesc) modelOptionThinkingDesc.textContent = i18next.t('modelOptionThinkingDesc');
  
  const modelOptionAgentTitle = document.querySelector('.model-option[data-model="agent"] .model-option-title');
  const modelOptionAgentDesc = document.querySelector('.model-option[data-model="agent"] .model-option-desc');
  if (modelOptionAgentTitle) modelOptionAgentTitle.textContent = i18next.t('modelOptionAgentTitle');
  if (modelOptionAgentDesc) modelOptionAgentDesc.textContent = i18next.t('modelOptionAgentDesc');
  
  const updateBarTitle = document.querySelector('#updateNotification .update-text span');
  const updateBarBtn = document.querySelector('#updateAppBtn');
  if (updateBarTitle) updateBarTitle.textContent = i18next.t('newVersion');
  if (updateBarBtn) updateBarBtn.textContent = i18next.t('update');
  
  const activeModelLabel = document.getElementById('activeModelLabel');
  if (activeModelLabel) {
    const selectedModel = (window.State && window.State.selectedModelType) ||
      (window.Logic && window.Logic.State && window.Logic.State.selectedModelType) || 'instant';
    if (selectedModel === 'instant') activeModelLabel.textContent = i18next.t('modelOptionInstantTitle');
    else if (selectedModel === 'thinking') activeModelLabel.textContent = i18next.t('modelOptionThinkingTitle');
    else if (selectedModel === 'agent') activeModelLabel.textContent = i18next.t('modelOptionAgentTitle');
  }
},
initUpdateNotification() {
        const card = document.getElementById('updateNotification');
        const updateBtn = document.getElementById('updateAppBtn');
        const dismissBtn = document.getElementById('dismissUpdateBtn');
        
        if (dismissBtn) {
            dismissBtn.onclick = (e) => {
                e.stopPropagation();
                window.AppleHaptics?.impactLight();
                this.hideUpdateNotification();
                if (window.Logic?.dismissUpdate) window.Logic.dismissUpdate();
            };
        }
        
        if (updateBtn) {
            updateBtn.onclick = (e) => {
                e.stopPropagation();
                window.AppleHaptics?.notificationSuccess();
                this.hideUpdateNotification();
                
                if (window.newWorker) {
                    window.newWorker.postMessage({ action: 'skipWaiting' });
                } else if (window.Logic?.dismissUpdate) {
                    window.Logic.dismissUpdate();
                    window.location.reload();
                }
            };
        }
    },
    
    showUpdateNotification(details = {}) {
        const card = document.getElementById('updateNotification');
        if (!card) return;
        
        const titleEl = document.getElementById('updateNotificationTitle');
        const badgeEl = document.getElementById('updateNotificationBadge');
        const descEl = document.getElementById('updateNotificationDesc');
        
        if (titleEl && details.title) titleEl.textContent = details.title;
        if (badgeEl && details.version) badgeEl.textContent = `v${details.version}`;
        if (descEl && details.description) descEl.textContent = details.description;
        
        card.classList.add('show');
        window.AppleHaptics?.impactLight();
    },
    
    hideUpdateNotification() {
        const card = document.getElementById('updateNotification');
        if (card) {
            card.classList.remove('show');
        }
    },
injectStyles() {
    if (document.getElementById('ui-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'ui-injected-styles';
    style.textContent = `
    :root {
        --spring-transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        --fluid-ease: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        --neural-glow-blue: 0 0 25px rgba(52, 134, 235, 0.25);
        --neural-glow-orange: 0 0 25px rgba(255, 126, 95, 0.25);
        --premium-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    /* ── Apple-Grade Mode-Aware @ Mention Autocomplete Popup ── */
    .at-mention-popup {
        position: absolute;
        bottom: calc(100% + 14px);
        left: 0;
        width: min(380px, 94vw);
        background: rgba(22, 22, 28, 0.90);
        backdrop-filter: blur(40px) saturate(190%);
        -webkit-backdrop-filter: blur(40px) saturate(190%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-top: 1px solid rgba(255, 255, 255, 0.22); /* Specular Rim Light */
        border-radius: 26px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.12);
        padding: 10px 8px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 2600;
        opacity: 0;
        pointer-events: none;
        transform: translateY(12px) scale(0.94);
        transform-origin: bottom left;
        transition: transform 0.26s cubic-bezier(0.18, 0.89, 0.32, 1.15), opacity 0.2s ease;
        user-select: none;
        -webkit-user-select: none;
    }

    .at-mention-popup.show {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
    }

    .at-mention-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 10px 8px 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        margin-bottom: 2px;
    }

    .at-mention-mode-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.5);
    }

    .at-mention-mode-pill .mode-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--active-blue, #3486eb);
        box-shadow: 0 0 8px rgba(52, 134, 235, 0.6);
    }

    .at-mention-hint {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.35);
        font-weight: 500;
    }

    .at-mention-list {
        display: flex;
        flex-direction: column;
        gap: 3px;
        max-height: 240px;
        overflow-y: auto;
        scrollbar-width: none;
        overscroll-behavior: contain;
    }

    .at-mention-list::-webkit-scrollbar {
        display: none;
    }

    .at-mention-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        border-radius: 18px;
        background: transparent;
        cursor: pointer;
        transition: background-color 0.15s ease, transform 0.08s ease;
        box-sizing: border-box;
    }

    .at-mention-item:hover,
    .at-mention-item.selected {
        background: rgba(255, 255, 255, 0.09);
    }

    .at-mention-item:active {
        transform: scale(0.97);
        background: rgba(255, 255, 255, 0.14);
    }

    .at-mention-icon-wrap {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .at-mention-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
    }

    .at-mention-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .at-mention-handle {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif;
        font-size: 14.5px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.01em;
    }

    .at-mention-name {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        font-weight: 500;
    }

    .at-mention-desc {
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.45);
        line-height: 1.35;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .at-mention-empty {
        padding: 20px 14px;
        text-align: center;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.45);
        font-weight: 500;
    }

    /* ── Apple-Grade Minimalist Redesigned Update Notification ── */
    .apple-update-card {
        position: fixed;
        bottom: calc(var(--bottom-bar-height, 120px) + 16px);
        left: 50%;
        transform: translateX(-50%) translateY(24px) scale(0.94);
        width: min(520px, calc(100vw - 32px));
        background: rgba(24, 24, 28, 0.88);
        backdrop-filter: blur(40px) saturate(190%);
        -webkit-backdrop-filter: blur(40px) saturate(190%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-top: 1px solid rgba(255, 255, 255, 0.25); /* Specular Rim Light */
        border-radius: 28px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.14);
        padding: 14px 16px 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        z-index: 2200;
        box-sizing: border-box;
        opacity: 0;
        pointer-events: none;
        transition: transform 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.15), opacity 0.25s ease, bottom 0.25s ease;
        user-select: none;
        -webkit-user-select: none;
    }

    .apple-update-card.show {
        transform: translateX(-50%) translateY(0) scale(1);
        opacity: 1;
        pointer-events: auto;
    }

    .apple-update-main {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
        flex: 1;
    }

    .apple-update-icon-box {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(52, 134, 235, 0.22) 0%, rgba(37, 117, 252, 0.12) 100%);
        border: 1px solid rgba(52, 134, 235, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #3486eb;
        font-size: 18px;
        flex-shrink: 0;
        box-shadow: 0 4px 14px rgba(52, 134, 235, 0.25);
    }

    .apple-update-details {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
        flex: 1;
    }

    .apple-update-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .apple-update-title {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
        font-size: 15px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.015em;
        line-height: 1.25;
    }

    .apple-update-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 8px;
        background: rgba(52, 134, 235, 0.16);
        color: #3486eb;
        border: 1px solid rgba(52, 134, 235, 0.3);
        letter-spacing: 0.02em;
    }

    .apple-update-desc {
        font-size: 12.5px;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.62);
        letter-spacing: -0.005em;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .apple-update-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
    }

    .apple-update-btn-primary {
        background: #ffffff;
        color: #000000;
        border: none;
        border-radius: 9999px;
        padding: 0 16px;
        height: 38px;
        font-size: 13.5px;
        font-weight: 600;
        letter-spacing: -0.01em;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        transition: transform 0.12s ease, background-color 0.15s ease;
        outline: none;
        font-family: inherit;
        box-shadow: 0 4px 14px rgba(255, 255, 255, 0.2);
    }

    .apple-update-btn-primary:hover {
        background: #f0f0f5;
        transform: scale(1.02);
    }

    .apple-update-btn-primary:active {
        transform: scale(0.95);
    }

    .apple-update-btn-close {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.09);
        color: rgba(255, 255, 255, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        outline: none;
        transition: all 0.15s ease;
        flex-shrink: 0;
        font-size: 13px;
    }

    .apple-update-btn-close:hover {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
    }

    .apple-update-btn-close:active {
        transform: scale(0.92);
    }

    @media (max-width: 600px) {
        .apple-update-card {
            flex-direction: column;
            align-items: stretch;
            padding: 16px;
            gap: 14px;
        }
        .apple-update-actions {
            justify-content: flex-end;
        }
        .apple-update-btn-primary {
            flex: 1;
            justify-content: center;
        }
    }
    /* ── Repository Row & Capsule (1:1 Layout Match) ── */
    .input-repo-row {
        display: flex;
        align-items: center;
        margin-top: 6px;
        margin-bottom: 2px;
        width: 100%;
    }

    .repo-selector-pill {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 9999px;
        padding: 5px 14px;
        font-size: 13.5px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.85);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        outline: none;
        transition: all 0.2s ease;
        font-family: inherit;
        user-select: none;
        -webkit-user-select: none;
    }

    .repo-selector-pill:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.2);
    }

    .repo-selector-pill:active {
        transform: scale(0.95);
    }

    .repo-selector-pill.active {
        background: rgba(52, 134, 235, 0.18);
        border-color: rgba(52, 134, 235, 0.45);
        color: #ffffff;
    }

    /* ── Repository Modal & Sheet ── */
    .repo-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 3300;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(28px) saturate(180%);
        -webkit-backdrop-filter: blur(28px) saturate(180%);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .repo-modal-overlay.show {
        opacity: 1;
        pointer-events: auto;
    }

    .repo-modal-card {
        width: 100%;
        max-width: 580px;
        max-height: 85vh;
        background: rgba(24, 24, 28, 0.9);
        backdrop-filter: blur(50px) saturate(200%);
        -webkit-backdrop-filter: blur(50px) saturate(200%);
        border-top-left-radius: 36px;
        border-top-right-radius: 36px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-bottom: none;
        padding: 12px 24px 34px 24px;
        box-sizing: border-box;
        transform: translateY(100%);
        transition: transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.15);
        display: flex;
        flex-direction: column;
        color: #ffffff;
        font-family: var(--font-family-sans);
        box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.7);
    }

    .repo-modal-card.show {
        transform: translateY(0);
    }

    @media (min-width: 768px) {
        .repo-modal-overlay {
            align-items: center;
        }
        .repo-modal-card {
            border-radius: 36px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            transform: scale(0.92) translateY(20px);
        }
        .repo-modal-card.show {
            transform: scale(1) translateY(0);
        }
    }

    .repo-modal-handle {
        width: 44px;
        height: 5px;
        background: rgba(255, 255, 255, 0.25);
        border-radius: 9999px;
        margin: 4px auto 16px auto;
        flex-shrink: 0;
    }

    .repo-modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
    }

    .repo-modal-title {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.025em;
        color: #ffffff;
    }

    .repo-modal-subtitle {
        font-size: 13.5px;
        color: rgba(255, 255, 255, 0.55);
        margin-top: 4px;
    }

    .repo-close-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.09);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        outline: none;
        transition: all 0.16s ease;
    }

    .repo-close-btn:hover {
        background: rgba(255, 255, 255, 0.16);
    }

    .repo-list-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        max-height: 360px;
        padding: 4px 0;
        margin-bottom: 16px;
    }

    .repo-item-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        cursor: pointer;
        transition: all 0.18s ease;
        user-select: none;
        -webkit-user-select: none;
    }

    .repo-item-card:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.16);
    }

    .repo-item-card.holding {
        transform: scale(0.96);
        background: rgba(255, 69, 58, 0.15);
        border-color: rgba(255, 69, 58, 0.35);
    }

    .repo-item-card.selected {
        background: rgba(52, 134, 235, 0.14);
        border-color: rgba(52, 134, 235, 0.45);
    }

    .repo-item-icon {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: #3486eb;
        flex-shrink: 0;
    }

    .repo-item-content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .repo-item-name {
        font-size: 15px;
        font-weight: 600;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .repo-item-url {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: "SF Mono", Menlo, monospace;
    }

    .repo-item-check {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: #3486eb;
        opacity: 0;
        flex-shrink: 0;
    }

    .repo-item-card.selected .repo-item-check {
        opacity: 1;
    }

    .repo-add-toggle-btn {
        width: 100%;
        height: 48px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px dashed rgba(255, 255, 255, 0.16);
        color: #ffffff;
        font-size: 14.5px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s ease;
        outline: none;
    }

    .repo-add-toggle-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.25);
    }

    .repo-add-form {
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 16px;
    }

    .repo-form-input {
        width: 100%;
        height: 44px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        padding: 0 14px;
        color: #ffffff;
        font-size: 14px;
        outline: none;
        box-sizing: border-box;
        font-family: inherit;
        transition: border-color 0.2s ease;
    }

    .repo-form-input:focus {
        border-color: #3486eb;
    }

    .repo-form-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 4px;
    }

    .repo-btn-cancel {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 13.5px;
        font-weight: 600;
        cursor: pointer;
        padding: 8px 14px;
        border-radius: 12px;
    }

    .repo-btn-save {
        background: #3486eb;
        border: none;
        color: #ffffff;
        font-size: 13.5px;
        font-weight: 600;
        cursor: pointer;
        padding: 8px 18px;
        border-radius: 12px;
        transition: transform 0.1s ease;
    }

    .repo-btn-save:active {
        transform: scale(0.96);
    }

    .repo-max-limit-notice {
        font-size: 12.5px;
        color: rgba(255, 255, 255, 0.45);
        text-align: center;
        padding: 6px 0;
    }

    /* ── Repository Badges and Private Repo UI ── */
    .repo-badges-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        flex-wrap: wrap;
    }

    .repo-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 6px;
        letter-spacing: -0.01em;
    }

    .repo-badge-env {
        background: rgba(48, 209, 88, 0.12);
        color: #30d158;
        border: 1px solid rgba(48, 209, 88, 0.25);
    }

    .repo-badge-new {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.09);
    }

    .repo-badge-private {
        background: rgba(255, 159, 10, 0.12);
        color: #ff9f0a;
        border: 1px solid rgba(255, 159, 10, 0.25);
    }

    .repo-badge-public {
        background: rgba(52, 134, 235, 0.12);
        color: #3486eb;
        border: 1px solid rgba(52, 134, 235, 0.25);
    }

    .repo-delete-icon-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: transparent;
        border: none;
        color: rgba(255, 69, 58, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s ease;
        flex-shrink: 0;
        outline: none;
    }

    .repo-delete-icon-btn:hover {
        background: rgba(255, 69, 58, 0.15);
        color: #ff453a;
        transform: scale(1.08);
    }

    .repo-delete-icon-btn:active {
        transform: scale(0.92);
    }

    .repo-token-hint {
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.45);
        margin-top: -4px;
        margin-bottom: 2px;
        padding-left: 2px;
        line-height: 1.35;
    }

    /* ── Ambient Glow (Fades out to pitch-black on first message) ── */
    .ambient-glow {
        position: fixed;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 140%;
        height: 75vh;
        background: radial-gradient(circle at bottom, rgba(16, 50, 150, 0.95) 0%, rgba(10, 25, 80, 0.6) 35%, rgba(4, 10, 35, 0.2) 65%, rgba(0, 0, 0, 0) 100%);
        filter: blur(50px);
        z-index: 0;
        pointer-events: none;
        mix-blend-mode: screen;
        animation: ambientAnimation 10s ease-in-out infinite;
        opacity: 0.85;
        visibility: visible;
        transition: opacity 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0.6s ease;
    }

    .ambient-glow.hide {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
    }

    @keyframes ambientAnimation {
        0%, 100% { opacity: 0.7; transform: translate(-50%, 0) scale(1); }
        50% { opacity: 0.95; transform: translate(-50%, 10px) scale(1.08); }
    }

    /* ── Welcome Placeholder Typography ── */
    .welcome-placeholder {
        transition: opacity 0.4s ease;
    }
    .welcome-text {
        font-size: 34px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        letter-spacing: -0.03em !important;
        line-height: 1.25 !important;
        text-align: center !important;
        -webkit-font-smoothing: antialiased;
    }
    .welcome-subtext {
        font-size: 16px !important;
        color: rgba(255, 255, 255, 0.58) !important;
        line-height: 1.55 !important;
        margin-top: 10px !important;
        text-align: center !important;
    }

    /* ── Main Text Input Area ── */
    .input-field {
        font-size: 17.5px !important;
        line-height: 1.55 !important;
        letter-spacing: -0.012em !important;
        color: #ffffff !important;
        -webkit-font-smoothing: antialiased;
    }
    .input-field::placeholder {
        font-size: 17.5px !important;
        color: rgba(255, 255, 255, 0.42) !important;
        letter-spacing: -0.012em !important;
    }

    /* ── User Message Styling ── */
    .user-wrapper {
        align-self: flex-end !important;
        align-items: flex-end !important;
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
    }

    .user-message-container {
        align-items: flex-end !important;
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
    }

    .user-message {
        align-self: flex-end !important;
        max-width: 85% !important;
        width: fit-content !important;
        background: #1c1c1e !important;
        backdrop-filter: blur(30px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
        border: 1px solid rgba(255, 255, 255, 0.09) !important;
        border-radius: 30px !important;
        padding: 16px 24px !important;
        color: #ffffff !important;
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45) !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
        box-sizing: border-box !important;
    }

    .user-message .message-text {
        word-break: normal !important;
        overflow-wrap: break-word !important;
        white-space: pre-wrap !important;
        color: #ffffff !important;
        font-size: 17px !important;
        font-weight: 400 !important;
        line-height: 1.58 !important;
        letter-spacing: -0.012em !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif !important;
        -webkit-font-smoothing: antialiased;
    }

    /* ── Bot Message & Markdown Typography ── */
    .message.bot-message {
        color: #e8eaed !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif;
        font-size: 17.5px !important;
        line-height: 1.68 !important;
        letter-spacing: -0.012em !important;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
    }

    .markdown-p {
        margin: 0 0 14px 0 !important;
        font-size: 17.5px !important;
        line-height: 1.68 !important;
        color: #e8eaed !important;
        letter-spacing: -0.012em !important;
    }
    .markdown-p:last-child {
        margin-bottom: 0 !important;
    }

    .markdown-inline-code {
        background: rgba(255, 255, 255, 0.09) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        border-radius: 7px !important;
        padding: 2px 7px !important;
        font-family: "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace !important;
        font-size: 0.92em !important;
        color: #f1f3f9 !important;
        font-weight: 500 !important;
    }

    .markdown-h1, .markdown-h2, .markdown-h3, .markdown-h4, .markdown-h5, .markdown-h6 {
        color: #ffffff !important;
        font-weight: 700 !important;
        margin: 24px 0 12px 0 !important;
        line-height: 1.3 !important;
        letter-spacing: -0.022em !important;
        -webkit-font-smoothing: antialiased;
    }
    .markdown-h1 { font-size: 26px !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important; padding-bottom: 8px !important; }
    .markdown-h2 { font-size: 22px !important; }
    .markdown-h3 { font-size: 19px !important; font-weight: 600 !important; }
    .markdown-h4 { font-size: 17.5px !important; font-weight: 600 !important; }

    .markdown-list {
        margin: 10px 0 16px 0 !important;
        padding-left: 24px !important;
        font-size: 17.5px !important;
        line-height: 1.68 !important;
        color: #e8eaed !important;
    }
    .markdown-list li {
        margin-bottom: 8px !important;
        color: #e8eaed !important;
    }
    .markdown-list li::marker {
        color: var(--active-blue, #3486eb) !important;
    }

    .markdown-blockquote {
        border-left: 3.5px solid var(--active-blue, #3486eb) !important;
        margin: 16px 0 !important;
        padding: 12px 20px !important;
        background: rgba(52, 134, 235, 0.07) !important;
        border-radius: 0 16px 16px 0 !important;
        color: #e0e4ec !important;
        font-size: 17px !important;
        line-height: 1.62 !important;
        font-style: italic !important;
    }

    .markdown-hr {
        border: none !important;
        height: 1px !important;
        background: rgba(255, 255, 255, 0.1) !important;
        margin: 24px 0 !important;
    }

    .markdown-link {
        color: var(--active-blue, #3486eb) !important;
        text-decoration: none !important;
        font-weight: 500 !important;
        transition: opacity 0.2s !important;
    }
    .markdown-link:hover {
        text-decoration: underline !important;
        opacity: 0.85 !important;
    }

    .markdown-table-wrapper {
        width: 100% !important;
        overflow-x: auto !important;
        margin: 18px 0 !important;
        border-radius: 16px !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        background: rgba(255, 255, 255, 0.02) !important;
    }

    .markdown-table-wrapper table {
        width: 100% !important;
        border-collapse: collapse !important;
        text-align: left !important;
        font-size: 15.5px !important;
    }

    .markdown-table-wrapper th, .markdown-table-wrapper td {
        padding: 12px 18px !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
    }

    .markdown-table-wrapper th {
        background: rgba(255, 255, 255, 0.05) !important;
        font-weight: 600 !important;
        color: #ffffff !important;
    }

    .markdown-table-wrapper tr:last-child td {
        border-bottom: none !important;
    }

    /* ── Thinking / Reasoning Typography ── */
    .thinking-text-container {
        display: flex;
        align-items: center;
        padding: 14px 0;
        margin-left: 4px;
        opacity: 0;
        transform: translateY(4px);
        animation: thinking-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .thinking-text-wrapper {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        user-select: none;
        -webkit-user-select: none;
    }

    .thinking-dots-icon {
        display: grid;
        grid-template-columns: repeat(2, 3px);
        grid-template-rows: repeat(3, 3px);
        gap: 3px;
        align-items: center;
        justify-content: center;
        opacity: 0.65;
        flex-shrink: 0;
    }

    .thinking-dots-icon span {
        width: 3px;
        height: 3px;
        background-color: #ffffff;
        border-radius: 50%;
        animation: dotPulse 1.8s infinite ease-in-out;
    }

    .thinking-dots-icon span:nth-child(1) { animation-delay: 0.0s; }
    .thinking-dots-icon span:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dots-icon span:nth-child(3) { animation-delay: 0.4s; }
    .thinking-dots-icon span:nth-child(4) { animation-delay: 0.1s; }
    .thinking-dots-icon span:nth-child(5) { animation-delay: 0.3s; }
    .thinking-dots-icon span:nth-child(6) { animation-delay: 0.5s; }

    @keyframes dotPulse {
        0%, 100% { opacity: 0.3; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
    }

    .thinking-shimmer-text {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
        font-size: 16.5px !important;
        font-weight: 400;
        letter-spacing: -0.015em;
        background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.35) 0%,
            rgba(255, 255, 255, 0.95) 45%,
            rgba(255, 255, 255, 0.35) 90%
        );
        background-size: 200% 100%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: appleTextShimmer 2.2s infinite linear;
    }

    @keyframes appleTextShimmer {
        0% { background-position: 150% 0; }
        100% { background-position: -150% 0; }
    }

    .thinking-timer {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
        font-size: 15px !important;
        font-weight: 400;
        color: rgba(255, 255, 255, 0.45);
        letter-spacing: -0.01em;
        white-space: nowrap;
    }

    .collapsible-thought-block summary {
        font-size: 16.5px !important;
        font-weight: 600 !important;
    }

    .thought-content {
        font-size: 16.5px !important;
        line-height: 1.62 !important;
        color: #d1d5db !important;
    }

    .action-pill {
        font-size: 13px !important;
        font-weight: 600 !important;
        padding: 6px 13px !important;
    }

    /* ── Writing Block ── */
    .writing-block {
        background: #212121 !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 28px !important;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
        margin: 18px 0 !important;
        display: flex !important;
        flex-direction: column !important;
        max-width: 100% !important;
        position: relative !important;
        overflow: hidden !important;
        animation: blockFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
    }

    .writing-block-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        background: transparent !important;
        border-bottom: none !important;
        padding: 20px 24px 10px 24px !important;
        user-select: none !important;
        -webkit-user-select: none !important;
    }

    .writing-block-title {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif !important;
        margin: 0 !important;
    }

    .writing-block-copy {
        background: transparent !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.9) !important;
        cursor: pointer !important;
        width: 36px !important;
        height: 36px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
        margin: 0 !important;
        outline: none !important;
        border-radius: 50% !important;
        transition: transform 0.16s ease, opacity 0.16s ease, color 0.16s ease !important;
    }

    .writing-block-copy:hover {
        color: #ffffff !important;
        opacity: 1 !important;
        background: rgba(255, 255, 255, 0.06) !important;
    }

    .writing-block-copy:active {
        transform: scale(0.92) !important;
    }

    .writing-block-content {
        color: #f5f5f5 !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif !important;
        font-size: 16.5px !important;
        line-height: 1.65 !important;
        padding: 4px 24px 24px 24px !important;
        overflow-x: auto !important;
        overflow-y: auto !important;
        max-height: 520px;
        box-sizing: border-box !important;
        transition: max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }

    .writing-block.is-collapsed .writing-block-content {
        max-height: 240px !important;
        overflow-y: hidden !important;
        padding-bottom: 36px !important;
    }

    .writing-block.is-expanded .writing-block-content {
        max-height: 650px !important;
        overflow-y: auto !important;
    }

    .writing-expand-footer {
        position: relative !important;
        width: 100% !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        padding: 8px 16px 14px 16px !important;
        box-sizing: border-box !important;
        background: #212121 !important;
        z-index: 5 !important;
    }

    .writing-block.is-collapsed .writing-expand-footer {
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        padding-top: 36px !important;
        background: linear-gradient(to bottom, rgba(33, 33, 33, 0) 0%, rgba(33, 33, 33, 0.95) 55%, #212121 100%) !important;
    }

    .writing-expand-btn {
        background: rgba(255, 255, 255, 0.08) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: #ffffff !important;
        border-radius: 9999px !important;
        padding: 6px 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        letter-spacing: -0.01em !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif !important;
        transition: background-color 0.2s ease, transform 0.12s ease !important;
        outline: none !important;
    }

    .writing-expand-btn:hover {
        background: rgba(255, 255, 255, 0.15) !important;
    }

    .writing-expand-btn:active {
        transform: scale(0.95) !important;
    }

    /* ── Redesigned Code Block (Fixed Nested Layout & Preview Mode) ── */
    .code-block {
        background: #161618 !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 24px !important;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45) !important;
        margin: 18px 0 !important;
        display: flex !important;
        flex-direction: column !important;
        max-width: 100% !important;
        position: relative !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        animation: blockFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
    }

    .code-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        background: transparent !important;
        border-bottom: none !important;
        padding: 14px 18px 12px 20px !important;
        user-select: none !important;
        -webkit-user-select: none !important;
    }

    .code-language {
        font-size: 14px !important;
        font-weight: 500 !important;
        color: rgba(255, 255, 255, 0.6) !important;
        text-transform: lowercase !important;
        letter-spacing: -0.01em !important;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace !important;
        margin: 0 !important;
    }

    .code-header-actions {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
    }

    .code-copy-btn {
        background: rgba(255, 255, 255, 0.04) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 18px !important;
        color: rgba(255, 255, 255, 0.75) !important;
        cursor: pointer !important;
        width: 36px !important;
        height: 36px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
        margin: 0 !important;
        outline: none !important;
        transition: all 0.15s ease !important;
    }

    .code-copy-btn:hover {
        color: #ffffff !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(255, 255, 255, 0.18) !important;
    }

    .code-copy-btn:active {
        transform: scale(0.93) !important;
    }

    .code-view-toggle-pill {
        display: inline-flex !important;
        align-items: center !important;
        background: rgba(255, 255, 255, 0.04) !important;
        border: 1px solid rgba(255, 255, 255, 0.09) !important;
        border-radius: 18px !important;
        padding: 2px !important;
        gap: 2px !important;
        box-sizing: border-box !important;
    }

    .code-toggle-btn {
        background: transparent !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.55) !important;
        cursor: pointer !important;
        padding: 4px 10px !important;
        border-radius: 18px !important;
        display: flex !important;
        align-items: center !important;
        gap: 5px !important;
        font-size: 11.5px !important;
        font-weight: 500 !important;
        transition: all 0.15s ease !important;
        outline: none !important;
        height: 28px !important;
        box-sizing: border-box !important;
    }

    .code-toggle-btn:hover {
        color: #ffffff !important;
    }

    .code-toggle-btn.active {
        background: rgba(255, 255, 255, 0.14) !important;
        color: #ffffff !important;
        font-weight: 600 !important;
    }

    /* ── Inner Code Box (Pitch Black Window, Radius 20px) ── */
    .code-inner-box {
        background: #09090b !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        border-radius: 20px !important;
        margin: 0 12px 14px 12px !important;
        display: flex !important;
        flex-direction: column !important;
        position: relative !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        transition: max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }

    /* ── Scroll Area for Gutter + Code ── */
    .code-scroll-area {
        display: flex !important;
        flex-direction: row !important;
        align-items: stretch !important;
        width: 100% !important;
        overflow-x: auto !important;
        overflow-y: auto !important;
        padding: 16px 18px 18px 18px !important;
        box-sizing: border-box !important;
        max-height: 520px;
    }

    .code-block.is-collapsed .code-scroll-area {
        max-height: 210px !important;
        overflow-y: hidden !important;
        padding-bottom: 46px !important;
    }

    .code-block.is-expanded .code-scroll-area {
        max-height: 650px !important;
        overflow-y: auto !important;
    }

    /* ── Line Numbers Gutter ── */
    .code-gutter {
        position: sticky !important;
        left: 0 !important;
        background: #09090b !important;
        display: flex !important;
        flex-direction: column !important;
        text-align: right !important;
        padding-right: 18px !important;
        margin-right: 6px !important;
        color: rgba(255, 255, 255, 0.28) !important;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace !important;
        font-size: 14.5px !important;
        line-height: 1.65 !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        flex-shrink: 0 !important;
        z-index: 2 !important;
    }

    .code-gutter span {
        display: block !important;
        height: auto !important;
        line-height: 1.65 !important;
    }

    /* ── Code Content & Reset of Rogue Backgrounds ── */
    .code-content {
        flex: 1 !important;
        min-width: 0 !important;
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
    }

    .code-content pre,
    .code-content pre code,
    .code-content code.hljs {
        background: transparent !important;
        background-color: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace !important;
        font-size: 14.5px !important;
        line-height: 1.65 !important;
        white-space: pre !important;
        word-wrap: normal !important;
        word-break: normal !important;
        letter-spacing: -0.01em !important;
        color: #f4f4f5 !important;
        display: block !important;
    }

    /* ── Scrollbars ── */
    .code-scroll-area::-webkit-scrollbar {
        width: 6px !important;
        height: 6px !important;
    }
    .code-scroll-area::-webkit-scrollbar-track {
        background: transparent !important;
    }
    .code-scroll-area::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.18) !important;
        border-radius: 18px !important;
    }
    .code-scroll-area::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3) !important;
    }

    /* ── Expand / Collapse Footer ── */
    .code-expand-footer {
        width: 100% !important;
        box-sizing: border-box !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 5 !important;
    }

    .code-block.is-collapsed .code-expand-footer {
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        padding: 28px 16px 10px 16px !important;
        background: linear-gradient(to bottom, rgba(9, 9, 11, 0) 0%, rgba(9, 9, 11, 0.95) 55%, #09090b 100%) !important;
        border-bottom-left-radius: 20px !important;
        border-bottom-right-radius: 20px !important;
    }

    .code-block.is-expanded .code-expand-footer {
        position: relative !important;
        background: #09090b !important;
        padding: 10px 16px 12px 16px !important;
        border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    }

    .code-expand-btn {
        background: rgba(255, 255, 255, 0.08) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        color: #ffffff !important;
        border-radius: 18px !important;
        padding: 5px 14px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        letter-spacing: -0.01em !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        font-family: inherit !important;
        transition: all 0.16s ease !important;
        outline: none !important;
    }

    .code-expand-btn:hover {
        background: rgba(255, 255, 255, 0.15) !important;
    }

    .code-expand-btn:active {
        transform: scale(0.95) !important;
    }

    /* ── Preview Mode Toggle Rules (Clean Replacement) ── */
    .code-preview-container {
        display: none !important;
        padding: 0 12px 14px 12px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        animation: blockFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
    }

    .code-block.is-preview-mode .code-inner-box {
        display: none !important;
    }

    .code-block.is-preview-mode .code-preview-container {
        display: block !important;
    }

    .code-preview-frame {
        background: #09090b !important;
        border-radius: 20px !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        overflow: hidden !important;
        min-height: 340px !important;
        display: flex !important;
        flex-direction: column !important;
    }

    .code-preview-iframe {
        width: 100% !important;
        height: 380px !important;
        border: none !important;
        background: #09090b !important;
        display: block !important;
    }

    .syntax-bracket { color: #8892b0 !important; }
    .syntax-tag { color: #f97583 !important; font-weight: 500 !important; }
    .syntax-attribute { color: #ffab70 !important; }
    .syntax-keyword, .hljs-keyword { color: #79b8ff !important; font-weight: 500 !important; }
    .syntax-string, .hljs-string { color: #9ecbff !important; }
    .syntax-number, .syntax-boolean, .hljs-number { color: #79b8ff !important; }
    .syntax-property { color: #b392f0 !important; }
    .syntax-comment, .hljs-comment { color: #6a737d !important; font-style: italic !important; }
    .syntax-builtin, .hljs-built_in { color: #b392f0 !important; }
    .syntax-function, .hljs-function, .hljs-title { color: #b392f0 !important; }
    .syntax-variable, .hljs-variable { color: #e1e4e8 !important; }
    .syntax-operator { color: #f97583 !important; }

    .main-input-container {
        overflow: visible !important;
    }

    /* ── Custom Camera Viewfinder Modal ── */
    .custom-camera-modal-overlay {
        position: fixed;
        margin-top: 125px;
        inset: 0;
        z-index: 3500;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    .custom-camera-modal-overlay.show {
        opacity: 1;
        pointer-events: auto;
    }
    .custom-camera-viewfinder-card {
        position: relative;
        width: min(92vw, 420px);
        aspect-ratio: 3 / 4;
        max-height: 82vh;
        background: #000000;
        border-radius: 36px;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.12);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transform: scale(0.92);
        transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), aspect-ratio 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    .custom-camera-modal-overlay.show .custom-camera-viewfinder-card {
        transform: scale(1);
    }
    .custom-camera-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        position: absolute;
        inset: 0;
        z-index: 1;
        background: #0d0d12;
        transition: transform 0.3s ease;
    }
    .custom-cam-top-bar {
        position: absolute;
        top: 18px;
        left: 18px;
        z-index: 10;
    }
    .custom-cam-aspect-pill {
        background: rgba(30, 38, 55, 0.55);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 20px;
        padding: 6px 14px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        color: #ffffff;
        outline: none;
        user-select: none;
        -webkit-user-select: none;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
        transition: transform 0.15s ease, background-color 0.2s ease;
    }
    .custom-cam-aspect-pill:active {
        transform: scale(0.94);
        background: rgba(30, 38, 55, 0.75);
    }
    .custom-cam-aspect-label {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.8px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
    }
    .custom-cam-aspect-val {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif;
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.2px;
    }
    .custom-cam-bottom-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 22px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 10;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, transparent 100%);
    }
    .custom-cam-circle-btn {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(30, 38, 55, 0.55);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        outline: none;
        user-select: none;
        -webkit-user-select: none;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
        transition: transform 0.15s ease, background-color 0.2s ease;
    }
    .custom-cam-circle-btn:active {
        transform: scale(0.92);
        background: rgba(30, 38, 55, 0.75);
    }
    .custom-cam-shutter-outer {
        width: 68px;
        height: 68px;
        border-radius: 50%;
        border: 4px solid rgba(255, 255, 255, 0.45);
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        outline: none;
        user-select: none;
        -webkit-user-select: none;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.2s ease;
    }
    .custom-cam-shutter-outer:active {
        transform: scale(0.88);
        border-color: rgba(255, 255, 255, 0.8);
    }
    .custom-cam-shutter-inner {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #ffffff;
        display: block;
        transition: transform 0.15s ease, background-color 0.15s ease;
    }
    .custom-cam-shutter-outer:active .custom-cam-shutter-inner {
        transform: scale(0.92);
        background: #f0f0f0;
    }
    .custom-cam-flash {
        position: absolute;
        inset: 0;
        background: #ffffff;
        z-index: 100;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease-out;
    }
    .custom-cam-flash.active {
        opacity: 1;
        transition: none;
    }
    .custom-cam-flip-icon {
        transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    /* ── Apple-Grade Live Browser Takeover Modal ── */
    .browser-takeover-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 3400;
        background: rgba(0, 0, 0, 0.68);
        backdrop-filter: blur(32px) saturate(180%);
        -webkit-backdrop-filter: blur(32px) saturate(180%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .browser-takeover-modal-overlay.show {
        opacity: 1;
        pointer-events: auto;
    }

    .browser-takeover-card {
        position: relative;
        width: min(1040px, 94vw);
        height: min(780px, 88vh);
        background: rgba(22, 22, 28, 0.78);
        backdrop-filter: blur(50px) saturate(200%);
        -webkit-backdrop-filter: blur(50px) saturate(200%);
        border-radius: 34px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 32px 80px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.18);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: scale(0.94) translateY(14px);
        transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.38s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .browser-takeover-modal-overlay.show .browser-takeover-card {
        transform: scale(1) translateY(0);
    }

    .browser-header-bar {
        height: 64px;
        padding: 0 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
        z-index: 10;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        user-select: none;
        -webkit-user-select: none;
    }

    .browser-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 120px;
    }

    .browser-header-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9999px;
        padding: 6px 14px;
        font-size: 13px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.6);
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
        transition: all 0.2s ease;
    }

    .browser-header-pill .status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #ff9f43;
        box-shadow: 0 0 8px rgba(255, 159, 67, 0.8);
        animation: pulseBadgeDot 1.8s infinite ease-in-out;
    }

    .browser-header-pill .status-dot.resuming {
        background: #3486eb;
        box-shadow: 0 0 8px rgba(52, 134, 235, 0.8);
    }

    .browser-address-island {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9999px;
        padding: 7px 18px;
        max-width: 380px;
        width: 100%;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
        box-sizing: border-box;
    }

    .browser-address-island i.lock-icon {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.45);
    }

    .browser-domain-text {
        font-size: 13px;
        font-weight: 600;
        color: #ffffff;
        letter-spacing: -0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    }

    .browser-path-text {
        font-size: 13px;
        font-weight: 400;
        color: rgba(255, 255, 255, 0.38);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    }

    .browser-header-right {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        min-width: 120px;
    }

    .browser-glass-btn {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        outline: none;
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        font-size: 13px;
        padding: 0;
    }

    .browser-glass-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        transform: scale(1.05);
    }

    .browser-glass-btn:active {
        transform: scale(0.92);
    }

    .browser-viewport-wrapper {
        flex: 1;
        position: relative;
        background: #000000;
        display: flex;
        flex-direction: column;
        min-height: 0;
        margin: 0 12px;
        border-radius: 20px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .browser-iframe-element {
        width: 100%;
        height: 100%;
        border: none;
        display: block;
        background: #000000;
    }

    .browser-action-dock {
        padding: 16px 20px 20px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        position: relative;
        z-index: 10;
    }

    .browser-dock-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 12px 18px;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
    }

    .browser-dock-info {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
        flex: 1;
    }

    .browser-dock-badge {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(255, 159, 67, 0.25) 0%, rgba(255, 126, 95, 0.2) 100%);
        border: 1px solid rgba(255, 159, 67, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ff9f43;
        font-size: 15px;
        flex-shrink: 0;
    }

    .browser-dock-text-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .browser-dock-title {
        font-size: 14.5px;
        font-weight: 600;
        color: #ffffff;
        letter-spacing: -0.015em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    }

    .browser-dock-desc {
        font-size: 12.5px;
        color: rgba(255, 255, 255, 0.58);
        letter-spacing: -0.005em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    }

    .browser-dock-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
    }

    .dock-note-toggle-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 13.5px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 9999px;
        transition: all 0.2s ease;
        font-family: inherit;
    }

    .dock-note-toggle-btn:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.06);
    }

    .dock-resume-btn {
        height: 44px;
        background: #ffffff;
        color: #000000;
        border: none;
        border-radius: 22px;
        padding: 0 22px;
        font-size: 14.5px;
        font-weight: 600;
        letter-spacing: -0.01em;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 6px 20px rgba(255, 255, 255, 0.15);
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: inherit;
    }

    .dock-resume-btn:hover {
        background: #f2f2f7;
        transform: scale(1.02);
        box-shadow: 0 8px 24px rgba(255, 255, 255, 0.22);
    }

    .dock-resume-btn:active {
        transform: scale(0.96);
    }

    .dock-resume-btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        transform: none !important;
    }

    .dock-expandable-note {
        display: none;
        animation: dockSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .dock-expandable-note.show {
        display: block;
    }

    @keyframes dockSlideDown {
        0% { opacity: 0; transform: translateY(-8px); }
        100% { opacity: 1; transform: translateY(0); }
    }

    .dock-note-input {
        width: 100%;
        height: 48px;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        padding: 12px 18px;
        color: #ffffff;
        font-size: 14px;
        font-family: inherit;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.2s ease, background 0.2s ease;
    }

    .dock-note-input:focus {
        border-color: #3486eb;
        background: rgba(0, 0, 0, 0.6);
    }

    .browser-minimized-pill {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: rgba(22, 22, 28, 0.85);
        backdrop-filter: blur(36px) saturate(190%);
        -webkit-backdrop-filter: blur(36px) saturate(190%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.18);
        border-radius: 9999px;
        padding: 8px 16px 8px 10px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 2500;
        cursor: pointer;
        opacity: 0;
        pointer-events: none;
        transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.15);
        user-select: none;
        -webkit-user-select: none;
    }

    .browser-minimized-pill.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
        pointer-events: auto;
    }

    .browser-minimized-pill:hover {
        transform: translateX(-50%) translateY(-3px) scale(1.02);
        background: rgba(28, 28, 36, 0.95);
    }

    .browser-minimized-pill:active {
        transform: translateX(-50%) scale(0.97);
    }

    .minimized-beacon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 159, 67, 0.15);
        border: 1px solid rgba(255, 159, 67, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ff9f43;
        font-size: 13px;
    }

    .minimized-text-group {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    .minimized-title {
        font-size: 13px;
        font-weight: 600;
        color: #ffffff;
        letter-spacing: -0.01em;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    }

    .minimized-sub {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.55);
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    }

    @media (max-width: 768px) {
        .browser-takeover-modal-overlay {
            padding: 0;
            align-items: flex-end;
        }
        .browser-takeover-card {
            width: 100vw;
            height: 94vh;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
            border-bottom: none;
        }
        .browser-address-island {
            display: none;
        }
        .browser-dock-content {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
        }
        .browser-dock-actions {
            justify-content: space-between;
        }
        .dock-resume-btn {
            flex: 1;
            justify-content: center;
        }
    }

    /* ── Reasoning Effort Popup ── */
    .reasoning-effort-popup {
        position: fixed !important;
        bottom: calc(var(--bottom-bar-height, 120px) + 16px) !important;
        left: 50% !important;
        transform: translateX(-50%) scale(0.88) !important;
        opacity: 0 !important;
        pointer-events: none !important;
        background: rgba(22, 22, 28, 0.88) !important;
        backdrop-filter: blur(40px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
        border-radius: 36px !important;
        padding: 20px 22px 22px 22px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 14px !important;
        z-index: 3000 !important;
        width: 350px !important;
        box-sizing: border-box !important;
        transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease, bottom 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
    }

    .reasoning-effort-popup.show {
        opacity: 1 !important;
        pointer-events: auto !important;
        transform: translateX(-50%) scale(1) !important;
    }

    .effort-title-label {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;
        font-size: 22px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.02em;
        user-select: none;
        -webkit-user-select: none;
        text-align: center;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .effort-slider-track {
        position: relative;
        width: 100%;
        height: 58px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9999px;
        padding: 5px;
        box-sizing: border-box;
        box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4);
        cursor: pointer;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
    }

    .effort-slider-fill {
        position: absolute;
        inset: 5px;
        height: calc(100% - 10px);
        width: calc(100% - 10px);
        background: linear-gradient(90deg, #3486eb 0%, #2575fc 100%);
        border-radius: 9999px;
        pointer-events: none;
        box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3), 0 0 12px rgba(52, 134, 235, 0.35);
    }

    .effort-slider-dots {
        position: absolute;
        inset: 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 29px;
        pointer-events: none;
        z-index: 2;
    }

    .effort-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transition: background 0.2s, transform 0.2s;
    }

    .effort-dot.active {
        background: rgba(255, 255, 255, 0.95);
        box-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
    }

    .effort-slider-thumb {
        position: absolute;
        top: 8px;
        width: 42px;
        height: 42px;
        background: #ffffff;
        border-radius: 50%;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2);
        transition: left 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
        pointer-events: none;
        z-index: 3;
    }

    .disabled-agent-mode {
        opacity: 0.45 !important;
        cursor: not-allowed !important;
        filter: grayscale(0.8) !important;
        user-select: none !important;
    }

    /* ── Image Skeleton Generation Card ── */
    .img-skeleton-card {
        position: relative;
        width: 320px;
        height: 420px;
        max-width: 100%;
        background: #1c1c1e;
        border-radius: 28px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: var(--premium-shadow);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        margin: 8px 0;
        animation: appleCardPop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes appleCardPop {
        0% { opacity: 0; transform: scale(0.95) translateY(8px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
    }

    .img-skeleton-status-container {
        position: absolute;
        top: 20px;
        left: 20px;
        right: 20px;
        z-index: 10;
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
    }

    .img-skeleton-status-text {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
        font-size: 16px;
        font-weight: 500;
        letter-spacing: -0.015em;
        color: rgba(255, 255, 255, 0.92);
        opacity: 1;
        transform: translateY(0);
        transition: opacity 0.28s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);
        display: inline-block;
    }

    .img-skeleton-status-text.fade-out {
        opacity: 0;
        transform: translateY(-6px);
    }

    .img-skeleton-status-text.fade-in {
        opacity: 0;
        transform: translateY(6px);
    }

    .img-skeleton-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
    }

    .response-aborted-notice {
        margin-top: 14px;
        font-style: italic;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.45);
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
        letter-spacing: -0.01em;
        user-select: none;
    }

    .message-meta-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        margin-top: 8px;
        padding-top: 4px;
    }

    .response-duration-badge {
        font-family: "SF Mono", Menlo, Consolas, monospace;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.35);
        font-weight: 400;
        letter-spacing: 0.02em;
    }

    /* ── Attachment Popup Sheet ── */
    .attachment-popup-overlay {
        position: fixed;
        inset: 0;
        z-index: 2500;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .attachment-popup-overlay.show {
        pointer-events: auto;
        opacity: 1;
    }
    .attachment-popup-backdrop {
        position: absolute;
        inset: 0;
        background: transparent;
    }
    .attachment-popup-content {
        position: absolute;
        bottom: calc(var(--bottom-bar-height, 100px) + 8px);
        left: 16px;
        width: 235px;
        background: rgba(22, 22, 26, 0.85);
        backdrop-filter: blur(40px) saturate(180%);
        -webkit-backdrop-filter: blur(40px) saturate(180%);
        border-radius: 38px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        box-sizing: border-box;
        transform-origin: bottom left;
        transform: scale(0.85) translateY(12px);
        opacity: 0;
        transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.2), opacity 0.2s ease;
    }
    .attachment-popup-overlay.show .attachment-popup-content {
        transform: scale(1) translateY(0);
        opacity: 1;
    }
    .attachment-popup-row {
        display: flex;
        align-items: center;
        gap: 16px;
        background: transparent;
        border: none;
        outline: none;
        padding: 8px 10px;
        border-radius: 20px;
        width: 100%;
        text-align: left;
        cursor: pointer;
        box-sizing: border-box;
        transition: background 0.15s ease, transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1);
        user-select: none;
        -webkit-user-select: none;
    }
    .attachment-popup-row:hover {
        background: rgba(255, 255, 255, 0.05);
    }
    .attachment-popup-row:active {
        transform: scale(0.96);
        background: rgba(255, 255, 255, 0.08);
    }
    .attachment-popup-icon {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 19px;
        color: #ffffff;
        flex-shrink: 0;
    }
    .attachment-popup-label {
        font-size: 17px;
        font-weight: 500;
        color: #ffffff;
        letter-spacing: -0.015em;
        font-family: var(--font-family-sans);
    }

    .drag-handle, .drag-handle-top {
        width: 80px !important;
        height: 10px !important;
        border-radius: 5px !important;
        background-color: rgba(255, 255, 255, 0.35) !important;
        margin: 15px auto !important;
        cursor: grab !important;
    }
    .drag-handle:active, .drag-handle-top:active {
        background-color: rgba(255, 255, 255, 0.55) !important;
        cursor: grabbing !important;
    }

    #closeSettingsButton {
        display: none !important;
    }

    .panel-close-circle-btn {
        position: absolute !important;
        top: 24px !important;
        right: 24px !important;
        width: 52px !important;
        height: 52px !important;
        border-radius: 50% !important;
        background: rgba(30, 30, 35, 0.9) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        color: #ffffff !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        z-index: 1012 !important;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6) !important;
        transition: transform 0.2s, background 0.2s !important;
    }
    .panel-close-circle-btn:active {
        transform: scale(0.92) !important;
    }

    /* ── Spotlight Search Island ── */
    .apple-search-spotlight {
        position: absolute !important;
        bottom: 84px !important;
        left: 16px !important;
        right: 16px !important;
        height: 52px !important;
        background: rgba(26, 26, 32, 0.92) !important;
        backdrop-filter: blur(40px) saturate(190%) !important;
        -webkit-backdrop-filter: blur(40px) saturate(190%) !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        border-radius: 26px !important;
        display: flex !important;
        align-items: center !important;
        padding: 0 12px 0 16px !important;
        gap: 10px !important;
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
        z-index: 1020 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transform: translateY(14px) scale(0.94) !important;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.2), opacity 0.22s ease !important;
        box-sizing: border-box !important;
    }

    .apple-search-spotlight.show {
        opacity: 1 !important;
        pointer-events: auto !important;
        transform: translateY(0) scale(1) !important;
    }

    .apple-search-icon {
        font-size: 15px !important;
        color: rgba(255, 255, 255, 0.38) !important;
        flex-shrink: 0 !important;
    }

    .apple-search-input {
        flex: 1 !important;
        background: transparent !important;
        border: none !important;
        outline: none !important;
        font-size: 15px !important;
        font-weight: 400 !important;
        color: #ffffff !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif !important;
        letter-spacing: -0.01em !important;
        min-width: 0 !important;
    }

    .apple-search-input::placeholder {
        color: rgba(255, 255, 255, 0.38) !important;
    }

    .apple-search-clear-btn {
        background: rgba(255, 255, 255, 0.12) !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.7) !important;
        width: 22px !important;
        height: 22px !important;
        border-radius: 50% !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 10px !important;
        cursor: pointer !important;
        transition: opacity 0.15s ease, background 0.15s ease !important;
        flex-shrink: 0 !important;
    }

    .apple-search-clear-btn.show {
        display: flex !important;
    }

    .apple-search-close-pill {
        background: rgba(255, 255, 255, 0.08) !important;
        border: none !important;
        color: #ffffff !important;
        padding: 6px 14px !important;
        border-radius: 9999px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        letter-spacing: -0.01em !important;
        font-family: inherit !important;
        flex-shrink: 0 !important;
        transition: background 0.15s ease, transform 0.1s ease !important;
    }

    .apple-search-close-pill:active {
        transform: scale(0.94) !important;
        background: rgba(255, 255, 255, 0.15) !important;
    }

    /* ── Apple Rename Modal ── */
    .rename-modal-overlay {
        position: fixed !important;
        inset: 0 !important;
        background: rgba(0, 0, 0, 0.58) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 3100 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }

    .rename-modal-overlay.show {
        opacity: 1 !important;
        pointer-events: auto !important;
    }

    .rename-modal-card {
        width: min(340px, 86vw) !important;
        background: rgba(30, 30, 36, 0.92) !important;
        backdrop-filter: blur(50px) saturate(190%) !important;
        -webkit-backdrop-filter: blur(50px) saturate(190%) !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        border-radius: 28px !important;
        padding: 24px 20px 18px 20px !important;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7) !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        transform: scale(0.92) translateY(8px) !important;
        transition: transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.2) !important;
        box-sizing: border-box !important;
    }

    .rename-modal-overlay.show .rename-modal-card {
        transform: scale(1) translateY(0) !important;
    }

    .rename-title {
        font-size: 17px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        text-align: center !important;
        letter-spacing: -0.015em !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif !important;
    }

    .rename-input {
        width: 100% !important;
        height: 44px !important;
        background: rgba(0, 0, 0, 0.38) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 14px !important;
        padding: 0 14px !important;
        color: #ffffff !important;
        font-size: 14.5px !important;
        font-family: inherit !important;
        outline: none !important;
        box-sizing: border-box !important;
        transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
    }

    .rename-input:focus {
        border-color: #3486eb !important;
        box-shadow: 0 0 0 3px rgba(52, 134, 235, 0.25) !important;
    }

    .rename-actions {
        display: flex !important;
        gap: 10px !important;
    }

    .rename-btn-secondary {
        flex: 1 !important;
        height: 42px !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border: none !important;
        border-radius: 21px !important;
        color: #ffffff !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: background 0.15s ease, transform 0.1s ease !important;
        font-family: inherit !important;
    }

    .rename-btn-secondary:active {
        transform: scale(0.96) !important;
        background: rgba(255, 255, 255, 0.14) !important;
    }

    .rename-btn-primary {
        flex: 1 !important;
        height: 42px !important;
        background: #ffffff !important;
        border: none !important;
        border-radius: 21px !important;
        color: #000000 !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: background 0.15s ease, transform 0.1s ease !important;
        font-family: inherit !important;
    }

    .rename-btn-primary:active {
        transform: scale(0.96) !important;
        background: #e5e5ea !important;
    }

    .panel-chats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr) !important;
        grid-auto-rows: minmax(130px, auto) !important;
        gap: 16px !important;
        padding: 70px 20px 120px 20px !important;
        box-sizing: border-box;
    }

    .chats-masonry-card {
        position: relative !important;
        border: none !important;
        border-radius: 28px !important;
        padding: 20px !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.05) !important;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 8px;
        color: #ffffff !important;
        box-sizing: border-box;
        transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s ease !important;
        background: #1c1c1e !important;
        overflow: hidden !important;
    }
    .chats-masonry-card:hover {
        transform: translateY(-6px) scale(1.03) !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.08) !important;
    }

    /* ── URL Showcase Card ── */
    .url-showcase-card {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 320px;
        border-radius: 28px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: var(--premium-shadow);
        margin-top: 10px;
        transition: var(--spring-transition);
        background: linear-gradient(135deg, rgba(46, 125, 50, 0.15) 0%, rgba(18, 18, 22, 0.8) 100%);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
    }
    .url-showcase-card:hover {
        transform: scale(1.02) translateY(-2px);
        border-color: rgba(52, 134, 235, 0.4);
        box-shadow: 0 12px 30px rgba(52,134,235,0.15), var(--premium-shadow);
    }
    .url-showcase-top {
        height: 140px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background: radial-gradient(circle at center, rgba(76, 175, 80, 0.2) 0%, transparent 70%);
    }
    .url-floating-element {
        position: absolute;
        width: 32px;
        height: 32px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        color: #ffffff;
        opacity: 0.8;
        animation: floatSlow 6s infinite ease-in-out alternate;
    }
    .url-main-title {
        font-size: 24px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.5px;
        text-align: center;
        z-index: 2;
        text-shadow: 0 4px 10px rgba(0,0,0,0.5);
        font-family: var(--font-family-sans);
        text-transform: capitalize;
    }
    .url-showcase-bottom {
        background-color: #f1f8e9;
        padding: 14px 18px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .url-bottom-title {
        font-size: 15px;
        font-weight: 700;
        color: #1b5e20;
    }
    .url-bottom-domain {
        font-size: 12px;
        color: #558b2f;
        font-weight: 500;
    }

    /* ── Execution Output Container ── */
    .exec-output-container {
        background: #1c1c1e !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 24px !important;
        margin: 16px 0 !important;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        max-width: 100% !important;
        animation: premiumFadeInUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
    }

    .exec-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 16px 20px !important;
        background: rgba(255, 255, 255, 0.02) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
        user-select: none !important;
    }

    .exec-header-left {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
    }

    .exec-terminal-icon {
        color: #8e8e93 !important;
        font-size: 14px !important;
    }

    .exec-title {
        font-size: 15px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }

    .exec-status-badge {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        padding: 4px 10px !important;
        border-radius: 12px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: capitalize !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }

    .exec-status-dot {
        width: 6px !important;
        height: 6px !important;
        border-radius: 50% !important;
        display: inline-block !important;
    }

    .exec-status-dot.pulse {
        animation: pulse-badge-dot 1.5s infinite ease-in-out !important;
    }

    @keyframes pulse-badge-dot {
        0% { transform: scale(0.8); opacity: 0.5; }
        50% { transform: scale(1.2); opacity: 1; }
        100% { transform: scale(0.8); opacity: 0.5; }
    }

    .exec-header-right {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
    }

    .exec-btn {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        color: rgba(255, 255, 255, 0.7) !important;
        cursor: pointer !important;
        width: 32px !important;
        height: 32px !important;
        border-radius: 8px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 150ms ease !important;
        padding: 0 !important;
        outline: none !important;
    }

    .exec-btn:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        color: #ffffff !important;
        transform: scale(1.05) !important;
    }

    .exec-btn:active {
        transform: scale(0.95) !important;
    }

    .exec-body {
        padding: 20px !important;
        background: transparent !important;
        max-height: 300px !important;
        overflow-y: auto !important;
        overflow-x: auto !important;
        transition: max-height 0.3s ease !important;
    }

    .exec-terminal-pre {
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
    }

    .exec-terminal-pre code {
        font-family: "SF Mono", "JetBrains Mono", monospace !important;
        font-size: 14px !important;
        line-height: 1.65 !important;
        color: #e0e0e3 !important;
        white-space: pre !important;
        display: block !important;
    }

    .exec-footer {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
        padding: 14px 20px !important;
        background: rgba(0, 0, 0, 0.15) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.04) !important;
    }

    .exec-meta-pill {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        background: rgba(255, 255, 255, 0.04) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        color: rgba(255, 255, 255, 0.6) !important;
        padding: 4px 10px !important;
        border-radius: 10px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }

    .exec-meta-pill i {
        font-size: 11px !important;
        opacity: 0.8 !important;
    }

    /* ── Plugins Modal & Skills Sheet ── */
    .plugins-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 3200;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(28px) saturate(180%);
        -webkit-backdrop-filter: blur(28px) saturate(180%);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .plugins-modal-overlay.show {
        opacity: 1;
        pointer-events: auto;
    }

    .plugins-sheet-card {
        width: 100%;
        max-width: 680px;
        max-height: 86vh;
        background: rgba(24, 24, 28, 0.88);
        backdrop-filter: blur(50px) saturate(200%);
        -webkit-backdrop-filter: blur(50px) saturate(200%);
        border-top-left-radius: 38px;
        border-top-right-radius: 38px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-bottom: none;
        padding: 12px 24px 36px 24px;
        box-sizing: border-box;
        transform: translateY(100%);
        transition: transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.15);
        display: flex;
        flex-direction: column;
        color: #ffffff;
        font-family: var(--font-family-sans);
        box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.12);
    }

    .plugins-sheet-card.show {
        transform: translateY(0);
    }

    @media (min-width: 768px) {
        .plugins-modal-overlay {
            align-items: center;
        }
        .plugins-sheet-card {
            border-radius: 38px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            max-height: 80vh;
            transform: scale(0.92) translateY(20px);
            transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.2), opacity 0.3s ease;
        }
        .plugins-sheet-card.show {
            transform: scale(1) translateY(0);
        }
    }

    .plugins-sheet-handle {
        width: 44px;
        height: 5px;
        background: rgba(255, 255, 255, 0.25);
        border-radius: 9999px;
        margin: 4px auto 16px auto;
        flex-shrink: 0;
        cursor: grab;
    }

    .plugins-sheet-handle:active {
        cursor: grabbing;
        background: rgba(255, 255, 255, 0.45);
    }

    .plugins-sheet-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
        flex-shrink: 0;
    }

    .plugins-sheet-title {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.025em;
        color: #ffffff;
    }

    .plugins-sheet-subtitle {
        font-size: 13.5px;
        color: rgba(255, 255, 255, 0.55);
        margin-top: 4px;
        line-height: 1.4;
    }

    .plugins-close-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.09);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        outline: none;
        transition: all 0.16s ease;
        flex-shrink: 0;
    }

    .plugins-close-btn:hover {
        background: rgba(255, 255, 255, 0.16);
        transform: scale(1.05);
    }

    .plugins-close-btn:active {
        transform: scale(0.92);
    }

    .plugins-search-bar {
        position: relative;
        display: flex;
        align-items: center;
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 0 16px;
        height: 46px;
        margin-bottom: 14px;
        flex-shrink: 0;
        box-sizing: border-box;
        transition: border-color 0.2s ease, background 0.2s ease;
    }

    .plugins-search-bar:focus-within {
        border-color: var(--active-blue, #3486eb);
        background: rgba(0, 0, 0, 0.55);
    }

    .plugins-search-icon {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.45);
        margin-right: 10px;
    }

    .plugins-search-input {
        width: 100%;
        background: transparent;
        border: none;
        outline: none;
        font-size: 14.5px;
        color: #ffffff;
        font-family: inherit;
    }

    .plugins-search-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
    }

    .plugins-pills-row {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        scrollbar-width: none;
        margin-bottom: 16px;
        flex-shrink: 0;
        padding-bottom: 2px;
    }

    .plugins-pills-row::-webkit-scrollbar {
        display: none;
    }

    .plugins-category-pill {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9999px;
        padding: 6px 14px;
        font-size: 13px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.65);
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.18s ease;
        outline: none;
    }

    .plugins-category-pill:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.1);
    }

    .plugins-category-pill.active {
        background: #ffffff;
        color: #000000;
        font-weight: 600;
        border-color: #ffffff;
    }

    .plugins-list-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        overflow-y: auto;
        padding-right: 2px;
        box-sizing: border-box;
        overscroll-behavior: contain;
    }

    .plugin-skill-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 24px;
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        cursor: pointer;
        transition: transform 0.15s ease, background-color 0.18s ease, border-color 0.18s ease;
        box-sizing: border-box;
    }

    .plugin-skill-card:hover {
        background: rgba(255, 255, 255, 0.07);
        border-color: rgba(255, 255, 255, 0.14);
        transform: translateY(-2px);
    }

    .plugin-skill-card:active {
        transform: scale(0.98);
    }

    .plugin-skill-top {
        display: flex;
        align-items: center;
        gap: 14px;
    }

    .plugin-skill-icon {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 1px solid transparent;
        flex-shrink: 0;
    }

    .plugin-skill-title-block {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
    }

    .plugin-skill-name {
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
        letter-spacing: -0.015em;
    }

    .plugin-skill-handle {
        font-family: "SF Mono", "JetBrains Mono", Menlo, monospace;
        font-size: 12.5px;
        font-weight: 600;
        color: var(--active-blue, #3486eb);
    }

    .plugin-category-badge {
        font-size: 11.5px;
        font-weight: 600;
        padding: 3px 9px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.08);
        letter-spacing: -0.01em;
        flex-shrink: 0;
    }

    .plugin-skill-description {
        font-size: 13.5px;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.62);
        letter-spacing: -0.005em;
    }

    .plugin-skill-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 2px;
    }

    .plugin-use-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border-radius: 16px;
        padding: 6px 14px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
        outline: none;
        font-family: inherit;
    }

    .plugin-use-btn:hover {
        background: #ffffff;
        color: #000000;
        border-color: #ffffff;
    }

    .plugin-use-btn:active {
        transform: scale(0.94);
    }
    `;
    document.head.appendChild(style);
},
setupPanelDragGestures() {
  const bindFluidDrag = (sheet, content, onDismiss) => {
    if (!sheet || !content) return;
    const handle = content.querySelector('.drag-handle, .drag-handle-top, .ios-sheet-drag-handle, .repo-modal-handle, .plugins-sheet-handle');
    const touchArea = handle || content.querySelector('.panel-header, .panel-header-unified, .ios-sheet-panel-header') || content;

    let startY = 0;
    let startX = 0;
    let startTransformY = 0;
    let isTracking = false;
    let isCommittedDrag = false;
    let activeSpring = null;

    // Rolling velocity tracking buffer (last ~100ms)
    let moveHistory = [];

    const onPointerDown = (e) => {
      // Don't intercept button/input clicks
      if (e.target.closest('input, textarea, select, button, a, .close-button, .panel-icon-btn, .repo-close-btn')) {
        return;
      }

      // Interrupt running spring smoothly from live on-screen presentation value
      if (activeSpring) {
        activeSpring.stop();
        activeSpring = null;
      }

      startY = e.clientY;
      startX = e.clientX;
      startTransformY = window.AppleMotion.getLivePresentationTranslateY(content);
      moveHistory = [{ y: e.clientY, time: performance.now() }];
      isTracking = true;
      isCommittedDrag = false;

      content.style.transition = 'none';
      content.style.willChange = 'transform';
      touchArea.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!isTracking) return;

      const now = performance.now();
      moveHistory.push({ y: e.clientY, time: now });
      // Keep only samples from the last 100ms
      while (moveHistory.length > 1 && (now - moveHistory[0].time) > 100) {
        moveHistory.shift();
      }

      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = e.clientY - startY;

      // 8px directional hysteresis gate
      if (!isCommittedDrag) {
        if (deltaX > 8 && deltaX > Math.abs(deltaY)) {
          // User is scrolling horizontally or swiping elsewhere: release
          isTracking = false;
          try { touchArea.releasePointerCapture(e.pointerId); } catch (_) {}
          return;
        }
        if (Math.abs(deltaY) > 8) {
          isCommittedDrag = true;
        } else {
          return;
        }
      }

      let targetY = startTransformY + deltaY;

      // Soft rubber-banding if dragged above the resting top edge
      if (targetY < 0) {
        targetY = -window.AppleMotion.rubberband(Math.abs(targetY), window.innerHeight * 0.45);
      }

      content.style.transform = `translate3d(0, ${targetY}px, 0)`;
    };

    const onPointerUp = (e) => {
      if (!isTracking) return;
      isTracking = false;

      try {
        if (touchArea.hasPointerCapture(e.pointerId)) {
          touchArea.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      content.style.willChange = 'auto';

      if (!isCommittedDrag) {
        content.style.transform = `translate3d(0, 0, 0)`;
        return;
      }

      // Calculate release velocity from the sliding history window
      let releaseVelocity = 0;
      if (moveHistory.length >= 2) {
        const first = moveHistory[0];
        const last = moveHistory[moveHistory.length - 1];
        const dt = (last.time - first.time) / 1000;
        if (dt > 0.005) {
          releaseVelocity = (last.y - first.y) / dt;
        }
      }

      const currentY = window.AppleMotion.getLivePresentationTranslateY(content);
      const projectedEndpoint = currentY + window.AppleMotion.project(releaseVelocity);
      const dismissThreshold = Math.min(window.innerHeight * 0.28, 220);

      const shouldDismiss = (projectedEndpoint > dismissThreshold || releaseVelocity > 650) && currentY > -10;

      if (shouldDismiss) {
        window.AppleHaptics.impactLight();
        const sheetHeight = content.getBoundingClientRect().height || window.innerHeight;
        
        activeSpring = window.AppleMotion.spring({
          from: currentY,
          to: sheetHeight + 40,
          velocity: releaseVelocity,
          damping: 0.88, // Momentum flick feel
          response: 0.32,
          onUpdate: (v) => {
            content.style.transform = `translate3d(0, ${v}px, 0)`;
          },
          onComplete: () => {
            activeSpring = null;
            onDismiss();
            content.style.transform = '';
            content.style.transition = '';
          }
        });
      } else {
        // Return home with critical damping (no oscillation)
        activeSpring = window.AppleMotion.spring({
          from: currentY,
          to: 0,
          velocity: releaseVelocity,
          damping: 1.0,
          response: 0.36,
          onUpdate: (v) => {
            content.style.transform = `translate3d(0, ${v}px, 0)`;
          },
          onComplete: () => {
            activeSpring = null;
            content.style.transform = '';
          }
        });
      }
    };

    touchArea.addEventListener('pointerdown', onPointerDown);
    touchArea.addEventListener('pointermove', onPointerMove);
    touchArea.addEventListener('pointerup', onPointerUp);
    touchArea.addEventListener('pointercancel', onPointerUp);
  };

  const dragTargets = [
    {
      sheet: this.elements.slideInSettingsPanel,
      content: this.elements.slideInSettingsPanel,
      onDismiss: () => this.elements.slideInSettingsPanel.classList.remove('show')
    },
    {
      sheet: this.elements.fullInputModal,
      content: this.elements.fullInputModal,
      onDismiss: () => {
        if (this.elements.userInput && this.elements.fullInputTextarea) {
          this.elements.userInput.value = this.elements.fullInputTextarea.value;
          this.elements.userInput.dispatchEvent(new Event('input'));
        }
        this.elements.fullInputModal.classList.remove('show');
      }
    },
    {
      sheet: this.elements.actionSheet,
      content: this.elements.actionSheet?.querySelector('.attachment-popup-content, .action-sheet-content'),
      onDismiss: () => this.elements.actionSheet.classList.remove('show')
    },
    {
      sheet: this.elements.onboardingModal,
      content: document.getElementById('onboardingSlideSheet'),
      onDismiss: () => {
        localStorage.setItem('cohana_visited', 'true');
        if (this.elements.onboardingModal) {
          this.elements.onboardingModal.style.opacity = '0';
          setTimeout(() => { this.elements.onboardingModal.style.display = 'none'; }, 250);
        }
      }
    },
    {
      sheet: this.elements.onboardingModal,
      content: document.getElementById('whatsnewSlideSheet'),
      onDismiss: () => {
        if (window.Logic && window.Logic.dismissUpdate) window.Logic.dismissUpdate();
        if (this.elements.onboardingModal) {
          this.elements.onboardingModal.style.opacity = '0';
          setTimeout(() => { this.elements.onboardingModal.style.display = 'none'; }, 250);
        }
      }
    }
  ];

  dragTargets.forEach(({ sheet, content, onDismiss }) => {
    if (sheet && content) bindFluidDrag(sheet, content, onDismiss);
  });
},
    initCustomCamera() {
        if (document.getElementById('customCameraModalOverlay')) return;
        
        this._cameraFacingMode = 'environment';
        this._cameraAspectRatio = '4:3';
        this._cameraStream = null;
        this._cameraFlipRotation = 0;
        
        const overlay = document.createElement('div');
        overlay.id = 'customCameraModalOverlay';
        overlay.className = 'custom-camera-modal-overlay';
        
        overlay.innerHTML = `
        <div class="custom-camera-viewfinder-card" id="customCamViewfinder">
            <video id="customCameraVideo" class="custom-camera-video" autoplay playsinline muted></video>
            <div id="customCamFlash" class="custom-cam-flash"></div>
            
            <div class="custom-cam-top-bar">
                <button id="customCamAspectBtn" class="custom-cam-aspect-pill" aria-label="Toggle aspect ratio">
                    <span class="custom-cam-aspect-label">ASPECT</span>
                    <span class="custom-cam-aspect-val" id="customCamAspectVal">4:3</span>
                </button>
            </div>
            
            <div class="custom-cam-bottom-bar">
                <button id="customCamCloseBtn" class="custom-cam-circle-btn" aria-label="Close camera">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                
                <button id="customCamShutterBtn" class="custom-cam-shutter-outer" aria-label="Take photo">
                    <span class="custom-cam-shutter-inner"></span>
                </button>
                
                <button id="customCamFlipBtn" class="custom-cam-circle-btn" aria-label="Switch camera">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="custom-cam-flip-icon" id="customCamFlipIcon">
                        <path d="M20 11A8 8 0 0 0 4.5 9M4 5v4h4"></path>
                        <path d="M4 13a8 8 0 0 0 15.5 2M20 19v-4h-4"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
        
        document.body.appendChild(overlay);
        
        const closeBtn = document.getElementById('customCamCloseBtn');
        if (closeBtn) closeBtn.onclick = () => this.closeCustomCamera();
        
        const aspectBtn = document.getElementById('customCamAspectBtn');
        if (aspectBtn) aspectBtn.onclick = () => this.toggleCameraAspectRatio();
        
        const shutterBtn = document.getElementById('customCamShutterBtn');
        if (shutterBtn) shutterBtn.onclick = () => this.captureCustomCameraPhoto();
        
        const flipBtn = document.getElementById('customCamFlipBtn');
        if (flipBtn) flipBtn.onclick = () => this.toggleCameraFacingMode();
        
        overlay.onclick = (e) => {
            if (e.target === overlay) this.closeCustomCamera();
        };
    },
    async openCustomCamera() {
            this.initCustomCamera();
            const overlay = document.getElementById('customCameraModalOverlay');
            if (!overlay) return;
            
            overlay.classList.add('show');
            await this.startCustomCameraStream();
        },
    async startCustomCameraStream() {
                if (this._cameraStream) {
                    this._cameraStream.getTracks().forEach(track => track.stop());
                    this._cameraStream = null;
                }
                
                try {
                    const isUser = this._cameraFacingMode === 'user';
                    const constraints = {
                        video: {
                            facingMode: { ideal: this._cameraFacingMode },
                            width: { ideal: 1920 },
                            height: { ideal: 1080 }
                        },
                        audio: false
                    };
                    
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    this._cameraStream = stream;
                    
                    const video = document.getElementById('customCameraVideo');
                    if (video) {
                        video.srcObject = stream;
                        video.style.transform = isUser ? 'scaleX(-1)' : 'none';
                    }
                } catch (err) {
                    console.warn('Custom camera access error:', err);
                    if (this.elements && this.elements.cameraInput) {
                        this.elements.cameraInput.click();
                    } else {
                        this.showNotification('Unable to access camera stream');
                    }
                    this.closeCustomCamera();
                }
            },
    closeCustomCamera() {
                const overlay = document.getElementById('customCameraModalOverlay');
                if (overlay) {
                    overlay.classList.remove('show');
                }
                if (this._cameraStream) {
                    this._cameraStream.getTracks().forEach(track => track.stop());
                    this._cameraStream = null;
                }
                const video = document.getElementById('customCameraVideo');
                if (video) {
                    video.srcObject = null;
                }
            },
    toggleCameraAspectRatio() {
                const ratios = ['4:3', '16:9', '1:1'];
                const currentIdx = ratios.indexOf(this._cameraAspectRatio || '4:3');
                const nextRatio = ratios[(currentIdx + 1) % ratios.length];
                this._cameraAspectRatio = nextRatio;
                
                const label = document.getElementById('customCamAspectVal');
                if (label) label.textContent = nextRatio;
                
                const card = document.getElementById('customCamViewfinder');
                if (card) {
                    if (nextRatio === '4:3') card.style.aspectRatio = '3 / 4';
                    else if (nextRatio === '16:9') card.style.aspectRatio = '9 / 16';
                    else if (nextRatio === '1:1') card.style.aspectRatio = '1 / 1';
                }
            },
    toggleCameraFacingMode() {
                this._cameraFacingMode = (this._cameraFacingMode === 'environment') ? 'user' : 'environment';
                
                const icon = document.getElementById('customCamFlipIcon');
                if (icon) {
                    this._cameraFlipRotation = (this._cameraFlipRotation || 0) + 180;
                    icon.style.transform = `rotate(${this._cameraFlipRotation}deg)`;
                }
                
                this.startCustomCameraStream();
            },
    captureCustomCameraPhoto() {
                const video = document.getElementById('customCameraVideo');
                const flash = document.getElementById('customCamFlash');
                
                if (!video || !video.videoWidth) return;
                
                if (flash) {
                    flash.classList.add('active');
                    setTimeout(() => flash.classList.remove('active'), 150);
                }
                
                const canvas = document.createElement('canvas');
                const vw = video.videoWidth;
                const vh = video.videoHeight;
                
                let cw = vw;
                let ch = vh;
                let sx = 0;
                let sy = 0;
                
                const targetRatioStr = this._cameraAspectRatio || '4:3';
                if (targetRatioStr === '1:1') {
                    const dim = Math.min(vw, vh);
                    cw = dim;
                    ch = dim;
                    sx = (vw - dim) / 2;
                    sy = (vh - dim) / 2;
                } else if (targetRatioStr === '4:3') {
                    const targetRatio = 3 / 4;
                    if (vw / vh > targetRatio) {
                        cw = Math.round(vh * targetRatio);
                        ch = vh;
                        sx = Math.round((vw - cw) / 2);
                    } else {
                        cw = vw;
                        ch = Math.round(vw / targetRatio);
                        sy = Math.round((vh - ch) / 2);
                    }
                } else if (targetRatioStr === '16:9') {
                    const targetRatio = 9 / 16;
                    if (vw / vh > targetRatio) {
                        cw = Math.round(vh * targetRatio);
                        ch = vh;
                        sx = Math.round((vw - cw) / 2);
                    } else {
                        cw = vw;
                        ch = Math.round(vw / targetRatio);
                        sy = Math.round((vh - ch) / 2);
                    }
                }
                
                canvas.width = cw;
                canvas.height = ch;
                const ctx = canvas.getContext('2d');
                
                if (this._cameraFacingMode === 'user') {
                    ctx.translate(cw, 0);
                    ctx.scale(-1, 1);
                }
                
                ctx.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
                
                canvas.toBlob((blob) => {
                    if (!blob) return;
                    const photoFile = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    
                    if (window.Logic && window.Logic.handleFileSelect) {
                        window.Logic.handleFileSelect(photoFile, 'image');
                    }
                    
                    this.closeCustomCamera();
                }, 'image/jpeg', 0.92);
            },
    
    // --- INPUT BAR CONTROLS ---
autoResizeInput() {
    const input = this.elements.userInput || document.getElementById('userInput');
    const expandBtn = this.elements.expandInputBtn || document.getElementById('expandInputBtn');
    const container = this.elements.inputContainer || document.getElementById('inputContainer');
    if (!input) return;
    
    if (this._resizeRafId) cancelAnimationFrame(this._resizeRafId);
    
    this._resizeRafId = requestAnimationFrame(() => {
        const BASE_HEIGHT = 46;
        input.style.height = 'auto';
        const newHeight = input.scrollHeight;
        
        if (newHeight > BASE_HEIGHT + 6) {
            input.style.height = `${Math.min(newHeight, 140)}px`;
            if (expandBtn) expandBtn.classList.add('show');
            if (container) container.classList.add('expanded-state');
        } else {
            input.style.height = '';
            if (expandBtn) expandBtn.classList.remove('show');
            if (container && !container.classList.contains('preview-active')) {
                container.classList.remove('expanded-state');
            }
        }
        
        if (window.updateBottomBarHeight) {
            window.updateBottomBarHeight();
        }
    });
},
updateInputButtons(hasText, hasImage, hasFile, isStreaming = false) {
    const hasContent = Boolean(hasText || hasImage || hasFile);
    const sendBtn = this.elements.sendButton || document.getElementById('sendButton');
    const stopBtn = this.elements.stopButton || document.getElementById('stopButton');
    const audioBtn = this.elements.audioInputButton || document.getElementById('audioInputButton');
    const sendIcon = document.getElementById('sendButtonIcon');
    
    const voiceNavBtn = document.getElementById('voiceNavButton');
    if (voiceNavBtn) {
        voiceNavBtn.style.setProperty('display', 'none', 'important');
    }
    
    if (isStreaming) {
        if (sendBtn) sendBtn.style.setProperty('display', 'none', 'important');
        if (stopBtn) {
            stopBtn.style.setProperty('display', 'flex', 'important');
            stopBtn.style.transform = 'scale(1)';
        }
        if (audioBtn) audioBtn.style.setProperty('display', 'none', 'important');
        if (this.elements.expandInputBtn) this.elements.expandInputBtn.classList.remove('show');
        if (this.elements.userInput) this.elements.userInput.disabled = true;
    } else {
        if (stopBtn) stopBtn.style.setProperty('display', 'none', 'important');
        if (audioBtn) audioBtn.style.setProperty('display', 'flex', 'important');
        if (this.elements.userInput) this.elements.userInput.disabled = false;
        
        if (sendBtn) {
            sendBtn.style.setProperty('display', 'flex', 'important');
            if (hasContent) {
                if (sendIcon) sendIcon.className = 'fas fa-arrow-up';
                sendBtn.setAttribute('aria-label', 'Send message');
                sendBtn.style.backgroundColor = 'var(--active-blue)';
            } else {
                if (sendIcon) sendIcon.className = 'fas fa-headphones';
                sendBtn.setAttribute('aria-label', 'Voice mode');
            }
        }
    }
},
// --- UI: ui-core.js ---

setDictationState(isDictating) {
        const audioBtn = elements.audioInputButton || elements.voiceInputButton;
        if (audioBtn) {
            if (isDictating) {
                audioBtn.classList.add('active-dictation');
                audioBtn.style.color = 'var(--active-blue, #3486eb)';
                audioBtn.style.transform = 'scale(1.15)';
            } else {
                audioBtn.classList.remove('active-dictation');
                audioBtn.style.color = '';
                audioBtn.style.transform = '';
            }
        }
    },
    
    setVoiceRecordingState(isRecording) {
        this.setDictationState(isRecording);
    },
    setupVoiceRedirectHandler() {
    const voiceNavBtn = elements.voiceNavButton || document.getElementById('voiceNavButton');
    if (voiceNavBtn) {
        // Clear old redirection action
        const newVoiceNavBtn = voiceNavBtn.cloneNode(true);
        voiceNavBtn.parentNode.replaceChild(newVoiceNavBtn, voiceNavBtn);
        
        // Wire up the new Live Mode launcher
        newVoiceNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.LiveMode) {
                window.LiveMode.start();
            }
        });
    }
},
    animateSendButton(){
        elements.sendButton.innerHTML='<i class="fas fa-check"></i>';setTimeout(()=>{
            elements.sendButton.innerHTML='<i class="fas fa-arrow-up"></i>';
        },
        400);
    },
updateAttachmentInputsState(modelType) {
    const isAgent = modelType === 'agent' || (window.State && window.State.appMode === 'agent') || (window.Logic?.State?.appMode === 'agent');
    const cameraBtn = elements.sheetButtons?.camera || document.getElementById('sheetCameraBtn');
    const filesBtn = elements.sheetButtons?.files || document.getElementById('sheetFilesBtn');
    const photosBtn = elements.sheetButtons?.photos || document.getElementById('sheetPhotosBtn');
    const repoRow = document.getElementById('inputRepoRow') || elements.inputRepoRow;
    const userInput = elements.userInput || document.getElementById('userInput');
    
    if (elements.cameraInput) elements.cameraInput.disabled = false;
    if (elements.fileInput) elements.fileInput.disabled = isAgent;
    
    // Update placeholder based on mode layout
    if (userInput) {
        if (isAgent) {
            userInput.setAttribute('placeholder', 'Code anything or type @ for skills...');
        } else {
            userInput.setAttribute('placeholder', typeof t === 'function' ? t('askAnything') : 'Ask Cohana or type @ for plugins...');
        }
    }
    
    // Show/hide repository pill row matching the screenshot layout
    if (repoRow) {
        repoRow.style.display = isAgent ? 'flex' : 'none';
    }
    
    if (window.Logic && window.Logic.getSelectedRepository) {
        this.updateRepoPillUI(window.Logic.getSelectedRepository());
    }
    
    [cameraBtn, filesBtn, photosBtn].forEach(btn => {
        if (!btn) return;
        btn.classList.remove('disabled-agent-mode');
        btn.style.opacity = '';
        btn.style.filter = '';
        btn.style.cursor = '';
        const badge = btn.querySelector('.agent-disabled-badge');
        if (badge) badge.remove();
    });
    
    // In Agent mode, Camera, Photos, and Plugins are available; Files is hidden
    if (cameraBtn) cameraBtn.style.display = 'flex';
    if (photosBtn) photosBtn.style.display = 'flex';
    if (filesBtn) filesBtn.style.display = isAgent ? 'none' : 'flex';
    
    let pluginsBtn = document.getElementById('sheetPluginsBtn');
    const popupContent = document.querySelector('.attachment-popup-content');
    
    if (!pluginsBtn && popupContent) {
        pluginsBtn = document.createElement('button');
        pluginsBtn.id = 'sheetPluginsBtn';
        pluginsBtn.className = 'attachment-popup-row';
        pluginsBtn.innerHTML = `
            <div class="attachment-popup-icon"><i class="fas fa-puzzle-piece"></i></div>
            <span class="attachment-popup-label" data-i18n="plugins">${typeof t === 'function' ? t('Plugins') : 'Plugins'}</span>
        `;
        popupContent.appendChild(pluginsBtn);
        if (elements.sheetButtons) {
            elements.sheetButtons.plugins = pluginsBtn;
        }
        pluginsBtn.onclick = () => {
            if (elements.actionSheet) elements.actionSheet.classList.remove('show');
            if (window.UI && window.UI.openPluginsModal) {
                window.UI.openPluginsModal();
            }
        };
    }
    
    if (pluginsBtn) {
        pluginsBtn.style.display = isAgent ? 'flex' : 'none';
        if (elements.sheetButtons) {
            elements.sheetButtons.plugins = pluginsBtn;
        }
    }
    
    // Refresh active @ mention catalog view if open during mode change
    if (this._atMentionState?.isOpen && this.handleInputAtMention) {
        this.handleInputAtMention(this._atMentionState.activeInput || userInput);
    }
},
initRepoModal() {
    if (document.getElementById('repoModalOverlay')) return;
    
    const modalHtml = `
        <div id="repoModalOverlay" class="repo-modal-overlay">
            <div class="repo-modal-card" id="repoModalCard">
                <div class="repo-modal-handle"></div>
                <div class="repo-modal-header">
                    <div class="repo-header-text">
                        <div class="repo-modal-title">Repositories</div>
                        <div class="repo-modal-subtitle">Attach a Git repository environment (up to 3)</div>
                    </div>
                    <button class="repo-close-btn" id="repoCloseModalBtn" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="repo-list-container" id="repoListContainer">
                    <!-- Populated dynamically -->
                </div>
                
                <div class="repo-add-section" id="repoAddSection">
                    <button class="repo-add-toggle-btn" id="repoAddToggleBtn">
                        <i class="fas fa-plus"></i>
                        <span>Add Repository</span>
                    </button>
                    
                    <form class="repo-add-form" id="repoAddForm" style="display: none;">
                        <input type="text" class="repo-form-input" id="repoNameInput" placeholder="Project / Environment Name (e.g. Backend API)" required autocomplete="off">
                        <input type="url" class="repo-form-input" id="repoUrlInput" placeholder="Repository URL (e.g. https://github.com/org/repo)" required autocomplete="off">
                        <input type="password" class="repo-form-input" id="repoTokenInput" placeholder="Read Access Token (optional, for private repos)" autocomplete="off">
                        <div class="repo-token-hint">Add a Personal Access Token (PAT) for private repositories. Public repos can leave this blank.</div>
                        <div class="repo-form-actions">
                            <button type="button" class="repo-btn-cancel" id="repoCancelAddBtn">Cancel</button>
                            <button type="submit" class="repo-btn-save" id="repoSaveAddBtn">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = modalHtml;
    document.body.appendChild(tempDiv.firstElementChild);
    
    const overlay = document.getElementById('repoModalOverlay');
    const closeBtn = document.getElementById('repoCloseModalBtn');
    const addToggleBtn = document.getElementById('repoAddToggleBtn');
    const addForm = document.getElementById('repoAddForm');
    const cancelBtn = document.getElementById('repoCancelAddBtn');
    
    if (closeBtn) closeBtn.onclick = () => this.closeRepoModal();
    if (overlay) {
        overlay.onclick = (e) => {
            if (e.target === overlay) this.closeRepoModal();
        };
    }
    
    if (addToggleBtn && addForm) {
        addToggleBtn.onclick = () => {
            addToggleBtn.style.display = 'none';
            addForm.style.display = 'flex';
            const nameInput = document.getElementById('repoNameInput');
            if (nameInput) nameInput.focus();
        };
    }
    
    if (cancelBtn && addForm && addToggleBtn) {
        cancelBtn.onclick = () => {
            addForm.reset();
            addForm.style.display = 'none';
            addToggleBtn.style.display = 'flex';
        };
    }
    
    if (addForm) {
        addForm.onsubmit = (e) => {
            e.preventDefault();
            const name = document.getElementById('repoNameInput').value.trim();
            const url = document.getElementById('repoUrlInput').value.trim();
            const token = (document.getElementById('repoTokenInput')?.value || '').trim() || null;
            
            if (!name || !url) return;
            
            if (window.Logic && window.Logic.addRepository) {
                const added = window.Logic.addRepository(name, url, token);
                if (added) {
                    addForm.reset();
                    addForm.style.display = 'none';
                    if (addToggleBtn) addToggleBtn.style.display = 'flex';
                    this.renderRepoList();
                }
            }
        };
    }
},
openRepoModal() {
    this.initRepoModal();
    this.renderRepoList();
    
    const overlay = document.getElementById('repoModalOverlay');
    const card = document.getElementById('repoModalCard');
    if (!overlay || !card) return;
    
    overlay.classList.add('show');
    requestAnimationFrame(() => {
        card.classList.add('show');
    });
},
closeRepoModal() {
    const overlay = document.getElementById('repoModalOverlay');
    const card = document.getElementById('repoModalCard');
    if (!overlay || !card) return;
    
    card.classList.remove('show');
    setTimeout(() => {
        overlay.classList.remove('show');
        const addForm = document.getElementById('repoAddForm');
        const addToggleBtn = document.getElementById('repoAddToggleBtn');
        if (addForm) { addForm.reset(); addForm.style.display = 'none'; }
        if (addToggleBtn) addToggleBtn.style.display = 'flex';
    }, 250);
},
renderRepoList() {
    const container = document.getElementById('repoListContainer');
    const addToggleBtn = document.getElementById('repoAddToggleBtn');
    if (!container) return;
    
    const repos = (window.State && window.State.repositories) || (window.Logic?.State?.repositories) || [];
    const selectedRepoId = (window.State && window.State.selectedRepositoryId) || (window.Logic?.State?.selectedRepositoryId) || null;
    
    container.innerHTML = '';
    
    // Option 1: None / Default Sandbox
    const noneItem = document.createElement('div');
    noneItem.className = `repo-item-card ${!selectedRepoId ? 'selected' : ''}`;
    noneItem.innerHTML = `
        <div class="repo-item-icon"><i class="fas fa-server"></i></div>
        <div class="repo-item-content">
            <div class="repo-item-name">Default Sandbox</div>
            <div class="repo-item-url">Clean Linux VM without mounted repository</div>
            <div class="repo-badges-row">
                <span class="repo-badge repo-badge-public"><i class="fas fa-globe"></i> Fresh VM</span>
            </div>
        </div>
        <div class="repo-item-check"><i class="fas fa-check"></i></div>
    `;
    noneItem.onclick = () => {
        if (window.Logic && window.Logic.selectRepository) {
            window.Logic.selectRepository(null);
            this.renderRepoList();
            this.closeRepoModal();
        }
    };
    container.appendChild(noneItem);
    
    // Repositories List
    repos.forEach(repo => {
        const item = document.createElement('div');
        item.className = `repo-item-card ${selectedRepoId === repo.id ? 'selected' : ''}`;
        
        const isPrivate = Boolean(repo.token);
        const hasEnv = Boolean(repo.environmentId);
        
        item.innerHTML = `
            <div class="repo-item-icon"><i class="fas fa-code-branch"></i></div>
            <div class="repo-item-content">
                <div class="repo-item-name">${this.escapeHTML ? this.escapeHTML(repo.name) : repo.name}</div>
                <div class="repo-item-url">${this.escapeHTML ? this.escapeHTML(repo.url) : repo.url}</div>
                <div class="repo-badges-row">
                    ${isPrivate 
                        ? `<span class="repo-badge repo-badge-private"><i class="fas fa-lock"></i> Private</span>`
                        : `<span class="repo-badge repo-badge-public"><i class="fas fa-globe"></i> Public</span>`
                    }
                    ${hasEnv
                        ? `<span class="repo-badge repo-badge-env"><i class="fas fa-circle-check"></i> Sandbox Ready</span>`
                        : `<span class="repo-badge repo-badge-new"><i class="fas fa-server"></i> New Environment</span>`
                    }
                </div>
            </div>
            <div class="repo-item-check"><i class="fas fa-check"></i></div>
            <button class="repo-delete-icon-btn" type="button" aria-label="Delete repository" title="Delete repository">
                <i class="fas fa-trash-can"></i>
            </button>
        `;
        
        const deleteBtn = item.querySelector('.repo-delete-icon-btn');
        if (deleteBtn) {
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                const confirmed = window.confirm(`Delete repository "${repo.name}"?`);
                if (confirmed && window.Logic && window.Logic.deleteRepository) {
                    window.Logic.deleteRepository(repo.id);
                    this.renderRepoList();
                }
            };
        }
        
        let pressTimer = null;
        let isLongPress = false;
        
        const startPress = () => {
            isLongPress = false;
            item.classList.add('holding');
            pressTimer = setTimeout(() => {
                isLongPress = true;
                item.classList.remove('holding');
                if (navigator.vibrate) navigator.vibrate(50);
                
                const confirmed = window.confirm(`Delete repository "${repo.name}"?`);
                if (confirmed && window.Logic && window.Logic.deleteRepository) {
                    window.Logic.deleteRepository(repo.id);
                    this.renderRepoList();
                }
            }, 650);
        };
        
        const cancelPress = () => {
            item.classList.remove('holding');
            if (pressTimer) clearTimeout(pressTimer);
        };
        
        item.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.repo-delete-icon-btn')) return;
            startPress();
        });
        item.addEventListener('pointerup', (e) => {
            if (e.target.closest('.repo-delete-icon-btn')) return;
            cancelPress();
            if (!isLongPress) {
                if (window.Logic && window.Logic.selectRepository) {
                    window.Logic.selectRepository(repo.id);
                    this.renderRepoList();
                    this.closeRepoModal();
                }
            }
        });
        item.addEventListener('pointercancel', cancelPress);
        item.addEventListener('pointerleave', cancelPress);
        
        container.appendChild(item);
    });
    
    // Manage Add Button State based on 3-repo limit
    if (addToggleBtn) {
        if (repos.length >= 3) {
            addToggleBtn.style.display = 'none';
            let maxNotice = document.getElementById('repoMaxNotice');
            if (!maxNotice) {
                maxNotice = document.createElement('div');
                maxNotice.id = 'repoMaxNotice';
                maxNotice.className = 'repo-max-limit-notice';
                maxNotice.textContent = 'Maximum 3 repositories reached. Tap trash to delete.';
                container.parentNode.appendChild(maxNotice);
            }
        } else {
            addToggleBtn.style.display = 'flex';
            const maxNotice = document.getElementById('repoMaxNotice');
            if (maxNotice) maxNotice.remove();
        }
    }
},
updateRepoPillUI(selectedRepo) {
    const label = document.getElementById('repoSelectorLabel') || elements.repoSelectorLabel;
    const btn = document.getElementById('repoSelectorBtn') || elements.repoSelectorBtn;
    if (!label || !btn) return;
    
    if (selectedRepo && selectedRepo.name) {
        const lockIcon = selectedRepo.token ? '<i class="fas fa-lock" style="font-size: 11px; margin-right: 5px; opacity: 0.85;"></i>' : '';
        label.innerHTML = `${lockIcon}${this.escapeHTML ? this.escapeHTML(selectedRepo.name) : selectedRepo.name}`;
        btn.classList.add('active');
    } else {
        label.textContent = 'Choose repository';
        btn.classList.remove('active');
    }
},
showPreview(type, srcOrName, onDetach) {
    const previewArea = this.elements.previewArea || document.getElementById('previewArea');
    const inputContainer = this.elements.inputContainer || document.getElementById('inputContainer');
    if (!previewArea || !inputContainer) return;
    
    previewArea.innerHTML = '';
    inputContainer.classList.add('preview-active', 'expanded-state');
    
    if (type === 'file') {
        const ext = srcOrName ? srcOrName.split('.').pop().toUpperCase() : 'FILE';
        const fileTypeLabel = ext === 'MD' ? 'Markdown' : ext === 'PDF' ? 'PDF' : ext === 'TXT' ? 'Text' : ext;
        
        previewArea.innerHTML = `
      <div class="preview-card-file">
        <div class="doc-preview-page">
          <div class="doc-preview-lines">
            <div class="doc-line header"></div>
            <div class="doc-line"></div>
            <div class="doc-line"></div>
            <div class="doc-line short"></div>
          </div>
        </div>
        <div class="preview-file-type-pill">${fileTypeLabel}</div>
        <button class="preview-card-close" id="detachFileButton" aria-label="Remove file"><i class="fas fa-times"></i></button>
      </div>`;
        const btn = document.getElementById('detachFileButton');
        if (btn) {
            btn.onclick = (e) => {
                e.stopPropagation();
                window.AppleHaptics.impactLight();
                onDetach();
            };
        }
    } else if (type === 'image') {
        previewArea.innerHTML = `
      <div class="preview-card-image">
        <img id="imagePreview" src="${srcOrName}" alt="Preview">
        <button class="preview-card-close" id="detachImageButton" aria-label="Remove image"><i class="fas fa-times"></i></button>
      </div>`;
        const btn = document.getElementById('detachImageButton');
        if (btn) {
            btn.onclick = (e) => {
                e.stopPropagation();
                window.AppleHaptics.impactLight();
                onDetach();
            };
        }
    }
    
    previewArea.classList.add('has-content');
    this.updateAssetsRowVisibility();
    window.AppleHaptics.selection();
},

hidePreview() {
    const previewArea = this.elements.previewArea || document.getElementById('previewArea');
    if (!previewArea) return;
    previewArea.innerHTML = '';
    previewArea.classList.remove('has-content');
    this.updateAssetsRowVisibility();
},
    updateAssetsRowVisibility() {
    const assetsRow = elements.inputAssetsRow;
    if (!assetsRow) return;
    
    const hasPreviews = elements.previewArea && elements.previewArea.classList.contains('has-content');
    
    if (hasPreviews) {
        assetsRow.style.display = 'flex';
        assetsRow.classList.add('has-content');
        elements.inputContainer.classList.add('preview-active', 'expanded-state');
    } else {
        assetsRow.style.display = 'none';
        assetsRow.classList.remove('has-content');
        elements.inputContainer.classList.remove('preview-active');
        if (elements.userInput.value.length <= 46) {
            elements.inputContainer.classList.remove('expanded-state');
        }
    }
    
    if (elements.previewArea) {
        if (hasPreviews) {
            elements.previewArea.style.setProperty('display', 'flex', 'important');
        } else {
            elements.previewArea.style.setProperty('display', 'none', 'important');
        }
    }
    
    if (window.updateBottomBarHeight) window.updateBottomBarHeight();
},
    updateModePill(modeName,iconClass,onClose){
            const pill=elements.activeModePill;
            const metaBar = document.getElementById('inputMetaBar');
            if(!modeName){
                pill.style.setProperty('display', 'none', 'important');
                pill.innerHTML='';
                if (metaBar) metaBar.classList.remove('has-meta');
                this.updateAssetsRowVisibility();
                return;
            }
            if (metaBar) metaBar.classList.add('has-meta');
            pill.style.setProperty('display', 'flex', 'important');
            // Custom high-fidelity horizontal template
            pill.innerHTML=`<i class="${iconClass}"></i><span>${modeName}</span><button class="close-mode" id="closeModeBtn"><i class="fas fa-times"></i></button>`;
            document.getElementById('closeModeBtn').onclick=(e)=>{e.stopPropagation();onClose();};
            this.updateAssetsRowVisibility();
    },
    toggleTempChatIndicator(active) {
    if (active) {
        elements.tempChatBtn.classList.add('active');
        elements.topBar.classList.add('temp-mode');
        elements.tempChatBtn.innerHTML = '<i class="fas fa-fire"></i>';
    } else {
        elements.tempChatBtn.classList.remove('active');
        elements.topBar.classList.remove('temp-mode');
        elements.tempChatBtn.innerHTML = '<i class="fas fa-ghost"></i>';
    }
    },
    
    // --- PANELS, MODALS & SETTINGS ---
initModelSelector() {
    const effortBtn = document.getElementById('reasoningEffortBtn') || this.elements.reasoningEffortBtn;
    const popup = document.getElementById('reasoningEffortPopup') || this.elements.reasoningEffortPopup;
    const track = document.getElementById('effortSliderTrack');
    const thumb = document.getElementById('effortSliderThumb');
    const label = document.getElementById('effortTitleLabel');
    const dots = document.querySelectorAll('.effort-dot');
    
    if (!effortBtn || !popup || !track) return;
    
    const levels = [
        { id: 'instant', label: 'cx5 Instant' },
        { id: 'medium', label: 'cx5 Medium' },
        { id: 'high', label: 'cx5 High' }
    ];
    
    let currentIndex = 0;
    let thumbSpring = null;
    
    const computeThumbPosition = (index) => {
        const trackWidth = track.clientWidth || 306;
        const thumbWidth = 42;
        const leftPadding = 8;
        const pct = index / (levels.length - 1);
        return leftPadding + pct * (trackWidth - thumbWidth - (leftPadding * 2));
    };
    
    const updateSliderUI = (index, triggerStateChange = true, animate = true) => {
        const prevIndex = currentIndex;
        currentIndex = Math.max(0, Math.min(levels.length - 1, index));
        const selected = levels[currentIndex];
        
        if (prevIndex !== currentIndex) {
            window.AppleHaptics.selection();
        }
        
        const targetLeft = computeThumbPosition(currentIndex);
        
        if (thumbSpring) {
            thumbSpring.stop();
            thumbSpring = null;
        }
        
        if (animate && thumb) {
            const currentLeft = parseFloat(thumb.style.left) || targetLeft;
            thumbSpring = window.AppleMotion.spring({
                from: currentLeft,
                to: targetLeft,
                damping: 1.0, // Clean critically damped snap
                response: 0.28,
                onUpdate: (val) => {
                    thumb.style.left = `${val}px`;
                }
            });
        } else if (thumb) {
            thumb.style.left = `${targetLeft}px`;
        }
        
        if (label) label.textContent = selected.label;
        
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx <= currentIndex);
        });
        
        const icon = effortBtn.querySelector('i');
        if (icon) {
            if (currentIndex > 0) {
                icon.className = 'fas fa-lightbulb';
                icon.style.color = '#3486eb';
            } else {
                icon.className = 'far fa-lightbulb';
                icon.style.color = '';
            }
        }
        
        if (triggerStateChange) {
            if (window.State) window.State.selectedModelType = selected.id;
            if (window.Logic?.State) window.Logic.State.selectedModelType = selected.id;
            if (typeof this.updateAttachmentInputsState === 'function') {
                this.updateAttachmentInputsState(selected.id);
            }
        }
    };
    
    // Instant response toggle on pointerdown
    effortBtn.onclick = (e) => {
        e.stopPropagation();
        window.AppleHaptics.impactLight();
        const isShown = popup.classList.toggle('show');
        if (isShown) {
            updateSliderUI(currentIndex, false, false);
        }
    };
    
    let isDragging = false;
    let trackWidth = 306;
    
    const getNearestIndexFromX = (clientX) => {
        const rect = track.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const pct = x / rect.width;
        return Math.round(pct * (levels.length - 1));
    };
    
    track.addEventListener('pointerdown', (e) => {
        isDragging = true;
        track.setPointerCapture(e.pointerId);
        trackWidth = track.clientWidth || 306;
        const newIdx = getNearestIndexFromX(e.clientX);
        updateSliderUI(newIdx, true, true);
    });
    
    track.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const newIdx = getNearestIndexFromX(e.clientX);
        if (newIdx !== currentIndex) {
            updateSliderUI(newIdx, true, true);
        }
    });
    
    const onPointerRelease = (e) => {
        if (!isDragging) return;
        isDragging = false;
        try { track.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    
    track.addEventListener('pointerup', onPointerRelease);
    track.addEventListener('pointercancel', onPointerRelease);
    
    document.addEventListener('click', (e) => {
        if (!popup.contains(e.target) && e.target !== effortBtn && !effortBtn.contains(e.target)) {
            popup.classList.remove('show');
        }
    });
    
    const initialModel = (window.State && window.State.selectedModelType) || 'instant';
    const initialIdx = levels.findIndex(l => l.id === initialModel);
    updateSliderUI(initialIdx >= 0 ? initialIdx : 0, false, false);
},
setupSearchPopupElements() {
    const leftPanel = document.getElementById('slideLeftPanel');
    if (!leftPanel) return;
    
    // Hide legacy top header
    const topHeader = leftPanel.querySelector('.panel-header-unified');
    if (topHeader) topHeader.style.setProperty('display', 'none', 'important');
    
    // Ensure Close button floats at the top-right
    const closeBtn = document.getElementById('panelCloseBtn');
    if (closeBtn) {
        closeBtn.className = 'panel-close-circle-btn';
        if (closeBtn.parentNode !== leftPanel) leftPanel.appendChild(closeBtn);
    }
    
    // Unified Floating Bottom Dock
    let bottomPill = document.getElementById('panelBottomActionsPill');
    if (!bottomPill) {
        bottomPill = document.createElement('div');
        bottomPill.id = 'panelBottomActionsPill';
        bottomPill.className = 'panel-bottom-actions-pill';
        leftPanel.appendChild(bottomPill);
    }
    
    // Search Icon Button
    let searchBtn = document.getElementById('panelSearchBtn');
    if (!searchBtn) {
        searchBtn = document.createElement('button');
        searchBtn.id = 'panelSearchBtn';
        searchBtn.className = 'panel-bottom-pill-btn';
        searchBtn.setAttribute('aria-label', 'Search chats');
        searchBtn.innerHTML = '<i class="fas fa-search"></i>';
        bottomPill.appendChild(searchBtn);
    } else {
        searchBtn.className = 'panel-bottom-pill-btn';
        if (searchBtn.parentNode !== bottomPill) bottomPill.appendChild(searchBtn);
    }
    
    // New Chat Button
    let newChatBtn = document.getElementById('panelNewChatBtn');
    if (!newChatBtn) {
        newChatBtn = document.createElement('button');
        newChatBtn.id = 'panelNewChatBtn';
        newChatBtn.className = 'panel-bottom-pill-btn';
        newChatBtn.setAttribute('aria-label', 'New chat');
        newChatBtn.innerHTML = '<i class="far fa-edit"></i>';
        bottomPill.appendChild(newChatBtn);
    } else {
        newChatBtn.className = 'panel-bottom-pill-btn';
        newChatBtn.innerHTML = '<i class="far fa-edit"></i>';
        if (newChatBtn.parentNode !== bottomPill) bottomPill.appendChild(newChatBtn);
    }
    
    // Apple Spotlight Floating Search Capsule
    let searchPopup = document.getElementById('panelSearchPopup');
    if (!searchPopup) {
        searchPopup = document.createElement('div');
        searchPopup.id = 'panelSearchPopup';
        searchPopup.className = 'apple-search-spotlight';
        searchPopup.innerHTML = `
                <i class="fas fa-magnifying-glass apple-search-icon"></i>
                <input type="text" class="apple-search-input" id="popupSearchInput" placeholder="Search conversations..." autocomplete="off" data-i18n-placeholder="searchPlaceholder">
                <button class="apple-search-clear-btn" id="popupSearchClearBtn" aria-label="Clear search">
                    <i class="fas fa-times"></i>
                </button>
                <button class="apple-search-close-pill" id="closeSearchPopupBtn">Done</button>
            `;
        leftPanel.appendChild(searchPopup);
    }
    
    const searchInput = searchPopup.querySelector('#popupSearchInput');
    const clearBtn = searchPopup.querySelector('#popupSearchClearBtn');
    const doneBtn = searchPopup.querySelector('#closeSearchPopupBtn');
    
    if (window.UI && window.UI.elements) {
        window.UI.elements.panelSearchInput = searchInput;
    }
    
    // Toggle Search Capsule
    searchBtn.onclick = (e) => {
        e.stopPropagation();
        const isShown = searchPopup.classList.toggle('show');
        if (isShown && searchInput) {
            searchInput.focus();
        }
    };
    
    // Search Input Handling
    if (searchInput) {
        searchInput.oninput = (e) => {
            const query = e.target.value;
            if (clearBtn) clearBtn.classList.toggle('show', query.length > 0);
            if (window.Logic && window.Logic.renderUnifiedPanel) {
                window.Logic.renderUnifiedPanel(query);
            }
        };
    }
    
    // Clear Button Handling
    if (clearBtn) {
        clearBtn.onclick = (e) => {
            e.stopPropagation();
            if (searchInput) {
                searchInput.value = '';
                clearBtn.classList.remove('show');
                searchInput.focus();
            }
            if (window.Logic && window.Logic.renderUnifiedPanel) {
                window.Logic.renderUnifiedPanel('');
            }
        };
    }
    
    // Done / Close Capsule
    if (doneBtn) {
        doneBtn.onclick = (e) => {
            e.stopPropagation();
            searchPopup.classList.remove('show');
            if (searchInput) {
                searchInput.value = '';
                if (clearBtn) clearBtn.classList.remove('show');
            }
            if (window.Logic && window.Logic.renderUnifiedPanel) {
                window.Logic.renderUnifiedPanel('');
            }
        };
    }
    
    // Dismiss when clicking outside
    document.addEventListener('pointerdown', (e) => {
        if (searchPopup && searchPopup.classList.contains('show')) {
            if (!searchPopup.contains(e.target) && e.target !== searchBtn && !searchBtn.contains(e.target)) {
                searchPopup.classList.remove('show');
            }
        }
    });
},
initAtMentionPopup() {
    if (document.getElementById('atMentionPopup')) return;
    
    // Cohana Master Plugin Catalog
    this._pluginsCatalog = [
        {
            handle: '@Study',
            name: 'Study & Learning',
            icon: 'fa-graduation-cap',
            color: '#ff9f0a',
            modes: ['chat', 'agent'],
            description: 'Deep interactive learning, step-by-step explanations and quizzes'
        },
        {
            handle: '@Maps',
            name: 'Google Maps',
            icon: 'fa-map-location-dot',
            color: '#3486eb',
            modes: ['chat', 'agent'],
            description: 'Local navigation, place context, discovery and routes'
        },
        {
            handle: '@Presentation',
            name: 'Slide Deck Builder',
            icon: 'fa-file-powerpoint',
            color: '#ff9f43',
            modes: ['agent'],
            description: 'Generate structured slide decks and presentation blueprints'
        },
        {
            handle: '@Table',
            name: 'Data & Spreadsheets',
            icon: 'fa-table-cells',
            color: '#30d158',
            modes: ['agent'],
            description: 'Parse datasets, tabular formulas, spreadsheets and clean data rows'
        },
        {
            handle: '@Word',
            name: 'Document Writer',
            icon: 'fa-file-lines',
            color: '#0a84ff',
            modes: ['agent'],
            description: 'Synthesize long-form reports, whitepapers, contracts and essays'
        },
        {
            handle: '@PDF',
            name: 'PDF Synthesizer',
            icon: 'fa-file-pdf',
            color: '#ff453a',
            modes: ['agent'],
            description: 'Analyze PDF layouts, extract tables and cross-reference documents'
        }
    ];
    
    this._atMentionState = {
        isOpen: false,
        activeIndex: 0,
        query: '',
        filteredPlugins: [],
        activeInput: null
    };

    const container = document.getElementById('inputContainer') || document.getElementById('bottomBarWrapper');
    if (!container) return;

    const popup = document.createElement('div');
    popup.id = 'atMentionPopup';
    popup.className = 'at-mention-popup';
    popup.setAttribute('role', 'listbox');
    popup.setAttribute('aria-label', 'Plugin mentions');
    popup.innerHTML = `
        <div class="at-mention-header">
            <div class="at-mention-mode-pill">
                <span class="mode-dot"></span>
                <span id="atMentionModeLabel">Chat Mode</span>
            </div>
            <div class="at-mention-hint">↵ select • ↑↓ navigate</div>
        </div>
        <div class="at-mention-list" id="atMentionList"></div>
    `;

    container.appendChild(popup);
    this.elements.atMentionPopup = popup;
    this.elements.atMentionList = popup.querySelector('#atMentionList');

    // Dismiss when tapping outside
    document.addEventListener('pointerdown', (e) => {
        if (this._atMentionState.isOpen) {
            if (!popup.contains(e.target) && e.target !== this.elements.userInput && e.target !== this.elements.fullInputTextarea) {
                this.closeAtMentionPopup();
            }
        }
    });
},

getAppMode() {
    return (window.State && window.State.appMode) || (window.Logic?.State?.appMode) || 'chat';
},

handleInputAtMention(inputElement) {
    if (!inputElement) return;
    this.initAtMentionPopup();

    const text = inputElement.value || '';
    const cursor = inputElement.selectionEnd;
    if (typeof cursor !== 'number') {
        this.closeAtMentionPopup();
        return;
    }

    const beforeCursor = text.slice(0, cursor);
    // Matches @ preceded by start-of-line or whitespace, followed by non-whitespace characters up to cursor
    const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);

    if (!match) {
        this.closeAtMentionPopup();
        return;
    }

    const query = match[1].toLowerCase().trim();
    const currentMode = this.getAppMode();
    const catalog = this._pluginsCatalog || [];

    // Filter by mode first, then by match query
    const filtered = catalog.filter(p => {
        const matchesMode = p.modes.includes(currentMode);
        if (!matchesMode) return false;
        if (!query) return true;
        return (
            p.handle.toLowerCase().includes(query) ||
            p.name.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query)
        );
    });

    this._atMentionState.activeInput = inputElement;
    this._atMentionState.query = query;
    this._atMentionState.filteredPlugins = filtered;
    this._atMentionState.activeIndex = 0;

    this.renderAtMentionList(filtered, currentMode);
    this.openAtMentionPopup(currentMode);
},

renderAtMentionList(plugins, currentMode) {
    const list = this.elements.atMentionList || document.getElementById('atMentionList');
    const modeLabel = document.getElementById('atMentionModeLabel');
    if (!list) return;

    if (modeLabel) {
        modeLabel.textContent = currentMode === 'agent' ? 'Agent Mode Plugins' : 'Chat Mode Plugins';
    }

    list.innerHTML = '';

    if (!plugins || plugins.length === 0) {
        list.innerHTML = `
            <div class="at-mention-empty">
                No matching plugins in ${currentMode === 'agent' ? 'Agent' : 'Chat'} mode
            </div>
        `;
        return;
    }

    plugins.forEach((plugin, index) => {
        const item = document.createElement('div');
        item.className = `at-mention-item ${index === this._atMentionState.activeIndex ? 'selected' : ''}`;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', index === this._atMentionState.activeIndex ? 'true' : 'false');
        item.dataset.index = String(index);

        item.innerHTML = `
            <div class="at-mention-icon-wrap" style="background: ${plugin.color}16; color: ${plugin.color}; border-color: ${plugin.color}30;">
                <i class="fas ${plugin.icon}"></i>
            </div>
            <div class="at-mention-content">
                <div class="at-mention-title-row">
                    <span class="at-mention-handle">${this.escapeHTML(plugin.handle)}</span>
                    <span class="at-mention-name">${this.escapeHTML(plugin.name)}</span>
                </div>
                <div class="at-mention-desc">${this.escapeHTML(plugin.description)}</div>
            </div>
        `;

        item.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.AppleHaptics?.selection();
            this.selectAtMention(plugin);
        });

        item.addEventListener('pointerenter', () => {
            this._atMentionState.activeIndex = index;
            list.querySelectorAll('.at-mention-item').forEach((el, i) => {
                el.classList.toggle('selected', i === index);
                el.setAttribute('aria-selected', i === index ? 'true' : 'false');
            });
        });

        list.appendChild(item);
    });
},

openAtMentionPopup(currentMode) {
    const popup = this.elements.atMentionPopup || document.getElementById('atMentionPopup');
    if (!popup) return;

    this._atMentionState.isOpen = true;
    popup.classList.add('show');
},

closeAtMentionPopup() {
    const popup = this.elements.atMentionPopup || document.getElementById('atMentionPopup');
    if (popup) popup.classList.remove('show');
    if (this._atMentionState) {
        this._atMentionState.isOpen = false;
        this._atMentionState.activeInput = null;
    }
},

navigateAtMention(direction) {
    if (!this._atMentionState?.isOpen) return false;
    const plugins = this._atMentionState.filteredPlugins || [];
    if (plugins.length === 0) return false;

    window.AppleHaptics?.selection();
    const count = plugins.length;
    this._atMentionState.activeIndex = (this._atMentionState.activeIndex + direction + count) % count;

    const list = this.elements.atMentionList || document.getElementById('atMentionList');
    if (list) {
        const items = list.querySelectorAll('.at-mention-item');
        items.forEach((item, idx) => {
            const isSel = idx === this._atMentionState.activeIndex;
            item.classList.toggle('selected', isSel);
            item.setAttribute('aria-selected', isSel ? 'true' : 'false');
            if (isSel) {
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        });
    }
    return true;
},

confirmAtMention() {
    if (!this._atMentionState?.isOpen) return false;
    const plugins = this._atMentionState.filteredPlugins || [];
    const selected = plugins[this._atMentionState.activeIndex];
    if (selected) {
        this.selectAtMention(selected);
        return true;
    }
    return false;
},

selectAtMention(plugin) {
    const input = this._atMentionState.activeInput || this.elements.userInput;
    if (!input || !plugin) return;

    const val = input.value || '';
    const cursor = input.selectionEnd;
    const beforeCursor = val.slice(0, cursor);
    const afterCursor = val.slice(cursor);
    const atIndex = beforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
        const prefix = beforeCursor.slice(0, atIndex);
        const insertion = `${plugin.handle} `;
        input.value = prefix + insertion + afterCursor;

        const newPos = prefix.length + insertion.length;
        input.setSelectionRange(newPos, newPos);
    } else {
        input.value = `${plugin.handle} ${val}`;
    }

    window.AppleHaptics?.impactLight();
    this.closeAtMentionPopup();

    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (this.autoResizeInput) this.autoResizeInput();
},
setupSettingsControls() {
    const autoVoiceKey = 'cohana_auto_voice_mode';
    const memoryKey = 'cohana_memory_enabled';
    const locationKey = 'cohana_location_enabled';
    const voiceKey = 'cohana_live_voice';
    const latKey = 'cohana_user_lat';
    const lngKey = 'cohana_user_lng';
    
    const setSwitch = (button, enabled) => {
        if (!button) return;
        button.classList.toggle('active', enabled);
        button.setAttribute('aria-checked', String(enabled));
    };
    
    // Always resolve live element references to ensure DOM attachment
    const autoVoiceBtn = elements.autoVoiceToggle || document.getElementById('cohanaAutoVoiceToggle');
    const memoryBtn = elements.memoryToggle || document.getElementById('cohanaMemoryToggle');
    const locationBtn = elements.locationToggle || document.getElementById('cohanaLocationToggle');
    const memoryControls = elements.memoryControls || document.getElementById('cohanaMemoryControls');
    const liveVoiceSelect = document.getElementById('liveVoiceSelect');
    
    const memoryEnabled = localStorage.getItem(memoryKey) !== 'false';
    const autoVoiceEnabled = localStorage.getItem(autoVoiceKey) === 'true';
    const locationEnabled = localStorage.getItem(locationKey) === 'true';
    
    setSwitch(memoryBtn, memoryEnabled);
    setSwitch(autoVoiceBtn, autoVoiceEnabled);
    setSwitch(locationBtn, locationEnabled);
    
    if (memoryControls) memoryControls.hidden = !memoryEnabled;
    
    // Live Voice Selection Setup
    if (liveVoiceSelect) {
        const savedVoice = localStorage.getItem(voiceKey) || 'Charon';
        liveVoiceSelect.value = savedVoice;
        liveVoiceSelect.onchange = (e) => {
            const selectedVoice = e.target.value;
            localStorage.setItem(voiceKey, selectedVoice);
            if (window.LiveMode && typeof window.LiveMode.setVoice === 'function') {
                window.LiveMode.setVoice(selectedVoice);
            }
        };
    }
    
    if (autoVoiceBtn) {
        autoVoiceBtn.onclick = (e) => {
            e.stopPropagation();
            const enabled = localStorage.getItem(autoVoiceKey) !== 'true';
            localStorage.setItem(autoVoiceKey, String(enabled));
            setSwitch(autoVoiceBtn, enabled);
        };
    }
    
    if (locationBtn) {
        locationBtn.onclick = (e) => {
            e.stopPropagation();
            const currentlyEnabled = localStorage.getItem(locationKey) === 'true';
            
            if (!currentlyEnabled) {
                if (window.isSecureContext === false) {
                    this.showNotification('Location access requires a secure connection (HTTPS).');
                    return;
                }
                
                if (!navigator.geolocation) {
                    this.showNotification('Geolocation is not supported by your browser.');
                    return;
                }
                
                this.showNotification('Requesting precise location access...');
                
                const geoSuccess = (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    localStorage.setItem(locationKey, 'true');
                    localStorage.setItem(latKey, String(lat));
                    localStorage.setItem(lngKey, String(lng));
                    setSwitch(locationBtn, true);
                    this.showNotification('Location personalization enabled.');
                };
                
                const geoError = (error) => {
                    console.warn('[Geolocation Error]', error);
                    localStorage.setItem(locationKey, 'false');
                    setSwitch(locationBtn, false);
                    
                    let errMsg = 'Location access was unavailable.';
                    if (error.code === error.PERMISSION_DENIED) {
                        errMsg = 'Location permission was denied. Please allow location access in your browser/device settings.';
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        errMsg = 'Location information is currently unavailable.';
                    } else if (error.code === error.TIMEOUT) {
                        errMsg = 'Location request timed out. Please try again.';
                    }
                    this.showNotification(errMsg);
                };
                
                const geoOptions = {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                };
                
                try {
                    navigator.geolocation.getCurrentPosition(geoSuccess, geoError, geoOptions);
                } catch (err) {
                    console.error('[Geolocation Trigger Exception]', err);
                    this.showNotification('Unable to request location: ' + err.message);
                }
            } else {
                localStorage.setItem(locationKey, 'false');
                setSwitch(locationBtn, false);
                this.showNotification('Location personalization turned off.');
            }
        };
    }
    
    if (memoryBtn) {
        memoryBtn.onclick = (e) => {
            e.stopPropagation();
            const enabled = localStorage.getItem(memoryKey) === 'false';
            localStorage.setItem(memoryKey, String(enabled));
            setSwitch(memoryBtn, enabled);
            if (memoryControls) memoryControls.hidden = !enabled;
            this.renderMemoryDropdown();
        };
    }
    
    const memoryTrigger = elements.memoryDropdownTrigger || document.getElementById('cohanaMemoryDropdownTrigger');
    const memoryList = elements.memoryDropdownList || document.getElementById('cohanaMemoryDropdownList');
    
    if (memoryTrigger && memoryList) {
        memoryTrigger.onclick = event => {
            event.stopPropagation();
            const open = memoryTrigger.getAttribute('aria-expanded') === 'true';
            memoryTrigger.setAttribute('aria-expanded', String(!open));
            memoryList.classList.toggle('show', !open);
            if (!open) this.renderMemoryDropdown();
        };
        document.addEventListener('click', event => {
            if (!memoryTrigger?.contains(event.target) && !memoryList?.contains(event.target)) {
                memoryTrigger?.setAttribute('aria-expanded', 'false');
                memoryList?.classList.remove('show');
            }
        });
    }
    
    const infoOverlay = document.getElementById('cohanaMemoryInfoOverlay');
    const infoButton = elements.memoryInfoButton || document.getElementById('cohanaMemoryInfoButton');
    const closeInfo = () => {
        if (!infoOverlay) return;
        infoOverlay.classList.remove('show');
        infoOverlay.setAttribute('aria-hidden', 'true');
    };
    if (infoButton && infoOverlay) {
        infoButton.onclick = () => {
            infoOverlay.classList.add('show');
            infoOverlay.setAttribute('aria-hidden', 'false');
        };
        infoOverlay.onclick = event => {
            if (event.target === infoOverlay) closeInfo();
        };
        document.getElementById('cohanaMemoryInfoClose')?.addEventListener('click', closeInfo);
    }
    
    const deleteAllBtn = elements.deleteAllMemoryButton || document.getElementById('cohanaDeleteAllMemoryButton');
    if (deleteAllBtn) {
        deleteAllBtn.onclick = () => {
            const memories = window.Logic?.State?.memories || [];
            if (!memories.length) {
                this.showNotification('There are no memories to remove');
                return;
            }
            const confirmed = window.confirm('Remove all memories about you? This action cannot be undone.');
            if (!confirmed) return;
            if (window.Logic?.clearAllMemories) window.Logic.clearAllMemories();
            this.renderMemoryDropdown([]);
        };
    }
    
    this.renderMemoryDropdown();
},
    renderMemoryDropdown(memories = null) {
    const list = document.getElementById('cohanaMemoryDropdownList');
    const count = document.getElementById('cohanaMemoryCount');
    if (!list) return;
    
    const source = memories || (window.Logic?.State?.memories || []);
    const items = Array.isArray(source) ? [...source] : [];
    
    if (count) {
        count.textContent = `${items.length} ${items.length === 1 ? 'memory' : 'memories'}`;
    }
    
    list.innerHTML = '';
    
    if (!items.length) {
        list.innerHTML = `
            <div style="padding:24px 16px;text-align:center;color:#8e8e93;font-size:13px;">
                <i class="fas fa-brain" style="display:block;font-size:24px;margin-bottom:8px;color:#3486eb;"></i>
                No memories yet.
            </div>
        `;
        return;
    }
    
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).forEach(memory => {
        const row = document.createElement('div');
        row.className = 'cohana-memory-item';
        
        const icon = {
            preference: 'fa-heart',
            behavior: 'fa-sliders-h',
            rule: 'fa-gavel'
        } [memory.type] || 'fa-lightbulb';
        
        const iconEl = document.createElement('div');
        iconEl.className = 'cohana-memory-item-icon';
        iconEl.innerHTML = `<i class="fas ${icon}"></i>`;
        
        const copy = document.createElement('div');
        copy.className = 'cohana-memory-item-copy';
        
        const title = document.createElement('div');
        title.className = 'cohana-memory-item-title';
        title.textContent = memory.title || 'Memory';
        
        const content = document.createElement('div');
        content.className = 'cohana-memory-item-content';
        content.textContent = memory.content || '';
        
        copy.append(title, content);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'cohana-memory-delete';
        deleteBtn.type = 'button';
        deleteBtn.setAttribute('aria-label', 'Delete memory');
        deleteBtn.innerHTML = '<i class="fas fa-trash-can"></i>';
        deleteBtn.addEventListener('click', event => {
            event.stopPropagation();
            if (window.Logic?.deleteMemory) {
                window.Logic.deleteMemory(memory.id);
                this.renderMemoryDropdown();
            }
        });
        
        row.append(iconEl, copy, deleteBtn);
        list.appendChild(row);
    });

    },
    renderOnboarding() {
    const modal = elements.onboardingModal;
    if (!modal) return;
    
    modal.className = 'action-sheet-backdrop';
    modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 3000; display: none; opacity: 0; transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1); justify-content: center; align-items: flex-end;';
    modal.innerHTML = '';
    
    if (!document.getElementById('cohana-apple-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'cohana-apple-modal-styles';
        style.textContent = `
            .apple-minimal-sheet {
                width: 100%;
                max-width: 480px;
                max-height: 98vh;
                background: rgba(24, 24, 28, 0.85);
                backdrop-filter: blur(50px) saturate(190%);
                -webkit-backdrop-filter: blur(50px) saturate(190%);
                border-radius: 38px;
                border: 1px solid rgba(255, 255, 255, 0.09);
                border-bottom: none;
                padding: 12px 28px 36px 28px;
                box-sizing: border-box;
                transform: translateY(100%);
                transition: transform 0.42s cubic-bezier(0.175, 0.885, 0.32, 1.15);
                display: flex;
                flex-direction: column;
                overflow-y: auto;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", sans-serif;
                -webkit-font-smoothing: antialiased;
            }
            .apple-minimal-sheet.show {
                transform: translateY(0);
            }
            .apple-sheet-glyph {
                width: 58px;
                height: 58px;
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.09);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                color: #ffffff;
                margin: 4px auto 20px auto;
                flex-shrink: 0;
            }
            .apple-sheet-header {
                text-align: center;
                margin-bottom: 28px;
            }
            .apple-sheet-title {
                font-size: 29px;
                font-weight: 700;
                letter-spacing: -0.03em;
                line-height: 1.2;
                color: #ffffff;
                margin-bottom: 8px;
            }
            .apple-sheet-desc {
                font-size: 15px;
                line-height: 1.5;
                color: rgba(255, 255, 255, 0.58);
                letter-spacing: -0.01em;
                max-width: 360px;
                margin: 0 auto;
            }
            .apple-sheet-features {
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-bottom: 34px;
                padding: 0 4px;
            }
            .apple-sheet-row {
                display: flex;
                align-items: flex-start;
                gap: 16px;
            }
            .apple-sheet-iconbox {
                width: 38px;
                height: 38px;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                color: rgba(255, 255, 255, 0.9);
                flex-shrink: 0;
                margin-top: 2px;
            }
            .apple-sheet-content {
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
            .apple-sheet-row-title {
                font-size: 15.5px;
                font-weight: 600;
                color: #ffffff;
                letter-spacing: -0.015em;
            }
            .apple-sheet-row-desc {
                font-size: 13.5px;
                line-height: 1.45;
                color: rgba(255, 255, 255, 0.58);
                letter-spacing: -0.005em;
            }
            .apple-sheet-btn-primary {
                width: 100%;
                height: 52px;
                background: #ffffff;
                color: #000000;
                border: none;
                border-radius: 26px;
                font-size: 16px;
                font-weight: 600;
                letter-spacing: -0.015em;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.12s ease, background-color 0.2s ease;
                font-family: inherit;
            }
            .apple-sheet-btn-primary:active {
                transform: scale(0.97);
                background-color: #e5e5ea;
            }
            @media (min-width: 768px) {
                .apple-minimal-sheet {
                    border-radius: 36px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.09);
                    margin-bottom: 30px;
                    max-height: 820px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    const sheet = document.createElement('div');
    sheet.className = 'apple-minimal-sheet';
    sheet.id = 'onboardingSlideSheet';
    sheet.innerHTML = `
        
        <div class="apple-sheet-glyph">
            <i class="fa-solid fa-feather"></i>
        </div>

        <div class="apple-sheet-header">
            <div class="apple-sheet-title">Welcome to Cohana</div>
            <div class="apple-sheet-desc">A private, high-performance thinking environment built for deep work and speed.</div>
        </div>

        <div class="apple-sheet-features">
            <div class="apple-sheet-row">
                <div class="apple-sheet-iconbox">
                    <i class="fa-solid fa-microchip"></i>
                </div>
                <div class="apple-sheet-content">
                    <div class="apple-sheet-row-title">Reasoning at Scale</div>
                    <div class="apple-sheet-row-desc">Adaptive reasoning models structured to tackle complex logic and multidisciplinary queries.</div>
                </div>
            </div>

            <div class="apple-sheet-row">
                <div class="apple-sheet-iconbox">
                    <i class="fa-solid fa-arrow-pointer"></i>
                </div>
                <div class="apple-sheet-content">
                    <div class="apple-sheet-row-title">Autonomous Agent</div>
                    <div class="apple-sheet-row-desc">Computer-use engine capable of executing live browser research and data retrieval.</div>
                </div>
            </div>

            <div class="apple-sheet-row">
                <div class="apple-sheet-iconbox">
                    <i class="fa-solid fa-shield-halved"></i>
                </div>
                <div class="apple-sheet-content">
                    <div class="apple-sheet-row-title">Persistent Memory</div>
                    <div class="apple-sheet-row-desc">Remembers your preferences and past context privately without cloud training.</div>
                </div>
            </div>
        </div>

        <button class="apple-sheet-btn-primary" id="onboardingStartBtn">
            Get Started
        </button>
    `;
    
    modal.appendChild(sheet);
    
    const dismissOnboarding = () => {
        localStorage.setItem('cohana_visited', 'true');
        sheet.classList.remove('show');
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 350);
    };
    
    const startBtn = sheet.querySelector('#onboardingStartBtn');
    if (startBtn) startBtn.onclick = dismissOnboarding;
    
    modal.onclick = (e) => {
        if (e.target === modal) dismissOnboarding();
    };
    
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        sheet.classList.add('show');
    });

    },
    toggleScrollButton(show){
        if(show)elements.scrollToBottomBtn.classList.add('show');
        else elements.scrollToBottomBtn.classList.remove('show');
    },
    
    // --- TOASTS & NOTIFICATIONS ---
    showUndoToast(data) {
        if (!elements.undoToast) return;
        const isObj = typeof data === 'object' && data !== null;
        const msg = isObj ? (data.message || `Deleted "${data.title || ''}"`) : String(data);
        const span = elements.undoToast.querySelector('span');
        if (span) span.textContent = msg;
        
        const hasUndo = isObj && typeof data.onUndo === 'function';
        if (elements.undoBtn) {
            elements.undoBtn.style.display = hasUndo ? 'inline-block' : 'none';
            elements.undoBtn.onclick = hasUndo ? () => {
                data.onUndo();
                elements.undoToast.classList.remove('show');
            } : null;
        }
        
        if (elements.undoToast._toastTimer) clearTimeout(elements.undoToast._toastTimer);
        elements.undoToast.classList.add('show');
        const dur = (isObj && data.duration) ? data.duration : (hasUndo ? 5000 : 3000);
        elements.undoToast._toastTimer = setTimeout(() => {
            elements.undoToast.classList.remove('show');
            if (elements.undoBtn) elements.undoBtn.onclick = null;
        }, dur);
    },
    showNotification(text, duration = 3000) {
        this.showUndoToast({ message: text, duration });
    },
    showDraftRestoredHint() {
        this.showNotification('Draft restored', 3000);
    },
    updateRateLimitUI(){
        const state=getRateState();
        if(state.used>=DAILY_LIMIT) this.showRateLimitHint(state.resetAt);
        else this.clearRateLimitHint();
    },
    showRateLimitHint(resetAt) {
    const time = new Date(resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    elements.activeModePill.textContent = `Limit reached Â· resets at ${time}`;
    elements.activeModePill.classList.add('rate-limited');
    elements.activeModePill.style.setProperty('display', 'flex', 'important');
    elements.sendButton.disabled = true;
},
    clearRateLimitHint() {
        if (elements.activeModePill.classList.contains('rate-limited')) {
            elements.activeModePill.textContent = '';
            elements.activeModePill.classList.remove('rate-limited');
            elements.activeModePill.style.setProperty('display', 'none', 'important');
            elements.sendButton.disabled = false;
        }
    },
  });
})();