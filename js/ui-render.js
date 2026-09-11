(function() {
  window.UI = window.UI || {};
  
  // Helper shorthand to access DOM elements inside rendering methods
    const elements = new Proxy({}, {
        get(target, prop) {
            return window.UI?.elements?.[prop] || document.getElementById(prop);
        }
    });
  
  Object.assign(window.UI, {
    
    // --- CHAT & MESSAGE RENDERING ---

    attachMessageActionsToLastBotMessage() {
    const container = elements.chatContainer;
    if (!container) return;
    const lastMsg = container.lastElementChild;
    if (!lastMsg || !lastMsg.classList.contains('bot-wrapper')) return;
    
    const mc = lastMsg.querySelector('.message-container');
    if (!mc) return;
    
    // Prevent duplicate action bars if already rendered
    if (mc.querySelector('.message-action-bar')) return;
    
    const textEl = mc.querySelector('.message-text');
    const text = textEl ? textEl.innerText : '';
    
    const actionBar = this.createMessageActions(text, 'bot', lastMsg);
    mc.appendChild(actionBar);

    },
// --- WELCOME PLACEHOLDER & AMBIENT GLOW TOGGLE ---
showWelcomePlaceholder(message) {
    if (!this.elements.chatContainer) return;
    
    const glow = document.querySelector('.ambient-glow');
    if (glow) {
        glow.classList.remove('hide');
    }
    
    let placeholder = this.elements.welcomePlaceholder || document.getElementById('welcomePlaceholder');
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.id = 'welcomePlaceholder';
        placeholder.className = 'welcome-placeholder';
        this.elements.welcomePlaceholder = placeholder;
    }
    if (!this.elements.chatContainer.contains(placeholder)) {
        this.elements.chatContainer.appendChild(placeholder);
    }
    
    const hasMessages = Array.from(this.elements.chatContainer.children).some(child =>
        child !== placeholder && (
            child.classList.contains('message-wrapper') ||
            child.classList.contains('bot-wrapper') ||
            child.classList.contains('user-wrapper')
        )
    );
    
    if (hasMessages) {
        this.hideWelcomePlaceholder();
        return;
    }
    
    // High-Fidelity Apple Temporary Chat Hero State
    if (window.Logic && window.Logic.State && window.Logic.State.isTemporaryChat) {
        placeholder.innerHTML = `
            <div class="temp-chat-hero-card">
                <div class="temp-chat-hero-icon">
                    <i class="fas fa-fire"></i>
                </div>
                <div class="welcome-text" style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.024em; margin-bottom: 10px;">
                    Temporary Chat
                </div>
                <div class="welcome-subtext" style="font-size: 15.5px; color: rgba(255, 255, 255, 0.6); max-width: 360px; line-height: 1.55; margin: 0 auto;">
                    Messages in this chat aren't saved to your history, won't create memories, and won't be kept after you leave.
                </div>
                <button class="temp-exit-pill-btn" id="exitTempWelcomeBtn" type="button">
                    <i class="fas fa-arrow-left"></i>
                    <span>Exit Temporary Chat</span>
                </button>
            </div>
        `;
        
        const exitBtn = placeholder.querySelector('#exitTempWelcomeBtn');
        if (exitBtn) {
            exitBtn.onclick = (e) => {
                e.stopPropagation();
                if (window.Logic && window.Logic.toggleTempChatMode) {
                    window.Logic.toggleTempChatMode();
                }
            };
        }
    } else {
        const welcomeText = (message && message.text) ?
            message.text :
            (window.Logic && window.Logic.getRandomWelcomeMessage ?
                window.Logic.getRandomWelcomeMessage() :
                (typeof i18next !== 'undefined' ? i18next.t('welcomeUser') : 'Hi! What are you interested in?'));
        
        placeholder.innerHTML = `
            <img src="logo.png" alt="Logo" class="welcome-logo" style="width: 86px; height: 86px; margin-bottom: 26px; animation: slideInFadeIn 0.8s var(--ease-spring);">
            <div class="welcome-text">${welcomeText}</div>
        `;
    }
    
    placeholder.classList.add('show');
},

    hideWelcomePlaceholder() {
        // 1. Hide welcome text
        const placeholder = elements.welcomePlaceholder || document.getElementById('welcomePlaceholder');
        if (placeholder) {
            placeholder.classList.remove('show');
        }

        // 2. Remove ambient glow smoothly so the background becomes pure OLED black
        const glow = document.querySelector('.ambient-glow');
        if (glow) {
            glow.classList.add('hide');
        }
    },
renderPluginsList(query = '', category = 'all') {
    const grid = document.getElementById('pluginsListGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const q = query.toLowerCase().trim();
    const plugins = this._availablePlugins || [];
    
    const filtered = plugins.filter(p => {
        const matchesCategory = category === 'all' || p.category === category;
        const matchesQuery = !q ||
            p.handle.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.categoryName.toLowerCase().includes(q);
        return matchesCategory && matchesQuery;
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 16px; text-align: center; color: rgba(255, 255, 255, 0.45); gap: 12px;">
                <i class="fas fa-puzzle-piece" style="font-size: 32px; opacity: 0.4;"></i>
                <span style="font-size: 15px; font-weight: 500;">No matching plugins found</span>
            </div>
        `;
        return;
    }
    
    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'plugin-skill-card';
        card.innerHTML = `
            <div class="plugin-skill-top">
                <div class="plugin-skill-icon" style="background: ${p.color}18; color: ${p.color}; border-color: ${p.color}35;">
                    <i class="fas ${p.icon}"></i>
                </div>
                <div class="plugin-skill-title-block">
                    <div class="plugin-skill-name">${p.name}</div>
                    <div class="plugin-skill-handle">${p.handle}</div>
                </div>
                <span class="plugin-category-badge">${p.categoryName}</span>
            </div>
            <div class="plugin-skill-description">${p.description}</div>
            <div class="plugin-skill-footer">
                <button class="plugin-use-btn" data-handle="${p.handle}">
                    <i class="fas fa-plus"></i> Use Plugin
                </button>
            </div>
        `;
        
        const useBtn = card.querySelector('.plugin-use-btn');
        useBtn.onclick = (e) => {
            e.stopPropagation();
            this.insertPluginHandle(p.handle);
        };
        
        card.onclick = () => {
            this.insertPluginHandle(p.handle);
        };
        
        grid.appendChild(card);
    });
},
insertPluginHandle(handle) {
    const input = UI.elements.userInput;
    if (input) {
        const current = input.value;
        const toInsert = handle + ' ';
        if (!current.includes(handle)) {
            input.value = current.trim() ? `${toInsert}${current}` : toInsert;
        }
        UI.autoResizeInput();
        input.focus();
        if (window.Logic && window.Logic.updateInputUI) {
            window.Logic.updateInputUI();
        }
    }
    this.closePluginsModal();
    this.showNotification(`Added ${handle} to your prompt`);
},
initPluginsModal() {
    if (document.getElementById('pluginsModalOverlay')) return;
    
    const plugins = [
        {
            handle: '@Study',
            name: 'Study & Learning',
            icon: 'fa-graduation-cap',
            color: '#ff9f0a',
            category: 'education',
            categoryName: 'Education',
            description: 'Interactive tutoring, concept breakdowns, step-by-step guidance and structured learning.'
        },
        {
            handle: '@Maps',
            name: 'Google Maps',
            icon: 'fa-map-location-dot',
            color: '#3486eb',
            category: 'location',
            categoryName: 'Location',
            description: 'Contextual Google Maps integration, precise local search, directions and geographical discovery.'
        },
        {
            handle: '@Presentation',
            name: 'Slide Deck Builder',
            icon: 'fa-file-powerpoint',
            color: '#ff9f43',
            category: 'productivity',
            categoryName: 'Productivity',
            description: 'Generates professional slide decks, topic structures, executive summaries, and presentation blueprints.'
        },
        {
            handle: '@Table',
            name: 'Data & Spreadsheets',
            icon: 'fa-table-cells',
            color: '#30d158',
            category: 'data',
            categoryName: 'Data Analysis',
            description: 'Parses complex datasets, formats markdown tables, cleans data rows, and calculates tabular formulas.'
        },
        {
            handle: '@Word',
            name: 'Document Writer',
            icon: 'fa-file-lines',
            color: '#0a84ff',
            category: 'productivity',
            categoryName: 'Writing',
            description: 'Synthesizes long-form reports, whitepapers, contracts, essays, and structured professional documentation.'
        },
        {
            handle: '@PDF',
            name: 'PDF Synthesizer',
            icon: 'fa-file-pdf',
            color: '#ff453a',
            category: 'data',
            categoryName: 'Documents',
            description: 'Analyzes PDF structures, extracts tables, cross-references multi-page references, and answers document queries.'
        }
    ];

    this._availablePlugins = plugins;
    
    const overlay = document.createElement('div');
    overlay.id = 'pluginsModalOverlay';
    overlay.className = 'plugins-modal-overlay';
    overlay.innerHTML = `
        <div class="plugins-sheet-card" id="pluginsSheetCard">
            <div class="plugins-sheet-handle"></div>
            
            <div class="plugins-sheet-header">
                <div class="plugins-header-text">
                    <div class="plugins-sheet-title">Agent Plugins & Skills</div>
                    <div class="plugins-sheet-subtitle">Mention plugins with @ in your prompt to empower Cohana</div>
                </div>
                <button class="plugins-close-btn" id="pluginsModalCloseBtn" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="plugins-search-bar">
                <i class="fas fa-magnifying-glass plugins-search-icon"></i>
                <input type="text" id="pluginsSearchInput" class="plugins-search-input" placeholder="Search skills (e.g. Study, Maps, PDF)..." autocomplete="off">
            </div>

            <div class="plugins-pills-row" id="pluginsCategoryFilter">
                <button class="plugins-category-pill active" data-cat="all">All</button>
                <button class="plugins-category-pill" data-cat="education">Education</button>
                <button class="plugins-category-pill" data-cat="location">Location</button>
                <button class="plugins-category-pill" data-cat="productivity">Productivity</button>
                <button class="plugins-category-pill" data-cat="data">Data</button>
            </div>

            <div class="plugins-list-grid" id="pluginsListGrid"></div>
        </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = document.getElementById('pluginsModalCloseBtn');
    if (closeBtn) closeBtn.onclick = () => this.closePluginsModal();

    overlay.onclick = (e) => {
        if (e.target === overlay) this.closePluginsModal();
    };

    const searchInput = document.getElementById('pluginsSearchInput');
    if (searchInput) {
        searchInput.oninput = () => {
            const activeCat = overlay.querySelector('.plugins-category-pill.active')?.dataset.cat || 'all';
            this.renderPluginsList(searchInput.value, activeCat);
        };
    }

    const catPills = overlay.querySelectorAll('.plugins-category-pill');
    catPills.forEach(pill => {
        pill.onclick = () => {
            catPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const q = searchInput ? searchInput.value : '';
            this.renderPluginsList(q, pill.dataset.cat);
        };
    });

    // Gesture swipe-down to dismiss
    const sheet = overlay.querySelector('#pluginsSheetCard');
    const handle = overlay.querySelector('.plugins-sheet-handle');
    if (sheet && handle) {
        let startY = 0;
        let isDragging = false;

        handle.addEventListener('pointerdown', (e) => {
            startY = e.clientY;
            isDragging = true;
            sheet.style.transition = 'none';
            handle.setPointerCapture(e.pointerId);
        });

        handle.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const diffY = e.clientY - startY;
            if (diffY > 0) {
                sheet.style.transform = `translateY(${diffY}px)`;
            }
        });

        const endDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;
            try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
            const diffY = e.clientY - startY;
            sheet.style.transition = 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)';
            if (diffY > 120) {
                this.closePluginsModal();
            } else {
                sheet.style.transform = '';
            }
        };

        handle.addEventListener('pointerup', endDrag);
        handle.addEventListener('pointercancel', endDrag);
    }
},
openPluginsModal() {
    this.initPluginsModal();
    const overlay = document.getElementById('pluginsModalOverlay');
    const sheet = document.getElementById('pluginsSheetCard');
    const searchInput = document.getElementById('pluginsSearchInput');
    
    if (searchInput) searchInput.value = '';
    const firstPill = overlay?.querySelector('.plugins-category-pill[data-cat="all"]');
    if (firstPill) {
        overlay.querySelectorAll('.plugins-category-pill').forEach(p => p.classList.remove('active'));
        firstPill.classList.add('active');
    }
    
    this.renderPluginsList('', 'all');
    
    if (overlay && sheet) {
        sheet.style.transform = '';
        overlay.classList.add('show');
        requestAnimationFrame(() => {
            sheet.classList.add('show');
        });
    }
},
closePluginsModal() {
    const overlay = document.getElementById('pluginsModalOverlay');
    const sheet = document.getElementById('pluginsSheetCard');
    if (sheet) {
        sheet.classList.remove('show');
    }
    if (overlay) {
        overlay.classList.remove('show');
    }
},
    // --- CHAT & MESSAGE RENDERING ---
    addMessageToChat(sender, text, imageUrl, fileName, fromHistory = false, attachments = null) {
        this.hideWelcomePlaceholder();
        const mw = document.createElement('div');
        mw.classList.add('message-wrapper', sender + '-wrapper');
        const mc = document.createElement('div');
        mc.className = `message-container ${sender}-message-container`;
        const md = document.createElement('div');
        md.className = `message ${sender}-message`;
        md.style.userSelect = 'text';
        md.style.webkitUserSelect = 'text';
        
        if (sender === 'user') {
            const atts = attachments ? [...attachments] : [];
            
            if (atts.length === 0) {
                if (imageUrl) {
                    atts.push({ type: 'image', previewUrl: imageUrl });
                } else if (fileName) {
                    atts.push({ type: 'file', file: { name: fileName } });
                }
            }
            
            // Render Attachment Thumbnails
            if (atts.length === 1) {
                const att = atts[0];
                if (att.type === 'image') {
                    const card = document.createElement('div');
                    card.style.cssText = 'width: 260px; height: 260px; border-radius: 24px; overflow: hidden; margin-bottom: 10px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: var(--premium-shadow); flex-shrink: 0;';
                    const img = document.createElement('img');
                    img.src = att.previewUrl;
                    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';
                    card.appendChild(img);
                    mc.appendChild(card);
                } else if (att.type === 'video') {
                    const card = document.createElement('div');
                    card.className = 'user-single-attachment-video';
                    card.style.cssText = 'width: 260px; height: 260px; border-radius: 24px; overflow: hidden; margin-bottom: 10px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: var(--premium-shadow); flex-shrink: 0; position: relative;';
                    
                    const video = document.createElement('video');
                    video.src = att.previewUrl;
                    video.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';
                    video.preload = 'metadata';
                    
                    const playBtn = document.createElement('button');
                    playBtn.style.cssText = 'position: absolute; bottom: 12px; left: 12px; background: rgba(255, 255, 255, 0.92); color: #000000; border: none; border-radius: 20px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; backdrop-filter: blur(10px); box-shadow: 0 4px 14px rgba(0,0,0,0.2); transition: transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1); z-index: 2;';
                    playBtn.innerHTML = `<i class="fas fa-play"></i> ${att.durationStr || '0:12'}`;
                    
                    card.appendChild(video);
                    card.appendChild(playBtn);
                    mc.appendChild(card);
                    
                    playBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (video.paused) {
                            video.play();
                            playBtn.innerHTML = `<i class="fas fa-pause"></i> Pause`;
                            playBtn.style.opacity = '0.5';
                        } else {
                            video.pause();
                            playBtn.innerHTML = `<i class="fas fa-play"></i> ${att.durationStr || '0:12'}`;
                            playBtn.style.opacity = '1';
                        }
                    };
                    
                    video.onended = () => {
                        playBtn.innerHTML = `<i class="fas fa-play"></i> ${att.durationStr || '0:12'}`;
                        playBtn.style.opacity = '1';
                    };
                } else if (att.type === 'audio') {
                    const card = document.createElement('div');
                    card.className = 'user-single-attachment-audio';
                    card.style.marginBottom = '10px';
                    
                    const playBtn = document.createElement('button');
                    playBtn.className = 'voice-play-btn';
                    playBtn.setAttribute('aria-label', 'Play voice message');
                    
                    const playIconSVG = `<svg viewBox="0 0 24 24" class="voice-play-icon" style="width: 12px; height: 14px; display: block; fill: currentColor; transform: translateX(1px);"><path d="M4 2v20l17-10z" /></svg>`;
                    const pauseIconSVG = `<svg viewBox="0 0 24 24" class="voice-pause-icon" style="width: 12px; height: 14px; display: block; fill: currentColor;"><path d="M4 2h4v20H4zm12 0h4v20h-4z" /></svg>`;
                    
                    playBtn.innerHTML = playIconSVG;
                    
                    const waveformContainer = document.createElement('div');
                    waveformContainer.className = 'voice-waveform';
                    
                    const barHeights = [4, 4, 4, 18, 18, 8, 4, 4, 14, 4, 4, 18, 4, 18, 4, 18, 4, 4, 4];
                    const bars = [];
                    
                    barHeights.forEach(h => {
                        const bar = document.createElement('div');
                        bar.className = 'voice-bar';
                        bar.style.height = `${h}px`;
                        waveformContainer.appendChild(bar);
                        bars.push(bar);
                    });
                    
                    const audio = document.createElement('audio');
                    audio.src = att.previewUrl;
                    audio.style.display = 'none';
                    
                    card.appendChild(playBtn);
                    card.appendChild(waveformContainer);
                    card.appendChild(audio);
                    
                    audio.addEventListener('timeupdate', () => {
                        if (audio.duration) {
                            const pct = (audio.currentTime / audio.duration) * 100;
                            const barCount = bars.length;
                            bars.forEach((bar, index) => {
                                if ((index / barCount) * 100 <= pct) {
                                    bar.classList.add('played');
                                } else {
                                    bar.classList.remove('played');
                                }
                            });
                        }
                    });
                    
                    audio.addEventListener('ended', () => {
                        playBtn.innerHTML = playIconSVG;
                        card.classList.remove('playing');
                        bars.forEach(bar => bar.classList.remove('played'));
                    });
                    
                    playBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (audio.paused) {
                            document.querySelectorAll('audio').forEach(aud => {
                                if (aud !== audio) {
                                    aud.pause();
                                    const otherCard = aud.closest('.user-single-attachment-audio');
                                    if (otherCard) {
                                        otherCard.classList.remove('playing');
                                        const otherPlayBtn = otherCard.querySelector('.voice-play-btn');
                                        if (otherPlayBtn) otherPlayBtn.innerHTML = playIconSVG;
                                    }
                                }
                            });
                            audio.play();
                            playBtn.innerHTML = pauseIconSVG;
                            card.classList.add('playing');
                        } else {
                            audio.pause();
                            playBtn.innerHTML = playIconSVG;
                            card.classList.remove('playing');
                        }
                    };
                    
                    mc.appendChild(card);
                } else {
                    const card = document.createElement('div');
                    card.style.cssText = 'width: 220px; height: 110px; background: rgba(35, 35, 40, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: var(--premium-shadow); flex-shrink: 0; padding: 16px; box-sizing: border-box;';
                    
                    const icon = document.createElement('i');
                    icon.className = 'fa-solid fa-file-lines';
                    icon.style.cssText = 'font-size: 32px; color: var(--active-blue); filter: drop-shadow(0 2px 8px rgba(52, 134, 235, 0.4));';
                    
                    const name = document.createElement('span');
                    name.style.cssText = 'color: #ffffff; font-size: 13.5px; font-weight: 500; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;';
                    name.textContent = att.file?.name || fileName || 'File';
                    
                    card.appendChild(icon);
                    card.appendChild(name);
                    mc.appendChild(card);
                }
            } else if (atts.length > 1) {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; flex-direction: row; justify-content: flex-end; gap: 10px; margin-bottom: 10px; width: 100%; max-width: 100%; flex-wrap: wrap;';
                atts.forEach(att => {
                    const card = document.createElement('div');
                    card.style.cssText = 'width: 100px; height: 100px; border-radius: 18px; overflow: hidden; position: relative; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: var(--premium-shadow); flex-shrink: 0; box-sizing: border-box;';
                    if (att.type === 'image') {
                        const img = document.createElement('img');
                        img.src = att.previewUrl;
                        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';
                        card.appendChild(img);
                    } else if (att.type === 'video') {
                        const vid = document.createElement('video');
                        vid.src = att.previewUrl;
                        vid.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';
                        card.appendChild(vid);
                    } else {
                        card.style.background = 'rgba(35, 35, 40, 0.7)';
                        card.style.display = 'flex';
                        card.style.flexDirection = 'column';
                        card.style.alignItems = 'center';
                        card.style.justifyContent = 'center';
                        card.style.gap = '6px';
                        card.style.padding = '8px';
                        
                        const icon = document.createElement('i');
                        icon.className = att.type === 'audio' ? 'fa-solid fa-microphone' : 'fa-solid fa-file-lines';
                        icon.style.cssText = 'font-size: 24px; color: var(--active-blue);';
                        
                        const name = document.createElement('span');
                        name.style.cssText = 'color: #ffffff; font-size: 11px; font-weight: 500; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;';
                        name.textContent = att.file?.name || 'Attachment';
                        
                        card.appendChild(icon);
                        card.appendChild(name);
                    }
                    row.appendChild(card);
                });
                mc.appendChild(row);
            }
            
            // Render Message Text & Arrow Button with enhanced typography
            if (text && text.trim()) {
                const td = document.createElement('div');
                td.classList.add('message-text');
                
                const CHAR_LIMIT = 260;
                const isLong = text.length > CHAR_LIMIT;
                
                if (isLong) {
                    td.classList.add('collapsed-text');
                    td.innerHTML = text.substring(0, CHAR_LIMIT).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
                    md.appendChild(td);
                    
                    const btn = document.createElement('button');
                    btn.className = 'user-expand-btn';
                    btn.setAttribute('aria-label', 'Expand message');
                    btn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    
                    let expanded = false;
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        expanded = !expanded;
                        if (expanded) {
                            td.classList.remove('collapsed-text');
                            td.innerHTML = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
                            btn.innerHTML = '<i class="fas fa-chevron-up"></i>';
                            btn.setAttribute('aria-label', 'Collapse message');
                        } else {
                            td.classList.add('collapsed-text');
                            td.innerHTML = text.substring(0, CHAR_LIMIT).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
                            btn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                            btn.setAttribute('aria-label', 'Expand message');
                        }
                    };
                    md.appendChild(btn);
                } else {
                    td.innerHTML = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
                    md.appendChild(td);
                }
                
                mc.appendChild(md);
            }
            
            mc.appendChild(this.createMessageActions(text || '', 'user', mw));
            
            let pressTimer;
            const startPress = (e) => {
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                pressTimer = setTimeout(() => {
                    this.showUserOptionsMenu({ clientX, clientY }, text, md);
                }, 550);
            };
            const cancelPress = () => clearTimeout(pressTimer);
            
            md.addEventListener('mousedown', startPress);
            md.addEventListener('mouseup', cancelPress);
            md.addEventListener('mouseleave', cancelPress);
            md.addEventListener('touchstart', startPress, { passive: true });
            md.addEventListener('touchend', cancelPress);
        } else {
            const tc = document.createElement('div');
            tc.classList.add('thoughts-container');
            md.appendChild(tc);
            const td = document.createElement('div');
            td.classList.add('message-text');
            td.style.cssText = 'white-space: pre-wrap; word-break: break-word; font-size: 17.5px; line-height: 1.68; letter-spacing: -0.012em; color: #e8eaed; -webkit-font-smoothing: antialiased;';
            td.innerHTML = this.formatBotMessage(text || '');
            md.appendChild(td);
            const cc = document.createElement('div');
            cc.classList.add('citations-container');
            cc.style.display = 'none';
            md.appendChild(cc);
            mc.appendChild(md);
            
            const sourcesRow = document.createElement('div');
            sourcesRow.className = 'message-sources-row';
            sourcesRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; margin-left: 6px;';
            mc.appendChild(sourcesRow);
            
            // Create message actions immediately ONLY if loading from history
            if (fromHistory) {
                mc.appendChild(this.createMessageActions(text || '', 'bot', mw));
            }
            
            this.updateMessageSources(mw, text, null, null);
        }
        mw.appendChild(mc);
        if (!fromHistory) md.style.animation = 'neuralScaleIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
        elements.chatContainer.appendChild(mw);
        elements.chatContainer.scrollTo({ top: elements.chatContainer.scrollHeight, behavior: 'smooth' });
    },

    getOrCreateThoughtBlock(lastMessage) {
        const container = elements.chatContainer;
        if (!container) return null;

        if (!lastMessage) {
            lastMessage = container.lastElementChild;
        }
        if (!lastMessage || !lastMessage.classList.contains('bot-wrapper')) return null;

        const thoughtsContainer = lastMessage.querySelector('.thoughts-container');
        if (!thoughtsContainer) return null;

        let activeBlock = thoughtsContainer.querySelector('.collapsible-thought-block');
        if (!activeBlock) {
            activeBlock = document.createElement('details');
            activeBlock.className = 'collapsible-thought-block active';
            activeBlock.open = false;
            activeBlock.dataset.startTime = String(Date.now());

            const isRu = typeof i18next !== 'undefined' && i18next.language === 'ru';
            const defaultLabel = isRu ? 'Рассуждения' : (typeof t === 'function' ? t('reasoning') : 'Reasoning');

            const summary = document.createElement('summary');
            summary.innerHTML = `
                <span class="thought-summary-text shimmer-text">${defaultLabel}</span>
                <i class="fas fa-chevron-down" aria-hidden="true"></i>
            `;

            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'thought-content-wrapper';

            const timeline = document.createElement('div');
            timeline.className = 'thought-timeline';

            contentWrapper.appendChild(timeline);
            activeBlock.appendChild(summary);
            activeBlock.appendChild(contentWrapper);
            thoughtsContainer.appendChild(activeBlock);
        }

        let timeline = activeBlock.querySelector('.thought-timeline');
        if (!timeline) {
            const oldContent = activeBlock.querySelector('.thought-content');
            if (oldContent) {
                oldContent.className = 'thought-timeline';
                timeline = oldContent;
            } else {
                const wrapper = activeBlock.querySelector('.thought-content-wrapper');
                timeline = document.createElement('div');
                timeline.className = 'thought-timeline';
                if (wrapper) wrapper.appendChild(timeline);
                else activeBlock.appendChild(timeline);
            }
        }
        const summaryText = activeBlock.querySelector('.thought-summary-text');

        return { activeBlock, timeline, summaryText };
    },

    renderThoughtTextChunk(timeline, text, summaryTitle) {
        if (!timeline || !text) return;

        if (summaryTitle) {
            let chunkDetails = Array.from(timeline.querySelectorAll('.thought-chunk-details'))
                .find(el => el.dataset.summaryTitle === summaryTitle);

            if (!chunkDetails) {
                chunkDetails = document.createElement('details');
                chunkDetails.className = 'thought-subitem thought-chunk-details';
                chunkDetails.dataset.summaryTitle = summaryTitle;
                chunkDetails.open = false;

                const summary = document.createElement('summary');
                summary.innerHTML = `
                    <span class="thought-subitem-title">
                        <span class="thought-cloud-icon">☁</span>
                        <span>${this.escapeHTML(summaryTitle)}</span>
                    </span>
                    <i class="fas fa-chevron-down" aria-hidden="true"></i>
                `;

                const body = document.createElement('div');
                body.className = 'thought-subitem-body thought-text-chunk';

                chunkDetails.appendChild(summary);
                chunkDetails.appendChild(body);
                timeline.appendChild(chunkDetails);
            }

            const body = chunkDetails.querySelector('.thought-subitem-body');
            if (body) {
                body.innerHTML = this.formatBotMessage(text);
                if (typeof hljs !== 'undefined') {
                    body.querySelectorAll('pre code').forEach(codeBlock => {
                        try { hljs.highlightElement(codeBlock); } catch {}
                    });
                }
            }
            return;
        }

        let lastItem = timeline.lastElementChild;
        if (!lastItem || !lastItem.classList.contains('thought-text-chunk') || lastItem.classList.contains('thought-subitem')) {
            lastItem = document.createElement('div');
            lastItem.className = 'thought-text-chunk';
            timeline.appendChild(lastItem);
        }
        lastItem.innerHTML = this.formatBotMessage(text);
        if (typeof hljs !== 'undefined') {
            lastItem.querySelectorAll('pre code').forEach(codeBlock => {
                try { hljs.highlightElement(codeBlock); } catch {}
            });
        }
    },
