(function() {
    // ── Workspace Token IndexedDB Storage ────────────────────────────────────
    const WorkspaceDB = {
        _db: null,
        DB_NAME   : 'cohana_workspace',
        DB_VERSION: 1,
        STORE_NAME: 'tokens',

        async getDB() {
            if (this._db) return this._db;
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
                req.onupgradeneeded = e => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                        db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                    }
                };
                req.onsuccess = e => { this._db = e.target.result; resolve(this._db); };
                req.onerror   = e => reject(e.target.error);
            });
        },
async getToken() {
    try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const req = db.transaction(this.STORE_NAME, 'readonly').objectStore(this.STORE_NAME).get('workspace_token');
            req.onsuccess = () => resolve(req.result?.data || null);
            req.onerror = () => reject(req.error);
        });
    } catch { return null; }
},
async setToken(data) {
    try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const req = db.transaction(this.STORE_NAME, 'readwrite').objectStore(this.STORE_NAME).put({ id: 'workspace_token', data });
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    } catch { return false; }
},
async clearToken() {
    try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readwrite');
            tx.objectStore(this.STORE_NAME).delete('workspace_token');
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    } catch { return false; }}};

    window.addEventListener('message', (event) => {
        if (!event.data || typeof event.data !== 'object') return;
        const expectedOrigin = window.location.origin;
        if (event.origin !== expectedOrigin) return;
        if (window.__workspaceAuthPopup && event.source !== window.__workspaceAuthPopup) return;

        if (event.data.type === 'workspace_token') {
            WorkspaceDB.setToken(event.data.data).then(() => {
                // Resolve any pending connect callbacks
                if (window.__workspaceConnectResolve) {
                    window.__workspaceConnectResolve(event.data.data);
                    window.__workspaceConnectResolve = null;
                }
                if (window.UI) UI.showNotification('Google Workspace connected ✓');
            });
        } else if (event.data.type === 'workspace_error') {
            if (window.__workspaceConnectReject) {
                window.__workspaceConnectReject(new Error(event.data.error));
                window.__workspaceConnectReject = null;
            }
            if (window.UI) UI.showNotification('Workspace connection failed: ' + event.data.error);
        }
        window.__workspaceAuthPopup = null;
    });

    const API = {

        // Get memory string from Logic/State
        _getMemoryString() {
            try {
                if (window.Logic && window.Logic.getEffectiveMemory) {
                    return window.Logic.getEffectiveMemory();
                }
            } catch {}
            return '';
        },
        _isMemoryEnabled() {
            return localStorage.getItem('cohana_memory_enabled') !== 'false';
        },
async chat(formData, callbacks, internalState = null) {
    try {
        if (internalState?.thoughtSignature) {
            formData.append('thoughtSignature', internalState.thoughtSignature);
        }
        
        if (callbacks?.onStart) {
            callbacks.onStart();
        }
        
        let currentFormData = formData;
        let shouldResume = true;
        let resumeRequest = false;
        
        while (shouldResume && !callbacks?.signal?.aborted) {
            shouldResume = false;
            let receivedTimeout = false;
            
            if (resumeRequest) {
                if (internalState?.interactionId) {
                    currentFormData.set('interaction_id', internalState.interactionId);
                }
                if (internalState?.lastEventId) {
                    currentFormData.set('last_event_id', internalState.lastEventId);
                }
                currentFormData.set('resume', 'true');
            } else {
                currentFormData.delete('interaction_id');
                currentFormData.delete('last_event_id');
                currentFormData.delete('resume');
            }
            
            if (!currentFormData.has('memoryEnabled')) {
                currentFormData.set('memoryEnabled', String(this._isMemoryEnabled()));
            }
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: currentFormData,
                signal: callbacks?.signal
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            await this._readStream(
                response,
                (data) => {
                    switch (data.type) {
                        case 'event_id':
                            if (internalState) {
                                internalState.lastEventId = data.id;
                            }
                            callbacks.onEventId?.(data.id);
                            break;
                            
                        case 'interaction_id':
                            if (internalState) {
                                internalState.interactionId = data.id;
                            }
                            callbacks.onInteractionId?.(data.id);
                            break;
                            
                        case 'stream_timeout':
                            receivedTimeout = true;
                            if (data.interaction_id && internalState) {
                                internalState.interactionId = data.interaction_id;
                            }
                            if (data.last_event_id && internalState) {
                                internalState.lastEventId = data.last_event_id;
                            }
                            resumeRequest = true;
                            break;
                            
                        case 'mode_update':
                        case 'interaction_mode':
                            if (data.mode) callbacks.onModeUpdate?.(data.mode);
                            break;
                            
                        case 'memory_update':
                            callbacks.onMemory?.(data.content);
                            break;
                            
                        case 'thought_signature':
                            if (internalState) {
                                internalState.thoughtSignature = data.content;
                            }
                            callbacks.onThoughtSignature?.(data.content);
                            break;
                            
                        case 'thought':
                        case 'thinking':
                            callbacks.onThought?.(data.content, data);
                            break;
                            
                        case 'text':
                            callbacks.onText?.(data.content);
                            break;
                            
                        case 'citation':
                            callbacks.onCitation?.(data.citation);
                            break;
                            
                        case 'code_execution_call':
                        case 'executable_code':
                            if (callbacks.onCodeExecutionCall) {
                                callbacks.onCodeExecutionCall(data);
                            } else if (callbacks.onCode) {
                                callbacks.onCode(data);
                            }
                            break;
                            
                        case 'code_execution_result':
                        case 'code_result':
                            if (callbacks.onCodeExecutionResult) {
                                callbacks.onCodeExecutionResult(data);
                            } else if (callbacks.onCodeResult) {
                                callbacks.onCodeResult(data);
                            }
                            break;

                        case 'url_context_call':
                            callbacks.onUrlContextCall?.(data);
                            break;

                        case 'url_context_result':
                            callbacks.onUrlContextResult?.(data);
                            break;

                        case 'google_search_call':
                            callbacks.onGoogleSearchCall?.(data);
                            break;

                        case 'google_search_result':
                            callbacks.onGoogleSearchResult?.(data);
                            break;

                        case 'tool_call':
                            callbacks.onToolCall?.(data);
                            break;

                        case 'tool_result':
                            callbacks.onToolResult?.(data);
                            break;
                            
                        case 'code_image':
                            callbacks.onCodeImage?.(data);
                            break;
                            
                        case 'audio':
                            callbacks.onAudio?.(data);
                            break;
                            
                        case 'grounding_metadata':
                            callbacks.onGrounding?.(data.content);
                            break;
                            
                        case 'uploaded_file_meta':
                            callbacks.onUploadedFileMeta?.(data);
                            break;
                            
                        case 'end':
                            break;
                            
                        case 'error':
                            callbacks.onError?.(new Error(data.error?.message || data.message || 'Chat error'));
                            break;
                    }
                },
                callbacks?.signal
            );
            
            if (receivedTimeout && !callbacks?.signal?.aborted) {
                shouldResume = true;
                resumeRequest = true;
            }
        }
        
        if (callbacks?.onDone) {
            callbacks.onDone();
        }
    } catch (error) {
        if (callbacks?.onError) {
            callbacks.onError(error);
        }
    }
},
async agent(formData, callbacks, internalState = null) {
    try {
        if (callbacks?.onStart) {
            callbacks.onStart();
        }
        
        let currentFormData = formData;
        let shouldResume = true;
        let resumeRequest = false;
        
        while (shouldResume && !callbacks?.signal?.aborted) {
            shouldResume = false;
            let receivedTimeout = false;
            let isInteractionIncomplete = false;
            
            if (resumeRequest) {
                // Reconnecting to the exact same background interaction and environment
                if (internalState?.interactionId) {
                    currentFormData.set('interaction_id', internalState.interactionId);
                }
                if (internalState?.environmentId) {
                    currentFormData.set('environment_id', internalState.environmentId);
                }
                if (internalState?.browserSessionId) {
                    currentFormData.set('browser_session_id', internalState.browserSessionId);
                }
                if (internalState?.lastEventId) {
                    currentFormData.set('last_event_id', internalState.lastEventId);
                }
                currentFormData.set('resume', 'true');
            } else {
                // Starting a new turn: purge resume-specific parameters
                currentFormData.delete('interaction_id');
                currentFormData.delete('last_event_id');
                currentFormData.delete('resume');
                
                if (internalState?.previousInteractionId) {
                    currentFormData.set('previous_interaction_id', internalState.previousInteractionId);
                }
                if (internalState?.environmentId) {
                    currentFormData.set('environment_id', internalState.environmentId);
                }
            }
            
            if (!currentFormData.has('memoryEnabled')) {
                currentFormData.set('memoryEnabled', String(this._isMemoryEnabled()));
            }
            
            const response = await fetch('/api/agent', {
                method: 'POST',
                body: currentFormData,
                signal: callbacks?.signal
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            await this._readStream(
                response,
                data => {
                    switch (data.type) {
                        case 'event_id':
                            if (internalState) internalState.lastEventId = data.id;
                            callbacks?.onEventId?.(data.id);
                            break;
                            
                        case 'interaction_id':
                            if (internalState) internalState.interactionId = data.id;
                            callbacks?.onInteractionId?.(data.id);
                            break;
                            
                        case 'environment_id':
                            if (internalState) internalState.environmentId = data.id;
                            callbacks?.onEnvironmentId?.(data.id);
                            break;
                            
                        case 'browser_session_id':
                            if (internalState) internalState.browserSessionId = data.id;
                            callbacks?.onBrowserSessionId?.(data.id);
                            break;
                            
                        case 'status':
                            if (data.status === 'incomplete') {
                                isInteractionIncomplete = true;
                                if (data.interaction_id && internalState) {
                                    internalState.interactionId = data.interaction_id;
                                }
                                if (data.environment_id && internalState) {
                                    internalState.environmentId = data.environment_id;
                                }
                            }
                            callbacks?.onStatus?.(data);
                            break;
                            
                        case 'interaction_incomplete':
                            isInteractionIncomplete = true;
                            if (data.interaction_id && internalState) {
                                internalState.interactionId = data.interaction_id;
                            }
                            if (data.environment_id && internalState) {
                                internalState.environmentId = data.environment_id;
                            }
                            if (data.last_event_id && internalState) {
                                internalState.lastEventId = data.last_event_id;
                            }
                            callbacks?.onIncomplete?.(data);
                            break;
                            
                        case 'agent':
                            callbacks?.onAgentSelect?.(data);
                            break;
                            
                        case 'agent_handoff':
                            callbacks?.onAgentHandoff?.(data);
                            break;
                            
                        case 'plan_proposed':
                            callbacks?.onPlanProposed?.(data);
                            break;
                            
                        case 'stream_timeout':
                            receivedTimeout = true;
                            resumeRequest = true;
                            if (data.interaction_id && internalState) {
                                internalState.interactionId = data.interaction_id;
                            }
                            if (data.environment_id && internalState) {
                                internalState.environmentId = data.environment_id;
                            }
                            if (data.browser_session_id && internalState) {
                                internalState.browserSessionId = data.browser_session_id;
                            }
                            if (data.last_event_id && internalState) {
                                internalState.lastEventId = data.last_event_id;
                            }
                            break;
                            
                        case 'yield_to_user':
                            if (internalState) {
                                if (data.interaction_id) internalState.interactionId = data.interaction_id;
                                if (data.browser_session_id) internalState.browserSessionId = data.browser_session_id;
                            }
                            callbacks?.onYieldToUser?.(data);
                            break;
                            
                        case 'thought':
                            callbacks?.onThought?.(data.content, data);
                            break;
                            
                        case 'thought_signature':
                            callbacks?.onThoughtSignature?.(data.content);
                            break;
                            
                        case 'text':
                            callbacks?.onText?.(data.content);
                            break;
                            
                        case 'code_execution_call':
                        case 'executable_code':
                            callbacks?.onCodeExecutionCall?.(data);
                            break;
                            
                        case 'code_execution_result':
                        case 'code_result':
                            callbacks?.onCodeExecutionResult?.(data);
                            break;
                            
                        case 'url_context_call':
                            callbacks?.onUrlContextCall?.(data);
                            break;
                            
                        case 'url_context_result':
                            callbacks?.onUrlContextResult?.(data);
                            break;
                            
                        case 'google_search_call':
                            callbacks?.onGoogleSearchCall?.(data);
                            break;
                            
                        case 'google_search_result':
                            callbacks?.onGoogleSearchResult?.(data);
                            break;
                            
                        case 'tool_result':
                            callbacks?.onToolResult?.(data);
                            break;
                            
                        case 'tool_call':
                            callbacks?.onToolCall?.(data);
                            break;
                            
                        case 'tool_call_start':
                            callbacks?.onToolCallStart?.(data);
                            break;
                            
                        case 'tool_call_complete':
                            callbacks?.onToolCallComplete?.(data);
                            break;
                            
                        case 'requires_confirmation':
                            callbacks?.onRequiresConfirmation?.(data);
                            break;
                            
                        case 'file_shared':
                        case 'file':
                            callbacks?.onFileShared?.(data);
                            callbacks?.onFile?.(data);
                            break;
                            
                        case 'file_share_error':
                            callbacks?.onFileShareError?.(data);
                            break;
                            
                        case 'image_data':
                        case 'code_image':
                            callbacks?.onCodeImage?.(data);
                            break;
                            
                        case 'attachment_warning':
                            callbacks?.onAttachmentWarning?.(data);
                            break;
                            
                        case 'error':
                            callbacks?.onError?.(
                                new Error(data.error?.message || data.message || 'Agent error')
                            );
                            break;
                    }
                },
                callbacks?.signal
            );
            
            // Seamlessly reconnect on 300-second stream timeouts or budget continuations
            if (receivedTimeout && !callbacks?.signal?.aborted) {
                shouldResume = true;
                resumeRequest = true;
            } else if (isInteractionIncomplete && !callbacks?.signal?.aborted) {
                shouldResume = true;
                resumeRequest = true;
                currentFormData.set('prompt', 'continue');
            }
        }
        
        callbacks?.onDone?.();
    } catch (error) {
        callbacks?.onError?.(error);
    }
},

async resumeAgentAfterUserControl(params, callbacks, internalState = null) {
    try {
        callbacks?.onStart?.();
        
        const {
            interactionId,
            browserSessionId,
            lastEventId,
            userMessage,
            userMemories
        } = params;
        
        let currentPayload = {
            interaction_id: interactionId || internalState?.interactionId,
            browser_session_id: browserSessionId || internalState?.browserSessionId,
            last_event_id: lastEventId || internalState?.lastEventId || null,
            user_message: userMessage || 'The user completed the manual browser action.',
            userMemories: userMemories || (this._getMemoryString ? this._getMemoryString() : '')
        };
        
        let shouldResume = true;
        
        while (shouldResume && !callbacks?.signal?.aborted) {
            shouldResume = false;
            let receivedTimeout = false;
            
            if (internalState?.interactionId) {
                currentPayload.interaction_id = internalState.interactionId;
            }
            if (internalState?.browserSessionId) {
                currentPayload.browser_session_id = internalState.browserSessionId;
            }
            if (internalState?.lastEventId) {
                currentPayload.last_event_id = internalState.lastEventId;
            }
            
            const response = await fetch('/api/agent/resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentPayload),
                signal: callbacks?.signal
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error (${response.status}): ${errorText}`);
            }
            
            await this._readStream(
                response,
                data => {
                    switch (data.type) {
                        case 'event_id':
                            if (internalState) internalState.lastEventId = data.id;
                            callbacks?.onEventId?.(data.id);
                            break;
                            
                        case 'interaction_id':
                            if (internalState) internalState.interactionId = data.id;
                            callbacks?.onInteractionId?.(data.id);
                            break;
                            
                        case 'browser_session_id':
                            if (internalState) internalState.browserSessionId = data.id;
                            callbacks?.onBrowserSessionId?.(data.id);
                            break;
                            
                        case 'stream_timeout':
                            receivedTimeout = true;
                            if (data.interaction_id && internalState) {
                                internalState.interactionId = data.interaction_id;
                            }
                            if (data.browser_session_id && internalState) {
                                internalState.browserSessionId = data.browser_session_id;
                            }
                            if (data.last_event_id && internalState) {
                                internalState.lastEventId = data.last_event_id;
                            }
                            break;
                            
                        case 'yield_to_user':
                            if (internalState) {
                                if (data.interaction_id) internalState.interactionId = data.interaction_id;
                                if (data.browser_session_id) internalState.browserSessionId = data.browser_session_id;
                            }
                            callbacks?.onYieldToUser?.(data);
                            break;
                            
                        case 'thought':
                            callbacks?.onThought?.(data.content, data);
                            break;
                            
                        case 'thought_signature':
                            callbacks?.onThoughtSignature?.(data.content);
                            break;
                            
                        case 'text':
                            callbacks?.onText?.(data.content);
                            break;
                            
                        case 'code_execution_call':
                        case 'executable_code':
                            callbacks?.onCodeExecutionCall?.(data);
                            break;
                            
                        case 'code_execution_result':
                        case 'code_result':
                            callbacks?.onCodeExecutionResult?.(data);
                            break;
                            
                        case 'url_context_call':
                            callbacks?.onUrlContextCall?.(data);
                            break;
                            
                        case 'url_context_result':
                            callbacks?.onUrlContextResult?.(data);
                            break;
                            
                        case 'google_search_call':
                            callbacks?.onGoogleSearchCall?.(data);
                            break;
                            
                        case 'google_search_result':
                            callbacks?.onGoogleSearchResult?.(data);
                            break;
                            
                        case 'tool_result':
                            callbacks?.onToolResult?.(data);
                            break;
                            
                        case 'tool_call':
                            callbacks?.onToolCall?.(data);
                            break;
                            
                        case 'tool_call_start':
                            callbacks?.onToolCallStart?.(data);
                            break;
                            
                        case 'tool_call_complete':
                            callbacks?.onToolCallComplete?.(data);
                            break;
                            
                        case 'requires_confirmation':
                            callbacks?.onRequiresConfirmation?.(data);
                            break;
                            
                        case 'file_shared':
                            callbacks?.onFileShared?.(data);
                            break;
                            
                        case 'image_data':
                        case 'code_image':
                            callbacks?.onCodeImage?.(data);
                            break;
                            
                        case 'error':
                            callbacks?.onError?.(
                                new Error(data.error?.message || data.message || 'Agent resume error')
                            );
                            break;
                    }
                },
                callbacks?.signal
            );
            
            if (receivedTimeout && !callbacks?.signal?.aborted) {
                shouldResume = true;
            }
        }
        
        callbacks?.onDone?.();
    } catch (error) {
        callbacks?.onError?.(error);
    }
},

async getSkills(query) {
    try {
        const payload = typeof query === 'string' ? { prompt: query } : { plugins: query };
        const res = await fetch('/api/agent/skills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data.skills) ? data.skills : [];
    } catch (err) {
        console.warn('[API.getSkills Error]', err);
        return [];
    }
},
        // ── File upload ───────────────────────────────────────────────────────
        async upload(file) {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) throw new Error("Upload failed");
            return await res.json();
        },

        // ── Workspace token helpers (exposed for UI/Logic) ────────────────────
        workspaceDB: WorkspaceDB,

        async getWorkspaceToken()   { return WorkspaceDB.getToken(); },
        async setWorkspaceToken(t)  { return WorkspaceDB.setToken(t); },
        async clearWorkspaceToken() { return WorkspaceDB.clearToken(); },

        // ── SSE stream reader ─────────────────────────────────────────────────
async _readStream(response, onData, signal) {
    const reader  = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let   buffer  = '';
    const processPart = (part) => {
        if (!part?.trim()) return;
        let dataLine  = '', eventType = 'message';

        for (const line of part.split('\n')) {
            if (line.startsWith('event: '))      eventType = line.slice(7).trim();
            else if (line.startsWith('data: '))  dataLine  = line.slice(6);
        }

        if (dataLine) {
            try {
                const parsed = JSON.parse(dataLine);
                parsed.type ||= eventType;
                onData(parsed);
            } catch { /* noop */ }
        }
    };

    const onAbort = () => {
        try { reader.cancel(); } catch {}
    };

    if (signal) {
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
        while (true) {
            if (signal && signal.aborted) break;

            const { value, done } = await reader.read();
            if (done) {
                buffer += decoder.decode();
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            const parts = buffer.split(/\n\n/);
            buffer = parts.pop();

            for (const part of parts) {
                processPart(part);
            }
        }
        processPart(buffer);
    } finally {
        if (signal) signal.removeEventListener('abort', onAbort);
    }
},
        
    };

    window.API = API;
})();