renderCodeExecutionItem(timeline, data) {
    if (!timeline || !data) return;
    const itemId = data.id || ('code_exec_' + (data._index !== undefined ? data._index : 'auto'));
    
    let item = timeline.querySelector(`.thought-code-execution[data-id="${itemId}"]`);
    if (!item && (data.type === 'code_execution_result' || data.output !== undefined)) {
        const allCodeItems = timeline.querySelectorAll('.thought-code-execution');
        for (let i = allCodeItems.length - 1; i >= 0; i--) {
            if (!allCodeItems[i].querySelector('.thought-code-output-container')) {
                item = allCodeItems[i];
                break;
            }
        }
    }
    
    const isRu = typeof i18next !== 'undefined' && i18next.language === 'ru';
    const titleText = isRu ? 'Код Python' : 'Python';
    const outputLabel = isRu ? 'ВЫВОД' : 'OUTPUT';
    const visualLabel = isRu ? 'ИЗОБРАЖЕНИЕ' : 'VISUAL OUTPUT';
    
    if (!item) {
        item = document.createElement('details');
        item.className = 'thought-subitem thought-code-execution';
        item.dataset.id = itemId;
        item.open = false;
        item.style.cssText = `
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            margin: 6px 0;
            overflow: hidden;
            transition: background-color 0.2s ease, border-color 0.2s ease;
        `;
        
        const summary = document.createElement('summary');
        summary.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 9px 12px;
            cursor: pointer;
            user-select: none;
            list-style: none;
            color: rgba(255, 255, 255, 0.85);
            font-size: 13px;
            font-weight: 500;
            letter-spacing: -0.01em;
        `;
        summary.innerHTML = `
            <span class="thought-subitem-title" style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-terminal" style="color: rgba(255, 255, 255, 0.7); font-size: 11.5px;"></i>
                <span style="font-weight: 600; color: #ffffff;">${titleText}</span>
                <span class="thought-status-pill" style="font-size: 10.5px; font-weight: 500; color: rgba(255, 255, 255, 0.45); background: rgba(255, 255, 255, 0.06); padding: 1px 6px; border-radius: 6px;">code</span>
            </span>
            <i class="fas fa-chevron-down thought-chevron" style="color: rgba(255, 255, 255, 0.35); font-size: 11px; transition: transform 0.2s ease;"></i>
        `;
        
        const body = document.createElement('div');
        body.className = 'thought-subitem-body';
        body.style.cssText = `
            padding: 4px 12px 12px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        `;
        
        const codeBox = document.createElement('div');
        codeBox.className = 'thought-code-box';
        codeBox.style.cssText = `
            background: rgba(0, 0, 0, 0.45);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 8px;
            padding: 10px 12px;
            overflow-x: auto;
        `;
        const pre = document.createElement('pre');
        pre.style.cssText = 'margin: 0; padding: 0; font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; font-size: 12px; line-height: 1.5; color: rgba(255, 255, 255, 0.9);';
        const codeElem = document.createElement('code');
        codeElem.className = `language-${data.language || 'python'}`;
        codeElem.textContent = data.code || '';
        pre.appendChild(codeElem);
        codeBox.appendChild(pre);
        body.appendChild(codeBox);
        
        item.appendChild(summary);
        item.appendChild(body);
        timeline.appendChild(item);
    } else {
        if (data.code) {
            const codeElem = item.querySelector('.thought-code-box code');
            if (codeElem) codeElem.textContent = data.code;
        }
    }
    
    const body = item.querySelector('.thought-subitem-body');
    if (body) {
        if (data.output !== undefined && data.output !== null && String(data.output).trim()) {
            let outputContainer = body.querySelector('.thought-code-output-container');
            if (!outputContainer) {
                outputContainer = document.createElement('div');
                outputContainer.className = 'thought-code-output-container';
                outputContainer.style.cssText = `
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 8px;
                    padding: 8px 12px;
                    overflow-x: auto;
                `;
                outputContainer.innerHTML = `
                    <div class="thought-code-output-label" style="font-size: 9.5px; font-weight: 600; letter-spacing: 0.06em; color: rgba(255, 255, 255, 0.4); margin-bottom: 4px; text-transform: uppercase;">${outputLabel}</div>
                    <pre class="thought-code-output" style="margin: 0; padding: 0; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace; font-size: 11.5px; line-height: 1.45; color: rgba(255, 255, 255, 0.78); white-space: pre-wrap; word-break: break-word;"><code>${this.escapeHTML(String(data.output))}</code></pre>
                `;
                body.appendChild(outputContainer);
            } else {
                const outCode = outputContainer.querySelector('code');
                if (outCode) outCode.textContent = String(data.output);
            }
        }
        
        const images = data.images || (data.image ? [data.image] : []);
        if (images && images.length > 0) {
            let imagesContainer = body.querySelector('.thought-code-images-container');
            if (!imagesContainer) {
                imagesContainer = document.createElement('div');
                imagesContainer.className = 'thought-code-images-container';
                imagesContainer.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-top: 4px;
                `;
                body.appendChild(imagesContainer);
            }
            imagesContainer.innerHTML = `
                <div style="font-size: 9.5px; font-weight: 600; letter-spacing: 0.06em; color: rgba(255, 255, 255, 0.4); text-transform: uppercase;">${visualLabel}</div>
                <div class="thought-images-grid" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
            `;
            const grid = imagesContainer.querySelector('.thought-images-grid');
            images.forEach(img => {
                const b64 = typeof img === 'string' ? img : (img.data || '');
                const mime = (typeof img === 'object' && img.mimeType) ? img.mimeType : 'image/png';
                if (!b64) return;
                const imgEl = document.createElement('img');
                imgEl.src = b64.startsWith('data:') ? b64 : `data:${mime};base64,${b64}`;
                imgEl.alt = 'Code Execution Output';
                imgEl.style.cssText = `
                    max-width: 100%;
                    max-height: 380px;
                    object-fit: contain;
                    border-radius: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    background: rgba(0, 0, 0, 0.6);
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
                    cursor: pointer;
                    transition: transform 0.15s ease;
                `;
                imgEl.onclick = () => {
                    window.open(imgEl.src, '_blank');
                };
                grid.appendChild(imgEl);
            });
        }
    }
    
    if (typeof hljs !== 'undefined') {
        item.querySelectorAll('.thought-code-box pre code').forEach(codeBlock => {
            try { hljs.highlightElement(codeBlock); } catch {}
        });
    }
},
renderUrlContextItem(timeline, data) {
    if (!timeline || !data) return;
    const itemId = data.id || 'url_context';
    
    let item = timeline.querySelector(`.thought-url-context[data-id="${itemId}"]`);
    const isRu = typeof i18next !== 'undefined' && i18next.language === 'ru';
    
    if (!item) {
        item = document.createElement('details');
        item.className = 'thought-subitem thought-url-context';
        item.dataset.id = itemId;
        item.open = false;
        item.style.cssText = `
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            margin: 6px 0;
            overflow: hidden;
            transition: background-color 0.2s ease, border-color 0.2s ease;
        `;
        
        const summary = document.createElement('summary');
        summary.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 9px 12px;
            cursor: pointer;
            user-select: none;
            list-style: none;
            color: rgba(255, 255, 255, 0.85);
            font-size: 13px;
            font-weight: 500;
            letter-spacing: -0.01em;
        `;
        summary.innerHTML = `
            <span class="thought-subitem-title" style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-globe" style="color: rgba(255, 255, 255, 0.7); font-size: 12px;"></i>
                <span class="url-context-header-text" style="font-weight: 600; color: #ffffff;">${isRu ? 'Поиск в интернете' : 'Web Search'}</span>
            </span>
            <i class="fas fa-chevron-down thought-chevron" style="color: rgba(255, 255, 255, 0.35); font-size: 11px; transition: transform 0.2s ease;"></i>
        `;
        
        const body = document.createElement('div');
        body.className = 'thought-subitem-body';
        body.style.cssText = `
            padding: 8px 12px 12px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        `;
        
        const pills = document.createElement('div');
        pills.className = 'thought-url-pills';
        pills.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        `;
        body.appendChild(pills);
        
        item.appendChild(summary);
        item.appendChild(body);
        timeline.appendChild(item);
    }
    
    const pillsContainer = item.querySelector('.thought-url-pills');
    const headerSpan = item.querySelector('.url-context-header-text');
    
    let urls = [];
    if (Array.isArray(data.urls)) urls.push(...data.urls);
    if (typeof data.url === 'string' && data.url) urls.push(data.url);
    if (Array.isArray(data.results)) {
        data.results.forEach(r => {
            if (r?.web?.uri) urls.push(r.web.uri);
            if (r?.url) urls.push(r.url);
            if (r?.uri) urls.push(r.uri);
        });
    }
    
    const uniqueUrls = [...new Set(urls.filter(Boolean))];
    const domains = [];
    
    if (pillsContainer && uniqueUrls.length > 0) {
        pillsContainer.innerHTML = '';
        uniqueUrls.forEach(url => {
            let domain = url;
            try {
                const u = new URL(url.startsWith('http') ? url : `https://${url}`);
                domain = u.hostname.replace(/^www\./, '');
            } catch {
                domain = url.replace(/^https?:\/\//, '').split('/')[0];
            }
            if (!domains.includes(domain)) domains.push(domain);
            
            const pill = document.createElement('a');
            pill.href = url.startsWith('http') ? url : `https://${url}`;
            pill.target = '_blank';
            pill.rel = 'noopener noreferrer';
            pill.className = 'thought-url-pill';
            pill.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 9px;
                border-radius: 7px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: rgba(255, 255, 255, 0.82);
                text-decoration: none;
                font-size: 11.5px;
                font-weight: 500;
                letter-spacing: -0.005em;
                transition: all 0.15s ease;
            `;
            pill.innerHTML = `
                <i class="fas fa-arrow-up-right-from-square" style="font-size: 9.5px; color: rgba(255, 255, 255, 0.4);"></i>
                <span>${this.escapeHTML(domain)}</span>
            `;
            pillsContainer.appendChild(pill);
        });
    }
    
    if (data.query) {
        let queryEl = item.querySelector('.thought-url-query');
        if (!queryEl) {
            queryEl = document.createElement('div');
            queryEl.className = 'thought-url-query';
            queryEl.style.cssText = 'font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-bottom: 2px;';
            const body = item.querySelector('.thought-subitem-body');
            if (body && pillsContainer) body.insertBefore(queryEl, pillsContainer);
        }
        queryEl.textContent = `“${data.query}”`;
    }
    
    const siteCount = domains.length || uniqueUrls.length;
    let label = '';
    if (siteCount > 0) {
        label = isRu ?
            `Поиск выполнен на ${siteCount} ${siteCount === 1 ? 'сайте' : siteCount < 5 ? 'сайтах' : 'сайтах'}` :
            `Searched ${siteCount} site${siteCount === 1 ? '' : 's'}`;
    } else if (data.query) {
        label = isRu ? `Поиск: ${data.query}` : `Searched: ${data.query}`;
    } else {
        label = isRu ? 'Поиск в интернете' : 'Web Search';
    }
    if (headerSpan) headerSpan.textContent = label;
},
renderCustomToolItem(timeline, data) {
    if (!timeline || !data) return;
    const itemId = data.id || ('tool_' + (data.name || 'custom'));
    
    let item = timeline.querySelector(`.thought-custom-tool[data-id="${itemId}"]`);
    const toolName = data.name || data.tool || 'custom_tool';
    const isRu = typeof i18next !== 'undefined' && i18next.language === 'ru';
    
    const getToolDisplayName = (n) => {
        if (n === 'memory') return isRu ? 'Память' : 'Memory';
        if (n === 'web_search') return isRu ? 'Поиск в сети' : 'Web Search';
        if (n === 'image_search') return isRu ? 'Поиск изображений' : 'Image Search';
        if (n === 'filesystem' || n === 'file_search') return isRu ? 'Файловая система' : 'File System';
        if (n === 'computer_use' || n === 'browser') return isRu ? 'Браузер' : 'Computer Use';
        return data.label || n;
    };
    
    const displayName = getToolDisplayName(toolName);
    const argsLabel = isRu ? 'ПАРАМЕТРЫ' : 'INPUT';
    const resLabel = isRu ? 'РЕЗУЛЬТАТ' : 'RESULT';
    
    if (!item) {
        item = document.createElement('details');
        item.className = 'thought-subitem thought-custom-tool';
        item.dataset.id = itemId;
        item.open = false;
        item.style.cssText = `
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            margin: 6px 0;
            overflow: hidden;
            transition: background-color 0.2s ease, border-color 0.2s ease;
        `;
        
        const summary = document.createElement('summary');
        summary.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 9px 12px;
            cursor: pointer;
            user-select: none;
            list-style: none;
            color: rgba(255, 255, 255, 0.85);
            font-size: 13px;
            font-weight: 500;
            letter-spacing: -0.01em;
        `;
        summary.innerHTML = `
            <span class="thought-subitem-title" style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-gear" style="color: rgba(255, 255, 255, 0.7); font-size: 11.5px;"></i>
                <span style="font-weight: 600; color: #ffffff;">${this.escapeHTML(displayName)}</span>
                <span class="thought-status-pill" style="font-size: 10.5px; font-weight: 500; color: rgba(255, 255, 255, 0.45); background: rgba(255, 255, 255, 0.06); padding: 1px 6px; border-radius: 6px;">tool</span>
            </span>
            <i class="fas fa-chevron-down thought-chevron" style="color: rgba(255, 255, 255, 0.35); font-size: 11px; transition: transform 0.2s ease;"></i>
        `;
        
        const body = document.createElement('div');
        body.className = 'thought-subitem-body';
        body.style.cssText = `
            padding: 4px 12px 12px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        `;
        
        if (data.arguments) {
            const argsBox = document.createElement('div');
            argsBox.className = 'thought-tool-args';
            argsBox.style.cssText = `
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 8px;
                padding: 8px 12px;
                overflow-x: auto;
            `;
            argsBox.innerHTML = `
                <div style="font-size: 9.5px; font-weight: 600; letter-spacing: 0.06em; color: rgba(255, 255, 255, 0.4); margin-bottom: 4px; text-transform: uppercase;">${argsLabel}</div>
                <pre class="thought-code-output" style="margin: 0; padding: 0; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace; font-size: 11.5px; line-height: 1.45; color: rgba(255, 255, 255, 0.85); white-space: pre-wrap; word-break: break-word;"><code>${this.escapeHTML(typeof data.arguments === 'object' ? JSON.stringify(data.arguments, null, 2) : String(data.arguments))}</code></pre>
            `;
            body.appendChild(argsBox);
        }
        
        item.appendChild(summary);
        item.appendChild(body);
        timeline.appendChild(item);
    } else {
        if (data.arguments) {
            const argsCode = item.querySelector('.thought-tool-args code');
            if (argsCode) {
                argsCode.textContent = typeof data.arguments === 'object' ? JSON.stringify(data.arguments, null, 2) : String(data.arguments);
            }
        }
    }
    
    if (data.result !== undefined || data.output !== undefined) {
        const body = item.querySelector('.thought-subitem-body');
        if (body) {
            let resContainer = body.querySelector('.thought-tool-result-container');
            const resData = data.result !== undefined ? data.result : data.output;
            const resText = typeof resData === 'object' ? JSON.stringify(resData, null, 2) : String(resData);
            
            if (!resContainer) {
                resContainer = document.createElement('div');
                resContainer.className = 'thought-tool-result-container';
                resContainer.style.cssText = `
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 8px;
                    padding: 8px 12px;
                    overflow-x: auto;
                `;
                resContainer.innerHTML = `
                    <div class="thought-code-output-label" style="font-size: 9.5px; font-weight: 600; letter-spacing: 0.06em; color: rgba(255, 255, 255, 0.4); margin-bottom: 4px; text-transform: uppercase;">${resLabel}</div>
                    <pre class="thought-code-output" style="margin: 0; padding: 0; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace; font-size: 11.5px; line-height: 1.45; color: rgba(255, 255, 255, 0.78); white-space: pre-wrap; word-break: break-word;"><code>${this.escapeHTML(resText)}</code></pre>
                `;
                body.appendChild(resContainer);
            } else {
                const resCode = resContainer.querySelector('code');
                if (resCode) resCode.textContent = resText;
            }
        }
    }
},
renderThoughtImageItem(timeline, data) {
    if (!timeline || !data) return;
    const itemId = data.id || ('img_' + Math.random().toString(36).slice(2, 7));
    let item = timeline.querySelector(`.thought-image-item[data-id="${itemId}"]`);
    const b64 = data.data || '';
    const mime = data.mimeType || 'image/png';
    if (!b64) return;
    
    const isRu = typeof i18next !== 'undefined' && i18next.language === 'ru';
    const imgLabel = isRu ? 'Визуальный результат' : 'Visual Output';
    
    if (!item) {
        item = document.createElement('div');
        item.className = 'thought-subitem thought-image-item';
        item.dataset.id = itemId;
        item.style.cssText = `
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 10px 12px;
            margin: 6px 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: #ffffff;">
                    <i class="fas fa-image" style="color: rgba(255, 255, 255, 0.7); font-size: 12px;"></i>
                    <span>${imgLabel}</span>
                </span>
                <span style="font-size: 10px; font-weight: 500; color: rgba(255, 255, 255, 0.45); background: rgba(255, 255, 255, 0.06); padding: 1px 6px; border-radius: 5px;">image</span>
            </div>
            <div class="thought-image-wrapper" style="display: flex; justify-content: center; background: rgba(0, 0, 0, 0.5); border-radius: 8px; padding: 6px; border: 1px solid rgba(255, 255, 255, 0.06);">
                <img src="${b64.startsWith('data:') ? b64 : `data:${mime};base64,${b64}`}" alt="Output" style="max-width: 100%; max-height: 380px; object-fit: contain; border-radius: 6px; cursor: pointer;" onclick="window.open(this.src, '_blank')" />
            </div>
        `;
        timeline.appendChild(item);
    }
},
renderThoughtTimeline(timeline, items) {
    if (!timeline || !Array.isArray(items)) return;
    timeline.innerHTML = '';
    items.forEach(item => {
        if (!item) return;
        if (item.type === 'text' || !item.type) {
            this.renderThoughtTextChunk(timeline, item.text || item.content || String(item), item.summary || item.title);
        } else if (item.type === 'code_execution' || item.type === 'code_execution_call' || item.type === 'code_execution_result' || item.type === 'executable_code' || item.type === 'code_result') {
            this.renderCodeExecutionItem(timeline, item);
        } else if (item.type === 'url_context' || item.type === 'url_context_call' || item.type === 'url_context_result' || item.type === 'google_search_call' || item.type === 'google_search_result') {
            this.renderUrlContextItem(timeline, item);
        } else if (item.type === 'code_image' || item.type === 'image') {
            this.renderThoughtImageItem(timeline, item);
        } else if (item.type === 'tool_call' || item.type === 'tool_result' || item.type === 'custom_tool' || item.type === 'function_call' || item.type === 'function_result') {
            this.renderCustomToolItem(timeline, item);
        }
    });
},
updateLastBotMessage(content, type) {
    const container = elements.chatContainer;
    if (!container) return;
    
    const lastMessage = container.lastElementChild;
    if (!lastMessage || !lastMessage.classList.contains('bot-wrapper')) return;
    
    if (type === 'thought') {
        const thoughtBlock = this.getOrCreateThoughtBlock(lastMessage);
        if (!thoughtBlock) return;
        const { activeBlock, timeline, summaryText } = thoughtBlock;
        
        let timelineItems = null;
        let thoughtText = '';
        let summaryTitle = null;
        
        if (typeof content === 'string') {
            if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                try {
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) {
                        timelineItems = parsed;
                    } else if (parsed && typeof parsed === 'object') {
                        timelineItems = parsed.timeline || null;
                        thoughtText = parsed.text || '';
                        summaryTitle = parsed.summary || parsed.title || null;
                    }
                } catch {}
            }
            if (!timelineItems) {
                thoughtText = content;
            }
        } else if (Array.isArray(content)) {
            timelineItems = content;
        } else if (content && typeof content === 'object') {
            timelineItems = content.timeline || null;
            thoughtText = content.text || content.content || '';
            summaryTitle = content.summary || content.title || null;
        }
        
        if (timelineItems && Array.isArray(timelineItems)) {
            this.renderThoughtTimeline(timeline, timelineItems);
        } else if (thoughtText) {
            this.renderThoughtTextChunk(timeline, thoughtText, summaryTitle);
        }
        
        if (summaryText) {
            if (summaryTitle) {
                summaryText.textContent = summaryTitle;
            } else if (thoughtText) {
                const boldMatches = [...thoughtText.matchAll(/\*\*([^*]+)\*\*/g)];
                if (boldMatches.length) {
                    summaryText.textContent = boldMatches[boldMatches.length - 1][1]
                        .replace(/`/g, '')
                        .trim();
                } else {
                    const lines = thoughtText.split('\n').map(line => line.trim()).filter(Boolean);
                    if (lines.length) {
                        const latestLine = lines[lines.length - 1].replace(/[*#`]/g, '').trim();
                        summaryText.textContent = latestLine.length > 70 ? `${latestLine.slice(0, 70)}…` : latestLine;
                    }
                }
            }
            summaryText.classList.add('shimmer-text');
        }
        return;
    }
    
    if (type === 'code_execution_call' || type === 'code_execution_result' || type === 'executable_code' || type === 'code_result') {
        const thoughtBlock = this.getOrCreateThoughtBlock(lastMessage);
        if (thoughtBlock) {
            this.renderCodeExecutionItem(thoughtBlock.timeline, content);
        }
        return;
    }
    
    if (type === 'code_image' || type === 'image') {
        const thoughtBlock = this.getOrCreateThoughtBlock(lastMessage);
        if (thoughtBlock) {
            this.renderThoughtImageItem(thoughtBlock.timeline, content);
        }
        return;
    }
    
    if (type === 'url_context_call' || type === 'url_context_result' || type === 'google_search_call' || type === 'google_search_result') {
        const thoughtBlock = this.getOrCreateThoughtBlock(lastMessage);
        if (thoughtBlock) {
            this.renderUrlContextItem(thoughtBlock.timeline, content);
        }
        return;
    }
    
    if (type === 'tool_call' || type === 'tool_result' || type === 'custom_tool') {
        const thoughtBlock = this.getOrCreateThoughtBlock(lastMessage);
        if (thoughtBlock) {
            this.renderCustomToolItem(thoughtBlock.timeline, content);
        }
        return;
    }
    
    if (type === 'text') {
        const messageText = lastMessage.querySelector('.message.bot-message .message-text');
        if (!messageText) return;
        
        messageText.innerHTML = this.formatBotMessage(typeof content === 'string' ? content : '');
        
        // Only highlight code blocks that have not already been highlighted
        if (typeof hljs !== 'undefined') {
            messageText.querySelectorAll('pre code:not(.hljs)').forEach(codeBlock => {
                try {
                    hljs.highlightElement(codeBlock);
                } catch {}
            });
        }
        
        const actionBar = lastMessage.querySelector('.message-action-bar');
        if (actionBar) {
            const copyButton = actionBar.querySelector('.action-pill-copy');
            if (copyButton) {
                copyButton.onclick = () => this.copyToClipboard(content, copyButton);
            }
        }
        
        this.updateMessageSources(lastMessage, typeof content === 'string' ? content : '', null, null);
    }
},
    showTypingIndicator() {
    if (elements.chatContainer.querySelector('.typing-indicator')) return;
    
    const ti = document.createElement('div');
    ti.classList.add('typing-indicator', 'thinking-text-container');
    ti.style.cssText = 'display: flex; align-items: center; padding: 14px 0; margin-left: 10px;';
    
    ti.innerHTML = `
        <div class="thinking-text-wrapper">
            <div class="thinking-dots-icon" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
            <span class="thinking-shimmer-text">Thinking about your request</span>
            <span class="thinking-timer" id="thinkingTimerText">• 0 s</span>
        </div>
    `;
    
    const startTime = Date.now();
    ti._timerInterval = setInterval(() => {
        const timerEl = ti.querySelector('#thinkingTimerText');
        if (timerEl) {
            const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
            timerEl.textContent = `• ${elapsedSec} s`;
        }
    }, 1000);
    
    elements.chatContainer.appendChild(ti);
    elements.chatContainer.scrollTo({
        top: elements.chatContainer.scrollHeight,
        behavior: 'smooth'
    });

    },
showSkeletonLoader(type = 'text') {
    this.hideSkeletonLoader();
    
    const wrapper = document.createElement('div');
    wrapper.id = 'skeletonLoader';
    wrapper.className = 'message-wrapper bot-wrapper thinking-text-container';
    wrapper._startTime = Date.now();
    
    if (type === 'image') {
        const lang = (typeof i18next !== 'undefined' && i18next.language) || 'en';
        const stages = lang.startsWith('ru') ?
            ["Делаем набросок", "Создаём первый набросок", "Настраиваем сцену", "Шлифуем детали", "Завершаем"] :
            ["Making a sketch", "Creating first draft", "Setting the scene", "Polishing details", "Finalizing"];
        
        wrapper.innerHTML = `
      <div class="message-container" style="max-width: 100%;">
        <div class="img-skeleton-card">
          <div class="img-skeleton-status-container">
            <span class="img-skeleton-status-text" id="imgSkeletonStatusText">${stages[0]}</span>
          </div>
          <canvas class="img-skeleton-canvas" id="imgSkeletonCanvas"></canvas>
        </div>
      </div>
    `;
        
        this.elements.chatContainer.appendChild(wrapper);
        
        const canvas = wrapper.querySelector('#imgSkeletonCanvas');
        const textEl = wrapper.querySelector('#imgSkeletonStatusText');
        
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            
            const resize = () => {
                const rect = canvas.getBoundingClientRect();
                canvas.width = (rect.width || 320) * dpr;
                canvas.height = (rect.height || 420) * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            };
            resize();
            
            let animId;
            const startTime = performance.now();
            
            const render = (now) => {
                const rect = canvas.getBoundingClientRect();
                const w = rect.width || 320;
                const h = rect.height || 420;
                ctx.clearRect(0, 0, w, h);
                
                const spacing = 16;
                const cols = Math.floor(w / spacing);
                const rows = Math.floor(h / spacing);
                const startX = (w - (cols - 1) * spacing) / 2;
                const startY = (h - (rows - 1) * spacing) / 2;
                const elapsed = (now - startTime) / 1000;
                
                const cx = w * 0.5 + Math.sin(elapsed * 1.4) * (w * 0.35);
                const cy = h * 0.5 + Math.cos(elapsed * 1.1) * (h * 0.35);
                
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const x = startX + c * spacing;
                        const y = startY + r * spacing;
                        const dist = Math.hypot(x - cx, y - cy);
                        const wave = Math.sin(dist * 0.035 - elapsed * 3.4);
                        const intensity = Math.max(0, wave);
                        const alpha = 0.10 + Math.pow(intensity, 2.2) * 0.72;
                        
                        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
                        ctx.beginPath();
                        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                animId = requestAnimationFrame(render);
            };
            
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                animId = requestAnimationFrame(render);
                wrapper._animFrame = animId;
            }
        }
        
        let currentStage = 0;
        wrapper._imgInterval = setInterval(() => {
            currentStage = (currentStage + 1) % stages.length;
            if (textEl) {
                textEl.style.opacity = '0';
                setTimeout(() => {
                    textEl.textContent = stages[currentStage];
                    textEl.style.opacity = '1';
                }, 180);
            }
        }, 2800);
    } else {
        wrapper.innerHTML = `
      <div class="message-container">
        <div class="thinking-text-wrapper">
          <div class="thinking-dots-icon" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
          <span class="thinking-shimmer-text">Thinking about your request</span>
          <span class="thinking-timer" id="skTimerText">• 0 s</span>
        </div>
      </div>
    `;
        
        const startTime = wrapper._startTime;
        wrapper._timerInterval = setInterval(() => {
            const timerEl = wrapper.querySelector('#skTimerText');
            if (timerEl) {
                const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
                timerEl.textContent = `• ${elapsedSec} s`;
            }
        }, 1000);
        
        this.elements.chatContainer.appendChild(wrapper);
    }
    
    this.elements.chatContainer.scrollTo({
        top: this.elements.chatContainer.scrollHeight,
        behavior: 'smooth'
    });
},
    hideSkeletonLoader() {
    const sk = document.getElementById('skeletonLoader');
    if (sk) {
        if (sk._timerInterval) clearInterval(sk._timerInterval);
        if (sk._imgInterval) clearInterval(sk._imgInterval);
        if (sk._animFrame) cancelAnimationFrame(sk._animFrame);
        if (sk._cxStopFace) sk._cxStopFace();
        sk.remove();
    }
    const ti = elements.chatContainer ? elements.chatContainer.querySelector('.typing-indicator') : null;
    if (ti) {
        if (ti._timerInterval) clearInterval(ti._timerInterval);
        ti.remove();
    }

    },
    finishThoughtAnimation() {
        const lm = elements.chatContainer ? elements.chatContainer.lastElementChild : null;
        if (!lm || !lm.classList.contains('bot-wrapper')) return;
        const ab = lm.querySelector('.collapsible-thought-block.active') || lm.querySelector('.collapsible-thought-block');
        if (ab) {
            ab.classList.remove('active');
            const ts = ab.querySelector('.thought-summary-text');
            if (ts) {
                ts.classList.remove('shimmer-text');
                const startTime = parseInt(ab.dataset.startTime || Date.now(), 10);
                const dur = Math.max(1, Math.ceil((Date.now() - startTime) / 1000));
                const m = Math.floor(dur / 60);
                const s = dur % 60;
                const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
                const isRu = typeof i18next !== 'undefined' && i18next.language === 'ru';
                ts.textContent = isRu ? `Обработка заняла ${timeStr}` : `Thought for ${timeStr}`;
            }
        }
    },
    renderAbortedStatus(elapsedMs = 0) {
    this.hideSkeletonLoader();
    
    let lm = elements.chatContainer.lastElementChild;
    if (!lm || !lm.classList.contains('bot-wrapper')) {
        this.addMessageToChat('bot', '', null, null, false);
        lm = elements.chatContainer.lastElementChild;
    }
    
    if (!lm) return;
    
    const mc = lm.querySelector('.message-container');
    const md = lm.querySelector('.message.bot-message');
    if (!mc || !md) return;
    
    // Check if notice already rendered
    if (!mc.querySelector('.response-aborted-notice')) {
        const notice = document.createElement('div');
        notice.className = 'response-aborted-notice';
        notice.textContent = 'Response stopped by user.';
        
        const sourcesRow = mc.querySelector('.message-sources-row');
        if (sourcesRow) {
            mc.insertBefore(notice, sourcesRow.nextSibling);
        } else {
            mc.appendChild(notice);
        }
    }
    
    // Add execution duration badge at the bottom right
    const formattedSeconds = (Math.max(0, elapsedMs) / 1000).toFixed(2) + 's';
    let metaFooter = mc.querySelector('.message-meta-footer');
    if (!metaFooter) {
        metaFooter = document.createElement('div');
        metaFooter.className = 'message-meta-footer';
        mc.appendChild(metaFooter);
    }
    
    let durationBadge = metaFooter.querySelector('.response-duration-badge');
    if (!durationBadge) {
        durationBadge = document.createElement('span');
        durationBadge.className = 'response-duration-badge';
        metaFooter.appendChild(durationBadge);
    }
    durationBadge.textContent = formattedSeconds;
    
    elements.chatContainer.scrollTo({ top: elements.chatContainer.scrollHeight, behavior: 'smooth' });

    },
renderChatsPanel(chats, onLoad, onDelete) {
    const listContainer = this.elements.panelChatsList || document.getElementById('panelChatsList');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    listContainer.className = 'panel-chats-grid';
    
    if (!chats || !chats.length) {
        listContainer.innerHTML = `
      <div style="grid-column: span 2; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 16px; color: var(--muted-color, #858585); text-align: center; gap: 12px;">
        <i class="far fa-comments" style="font-size: 32px; opacity: 0.4;"></i>
        <span style="font-size: 15px; font-weight: 500; letter-spacing: -0.01em;">No conversations yet</span>
      </div>
    `;
        return;
    }
    
    const getFriendlyTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };
    
    chats.forEach((item, index) => {
        const card = document.createElement('li');
        
        let firstImageB64 = null;
        if (item.chat.messages && item.chat.messages.length > 0) {
            for (const msg of item.chat.messages) {
                if (msg.imageUrl) {
                    firstImageB64 = msg.imageUrl;
                    break;
                }
                if (msg.attachments && msg.attachments.length > 0) {
                    const imgAtt = msg.attachments.find(a => a.type === 'image');
                    if (imgAtt && imgAtt.previewUrl) {
                        firstImageB64 = imgAtt.previewUrl;
                        break;
                    }
                }
            }
        }
        
        const dateString = getFriendlyTimestamp(item.chat.lastActive || Date.now());
        const cleanTitle = (item.chat.title || 'New Chat').replace(/</g, '&lt;');
        const cleanSnippet = (item.contextSnippet || '').replace(/</g, '&lt;');
        const pinnedPrefix = item.chat.pinned ? '<i class="fas fa-thumbtack pin-badge" style="margin-right: 5px; color: #3486eb;"></i>' : '';
        
        if (firstImageB64 && index % 5 === 4) {
            card.className = 'chats-masonry-card card-cover';
            card.innerHTML = `
        <img src="${firstImageB64}" alt="Chat Preview" class="card-image-background" loading="lazy">
        <div class="card-text-overlay">
          <div class="card-metadata"><span>${pinnedPrefix}${dateString}</span></div>
          <div class="card-title">${cleanTitle}</div>
        </div>
      `;
        } else if (firstImageB64) {
            card.className = 'chats-masonry-card card-with-image-bottom';
            card.innerHTML = `
        <div class="card-metadata"><span>${pinnedPrefix}${dateString}</span></div>
        <div class="card-title">${cleanTitle}</div>
        <div class="card-image-wrapper">
          <img src="${firstImageB64}" alt="Chat Preview" class="card-image-preview" loading="lazy">
        </div>
      `;
        } else {
            card.className = 'chats-masonry-card card-text-only';
            card.innerHTML = `
        <div class="card-metadata"><span>${pinnedPrefix}${dateString}</span></div>
        <div class="card-title">${cleanTitle}</div>
        ${cleanSnippet ? `<div class="card-snippet">${cleanSnippet}</div>` : ''}
      `;
        }
        
        let pressTimer = null;
        let isLongPress = false;
        let startX = 0;
        let startY = 0;
        
        const startPress = (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            isLongPress = false;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            startX = clientX;
            startY = clientY;
            
            // Instantaneous touch-down response
            card.style.transform = 'scale(0.96)';
            card.style.transition = 'transform 80ms ease-out';
            
            pressTimer = setTimeout(() => {
                isLongPress = true;
                card.style.transform = '';
                window.AppleHaptics.impactMedium();
                this.showChatContextMenu(clientX, clientY, item.index, item.chat);
            }, 440);
        };
        
        const cancelPress = () => {
            if (pressTimer) clearTimeout(pressTimer);
            card.style.transform = '';
            card.style.transition = 'transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)';
        };
        
        const checkMove = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            if (Math.hypot(clientX - startX, clientY - startY) > 9) {
                cancelPress();
            }
        };
        
        card.addEventListener('pointerdown', startPress);
        card.addEventListener('pointerup', cancelPress);
        card.addEventListener('pointercancel', cancelPress);
        card.addEventListener('pointermove', checkMove);
        
        card.onclick = (e) => {
            if (isLongPress || document.getElementById('chat-context-menu')) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            window.AppleHaptics.selection();
            onLoad(item.index);
        };
        
        listContainer.appendChild(card);
    });
},
showChatContextMenu(x, y, index, chat) {
    const existing = document.getElementById('chat-context-menu');
    if (existing) existing.remove();
    
    const menu = document.createElement('div');
    menu.id = 'chat-context-menu';
    menu.className = 'chat-context-menu';
    
    const pinText = chat.pinned ?
        (typeof t === 'function' ? t('unpin') : 'Unpin') :
        (typeof t === 'function' ? t('pin') : 'Pin');
    const pinIcon = chat.pinned ? 'fa-thumbtack-slash' : 'fa-thumbtack';
    const renameText = typeof t === 'function' ? t('rename') : 'Rename';
    const deleteText = typeof t === 'function' ? t('delete') : 'Delete';
    
    menu.style.cssText = `
    position: fixed;
    background: rgba(30, 30, 36, 0.92);
    backdrop-filter: blur(40px) saturate(190%);
    -webkit-backdrop-filter: blur(40px) saturate(190%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-top: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 20px;
    padding: 6px;
    z-index: 1015;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 150px;
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    opacity: 0;
    pointer-events: auto;
  `;
    
    menu.innerHTML = `
    <button class="context-menu-item" id="contextPinBtn">
      <i class="fas ${pinIcon}"></i> <span>${pinText}</span>
    </button>
    <button class="context-menu-item" id="contextRenameBtn">
      <i class="fas fa-pen-to-square"></i> <span>${renameText}</span>
    </button>
    <button class="context-menu-item delete" id="contextDeleteBtn">
      <i class="fas fa-trash"></i> <span>${deleteText}</span>
    </button>
  `;
    
    document.body.appendChild(menu);
    
    const rect = menu.getBoundingClientRect();
    const computedX = Math.max(14, Math.min(window.innerWidth - rect.width - 14, x - rect.width / 2));
    const computedY = Math.max(14, Math.min(window.innerHeight - rect.height - 14, y - 10));
    
    // Anchor transform origin to touch coordinate for natural emergence
    const originX = Math.round(((x - computedX) / rect.width) * 100);
    const originY = Math.round(((y - computedY) / rect.height) * 100);
    
    menu.style.transformOrigin = `${originX}% ${originY}%`;
    menu.style.left = `${computedX}px`;
    menu.style.top = `${computedY}px`;
    
    // Materialize with Apple Spring
    window.AppleMotion.spring({
        from: 0.82,
        to: 1.0,
        damping: 0.82,
        response: 0.26,
        onUpdate: (scale) => {
            menu.style.transform = `scale(${scale})`;
            menu.style.opacity = Math.min(1, (scale - 0.82) / 0.15);
        }
    });
    
    menu.querySelectorAll('.context-menu-item').forEach(btn => {
        btn.addEventListener('pointerdown', () => {
            btn.style.transform = 'scale(0.96)';
            window.AppleHaptics.selection();
        });
        btn.addEventListener('pointerup', () => { btn.style.transform = ''; });
        btn.addEventListener('pointercancel', () => { btn.style.transform = ''; });
    });
    
    menu.querySelector('#contextPinBtn').onclick = (e) => {
        e.stopPropagation();
        window.AppleHaptics.impactLight();
        chat.pinned = !chat.pinned;
        if (window.Logic?.saveChatHistories) window.Logic.saveChatHistories();
        
        const searchEl = this.elements.panelSearchInput || document.getElementById('popupSearchInput');
        const query = searchEl ? searchEl.value : '';
        if (window.Logic?.renderUnifiedPanel) window.Logic.renderUnifiedPanel(query);
        menu.remove();
    };
    
    menu.querySelector('#contextRenameBtn').onclick = (e) => {
        e.stopPropagation();
        window.AppleHaptics.impactLight();
        menu.remove();
        this.showRenameChatModal(index, chat);
    };
    
    menu.querySelector('#contextDeleteBtn').onclick = (e) => {
        e.stopPropagation();
        window.AppleHaptics.impactHeavy();
        if (window.Logic?.confirmDeleteChat) window.Logic.confirmDeleteChat(index);
        menu.remove();
    };
    
    const onOutsideDismiss = (event) => {
        if (event && menu.contains(event.target)) return;
        document.removeEventListener('pointerdown', onOutsideDismiss);
        menu.remove();
    };
    
    setTimeout(() => {
        document.addEventListener('pointerdown', onOutsideDismiss);
    }, 40);
},
    
showRenameChatModal(index, chat) {
    const existing = document.getElementById('renameChatModalOverlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'renameChatModalOverlay';
    overlay.className = 'rename-modal-overlay';
    
    const titleText = typeof t === 'function' ? t('renameChat') : 'Rename Chat';
    const cancelText = typeof t === 'function' ? t('cancel') : 'Cancel';
    const saveText = typeof t === 'function' ? t('save') : 'Save';
    const currentTitle = chat.title || 'New Chat';
    
    overlay.innerHTML = `
    <div class="rename-modal-card" id="renameModalCard">
      <div class="rename-title">${titleText}</div>
      <input type="text" class="rename-input" id="renameModalInput" value="${currentTitle.replace(/"/g, '&quot;')}" placeholder="Title..." autocomplete="off">
      <div class="rename-actions">
        <button class="rename-btn-secondary" id="renameModalCancelBtn">${cancelText}</button>
        <button class="rename-btn-primary" id="renameModalSaveBtn">${saveText}</button>
      </div>
    </div>
  `;
    
    document.body.appendChild(overlay);
    
    const card = overlay.querySelector('#renameModalCard');
    const input = overlay.querySelector('#renameModalInput');
    const cancelBtn = overlay.querySelector('#renameModalCancelBtn');
    const saveBtn = overlay.querySelector('#renameModalSaveBtn');
    
    const closeModal = () => {
        overlay.classList.remove('show');
        if (card) {
            window.AppleMotion.spring({
                from: 1.0,
                to: 0.9,
                damping: 1.0,
                response: 0.22,
                onUpdate: (scale) => {
                    card.style.transform = `scale(${scale})`;
                    overlay.style.opacity = Math.max(0, scale - 0.9) * 10;
                },
                onComplete: () => overlay.remove()
            });
        } else {
            overlay.remove();
        }
    };
    
    const saveRename = () => {
        const val = input.value.trim();
        if (val && val !== chat.title) {
            window.AppleHaptics.notificationSuccess();
            chat.title = val;
            if (window.Logic?.saveChatHistories) window.Logic.saveChatHistories();
            
            const searchEl = this.elements.panelSearchInput || document.getElementById('popupSearchInput');
            const query = searchEl ? searchEl.value : '';
            if (window.Logic?.renderUnifiedPanel) window.Logic.renderUnifiedPanel(query);
            if (this.showNotification) this.showNotification('Chat renamed');
        }
        closeModal();
    };
    
    cancelBtn.onclick = () => {
        window.AppleHaptics.impactLight();
        closeModal();
    };
    
    saveBtn.onclick = saveRename;
    
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveRename();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeModal();
        }
    };
    
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };
    
    overlay.classList.add('show');
    input.focus();
    input.select();
    
    window.AppleMotion.spring({
        from: 0.92,
        to: 1.0,
        damping: 0.84,
        response: 0.28,
        onUpdate: (scale) => {
            if (card) card.style.transform = `scale(${scale})`;
        }
    });
},
    showUserOptionsMenu(coords, text, anchor) {
    const existing = document.getElementById('user-options-menu');
    if (existing) existing.remove();
    
    const menu = document.createElement('div');
    menu.id = 'user-options-menu';
    menu.style.cssText = `
        position: fixed;
        background: rgba(30, 30, 35, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 12px;
        padding: 4px;
        z-index: 9999;
        display: flex;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        animation: popIn 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
    `;
    
    const rect = anchor.getBoundingClientRect();
    // Anchor popup safely around target bubble bounds
    menu.style.top = `${Math.max(10, rect.top - 45)}px`;
    menu.style.left = `${Math.max(10, Math.min(window.innerWidth - 110, rect.left + (rect.width / 2) - 50))}px`;
    
    const copyBtn = document.createElement('button');
    copyBtn.style.cssText = `
        background: transparent;
        border: none;
        color: #ffffff;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        border-radius: 8px;
    `;
    copyBtn.innerHTML = `<i class="far fa-copy"></i> Copy`;
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Text copied to clipboard');
            menu.remove();
        });
    };
    
    menu.appendChild(copyBtn);
    document.body.appendChild(menu);
    
    const closeHandler = () => {
        menu.remove();
        document.removeEventListener('click', closeHandler);
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 100);

    },
createMessageActions(text, sender, wrapperElement) {
    const bar = document.createElement('div');
    bar.className = 'message-action-bar';
    
    if (sender === 'user') {
        const editBtn = document.createElement('button');
        editBtn.className = 'action-pill action-pill-edit';
        editBtn.setAttribute('aria-label', 'Edit message');
        editBtn.innerHTML = `<i class="fas fa-pen"></i> ${typeof t === 'function' ? t('edit') : 'Edit'}`;
        editBtn.onclick = () => {
            window.AppleHaptics.selection();
            if (window.Logic?.startEditMessage) {
                window.Logic.startEditMessage(wrapperElement, text);
            }
        };
        bar.appendChild(editBtn);
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-pill action-pill-copy';
        copyBtn.setAttribute('aria-label', 'Copy message');
        copyBtn.innerHTML = `<i class="far fa-copy"></i> ${typeof t === 'function' ? t('copy') : 'Copy'}`;
        copyBtn.onclick = () => {
            window.AppleHaptics.impactLight();
            this.copyToClipboard(text, copyBtn);
        };
        bar.appendChild(copyBtn);
    } else {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-pill action-pill-copy';
        copyBtn.setAttribute('aria-label', 'Copy response');
        copyBtn.innerHTML = `<i class="far fa-copy"></i> ${typeof t === 'function' ? t('copy') : 'Copy'}`;
        copyBtn.onclick = () => {
            window.AppleHaptics.impactLight();
            this.copyToClipboard(text, copyBtn);
        };
        bar.appendChild(copyBtn);
        
        const retryBtn = document.createElement('button');
        retryBtn.className = 'action-pill action-pill-retry';
        retryBtn.setAttribute('aria-label', 'Regenerate response');
        retryBtn.innerHTML = `<i class="fas fa-redo"></i> ${typeof t === 'function' ? t('retry') : 'Retry'}`;
        retryBtn.onclick = () => {
            window.AppleHaptics.impactMedium();
            if (window.Logic?.retryMessage) {
                window.Logic.retryMessage(wrapperElement);
            } else if (window.Logic?.retryLastAction) {
                window.Logic.retryLastAction();
            }
        };
        bar.appendChild(retryBtn);
    }
    
    return bar;
},
    
    // --- FORMATTING & RICH BLOCKS ---
formatBotMessage(text) {
    if (!text) return '';
    if (text.startsWith('<img') || text.includes('error-card')) return text;
    
    let cleanText = String(text);
    
    // 1. Balance unclosed fences during streaming so the parser never breaks
    const codeFences = cleanText.match(/^```/gm);
    if (codeFences && codeFences.length % 2 !== 0) {
        cleanText += '\n```';
    }
    
    const writingStarts = (cleanText.match(/^::writing\b/gm) || []).length;
    const writingEnds = (cleanText.match(/^::\s*$/gm) || []).length;
    if (writingStarts > writingEnds) {
        cleanText += '\n::';
    }
    
    const placeholders = [];
    const registerPlaceholder = (html) => {
        const id = placeholders.length;
        // Block-level HTML element ensures Marked treats it as an independent HTML block and avoids wrapping in <p>
        const marker = `\n\n<div class="cx-ph-token" data-ph-idx="${id}"></div>\n\n`;
        placeholders.push({ id, html });
        return marker;
    };
    
    // 2. Protect Cohana writing blocks
    cleanText = cleanText.replace(/^::writing\s*\r?\n([\s\S]*?)\r?\n::\s*$/gm, (_, content) => {
        return registerPlaceholder(this.createWritingBlockHTML(content));
    });
    
    // 3. Protect fenced code blocks (supporting any language identifiers, spaces, or attributes)
    cleanText = cleanText.replace(/(?:^|\r?\n)```([^\r\n]*)\r?\n([\s\S]*?)\r?\n```(?=\r?\n|$)/g, (match, info, code) => {
        const lang = (info || '').trim().split(/\s+/)[0];
        return registerPlaceholder(this.createCodeBlockHTML(lang, code));
    });
    
    // 4. Protect KaTeX display and inline math
    if (typeof katex !== 'undefined') {
        try {
            cleanText = cleanText.replace(/(\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])/g, (_, __, t1, t2) => {
                const formula = t1 || t2;
                const rendered = katex.renderToString(formula, { displayMode: true, throwOnError: false });
                return registerPlaceholder(`<div class="katex-display-block">${rendered}</div>`);
            });
            cleanText = cleanText.replace(/(\\\(([\s\S]+?)\\\)|\$([^\$\n\r]+?)\$)/g, (_, __, t1, t2) => {
                const formula = t1 || t2;
                return katex.renderToString(formula, { displayMode: false, throwOnError: false });
            });
        } catch (e) {}
    }
    
    let output = '';
    
    // 5. Marked.js engine with DOMPurify sanitization
    if (typeof marked !== 'undefined') {
        try {
            const renderer = new marked.Renderer();
            
            renderer.link = (href, title, linkText) => {
                const titleAttr = title ? ` title="${title}"` : '';
                return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr} class="markdown-link">${linkText}</a>`;
            };
            
            renderer.table = (header, body) => {
                return `<div class="markdown-table-wrapper"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
            };
            
            renderer.blockquote = (quote) => {
                return `<blockquote class="markdown-blockquote">${quote}</blockquote>`;
            };
            
            renderer.hr = () => {
                return `<hr class="markdown-hr">`;
            };
            
            renderer.code = (code, language) => {
                const lang = (language || '').trim().split(/\s+/)[0];
                return registerPlaceholder(this.createCodeBlockHTML(lang, code));
            };
            
            const rawHtml = marked.parse(cleanText, { renderer, gfm: true, breaks: true });
            
            if (typeof DOMPurify !== 'undefined') {
                output = DOMPurify.sanitize(rawHtml, {
                    ADD_TAGS: [
                        'gmp-place-contextual', 'iframe', 'table', 'thead', 'tbody',
                        'tr', 'th', 'td', 'blockquote', 'hr', 'code', 'pre', 'div', 'span'
                    ],
                    ADD_ATTR: [
                        'target', 'rel', 'context-token', 'data-lang', 'data-code-id',
                        'data-ph-idx', 'allowfullscreen', 'loading', 'class', 'href', 'title'
                    ]
                });
            } else {
                output = rawHtml;
            }
        } catch (e) {
            output = '';
        }
    }
    
    // 6. Fast fallback parser if marked.js is absent
    if (!output) {
        const parseInline = (s) => s
            .replace(/`([^`]+)`/g, '<code class="markdown-inline-code">$1</code>')
            .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/~~([^~]+)~~/g, '<del>$1</del>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="markdown-link">$1</a>');
        
        const lines = cleanText.split('\n');
        let inList = false;
        let listType = null;
        let inTable = false;
        let tableLines = [];
        let inBlockquote = false;
        let blockquoteLines = [];
        
        const flushTable = () => {
            if (!tableLines.length) return '';
            const [header, sep, ...rows] = tableLines;
            let html = '<div class="markdown-table-wrapper"><table><thead><tr>';
            if (header) {
                header.split('|').slice(1, -1).forEach(c => { html += `<th>${parseInline(c.trim())}</th>`; });
            }
            html += '</tr></thead><tbody>';
            rows.forEach(r => {
                html += '<tr>';
                r.split('|').slice(1, -1).forEach(c => { html += `<td>${parseInline(c.trim())}</td>`; });
                html += '</tr>';
            });
            html += '</tbody></table></div>';
            tableLines = [];
            inTable = false;
            return html;
        };
        
        const flushBlockquote = () => {
            if (!blockquoteLines.length) return '';
            const html = `<blockquote class="markdown-blockquote">${blockquoteLines.map(l => parseInline(l)).join('<br>')}</blockquote>`;
            blockquoteLines = [];
            inBlockquote = false;
            return html;
        };
        
        const flushList = () => {
            if (!inList) return '';
            const tag = listType === 'ol' ? 'ol' : 'ul';
            inList = false;
            listType = null;
            return `</${tag}>`;
        };
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('cx-ph-token') || line.includes('tool-widget-container') || line.includes('exec-output-container') || line.includes('maps-widget-container')) {
                if (inTable) output += flushTable();
                if (inBlockquote) output += flushBlockquote();
                if (inList) output += flushList();
                output += line + '\n';
                continue;
            }
            
            if (line.trim().startsWith('>')) {
                if (inTable) output += flushTable();
                if (inList) output += flushList();
                inBlockquote = true;
                blockquoteLines.push(line.trim().replace(/^>\s?/, ''));
                continue;
            } else if (inBlockquote) {
                output += flushBlockquote();
            }
            
            if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                if (inBlockquote) output += flushBlockquote();
                if (inList) output += flushList();
                inTable = true;
                tableLines.push(line);
                continue;
            } else if (inTable) {
                output += flushTable();
            }
            
            if (/^(---|\*\*\*|___)\s*$/.test(line.trim())) {
                if (inList) output += flushList();
                output += '<hr class="markdown-hr">';
                continue;
            }
            
            const hMatch = line.match(/^(#{1,6})\s+(.+)/);
            if (hMatch) {
                if (inList) output += flushList();
                const lvl = hMatch[1].length;
                output += `<h${lvl} class="markdown-h${lvl}">${parseInline(hMatch[2])}</h${lvl}>`;
                continue;
            }
            
            if (/^\s*[-*+]\s/.test(line)) {
                if (!inList || listType !== 'ul') {
                    if (inList) output += flushList();
                    inList = true;
                    listType = 'ul';
                    output += '<ul class="markdown-list">';
                }
                const content = line.replace(/^\s*[-*+]\s/, '');
                output += `<li>${parseInline(content)}</li>`;
                continue;
            }
            
            if (/^\s*\d+\.\s/.test(line)) {
                if (!inList || listType !== 'ol') {
                    if (inList) output += flushList();
                    inList = true;
                    listType = 'ol';
                    output += '<ol class="markdown-list">';
                }
                const content = line.replace(/^\s*\d+\.\s/, '');
                output += `<li>${parseInline(content)}</li>`;
                continue;
            }
            
            if (inList) output += flushList();
            if (line.trim() === '') continue;
            output += `<p class="markdown-p">${parseInline(line)}</p>`;
        }
        
        if (inTable) output += flushTable();
        if (inBlockquote) output += flushBlockquote();
        if (inList) output += flushList();
    }
    
    // 7. Strip accidental enclosing paragraph tags around placeholder tokens
    output = output.replace(/<p>\s*(<div class="cx-ph-token"[^>]*><\/div>)\s*<\/p>/g, '$1');
    
    // 8. Re-insert preserved components using function replacer to completely avoid $ replacement corruption
    placeholders.forEach(ph => {
        const tokenRegex = new RegExp(`<div class="cx-ph-token" data-ph-idx="${ph.id}"><\\/div>`, 'g');
        output = output.replace(tokenRegex, () => ph.html);
    });
    
    return output;
},
    escapeHTML(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    },
    friendlyError(err) {
    if (!err) return i18next.t('notWorkingToday');
    const msg = (err.message || err || '').toString().toLowerCase();
    if (err.name === 'AbortError' || msg.includes('aborted')) return i18next.t('errAborted');
    if (msg.includes('timeout') || msg.includes('took too long')) return i18next.t('errTimeout');
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many')) return i18next.t('errRateLimit');
    if (msg.includes('503') || msg.includes('overload')) return i18next.t('errServer');
    if (/fetch|network|connection/.test(msg)) return i18next.t('errConnection');
    if (/500|502|server/.test(msg)) return i18next.t('notWorkingToday');
    return i18next.t('errGeneric');

    },
    renderErrorCard(errorMessage){
            const friendly = this.friendlyError(typeof errorMessage === 'string' ? { message: errorMessage } : errorMessage);
            return `<div class="error-card"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="error-content"><div class="error-title">Oops</div><div class="error-message">${friendly}</div><button class="retry-button"><i class="fas fa-redo"></i> ${t('retry')}</button></div></div>`;
        
    },
    renderSafetyCard(safetyData,onDecide){
            const wrapper=document.createElement('div');wrapper.className='message-wrapper';
            const container=document.createElement('div');container.className='message-container';
            container.innerHTML=`<div class="message bot-message"><div class="safety-card"><div class="safety-header"><i class="fas fa-shield-alt"></i> Security Alert</div><div class="safety-explanation">${safetyData.explanation||'Potentially sensitive action detected.'}</div><div class="safety-actions"><button class="safety-btn safety-confirm">Allow Action</button><button class="safety-btn safety-deny">Deny</button></div></div></div>`;
            wrapper.appendChild(container);elements.chatContainer.appendChild(wrapper);elements.chatContainer.scrollTo({top:elements.chatContainer.scrollHeight,behavior:'smooth'});
            const handle=(d)=>{container.querySelectorAll('.safety-btn').forEach(b=>b.disabled=true);wrapper.style.opacity='0.7';onDecide(d);};
            container.querySelector('.safety-confirm').onclick=()=>handle('confirm');container.querySelector('.safety-deny').onclick=()=>handle('deny');
        
    },
// -------------------------------------------------------------------------
    // CODE BLOCK & WRITING BLOCK ENGINE
    // -------------------------------------------------------------------------
createCodeBlockHTML(language, code) {
    const rawLang = language ? language.trim().split(/\s+/)[0].toLowerCase() : 'text';
    const lang = rawLang || 'text';
    const id = 'cb-' + Math.random().toString(36).slice(2, 9);
    
    // Lowercase language label matching the screenshot (e.g., 'jsx', 'html')
    const displayLang = (lang && lang !== 'text' && lang !== 'plaintext') ? lang : 'code';
    const highlighted = this.highlightCode(code, lang);
    
    // Check for previewable snippets (HTML & SVG)
    const isPreviewable = ['html', 'htm', 'svg', 'xml'].includes(lang);
    
    const CODE_COLLAPSE_CHAR_LIMIT = 320;
    const CODE_COLLAPSE_LINE_LIMIT = 10;
    const lines = (code || '').split('\n');
    const linesCount = lines.length;
    const isLongCode = (code || '').length > CODE_COLLAPSE_CHAR_LIMIT || linesCount > CODE_COLLAPSE_LINE_LIMIT;
    
    const escapeTextarea = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    
    // Line number gutter matching the reference image
    const lineNumbersHtml = lines.map((_, i) => `<span>${i + 1}</span>`).join('');
    
    // Minimalist Copy icon SVG matching reference
    const copyBtnSvg = `
        <svg viewBox="0 0 24 24" class="copy-svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="3"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <svg viewBox="0 0 24 24" class="check-svg" width="16" height="16" style="display: none;" fill="none" stroke="#30d158" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    `;
    
    // Segmented Code / Preview pill for HTML & SVG
    const togglePillHTML = isPreviewable ? `
        <div class="code-view-toggle-pill">
            <button class="code-toggle-btn active" data-mode="code" title="Code view" onclick="UI.toggleCodeBlockMode(this, 'code')">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span>Code</span>
            </button>
            <button class="code-toggle-btn" data-mode="preview" title="Preview" onclick="UI.toggleCodeBlockMode(this, 'preview')">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Preview</span>
            </button>
        </div>
    ` : '';
    
    const previewContainerHTML = isPreviewable ? `
        <div class="code-preview-container">
            <div class="code-preview-frame">
                <iframe class="code-preview-iframe" sandbox="allow-scripts allow-modals allow-forms"></iframe>
            </div>
        </div>
    ` : '';
    
    const expandFooterHTML = isLongCode ? `
        <div class="code-expand-footer">
            <button class="code-expand-btn" type="button" onclick="UI.toggleCodeBlockExpand(this)">
                <span class="expand-text">Show More</span>
                <svg viewBox="0 0 24 24" class="expand-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>
        </div>
    ` : '';
    
    return `
    <div class="code-block ${isLongCode ? 'is-collapsible is-collapsed' : ''}" data-lang="${lang}" data-code-id="${id}">
        <textarea class="raw-code-store" style="display:none;">${escapeTextarea(code)}</textarea>
        <div class="code-header">
            <span class="code-language">${displayLang}</span>
            <div class="code-header-actions">
                ${togglePillHTML}
                <button class="code-copy-btn" aria-label="Copy code" title="Copy code" onclick="UI.copyCodeBlock(this)">
                    ${copyBtnSvg}
                </button>
            </div>
        </div>
        <div class="code-inner-box">
            <div class="code-scroll-area">
                <div class="code-gutter" aria-hidden="true">${lineNumbersHtml}</div>
                <div class="code-content">
                    <pre><code class="language-${lang} hljs" id="${id}">${highlighted}</code></pre>
                </div>
            </div>
            ${expandFooterHTML}
        </div>
        ${previewContainerHTML}
    </div>`;
},
toggleCodeBlockExpand(btn) {
    const codeBlock = btn.closest('.code-block');
    if (!codeBlock) return;
    
    const isCollapsed = codeBlock.classList.contains('is-collapsed');
    const textEl = btn.querySelector('.expand-text');
    const iconSvg = btn.querySelector('.expand-icon');
    
    if (isCollapsed) {
        codeBlock.classList.remove('is-collapsed');
        codeBlock.classList.add('is-expanded');
        if (textEl) textEl.textContent = 'Show Less';
        if (iconSvg) iconSvg.innerHTML = '<polyline points="18 15 12 9 6 15"></polyline>';
    } else {
        codeBlock.classList.remove('is-expanded');
        codeBlock.classList.add('is-collapsed');
        if (textEl) textEl.textContent = 'Show More';
        if (iconSvg) iconSvg.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
        codeBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
},

    createWritingBlockHTML(content) {
        const rawContent = String(content ?? '').replace(/\r\n?/g, '\n');
        const id = 'wb-' + Math.random().toString(36).slice(2, 9);
        const encodedContent = encodeURIComponent(rawContent);
        const renderedContent = this.formatWritingBlockContent(rawContent);
        
        const isLongWriting = rawContent.length > 550 || rawContent.split('\n').length > 14;
        
        const expandFooterHTML = isLongWriting ? `
            <div class="writing-expand-footer">
                <button class="writing-expand-btn" type="button" onclick="UI.toggleWritingBlockExpand(this)">
                    <span class="expand-text">Show More</span>
                    <svg viewBox="0 0 24 24" class="expand-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
            </div>
        ` : '';
        
        return `
        <div class="writing-block ${isLongWriting ? 'is-collapsible is-collapsed' : ''}" data-writing-id="${id}" data-writing-content="${encodedContent}">
            <div class="writing-block-header">
                <span class="writing-block-title">Writing</span>
                <button class="writing-block-copy" type="button" aria-label="Copy writing" title="Copy" onclick="UI.copyWritingBlock(this)">
                    <svg viewBox="0 0 24 24" class="copy-svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="8" y="8" width="12" height="12" rx="3.5"></rect>
                        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path>
                    </svg>
                    <svg viewBox="0 0 24 24" class="check-svg" width="20" height="20" style="display: none;" fill="none" stroke="#28c840" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
            </div>
            <div class="writing-block-content">${renderedContent}</div>
            ${expandFooterHTML}
        </div>`;
    },

    toggleWritingBlockExpand(btn) {
        const writingBlock = btn.closest('.writing-block');
        if (!writingBlock) return;
        
        const isCollapsed = writingBlock.classList.contains('is-collapsed');
        const textEl = btn.querySelector('.expand-text');
        const iconSvg = btn.querySelector('.expand-icon');
        
        if (isCollapsed) {
            writingBlock.classList.remove('is-collapsed');
            writingBlock.classList.add('is-expanded');
            if (textEl) textEl.textContent = 'Show Less';
            if (iconSvg) iconSvg.innerHTML = '<polyline points="18 15 12 9 6 15"></polyline>';
        } else {
            writingBlock.classList.remove('is-expanded');
            writingBlock.classList.add('is-collapsed');
            if (textEl) textEl.textContent = 'Show More';
            if (iconSvg) iconSvg.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
            writingBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    },
copyCodeBlock(btn) {
    const codeBlock = btn.closest('.code-block');
    if (!codeBlock) return;
    
    const rawStore = codeBlock.querySelector('.raw-code-store');
    const codeText = rawStore ? rawStore.value : (codeBlock.querySelector('code')?.innerText || '');
    
    navigator.clipboard.writeText(codeText).then(() => {
        const copySvg = btn.querySelector('.copy-svg');
        const checkSvg = btn.querySelector('.check-svg');
        
        if (copySvg && checkSvg) {
            copySvg.style.display = 'none';
            checkSvg.style.display = 'block';
            
            setTimeout(() => {
                copySvg.style.display = 'block';
                checkSvg.style.display = 'none';
            }, 2000);
        }
    });
},

    copyWritingBlock(btn) {
        const block = btn?.closest('.writing-block');
        if (!block) return;
        
        let content = '';
        try {
            content = decodeURIComponent(block.getAttribute('data-writing-content') || '');
        } catch {
            content = block.querySelector('.writing-block-content')?.innerText || '';
        }
        
        navigator.clipboard.writeText(content).then(() => {
            const copySvg = btn.querySelector('.copy-svg');
            const checkSvg = btn.querySelector('.check-svg');
            
            if (copySvg && checkSvg) {
                copySvg.style.display = 'none';
                checkSvg.style.display = 'block';
                
                setTimeout(() => {
                    copySvg.style.display = 'block';
                    checkSvg.style.display = 'none';
                }, 2000);
            }
        });
    },
toggleCodeBlockMode(btn, mode) {
    const codeBlock = btn.closest('.code-block');
    if (!codeBlock) return;
    
    const previewContainer = codeBlock.querySelector('.code-preview-container');
    const toggleBtns = codeBlock.querySelectorAll('.code-toggle-btn');
    
    toggleBtns.forEach(b => {
        if (b.getAttribute('data-mode') === mode) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
    
    if (mode === 'preview') {
        codeBlock.classList.add('is-preview-mode');
        if (previewContainer) {
            const iframe = previewContainer.querySelector('.code-preview-iframe');
            if (iframe) {
                const rawStore = codeBlock.querySelector('.raw-code-store');
                const rawCode = rawStore ? rawStore.value : (codeBlock.querySelector('code')?.innerText || '');
                const lang = (codeBlock.getAttribute('data-lang') || '').toLowerCase();
                
                let htmlDoc = '';
                if (lang === 'svg' || rawCode.trim().startsWith('<svg')) {
                    htmlDoc = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #09090b;
            min-height: 100vh;
            box-sizing: border-box;
        }
        svg {
            max-width: 100%;
            max-height: 100%;
            height: auto;
        }
    </style>
</head>
<body>
    ${rawCode}
</body>
</html>`;
                } else {
                    htmlDoc = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: #09090b;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
            box-sizing: border-box;
        }
    </style>
</head>
<body>
    ${rawCode}
</body>
</html>`;
                }
                iframe.srcdoc = htmlDoc;
            }
        }
    } else {
        codeBlock.classList.remove('is-preview-mode');
    }
},
highlightCode(code, lang) {
    if (!code) return '';
    const cleanLang = (lang || '').trim().split(/\s+/)[0].toLowerCase();
    
    // High-speed, non-blocking highlighting leveraging preloaded highlight.js
    if (typeof hljs !== 'undefined') {
        try {
            if (cleanLang && hljs.getLanguage(cleanLang)) {
                return hljs.highlight(code, { language: cleanLang, ignoreIllegals: true }).value;
            }
            if (cleanLang === 'text' || cleanLang === 'plaintext') {
                return this.escapeHTML(code);
            }
            return hljs.highlightAuto(code).value;
        } catch (e) {
            return this.escapeHTML(code);
        }
    }
    
    return this.escapeHTML(code);
},
formatWritingBlockContent(content) {
    const raw = String(content ?? '');
    const placeholders = [];
    const registerPlaceholder = (html) => {
        const id = placeholders.length;
        const marker = `\n\n<div class="cx-wb-ph-token" data-ph-idx="${id}"></div>\n\n`;
        placeholders.push({ id, html });
        return marker;
    };
    
    // Protect nested code blocks and math while writing content is parsed
    let text = raw.replace(/(?:^|\r?\n)```([^\r\n]*)\r?\n([\s\S]*?)\r?\n```(?=\r?\n|$)/g, (match, info, code) => {
        const lang = (info || '').trim().split(/\s+/)[0];
        return registerPlaceholder(this.createCodeBlockHTML(lang, code));
    });
    
    if (typeof katex !== 'undefined') {
        try {
            text = text.replace(/(\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])/g, (_, __, t1, t2) => {
                return registerPlaceholder(`<div class="katex-display-block">${katex.renderToString(t1 || t2, { displayMode: true, throwOnError: false })}</div>`);
            });
            text = text.replace(/(\\\(([\s\S]+?)\\\)|\$([^\$\n\r]+?)\$)/g, (_, __, t1, t2) => {
                return katex.renderToString(t1 || t2, { displayMode: false, throwOnError: false });
            });
        } catch (e) {}
    }
    
    let output = '';
    
    if (typeof marked !== 'undefined') {
        try {
            const renderer = new marked.Renderer();
            renderer.link = (href, title, linkText) => {
                const titleAttr = title ? ` title="${title}"` : '';
                return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr} class="markdown-link">${linkText}</a>`;
            };
            renderer.code = (code, language) => {
                const lang = (language || '').trim().split(/\s+/)[0];
                return registerPlaceholder(this.createCodeBlockHTML(lang, code));
            };
            renderer.table = (header, body) => `<div class="markdown-table-wrapper"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
            renderer.blockquote = (quote) => `<blockquote class="markdown-blockquote">${quote}</blockquote>`;
            renderer.hr = () => `<hr class="markdown-hr">`;
            
            output = marked.parse(text, { renderer, gfm: true, breaks: true });
            
            if (typeof DOMPurify !== 'undefined') {
                output = DOMPurify.sanitize(output, {
                    ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'hr', 'code', 'pre', 'div', 'span'],
                    ADD_ATTR: ['target', 'rel', 'data-lang', 'data-code-id', 'data-ph-idx', 'class', 'href', 'title']
                });
            }
        } catch (e) {
            output = '';
        }
    }
    
    if (!output) {
        output = this.escapeHTML(text).replace(/\n/g, '<br>');
    }
    
    output = output.replace(/<p>\s*(<div class="cx-wb-ph-token"[^>]*><\/div>)\s*<\/p>/g, '$1');
    
    placeholders.forEach(ph => {
        const tokenRegex = new RegExp(`<div class="cx-wb-ph-token" data-ph-idx="${ph.id}"><\\/div>`, 'g');
        output = output.replace(tokenRegex, () => ph.html);
    });
    
    return output;
},
    createExecutionOutputHTML(data) {
    const outcome = (data.outcome || 'success').toLowerCase();
    const output = data.output || '';
    const runtime = data.runtime || '24ms';
    const memory = data.memory || '4.2 MB';
    const language = data.language || 'Python';
    const exitCode = data.exitCode !== undefined ? data.exitCode : (outcome === 'failed' || outcome === 'error' ? 1 : 0);
    const id = 'exec-' + Math.random().toString(36).slice(2, 9);
    
    let statusColor = '#3486eb';
    let statusLabel = 'Running';
    if (outcome === 'ok' || outcome === 'success') {
        statusColor = '#28c840';
        statusLabel = 'Success';
    } else if (outcome === 'failed' || outcome === 'error' || outcome === 'err') {
        statusColor = '#ff5f57';
        statusLabel = 'Failed';
    } else if (outcome === 'cancelled' || outcome === 'aborted') {
        statusColor = '#ff9f43';
        statusLabel = 'Cancelled';
    }
    
    return `
    <div class="exec-output-container" id="${id}">
        <div class="exec-header">
            <div class="exec-header-left">
                <i class="fas fa-terminal exec-terminal-icon"></i>
                <span class="exec-title">Output</span>
                <span class="exec-status-badge" style="background: ${statusColor}15; color: ${statusColor};">
                    <span class="exec-status-dot ${outcome === 'running' ? 'pulse' : ''}" style="background-color: ${statusColor};"></span>
                    ${statusLabel}
                </span>
            </div>
            <div class="exec-header-right">
                <button class="exec-btn exec-copy-btn" title="Copy output" onclick="UI.copyExecutionOutput('${id}')">
                    <svg viewBox="0 0 24 24" class="copy-svg" width="16" height="16">
                        <rect x="8" y="3" width="13" height="13" rx="4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        <rect x="3" y="8" width="13" height="13" rx="4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <svg viewBox="0 0 24 24" class="check-svg" width="16" height="16" style="display: none;">
                        <polyline points="20 6 9 17 4 12" fill="none" stroke="#28c840" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </button>
                <button class="exec-btn exec-collapse-btn" title="Toggle collapse" onclick="UI.toggleExecutionCollapse('${id}')">
                    <i class="fas fa-chevron-up"></i>
                </button>
            </div>
        </div>
        <div class="exec-body">
            <pre class="exec-terminal-pre"><code>${this.formatTerminalOutput(output)}</code></pre>
        </div>
        <div class="exec-footer">
            <div class="exec-meta-pill"><i class="far fa-clock"></i> ${runtime}</div>
            <div class="exec-meta-pill"><i class="fas fa-microchip"></i> ${memory}</div>
            <div class="exec-meta-pill"><i class="fas fa-code"></i> ${language}</div>
            <div class="exec-meta-pill"><i class="fas fa-sign-out-alt"></i> Exit Code: ${exitCode}</div>
        </div>
    </div>`;

    },
    copyExecutionOutput(id) {
    const container = document.getElementById(id);
    const codeEl = container ? container.querySelector('.exec-terminal-pre code') : null;
    if (!codeEl) return;
    
    navigator.clipboard.writeText(codeEl.innerText).then(() => {
        const btn = container.querySelector('.exec-copy-btn');
        const copySvg = btn.querySelector('.copy-svg');
        const checkSvg = btn.querySelector('.check-svg');
        
        if (copySvg && checkSvg) {
            copySvg.style.display = 'none';
            checkSvg.style.display = 'block';
            setTimeout(() => {
                copySvg.style.display = 'block';
                checkSvg.style.display = 'none';
            }, 2000);
        }
    });

    },
    toggleExecutionCollapse(id) {
    const container = document.getElementById(id);
    if (!container) return;
    
    const body = container.querySelector('.exec-body');
    const footer = container.querySelector('.exec-footer');
    const icon = container.querySelector('.exec-collapse-btn i');
    
    if (body.style.display === 'none') {
        body.style.display = 'block';
        footer.style.display = 'flex';
        icon.className = 'fas fa-chevron-up';
        container.classList.remove('collapsed');
    } else {
        body.style.display = 'none';
        footer.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
        container.classList.add('collapsed');
    }

    },
    formatTerminalOutput(text) {
    if (!text) return '<i>No output returned.</i>';
    let esc = this.escapeHTML(text);
    
    const ansiStyles = {
        '30': 'color: #1e1e1e;',
        '31': 'color: #ff5f57; font-weight: bold;',
        '32': 'color: #28c840;',
        '33': 'color: #febc2e;',
        '34': 'color: #3486eb;',
        '35': 'color: #d1adff;',
        '36': 'color: #00bcd4;',
        '37': 'color: #ffffff;',
        '90': 'color: #8e8e93;',
    };
    
    esc = esc.replace(/\u001b\[(\d+)m/g, (match, code) => {
        if (code === '0') return '</span>';
        const style = ansiStyles[code];
        return style ? `<span style="${style}">` : '';
    });
    
    if (esc.includes('Traceback') || esc.includes('Error:') || esc.includes('Exception:')) {
        return `<span style="color: #ff5f57;">${esc}</span>`;
    }
    
    return esc;

    },
    createUrlPreviewCard(url) {
    let domain = 'link';
    try {
        domain = new URL(url).hostname;
    } catch (e) {}
    
    const cardHtml = `
        <a href="${url}" target="_blank" class="url-showcase-card" style="text-decoration:none;">
            <div class="url-showcase-top">
                <div class="url-floating-element" style="top:15%; left:15%;"><i class="far fa-calendar-alt"></i></div>
                <div class="url-floating-element" style="top:10%; right:20%;"><i class="fas fa-birthday-cake"></i></div>
                <div class="url-floating-element" style="bottom:20%; left:10%;"><i class="far fa-smile"></i></div>
                <div class="url-floating-element" style="bottom:15%; right:15%;"><i class="fas fa-magic"></i></div>

                <div class="url-main-title">${domain.replace('www.', '')}</div>
            </div>
            <div class="url-showcase-bottom">
                <div class="url-bottom-title">Visit Website</div>
                <div class="url-bottom-domain">${domain}</div>
            </div>
        </a>
    `;
    return cardHtml;

    },
// --- TOOL CALLS & LIVE BROWSER AGENT ---
showBrowserTakeover(controlState = {}) {
        let overlay = document.getElementById('browserTakeoverModalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'browserTakeoverModalOverlay';
            overlay.className = 'browser-takeover-modal-overlay';
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('role', 'dialog');
            overlay.innerHTML = `
                <div class="browser-takeover-card" id="browserTakeoverCard">
                    <div class="browser-header-bar">
                        <div class="browser-header-left">
                            <div class="browser-header-pill">
                                <span class="status-dot" id="browserStatusDot"></span>
                                <span id="browserStatusPillText">Live Handoff</span>
                            </div>
                        </div>
                        <div class="browser-address-island" id="browserAddressIsland">
                            <i class="fas fa-lock lock-icon"></i>
                            <span class="browser-domain-text" id="browserDomainText">cohana.browser</span>
                            <span class="browser-path-text" id="browserPathText">/session</span>
                        </div>
                        <div class="browser-header-right">
                            <button class="browser-glass-btn" id="browserMinimizeBtn" title="Minimize (Esc)" aria-label="Minimize browser">
                                <i class="fas fa-minus"></i>
                            </button>
                        </div>
                    </div>
                    <div class="browser-viewport-wrapper">
                        <iframe id="browserTakeoverIframe" class="browser-iframe-element" allow="clipboard-read; clipboard-write; autoplay; fullscreen"></iframe>
                    </div>
                    <div class="browser-action-dock">
                        <div class="browser-dock-content">
                            <div class="browser-dock-info">
                                <div class="browser-dock-badge">
                                    <i class="fas fa-shield-halved" id="browserDockIcon"></i>
                                </div>
                                <div class="browser-dock-text-group">
                                    <span class="browser-dock-title" id="browserReasonTitle">Action Required</span>
                                    <span class="browser-dock-desc" id="browserReasonDesc">Complete the requested step in the window above.</span>
                                </div>
                            </div>
                            <div class="browser-dock-actions">
                                <button class="dock-note-toggle-btn" id="browserNoteToggleBtn" type="button">
                                    <i class="far fa-comment-dots"></i> Add Note
                                </button>
                                <button class="dock-resume-btn" id="browserResumeSubmitBtn" type="button">
                                    <span>Done, Continue</span>
                                    <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                        <div class="dock-expandable-note" id="browserExpandableNote">
                            <input type="text" class="dock-note-input" id="browserReportInput" placeholder="Add optional details for Cohana (e.g. 'I confirmed 2FA')..." autocomplete="off">
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            
            document.getElementById('browserMinimizeBtn').onclick = () => {
                this.hideBrowserTakeover();
                this.renderBrowserTakeoverBanner(window.Logic?.State?.browserControl);
            };
            
            const noteToggleBtn = document.getElementById('browserNoteToggleBtn');
            const noteContainer = document.getElementById('browserExpandableNote');
            const noteInput = document.getElementById('browserReportInput');
            
            if (noteToggleBtn && noteContainer) {
                noteToggleBtn.onclick = () => {
                    noteContainer.classList.toggle('show');
                    const isShown = noteContainer.classList.contains('show');
                    noteToggleBtn.innerHTML = isShown ?
                        `<i class="fas fa-times"></i> Close Note` :
                        `<i class="far fa-comment-dots"></i> Add Note`;
                    if (isShown && noteInput) noteInput.focus();
                };
            }
            
            if (noteInput) {
                noteInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        document.getElementById('browserResumeSubmitBtn')?.click();
                    }
                });
            }
            
            document.getElementById('browserResumeSubmitBtn').onclick = () => {
                const input = document.getElementById('browserReportInput');
                const report = input ? input.value : '';
                this.updateBrowserTakeoverResuming();
                if (window.Logic?.resumeBrowserAgent) {
                    window.Logic.resumeBrowserAgent(report);
                }
            };
            
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    this.hideBrowserTakeover();
                    this.renderBrowserTakeoverBanner(window.Logic?.State?.browserControl);
                }
            };
        }
        
        const iframe = document.getElementById('browserTakeoverIframe');
        const domainText = document.getElementById('browserDomainText');
        const pathText = document.getElementById('browserPathText');
        const reasonTitle = document.getElementById('browserReasonTitle');
        const reasonDesc = document.getElementById('browserReasonDesc');
        const resumeBtn = document.getElementById('browserResumeSubmitBtn');
        const statusDot = document.getElementById('browserStatusDot');
        const statusPillText = document.getElementById('browserStatusPillText');
        
        this.hideBrowserTakeoverBanner();
        
        if (iframe && controlState.debugUrl) {
            const interactiveUrl = window.Logic?.buildInteractiveBrowserUrl ?
                window.Logic.buildInteractiveBrowserUrl(controlState.debugUrl) :
                controlState.debugUrl;
            if (iframe.src !== interactiveUrl) iframe.src = interactiveUrl;
            
            try {
                const parsed = new URL(controlState.debugUrl);
                if (domainText) domainText.textContent = parsed.hostname.replace('www.', '');
                if (pathText) pathText.textContent = parsed.pathname || '';
            } catch {
                if (domainText) domainText.textContent = 'live-browser';
                if (pathText) pathText.textContent = '/session';
            }
        }
        
        if (reasonTitle) reasonTitle.textContent = controlState.title || "Action Required";
        if (reasonDesc) reasonDesc.textContent = controlState.reason || "Complete the requested action in the browser above.";
        
        if (statusDot) statusDot.className = 'status-dot';
        if (statusPillText) statusPillText.textContent = 'Live Handoff';
        
        if (resumeBtn) {
            resumeBtn.disabled = false;
            resumeBtn.innerHTML = `<span>Done, Continue</span> <i class="fas fa-arrow-right"></i>`;
        }
        
        overlay.classList.add('show');
        
        this._browserEscHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideBrowserTakeover();
                this.renderBrowserTakeoverBanner(window.Logic?.State?.browserControl);
            }
        };
        window.addEventListener('keydown', this._browserEscHandler);
    },
    
    updateBrowserTakeoverResuming() {
        const statusDot = document.getElementById('browserStatusDot');
        const statusPillText = document.getElementById('browserStatusPillText');
        const resumeBtn = document.getElementById('browserResumeSubmitBtn');
        
        if (statusDot) statusDot.className = 'status-dot resuming';
        if (statusPillText) statusPillText.textContent = 'Resuming Cohana...';
        if (resumeBtn) {
            resumeBtn.disabled = true;
            resumeBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> <span>Resuming Agent...</span>`;
        }
        
        setTimeout(() => {
            this.hideBrowserTakeover();
            this.hideBrowserTakeoverBanner();
        }, 1000);
    },
    
    resetBrowserTakeoverButtons() {
        const statusDot = document.getElementById('browserStatusDot');
        const statusPillText = document.getElementById('browserStatusPillText');
        const resumeBtn = document.getElementById('browserResumeSubmitBtn');
        
        if (statusDot) statusDot.className = 'status-dot';
        if (statusPillText) statusPillText.textContent = 'Live Handoff';
        if (resumeBtn) {
            resumeBtn.disabled = false;
            resumeBtn.innerHTML = `<span>Done, Continue</span> <i class="fas fa-arrow-right"></i>`;
        }
    },
    
    hideBrowserTakeover() {
        const overlay = document.getElementById('browserTakeoverModalOverlay');
        if (overlay) overlay.classList.remove('show');
        if (this._browserEscHandler) {
            window.removeEventListener('keydown', this._browserEscHandler);
        }
    },
    
    renderBrowserTakeoverBanner(controlState) {
        if (!controlState || !controlState.awaitingUser) {
            this.hideBrowserTakeoverBanner();
            return;
        }
        let pill = document.getElementById('browserMinimizedPill');
        if (!pill) {
            pill = document.createElement('div');
            pill.id = 'browserMinimizedPill';
            pill.className = 'browser-minimized-pill';
            pill.innerHTML = `
                <div class="minimized-beacon">
                    <i class="fas fa-arrow-pointer"></i>
                </div>
                <div class="minimized-text-group">
                    <span class="minimized-title">Browser Handoff Active</span>
                    <span class="minimized-sub">Tap to view live session</span>
                </div>
            `;
            document.body.appendChild(pill);
            pill.onclick = () => {
                this.showBrowserTakeover(window.Logic?.State?.browserControl);
            };
        }
        pill.classList.add('show');
    },
    
    hideBrowserTakeoverBanner() {
        const pill = document.getElementById('browserMinimizedPill');
        if (pill) pill.classList.remove('show');
    },
    renderToolCallStatus(
    toolData,
    legacyLabel = null) {
    let data;

    if (
        typeof toolData === 'string'
    ) {
        data = {
            name: toolData,
            label:
                legacyLabel || toolData
        };
    } else {
        data = {
            ...(toolData || {})
        };
    }

    const toolName =
        String(
            data.name ||
            data.tool_name ||
            data.type ||
            'computer_use'
        );

    const label =
        String(
            data.display ||
            data.label ||
            legacyLabel ||
            ''
        ).trim();

    const phase =
        data.phase ||
        (
            data.type ===
            'requires_confirmation'
                ? 'confirmation'
                : 'event'
        );

    if (
        toolName ===
            'yield_to_user'
    ) {
        const reason =
            data.reason ||
            label ||
            'Waiting for your help';

        this.showNotification(
            reason
        );
    }

    const chatContainer =
        elements.chatContainer;

    if (!chatContainer) {
        return;
    }

    const botWrapper =
        chatContainer.lastElementChild;

    if (
        !botWrapper ||
        !botWrapper.classList.contains(
            'bot-wrapper'
        )
    ) {
        return;
    }

    let toolContainer =
        botWrapper.querySelector(
            '.computer-use-tool-container'
        );

    if (!toolContainer) {
        toolContainer =
            document.createElement(
                'div'
            );

        toolContainer.className =
            'computer-use-tool-container';

        toolContainer.style.cssText =
            [
                'display:flex',
                'flex-direction:column',
                'gap:8px',
                'margin-top:12px',
                'margin-bottom:8px'
            ].join(';');

        const target =
            botWrapper.querySelector(
                '.message.bot-message'
            ) ||
            botWrapper;

        target.appendChild(
            toolContainer
        );
    }

    /*
     * Native background tools such as search/code execution are represented
     * compactly. Computer Use actions get their exact command display.
     */
    const isComputerAction =
        data.step_type ===
            'function_call' ||
        data.native === false ||
        Boolean(
            data.coordinates
        ) ||
        Boolean(
            data.arguments
        );

    const commandText =
        label ||
        (
            isComputerAction
                ? `[${toolName}]`
                : `Running ${toolName}`
        );

    const existingId =
        data.id
            ? `computer-tool-${CSS.escape(
                String(data.id)
            )}`
            : null;

    let row =
        existingId
            ? toolContainer.querySelector(
                `#${existingId}`
            )
            : null;

    if (!row) {
        row =
            document.createElement(
                'div'
            );

        if (existingId) {
            row.id =
                existingId;
        }

        row.className =
            'computer-use-tool-row';

        row.style.cssText =
            [
                'display:flex',
                'align-items:flex-start',
                'gap:10px',
                'padding:10px 12px',
                'border-radius:14px',
                'background:rgba(255,255,255,0.04)',
                'border:1px solid rgba(255,255,255,0.08)',
                'font-size:13px',
                'line-height:1.45',
                'color:rgba(255,255,255,0.82)'
            ].join(';');

        toolContainer.appendChild(
            row
        );
    }

    const icon =
        toolName ===
            'yield_to_user'
            ? 'fa-hand'
            : phase ===
                'complete'
                ? 'fa-check'
                : phase ===
                    'confirmation'
                    ? 'fa-shield-halved'
                    : 'fa-arrow-pointer';

    const iconColor =
        toolName ===
            'yield_to_user'
            ? '#ff9f43'
            : phase ===
                'complete'
                ? '#30d158'
                : phase ===
                    'confirmation'
                    ? '#ffd60a'
                    : '#3486eb';

    row.innerHTML = `
        <span
            style="
                width:28px;
                height:28px;
                flex:0 0 28px;
                display:flex;
                align-items:center;
                justify-content:center;
                border-radius:9px;
                background:rgba(255,255,255,0.06);
                color:${iconColor};
            "
        >
            <i
                class="fas ${icon}"
                aria-hidden="true"
            ></i>
        </span>

        <div
            style="
                min-width:0;
                display:flex;
                flex-direction:column;
                gap:3px;
                flex:1;
            "
        >
            <span
                style="
                    font-weight:600;
                    color:#ffffff;
                    overflow-wrap:anywhere;
                "
            >
                ${this.escapeHTML
                    ? this.escapeHTML(
                        commandText
                    )
                    : commandText}
            </span>

            ${
                data.intent
                    ? `
                        <span
                            style="
                                color:rgba(255,255,255,0.55);
                                font-size:12px;
                                overflow-wrap:anywhere;
                            "
                        >
                            ${this.escapeHTML
                                ? this.escapeHTML(
                                    String(
                                        data.intent
                                    )
                                )
                                : String(
                                    data.intent
                                )}
                        </span>
                    `
                    : ''
            }

            ${
                phase ===
                    'confirmation'
                    ? `
                        <span
                            style="
                                color:#ffd60a;
                                font-size:12px;
                                font-weight:600;
                            "
                        >
                            Confirmation required
                        </span>
                    `
                    : ''
            }
        </div>
    `;

    if (
        phase === 'start'
    ) {
        row.dataset.state =
            'running';

        row.style.borderColor =
            'rgba(52,134,235,0.24)';
    } else if (
        phase === 'complete'
    ) {
        row.dataset.state =
            'complete';

        row.style.borderColor =
            'rgba(48,209,88,0.18)';
    } else if (
        phase === 'confirmation'
    ) {
        row.dataset.state =
            'confirmation';

        row.style.borderColor =
            'rgba(255,214,10,0.22)';
    }

    const scrollTarget =
        elements.chatContainer;

    if (
        scrollTarget
    ) {
        const nearBottom =
            scrollTarget.scrollHeight -
            scrollTarget.scrollTop -
            scrollTarget.clientHeight <
            160;

        if (nearBottom) {
            scrollTarget.scrollTop =
                scrollTarget.scrollHeight;
        }
    }
    },
    // --- CITATIONS & SOURCES ---
    openSourcesPanel() {
    const list = window.Logic && window.Logic.State ? window.Logic.State.currentSourcesList : [];
    const container = document.getElementById('sourcesPanelContent');
    const titleEl = document.getElementById('sourcesPanelTitle');
    
    const getDomain = (url) => {
        try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
    };
    const getDomainName = (url) => {
        const domain = getDomain(url).toLowerCase();
        if (!domain) return 'Link';
        if (domain.includes('openai.com')) return 'OpenAI';
        if (domain.includes('arxiv.org')) return 'arXiv';
        if (domain.includes('google.com')) return 'Google';
        if (domain.includes('github.com')) return 'GitHub';
        if (domain.includes('wikipedia.org')) return 'Wikipedia';
        const parts = domain.split('.');
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    };
    
    if (titleEl) {
        titleEl.textContent = `Sources ${list.length}`;
        titleEl.style.letterSpacing = '-0.022em';
    }
    
    if (container) {
        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 20px; text-align: center; color: var(--muted-color, #8e8e93); gap: 12px;">
                    <i class="far fa-folder-open" style="font-size: 32px; opacity: 0.5;"></i>
                    <span style="font-size: 14.5px; font-weight: 500; letter-spacing: -0.01em;">No sources used in this conversation.</span>
                </div>
            `;
        } else {
            list.forEach(src => {
                const domain = getDomain(src.uri);
                const title = src.title || getDomainName(src.uri);
                const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
                
                const row = document.createElement('a');
                row.href = src.uri;
                row.target = '_blank';
                row.rel = 'noopener noreferrer';
                row.className = 'source-row';
                row.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-top: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 18px;
                    padding: 14px 16px;
                    color: var(--body-color);
                    text-decoration: none;
                    transition: transform 100ms ease-out, background-color 0.2s;
                    user-select: none;
                    -webkit-user-select: none;
                    cursor: pointer;
                    box-sizing: border-box;
                    width: 100%;
                `;
                
                row.addEventListener('pointerdown', () => {
                    row.style.transform = 'scale(0.97)';
                });
                row.addEventListener('pointerup', () => {
                    row.style.transform = '';
                });
                row.addEventListener('pointercancel', () => {
                    row.style.transform = '';
                });
                
                row.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 14px; min-width: 0; flex-grow: 1;">
                        <div style="width: 38px; height: 38px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <img src="${faviconUrl}" onerror="this.src='logo.png'; this.onerror=null;" style="width: 20px; height: 20px; object-fit: contain;" />
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0; flex-grow: 1; text-align: left;">
                            <span style="font-size: 14.5px; font-weight: 600; color: var(--header-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.015em;">${title}</span>
                            <span style="font-size: 12px; color: var(--muted-color, #8e8e93); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.005em;">${domain}</span>
                        </div>
                    </div>
                    <div style="color: var(--muted-color, #8e8e93); font-size: 13px; padding-left: 10px; flex-shrink: 0; display: flex; align-items: center;">
                        <i class="fas fa-arrow-up-right-from-square"></i>
                    </div>
                `;
                
                container.appendChild(row);
            });
        }
    }
    
    const panel = document.getElementById('slideInSourcesPanel');
    if (panel) {
        panel.classList.add('show');
    }

    },
    closeSourcesPanel() {
    const panel = document.getElementById('slideInSourcesPanel');
    if (panel) {
        panel.classList.remove('show');
    }

    },
    renderCitations(citations) {
    const lm = elements.chatContainer.lastElementChild; if (!lm || !lm.classList.contains('bot-wrapper')) return;
    const textElement = lm.querySelector('.message-text');
    const text = textElement ? textElement.innerText : '';
    this.updateMessageSources(lm, text, citations, null);

    },
    renderGroundingCitations(chunks) {
    const lm = elements.chatContainer.lastElementChild; if (!lm || !lm.classList.contains('bot-wrapper')) return;
    const textElement = lm.querySelector('.message-text');
    const text = textElement ? textElement.innerText : '';
    this.updateMessageSources(lm, text, null, chunks);

    },
    updateMessageSources(messageWrapper, text, citations, groundingChunks) {
    if (!messageWrapper) return;
    const sourcesRow = messageWrapper.querySelector('.message-sources-row');
    if (!sourcesRow) return;
    
    sourcesRow.innerHTML = '';
    const msgSources = window.Logic ? window.Logic.extractSources(text, citations, groundingChunks) : [];
    if (msgSources.length === 0) return;
    
    const getDomain = (url) => {
        try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
    };
    const getDomainName = (url) => {
        const domain = getDomain(url).toLowerCase();
        if (!domain) return 'Link';
        if (domain.includes('openai.com')) return 'OpenAI';
        if (domain.includes('arxiv.org')) return 'arXiv';
        if (domain.includes('google.com')) return 'Google';
        if (domain.includes('github.com')) return 'GitHub';
        if (domain.includes('wikipedia.org')) return 'Wikipedia';
        const parts = domain.split('.');
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    };
    
    if (window.Logic && window.Logic.State && window.Logic.State.currentSourcesList) {
        msgSources.forEach(src => {
            const cleanUri = src.uri.trim();
            const existing = window.Logic.State.currentSourcesList.find(s => s.uri.toLowerCase() === cleanUri.toLowerCase());
            if (!existing) {
                window.Logic.State.currentSourcesList.push({
                    title: src.title ? src.title.trim() : '',
                    uri: cleanUri
                });
            } else if (!existing.title && src.title) {
                existing.title = src.title.trim();
            }
        });
    }
    
    const firstSrc = msgSources[0];
    const firstDomain = getDomain(firstSrc.uri);
    const firstTitle = firstSrc.title || getDomainName(firstSrc.uri);
    const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${firstDomain}`;
    
    const countText = msgSources.length > 1 ? ` +${msgSources.length - 1}` : '';
    
    const pill = document.createElement('button');
    pill.className = 'action-pill action-pill-sources';
    pill.innerHTML = `
        <img src="${faviconUrl}" onerror="this.src='logo.png'; this.onerror=null;" style="width: 14px; height: 14px; border-radius: 3px; object-fit: contain;" />
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">${firstTitle}</span>
        ${countText ? `<span style="opacity: 0.6; font-size: 11px; font-weight: 600;">${countText}</span>` : ''}
    `;
    
    pill.onclick = (e) => {
        e.stopPropagation();
        UI.openSourcesPanel();
    };
    
    sourcesRow.appendChild(pill);

    },
    copyToClipboard(text,btnElement){
        navigator.clipboard.writeText(text).then(()=>{
            const orig=btnElement.innerHTML;
            btnElement.innerHTML=`<i class="fas fa-check"></i> ${t('copy')}`;
            setTimeout(()=>{btnElement.innerHTML=orig;
            },
            2000);
        });
    }
  });
})();