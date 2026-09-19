import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const RUNTIME_CONFIG = {
    keys: {
        gemini: "",
        tavily: process.env.TAVILY_API_KEY
    },
    urls: {
        tavilySearch: "https://api.tavily.com/search"
    },
    limits: {
        fileUploadBytes: 3_500_000,
        vercelFunctionMaxMs: 300_000
    },
    defaults: {
        locale: 'Asia/Baku'
    }
};

export const MODE_CHAINS = {
    instant: [
        { modelId: 'gemini-3.5-flash-lite', thinkingLevel: 'high' },
        { modelId: 'gemini-3.1-flash-lite', thinkingLevel: 'high' }
    ],
    medium: [
        { modelId: 'gemini-3.6-flash', thinkingLevel: 'medium' },
        { modelId: 'gemini-3.8-flash', thinkingLevel: 'medium' },
        { modelId: 'gemini-3.7-flash', thinkingLevel: 'medium' },
        { modelId: 'gemini-3.5-flash', thinkingLevel: 'high' }
    ],
    high: [
        { modelId: 'gemini-3.6-flash', thinkingLevel: 'high' },
        { modelId: 'gemini-3.8-flash', thinkingLevel: 'high' },
        { modelId: 'gemini-3.7-flash', thinkingLevel: 'high' },
        { modelId: 'gemini-3.5-flash', thinkingLevel: 'high' }
    ]
};

const app = express();
app.use(cors());
app.use(express.json());

const client = new GoogleGenAI({ apiKey: RUNTIME_CONFIG.keys.gemini });
const deepClone = value => JSON.parse(JSON.stringify(value));

class RuntimeObservability {
    static logSessionState(sessionId, stage, details) {
        const timestamp = new Date().toISOString();
        console.log(
            `[Interaction Runtime][${timestamp}][Session: ${sessionId}][Stage: ${stage}]`,
            JSON.stringify(details, null, 2)
        );
    }

    static createTrace(sessionId, prompt, reasoningTier) {
        return {
            sessionId: sessionId || `sess_${Date.now()}`,
            startTime: Date.now(),
            promptSnippet: String(prompt || '').slice(0, 120),
            requestedModelType: reasoningTier || 'instant',
            lifecycleStage: 'PREPARATION',
            selectedTools: [],
            selectedModel: null,
            effectiveMode: reasoningTier || 'instant',
            toolCallsExecuted: []
        };
    }
}

function normalizeReasoningTier(value) {
    return ['instant', 'medium', 'high'].includes(value) ? value : 'instant';
}

export class ModelResolver {
    static getChain(reasoningTier) {
        return MODE_CHAINS[normalizeReasoningTier(reasoningTier)];
    }

    static getPrimary(reasoningTier) {
        return this.getChain(reasoningTier)[0];
    }
}

const FUNCTION_TOOL_FACTORIES = {
    memory: () => ({
        type: 'function',
        name: 'memory',
        description: 'Read, create, update, or delete durable user memories, preferences, and historical context. Use proactively when the user states durable preferences, facts, or instructions to remember, or when updating/deleting existing memories.',
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['read', 'write', 'add', 'update', 'delete', 'remove'],
                    description: 'Action to perform on memory.'
                },
                key: {
                    type: 'string',
                    description: 'Search term, memory title, or category to create or update.'
                },
                id: {
                    type: 'string',
                    description: 'Unique memory entry ID when updating or deleting a specific entry.'
                },
                content: {
                    type: 'string',
                    description: 'Factual information, preference, rule, or other durable memory content.'
                },
                type: {
                    type: 'string',
                    enum: ['fact', 'preference', 'rule', 'behavior', 'chat_history'],
                    description: 'Category classification of the memory.'
                }
            },
            required: ['action']
        }
    }),
    
    web_search: () => ({
        type: 'function',
        name: 'web_search',
        description: 'Search live web data via Tavily. Use for current, changing, externally verifiable, or otherwise unavailable information.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query.' },
                num_results: { type: 'integer', minimum: 1, maximum: 10, description: 'Maximum number of search results.' }
            },
            required: ['query']
        }
    }),
    
    image_search: () => ({
        type: 'function',
        name: 'image_search',
        description: 'Search the live web for external visual references, photographs, examples, or image assets.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Visual search query.' }
            },
            required: ['query']
        }
    })
};

export function buildCohanaToolset(options = {}) {
    const { enableMaps = false, enableStudy = false, latitude = null, longitude = null } = options;
    const customTools = Object.values(FUNCTION_TOOL_FACTORIES).map(factory => factory());
    
    let nativeTools;
    if (enableMaps && !enableStudy) {
        const mapsTool = { type: 'google_maps' };
        if (
            latitude !== null &&
            latitude !== undefined &&
            !isNaN(Number(latitude)) &&
            longitude !== null &&
            longitude !== undefined &&
            !isNaN(Number(longitude))
        ) {
            mapsTool.latitude = Number(latitude);
            mapsTool.longitude = Number(longitude);
        }
        // When google_maps is strictly enabled, url_context and code_execution are excluded
        nativeTools = [mapsTool];
    } else {
        // Study mode explicitly ensures code_execution and url_context are fully enabled
        nativeTools = [
            { type: 'url_context' },
            { type: 'code_execution' }
        ];
    }
    
    return [...nativeTools, ...customTools].map(deepClone);
}

export class InstructionCompiler {
    static compile(runtimeContext, reasoningTier, options = {}) {
        const enableMaps = typeof options === 'boolean' ? options : Boolean(options?.enableMaps);
        const enableStudy = Boolean(options?.enableStudy);
        
        const userMemories = String(runtimeContext?.userMemories || '').trim();
        const memorySection = userMemories ?
            `\n<SAVED_USER_CONTEXT>\n${userMemories}\n</SAVED_USER_CONTEXT>\n` :
            '';
        
        const tierGuidelines = {
            instant: 'TIER [INSTANT]: Prioritize extreme speed, high information density, direct answers, and zero conversational fluff. Call tools proactively when factual verification is required, and synthesize findings immediately.',
            medium: 'TIER [MEDIUM]: Balanced depth and speed. Explore nuances, verify facts across tools, structure explanations methodically, and offer targeted insights without unnecessary verbosity.',
            high: 'TIER [HIGH / EXTRA-HIGH]: Maximum intellectual depth, rigorous analysis, comprehensive multi-step reasoning, exhaustive edge-case evaluation, and meticulous technical precision.'
        } [reasoningTier] || 'TIER [INSTANT]: Direct, precise, and immediately useful responses.';
        
        let nativeToolsDescription = `- \`url_context\`: Fetch and inspect specific web URLs or documents.
- \`code_execution\`: Perform verified calculations, run Python data transformations, and generate dynamic visual plots and simulations.`;
        
        if (enableMaps && !enableStudy) {
            nativeToolsDescription = `- \`google_maps\`: Access rich, up-to-date spatial data, place details, opening hours, reviews, and directions grounded to the user's location.`;
        }
        
        const studySection = enableStudy ? `
---

## 6. @STUDY TUTOR MODE (ELITE PEDAGOGICAL ENGINE)
You are currently operating in **@Study Mode**: an extraordinary, world-class personal tutor, thinking partner, and concept coach inspired by Richard Feynman, Sal Khan, and 3Blue1Brown.

### Pedagogical Core Directives:
1. **Intuition First, Formalism Second**:
   - Never present a naked formula, definition, or syntax block without first explaining *why* it exists, what problem it solves, and the mechanical or geometric intuition behind it.
   - Anchor abstract theories in concrete, memorable physical analogies and real-world mechanics.

2. **Active Dynamic Visualizations (\`code_execution\`)**:
   - Whenever explaining mathematical functions, physics equations, data structures, algorithm complexities, statistical distributions, or quantitative trends, **proactively write and execute Python code** using \`matplotlib\`, \`seaborn\`, or \`numpy\`.
   - **Plot Aesthetic Rules**: Use dark backgrounds (\`plt.style.use('dark_background')\` or \`fig.patch.set_facecolor('#1c1c1e')\`), high-contrast modern line colors (e.g. \`#3486eb\`, \`#2ecc71\`, \`#ff7e5f\`), explicit axis labels, clean grid lines (\`alpha=0.15\`), and clear legends.

3. **Interactive Hands-On Practice (Live HTML5 Applications)**:
   - When a concept is best understood through direct manipulation (e.g. sorting visualizers, optical ray tracing, pendulum physics, neural weight adjustments, regex testers, interactive matrix multiplication, flashcard drills, binary arithmetic), generate a complete, self-contained, beautifully styled \`\`\`html ... \`\`\` code block.
   - Include inline CSS (sleek modern dark UI, rounded controls, responsive layout) and clean JavaScript event listeners so the user can interactively toggle parameters, slide values, and witness changes live.

4. **Socratic Scaffolding & Milestone Pacing**:
   - Break complicated proofs or workflows into progressive, digestible cognitive milestones.
   - Don't overwhelm the student with monotonous monologues. Highlight key epiphanies and summarize takeaways crisply.

5. **Warm Encouragement & Comprehension Checkpoints**:
   - Treat honest misunderstandings and bugs as exciting opportunities for deeper discovery.
   - Conclude explanatory sections with an engaging, bite-sized checkpoint question or thought experiment (e.g. *"Quick question for you: what would happen to this curve if we doubled the resistance?"*) to invite active recall without feeling like a stressful test.
` : '';
        
        return `
# COHANA (cx5 Architecture)

You are Cohana, a frontier AI assistant and thinking partner powered by the cx5 model family.

## RUNTIME EXECUTION SPECIFICATION
- Reasoning Configuration: ${reasoningTier.toUpperCase()}
- Operational Directive: ${tierGuidelines}
- Session ID: ${runtimeContext.sessionId}
- Current Date & Time: ${runtimeContext.currentDate} (${runtimeContext.timeZone})
${enableStudy ? '- Active Learning Engine: @STUDY TUTOR ACTIVATED' : ''}

---

## 1. EPISTEMIC STANDARDS & TRUTH-SEEKING
- **Truth Over Agreement**: Seek maximum objective truth. If the user presents incorrect facts, invalid premises, or broken logic, push back respectfully and constructively with evidence. Do not agree sycophantically with false assumptions.
- **Empirical Grounding**: Treat tool responses as authoritative ground truth. Never guess or extrapolate when an available tool can verify the fact.
- **Calibrated Uncertainty**: Clearly distinguish between verified empirical facts, logical deductions, and working hypotheses. If information is unavailable or inconclusive, state the boundary plainly without making confident guesses.
- **Temporal Awareness & Cutoff Rules**: When asked about changing events, people holding specific offices or roles, current prices, live software versions, laws, weather, or real-time news, verify the information using \`web_search\` before responding. Never assume a temporally sensitive fact remains unchanged.

---

## 2. COMMUNICATION & PROSE DISCIPLINE
- **"Show, Don't Tell"**: Never explain your compliance with instructions (e.g., never say *"Here is a concise explanation"*, *"I kept this brief"*, or *"I searched the web for you"*). Let your answer speak for itself.
- **Banned Verbal Tics**: Under no circumstances use superficial commentary or conversational filler. Strictly avoid:
  - *"Honestly..."*, *"To be blunt..."*, *"My honest take..."*, *"If I'm being direct..."*
  - *"As an AI..."*, *"I don't have personal feelings, but..."*
  - *"Short answer:"*, *"Long story short:"*, *"Summary:"* at the very top of replies.
  - Ending messages with robotic follow-up hooks like *"Let me know if you want me to do X!"*, *"I can help you with Y if you like!"*, or *"Shall we proceed?"*.
- **Natural, Prose-First Layout**:
  - Default to clear, natural paragraphs rather than dense bulleted lists.
  - Restrict bullet points and numbered lists to instances where sequential steps or multifaceted data items genuinely demand them for readability.
  - Avoid excessive bolding across sentences; reserve bold text for genuine section headings and critical terms.
- **Language & Alphabet Fidelity**: Always match the user's language, dialect, regional spelling, and alphabet. Never switch languages mid-conversation unless requested.

---

## 3. CAPABILITY SURFACE & TOOL ORCHESTRATION
You have access to the complete Cohana toolset. Use the minimum number of tool calls needed, but never omit a tool when factual accuracy or user context depends on it.

### Native Server Tools:
${nativeToolsDescription}

### Application Tools:
- \`web_search\`: Search live web indices via Tavily for fresh news, documentation, reviews, facts, and live information.
- \`image_search\`: Retrieve external visual references and photography from the live web.
- \`memory\`: Read, write, update, or purge durable cross-session user memory.

### Tool Execution Lifecycle:
1. **Parallel Execution**: Request multiple independent tool calls in the same turn when gathering multi-source context.
2. **CRITICAL POST-TOOL SYNTHESIS**: A tool call is a step toward an answer, not the answer itself. **Once tool outputs are received, you MUST synthesize the findings into a complete, clear, and informative response.** Never stop or remain silent after a tool execution turn.

---

## 4. PERSISTENT USER CONTEXT & MEMORY
${memorySection}
- **Proactive Memory Persistence**:
  - When the user explicitly states durable personal facts, preferences, background context, rules, or tech-stack constraints, or asks you to remember something, immediately invoke \`memory(action='write', key=..., content=..., type=...)\`.
  - When the user asks to update or forget a preference, invoke \`memory(action='update', ...)\` or \`memory(action='delete', ...)\`.
  - Do not record ephemeral details, passwords, secret keys, or payment data.

---

## 5. FINISHED WRITING ARTIFACTS (::writing)
When producing a standalone copyable artifact—such as an email, formal message, announcement, letter, speech, social post, or report section—enclose the finished text in a dedicated writing block:

::writing
[Complete, polished text ready for immediate copying or sending]
::

**Writing Block Rules:**
- Put only the final, reusable text inside the block. Do not include meta-notes, *"Subject:"* lines (unless explicitly part of an email body), or commentary inside the block.
- Provide a concise framing sentence before or after the block outside the fences.
- Maintain formatting, line breaks, and intentional spacing inside the block.
- Never nest writing blocks or wrap them inside standard markdown code fences.
${studySection}
`.trim();
    }
}

function isFunctionCallStep(type) {
    return type === 'function_call';
}

function isDeadlineReached(requestStartTime) {
    return Date.now() >= RUNTIME_CONFIG.limits.vercelFunctionMaxMs + requestStartTime - 1_500;
}

function parseFunctionArguments(value) {
    if (value && typeof value === 'object') return value;
    if (typeof value !== 'string' || value.trim() === '') return {};
    return JSON.parse(value);
}

// ── Application Services (Memory & Search) ──────────────────────────────────
const memoryStore = new Map();

function getMemoryStore(key, initialMemories = null) {
    const safeKey = key || 'sess_default';
    if (!memoryStore.has(safeKey)) {
        memoryStore.set(safeKey, { entries: Array.isArray(initialMemories) ? initialMemories : [] });
    } else if (Array.isArray(initialMemories) && initialMemories.length > 0) {
        const store = memoryStore.get(safeKey);
        store.entries = initialMemories;
    }
    return memoryStore.get(safeKey);
}

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Stream Timeout')), ms))
    ]);
}
function formatReconstructedHistoryInput(history, initialInputs) {
    if (!Array.isArray(history) || history.length === 0) {
        return initialInputs;
    }
    
    let activePrompt = '';
    if (typeof initialInputs === 'string') {
        activePrompt = initialInputs;
    } else if (Array.isArray(initialInputs)) {
        const textPart = initialInputs.find(p => p.type === 'text');
        activePrompt = textPart?.text || '';
    }
    
    // Filter out trailing duplicate user message if already present in history
    let cleanHistory = [...history];
    if (cleanHistory.length > 0) {
        const lastMsg = cleanHistory[cleanHistory.length - 1];
        const lastText = typeof lastMsg.content === 'string' ? lastMsg.content : (lastMsg.parts?.[0]?.text || '');
        if ((lastMsg.role === 'user' || lastMsg.role === undefined) && lastText.trim() === activePrompt.trim()) {
            cleanHistory.pop();
        }
    }
    
    if (cleanHistory.length === 0) {
        return initialInputs;
    }
    
    const contextHeader = "[CONVERSATION HISTORY]\n";
    const historyText = cleanHistory
        .map(msg => {
            const role = (msg.role === 'model' || msg.role === 'assistant') ? 'Assistant' : 'User';
            const text = typeof msg.content === 'string' ? msg.content : (msg.parts?.[0]?.text || '');
            return text ? `${role}: ${text}` : '';
        })
        .filter(Boolean)
        .join('\n\n');
    
    if (!historyText) return initialInputs;
    
    const fullContextIntro = `${contextHeader}${historyText}\n[END CONVERSATION HISTORY]\n\n`;
    
    if (Array.isArray(initialInputs)) {
        let foundText = false;
        const result = initialInputs.map((item) => {
            if (!foundText && item.type === 'text') {
                foundText = true;
                return { ...item, text: `${fullContextIntro}${item.text || ''}` };
            }
            return item;
        });
        if (!foundText) {
            result.unshift({ type: 'text', text: fullContextIntro.trim() });
        }
        return result;
    } else if (typeof initialInputs === 'string') {
        return `${fullContextIntro}${initialInputs}`;
    }
    
    return initialInputs;
}
export async function executeMemoryTool(args, sessionId, otherChatsList = [], rawMemories = null) {
    const store = getMemoryStore(sessionId, rawMemories);
    const { action, key, id, content, type } = args || {};
    
    if (action === 'read') {
        let memories = store.entries;
        let matchedChats = [];
        if (key) {
            const query = String(key).toLowerCase();
            memories = memories.filter(e =>
                (e.title && e.title.toLowerCase().includes(query)) ||
                (e.content && e.content.toLowerCase().includes(query))
            );
            if (Array.isArray(otherChatsList)) {
                matchedChats = otherChatsList.map(chat => {
                    let score = 0;
                    if (chat.title?.toLowerCase().includes(query)) score += 15;
                    if (chat.previewText?.toLowerCase().includes(query)) score += 5;
                    return { ...chat, score };
                }).filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
            }
        }
        return {
            status: 'success',
            profile_memories: memories,
            relevant_previous_chats: matchedChats.map(c => ({
                title: c.title,
                lastActiveDate: c.lastActive ? new Date(c.lastActive).toLocaleDateString() : 'Unknown',
                preview: c.previewText ? c.previewText.substring(0, 200) + '...' : ''
            }))
        };
    }
    
    if (action === 'write' || action === 'add' || action === 'create' || action === 'set') {
        const cleanTitle = key || 'User Preference / Fact';
        const cleanContent = content || '';
        
        if (!cleanContent && !cleanTitle) {
            return { status: 'error', message: 'Content or key is required to save memory.' };
        }
        
        const existingIdx = store.entries.findIndex(e =>
            (id && e.id === id) ||
            (key && e.title && e.title.toLowerCase() === key.toLowerCase())
        );
        
        if (existingIdx > -1) {
            const existing = store.entries[existingIdx];
            existing.content = cleanContent || existing.content;
            existing.title = cleanTitle;
            if (type) existing.type = type;
            existing.updatedAt = new Date().toISOString();
            return {
                status: 'success',
                id: existing.id,
                entry: existing,
                memories: store.entries,
                action: 'update',
                message: 'Memory updated successfully.'
            };
        }
        
        const entry = {
            id: id || ('mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
            title: cleanTitle,
            content: cleanContent,
            type: type || 'fact',
            updatedAt: new Date().toISOString()
        };
        
        store.entries.unshift(entry);
        if (store.entries.length > 50) store.entries = store.entries.slice(0, 50);
        return {
            status: 'success',
            id: entry.id,
            entry,
            memories: store.entries,
            action: 'write',
            message: 'Memory persisted successfully.'
        };
    }
    
    if (action === 'update') {
        const idx = store.entries.findIndex(e =>
            (id && e.id === id) ||
            (key && e.title && e.title.toLowerCase() === key.toLowerCase())
        );
        
        if (idx === -1) {
            const entry = {
                id: id || ('mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
                title: key || 'User Preference / Fact',
                content: content || '',
                type: type || 'fact',
                updatedAt: new Date().toISOString()
            };
            store.entries.unshift(entry);
            if (store.entries.length > 50) store.entries = store.entries.slice(0, 50);
            return {
                status: 'success',
                id: entry.id,
                entry,
                memories: store.entries,
                action: 'write',
                message: 'Memory created and persisted.'
            };
        }
        
        const entry = store.entries[idx];
        if (content) entry.content = content;
        if (type) entry.type = type;
        if (key) entry.title = key;
        entry.updatedAt = new Date().toISOString();
        return {
            status: 'success',
            id: entry.id,
            entry,
            memories: store.entries,
            action: 'update',
            message: 'Memory updated successfully.'
        };
    }
    
    if (action === 'delete' || action === 'remove' || action === 'purge') {
        const before = store.entries.length;
        store.entries = store.entries.filter(e =>
            !(id && e.id === id) &&
            !(key && e.title && e.title.toLowerCase() === key.toLowerCase())
        );
        
        if (store.entries.length === before) {
            return { status: 'error', message: 'Target memory not found for deletion.' };
        }
        return {
            status: 'success',
            id,
            action: 'delete',
            memories: store.entries,
            message: 'Memory purged successfully.'
        };
    }
    
    return { status: 'error', message: `Invalid memory action: ${action}` };
}

export async function executeWebSearch(query, numResults = 5) {
    const cleanQuery = typeof query === 'string' ? query.trim() : '';
    if (!cleanQuery) {
        return { status: 'error', query: '', error: 'Search query was empty.' };
    }
    
    const apiKey = RUNTIME_CONFIG.keys.tavily;
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    else headers['X-Tavily-Access-Mode'] = 'keyless';
    
    try {
        const response = await fetch(RUNTIME_CONFIG.urls.tavilySearch, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: cleanQuery, max_results: numResults || 5 })
        });
        if (!response.ok) throw new Error(`Tavily: ${response.status}`);
        const data = await response.json();
        const results = (data.results || []).map(r => ({
            title: r.title || 'Untitled',
            url: r.url || '',
            content: r.content || r.snippet || ''
        }));
        return { status: 'ok', query: cleanQuery, results };
    } catch (err) {
        console.error(`[Web Search Error] Query "${cleanQuery}":`, err.message);
        return { status: 'error', query: cleanQuery, error: err.message };
    }
}

export async function executeImageSearch(query) {
    const apiKey = RUNTIME_CONFIG.keys.tavily;
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    else headers['X-Tavily-Access-Mode'] = 'keyless';

    try {
        const response = await fetch(RUNTIME_CONFIG.urls.tavilySearch, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query, include_images: true, max_results: 5 })
        });
        if (!response.ok) throw new Error(`Tavily visual: ${response.status}`);
        const data = await response.json();
        let urls = Array.isArray(data.images) ? data.images.map(img => typeof img === 'string' ? img : img?.url).filter(Boolean) : [];
        urls = [...new Set(urls)].slice(0, 2);

        const images = [];
        await Promise.all(urls.map(async (u) => {
            try {
                const res = await withTimeout(fetch(u), 4000);
                if (res.ok) {
                    const buf = await res.buffer();
                    images.push({ mimeType: res.headers.get('content-type') || 'image/jpeg', data: buf.toString('base64'), url: u });
                }
            } catch {}
        }));
        return { status: 'success', query, images };
    } catch (err) {
        return { status: 'error', query, error: err.message };
    }
}

async function executeCustomTool(name, args, context) {
    context.trace.toolCallsExecuted.push(name);
    
    try {
        switch (name) {
            case 'memory': {
                const result = await executeMemoryTool(
                    args,
                    context.sessionKey,
                    context.parsedOtherChats,
                    context.parsedRawMemories
                );
                
                if (result && result.status === 'success' && args.action !== 'read') {
                    context.safeSend({ type: 'memory_update', content: result });
                }
                return result;
            }
                
            case 'web_search':
                return await executeWebSearch(args.query, args.num_results);
                
            case 'image_search': {
                const result = await executeImageSearch(args.query);
                if (result?.status === 'success') {
                    for (const image of result.images || []) {
                        context.safeSend({
                            type: 'code_image',
                            mimeType: image.mimeType,
                            data: image.data
                        });
                    }
                    
                    return {
                        ...result,
                        images: (result.images || []).map(image => ({
                            ...image,
                            data: '[Rendered Inline]'
                        }))
                    };
                }
                return result;
            }
            
            default:
                return {
                    status: 'error',
                    message: `Unknown custom tool: ${name}`
                };
        }
    } catch (error) {
        return {
            status: 'error',
            message: error?.message || 'Tool execution failed.'
        };
    }
}

async function executeFunctionCalls(functionCalls, context) {
    return Promise.all(functionCalls.map(async call => {
        const args = parseFunctionArguments(call.arguments);
        context.safeSend({
            type: 'tool_call',
            name: call.name,
            id: call.id,
            arguments: args
        });
        const outcome = await executeCustomTool(call.name, args, context);
        
        let formattedResult;
        if (typeof outcome === 'object' && outcome !== null) {
            formattedResult = outcome;
        } else if (typeof outcome === 'string') {
            formattedResult = { output: outcome };
        } else {
            formattedResult = { result: outcome };
        }
        
        context.safeSend({
            type: 'tool_result',
            name: call.name,
            call_id: call.id,
            result: formattedResult
        });
        
        return {
            type: 'function_result',
            name: call.name,
            call_id: call.id,
            result: formattedResult
        };
    }));
}

// ── Gemini Interactions API Lifecycle Helpers ──────────────────────────────────
async function getInteractionMetadata(interactionId, fallbackModel) {
    if (!interactionId) {
        return {
            model: fallbackModel,
            status: null,
            steps: [],
            outputText: ''
        };
    }
    
    try {
        const interaction = await client.interactions.get(interactionId);
        return {
            model: interaction?.model || fallbackModel,
            status: interaction?.status || null,
            steps: Array.isArray(interaction?.steps) ? interaction.steps : [],
            outputText: interaction?.output_text || ''
        };
    } catch (error) {
        console.warn(`[Interaction Metadata] Failed to retrieve ${interactionId}:`, error?.message || error);
        throw error;
    }
}

function extractPendingFunctionCalls(steps) {
    return (Array.isArray(steps) ? steps : [])
        .filter(step => step?.type === 'function_call' && step?.id && step?.name)
        .map(step => ({
            id: step.id,
            name: step.name,
            arguments: step.arguments || {}
        }));
}

function buildContinuationParams({
    interactionId,
    model,
    functionResults,
    systemInstruction,
    tools,
    thinkingLevel
}) {
    return {
        model,
        previous_interaction_id: interactionId,
        input: functionResults,
        tools,
        system_instruction: systemInstruction,
        generation_config: {
            thinking_level: thinkingLevel,
            thinking_summaries: 'auto'
        },
        store: true,
        stream: true
    };
}

async function createContinuation({
    interactionId,
    model,
    functionResults,
    systemInstruction,
    tools,
    thinkingLevel
}) {
    if (!interactionId) {
        throw new Error('Cannot create Interaction continuation without previous_interaction_id.');
    }
    
    const params = buildContinuationParams({
        interactionId,
        model,
        functionResults,
        systemInstruction,
        tools,
        thinkingLevel
    });
    
    return client.interactions.create(params);
}

async function streamResume(interactionId, lastEventId) {
    if (!interactionId) {
        throw new Error('Cannot resume Interaction without interaction_id.');
    }
    
    return client.interactions.get(interactionId, {
        stream: true,
        ...(lastEventId ? { last_event_id: lastEventId } : {})
    });
}

export class InteractionStarter {
    static async create({
        reasoningTier,
        input,
        previousInteractionId,
        history = [],
        systemInstruction,
        tools
    }) {
        const normalizedTier = normalizeReasoningTier(reasoningTier);
        const chain = ModelResolver.getChain(normalizedTier);
        let lastError = null;
        
        for (const candidate of chain) {
            // 1. Attempt multi-turn continuation with previous_interaction_id
            if (previousInteractionId) {
                try {
                    const params = {
                        model: candidate.modelId,
                        input,
                        previous_interaction_id: previousInteractionId,
                        tools,
                        system_instruction: systemInstruction,
                        generation_config: {
                            thinking_level: candidate.thinkingLevel,
                            thinking_summaries: 'auto'
                        },
                        stream: true,
                        store: true
                    };
                    
                    const stream = await client.interactions.create(params);
                    
                    return {
                        stream,
                        usedModel: candidate.modelId,
                        thinkingLevel: candidate.thinkingLevel,
                        background: false,
                        restoredFromHistory: false
                    };
                } catch (error) {
                    const errMsg = String(error?.message || '').toLowerCase();
                    const statusCode = error?.status || error?.statusCode || error?.code;
                    const isMismatchedOrExpired =
                        statusCode === 404 ||
                        statusCode === 400 ||
                        statusCode === 'INVALID_ARGUMENT' ||
                        statusCode === 'NOT_FOUND' ||
                        errMsg.includes('not found') ||
                        errMsg.includes('expired') ||
                        errMsg.includes('invalid') ||
                        errMsg.includes('interaction') ||
                        errMsg.includes('model') ||
                        errMsg.includes('signature') ||
                        errMsg.includes('thought');
                    
                    if (isMismatchedOrExpired) {
                        console.warn(`[Interaction Starter] Interaction ${previousInteractionId} continuation failed with ${candidate.modelId} (${error.message}). Re-anchoring context via conversation history.`);
                        previousInteractionId = null;
                    } else {
                        lastError = error;
                        console.warn(`[Interaction Starter] ${candidate.modelId} continuation failed: ${error.message}`);
                        continue;
                    }
                }
            }
            
            // 2. Create fresh interaction (bootstrapped with history if session expired or model switched)
            try {
                const effectiveInput = formatReconstructedHistoryInput(history, input);
                const params = {
                    model: candidate.modelId,
                    input: effectiveInput,
                    tools,
                    system_instruction: systemInstruction,
                    generation_config: {
                        thinking_level: candidate.thinkingLevel,
                        thinking_summaries: 'auto'
                    },
                    stream: true,
                    store: true
                };
                
                const stream = await client.interactions.create(params);
                
                return {
                    stream,
                    usedModel: candidate.modelId,
                    thinkingLevel: candidate.thinkingLevel,
                    background: false,
                    restoredFromHistory: Array.isArray(history) && history.length > 0
                };
            } catch (error) {
                lastError = error;
                console.warn(`[Interaction Starter] ${candidate.modelId} fresh start failed: ${error.message}`);
            }
        }
        
        throw lastError || new Error('Unable to create Gemini Interaction.');
    }
}
async function processInteractionStream({
    stream,
    state,
    context
}) {
    const functionCalls = [];
    let currentStep = null;
    let accumulatedArgs = '';
    let completedInteraction = null;
    let terminalStatus = null;

    const iterator =
        typeof stream?.[Symbol.asyncIterator] === 'function'
            ? stream[Symbol.asyncIterator]()
            : null;

    if (!iterator) {
        throw new Error('Interaction stream is not async iterable.');
    }

    while (true) {
        const { value: event, done } = await iterator.next();
        if (done) break;
        if (!event) continue;

        const eventId = event.event_id || event.id || null;
        if (eventId) {
            state.lastEventId = eventId;
            context.safeSend({
                type: 'event_id',
                id: eventId
            });
        }

        if (event.event_type === 'interaction.created' || event.event_type === 'interaction.started') {
            const interaction = event.interaction || {};

            if (interaction.id) {
                state.interactionId = interaction.id;
                completedInteraction = interaction;

                context.safeSend({
                    type: 'interaction_id',
                    id: interaction.id
                });
            }

            if (interaction.model) {
                state.model = interaction.model;
            }
        }

        if (event.event_type === 'interaction.status_update') {
            terminalStatus = event.status || event.interaction?.status || terminalStatus;
        }

        if (event.event_type === 'step.start') {
            currentStep = event.step ? { ...event.step } : {};
            accumulatedArgs = '';
            const stepType = currentStep.type;
            if (stepType === 'code_execution_call' || stepType === 'executable_code') {
                accumulatedArgs = currentStep.code || currentStep.arguments?.code || '';
                context.safeSend({
                    type: 'code_execution_call',
                    language: currentStep.language || 'python',
                    code: accumulatedArgs,
                    id: currentStep.id || null
                });
            } else if (stepType === 'code_execution_result' || stepType === 'code_result') {
                context.safeSend({
                    type: 'code_execution_result',
                    outcome: currentStep.outcome || 'success',
                    output: currentStep.output || currentStep.content || '',
                    id: currentStep.id || currentStep.call_id || null
                });
            } else if (stepType === 'url_context_call') {
                const urls = currentStep.urls || (currentStep.url ? [currentStep.url] : []) || [];
                context.safeSend({
                    type: 'url_context_call',
                    urls,
                    url: urls[0] || '',
                    id: currentStep.id || null
                });
            } else if (stepType === 'url_context_result') {
                context.safeSend({
                    type: 'url_context_result',
                    urls: currentStep.urls || (currentStep.url ? [currentStep.url] : []) || [],
                    results: currentStep.results || currentStep.content || currentStep.output || '',
                    id: currentStep.id || currentStep.call_id || null
                });
            } else if (stepType === 'google_search_call') {
                context.safeSend({
                    type: 'google_search_call',
                    query: currentStep.query || currentStep.queries || '',
                    id: currentStep.id || null
                });
            } else if (stepType === 'google_search_result') {
                context.safeSend({
                    type: 'google_search_result',
                    results: currentStep.results || currentStep.grounding_chunks || [],
                    id: currentStep.id || currentStep.call_id || null
                });
            }
        }

        if (event.event_type === 'step.delta') {
            const delta = event.delta;
            if (!delta) continue;

            if (currentStep && (currentStep.type === 'code_execution_call' || currentStep.type === 'executable_code')) {
                const codeChunk = delta.code || delta.text || (typeof delta === 'string' ? delta : '');
                accumulatedArgs += codeChunk;
                context.safeSend({
                    type: 'code_execution_call',
                    code: accumulatedArgs,
                    language: currentStep.language || delta.language || 'python',
                    id: currentStep.id || null
                });
                continue;
            }

            if (delta.type === 'text') {
                context.safeSend({
                    type: 'text',
                    content: delta.text || ''
                });
            } else if (delta.type === 'thought_summary' || delta.type === 'thought') {
                const thoughtText = delta.text || delta.content?.text || delta.summary || '';
                if (thoughtText) {
                    context.safeSend({
                        type: 'thought',
                        content: thoughtText
                    });
                }
            } else if (
                delta.type === 'code_execution_call' ||
                delta.type === 'code' ||
                delta.code
            ) {
                const codeChunk = delta.code || delta.text || '';
                accumulatedArgs += codeChunk;
                context.safeSend({
                    type: 'code_execution_call',
                    code: accumulatedArgs,
                    language: delta.language || currentStep?.language || 'python',
                    id: currentStep?.id || null
                });
            } else if (delta.type === 'thought_signature') {
                const signature = delta.signature || delta.content?.signature || delta.text || '';
                if (signature) {
                    context.safeSend({
                        type: 'thought_signature',
                        content: signature
                    });
                }
            } else if (
                delta.type === 'arguments_delta' ||
                delta.type === 'args_delta' ||
                delta.arguments ||
                delta.args
            ) {
                const chunk = delta.arguments || delta.args || delta.text || '';
                if (typeof chunk === 'string') {
                    accumulatedArgs += chunk;
                } else if (typeof chunk === 'object') {
                    try {
                        accumulatedArgs = JSON.stringify(chunk);
                    } catch {}
                }
            } else if (delta.type === 'image') {
                const data = delta.data || delta.image?.data;
                const mimeType = delta.mime_type || delta.image?.mime_type || 'image/jpeg';
                if (data) {
                    context.safeSend({
                        type: 'code_image',
                        mimeType,
                        data,
                        call_id: currentStep?.id || currentStep?.call_id || null
                    });
                }
            } else if (delta.type === 'audio') {
                context.safeSend({
                    type: 'audio',
                    mimeType: delta.mime_type || delta.audio?.mime_type,
                    data: delta.data || delta.audio?.data
                });
            }
        }

        if (event.event_type === 'step.stop') {
            const stopStep = event.step || currentStep || {};
            const stepType = stopStep.type || currentStep?.type;

            if (stepType === 'code_execution_call' || stepType === 'executable_code') {
                const code = stopStep.code || stopStep.arguments?.code || accumulatedArgs || currentStep?.code || '';
                context.safeSend({
                    type: 'code_execution_call',
                    language: stopStep.language || currentStep?.language || 'python',
                    code,
                    id: stopStep.id || currentStep?.id || null
                });
            } else if (stepType === 'code_execution_result' || stepType === 'code_result') {
                let outputText = '';
                const images = [];
                const rawOutput = stopStep.output ?? stopStep.content ?? currentStep?.output ?? currentStep?.content;

                if (typeof rawOutput === 'string') {
                    outputText = rawOutput;
                } else if (Array.isArray(rawOutput)) {
                    for (const part of rawOutput) {
                        if (part?.type === 'text' && part.text) {
                            outputText += (outputText ? '\n' : '') + part.text;
                        } else if (part?.type === 'image' && (part.data || part.image?.data)) {
                            images.push({
                                data: part.data || part.image?.data,
                                mimeType: part.mime_type || part.image?.mime_type || 'image/png'
                            });
                        }
                    }
                } else if (rawOutput && typeof rawOutput === 'object') {
                    if (rawOutput.text) outputText = rawOutput.text;
                    else if (rawOutput.output) outputText = String(rawOutput.output);
                    else outputText = JSON.stringify(rawOutput);
                }

                if (stopStep.image || stopStep.images) {
                    const stepImgs = Array.isArray(stopStep.images) ? stopStep.images : [stopStep.image];
                    for (const img of stepImgs) {
                        if (img?.data || typeof img === 'string') {
                            images.push({
                                data: img.data || img,
                                mimeType: img.mime_type || img.mimeType || 'image/png'
                            });
                        }
                    }
                }

                context.safeSend({
                    type: 'code_execution_result',
                    outcome: stopStep.outcome || stopStep.status || 'success',
                    output: outputText,
                    images: images.length ? images : undefined,
                    id: stopStep.id || stopStep.call_id || currentStep?.id || currentStep?.call_id || null
                });

                for (const img of images) {
                    context.safeSend({
                        type: 'code_image',
                        mimeType: img.mimeType,
                        data: img.data,
                        call_id: stopStep.id || stopStep.call_id || currentStep?.id || null
                    });
                }
            } else if (stepType === 'url_context_call') {
                const urls = stopStep.urls || (stopStep.url ? [stopStep.url] : []) || currentStep?.urls || [];
                context.safeSend({
                    type: 'url_context_call',
                    urls,
                    url: urls[0] || '',
                    id: stopStep.id || currentStep?.id || null
                });
            } else if (stepType === 'url_context_result') {
                context.safeSend({
                    type: 'url_context_result',
                    urls: stopStep.urls || currentStep?.urls || [],
                    results: stopStep.results || stopStep.content || stopStep.output || '',
                    id: stopStep.id || stopStep.call_id || null
                });
            } else if (stepType === 'google_search_call') {
                context.safeSend({
                    type: 'google_search_call',
                    query: stopStep.query || stopStep.queries || currentStep?.query || '',
                    id: stopStep.id || currentStep?.id || null
                });
            } else if (stepType === 'google_search_result') {
                context.safeSend({
                    type: 'google_search_result',
                    results: stopStep.results || stopStep.grounding_chunks || [],
                    id: stopStep.id || stopStep.call_id || null
                });
            }

            if (currentStep && isFunctionCallStep(stepType)) {
                let argumentsValue = {};

                if (stopStep.arguments && typeof stopStep.arguments === 'object' && Object.keys(stopStep.arguments).length > 0) {
                    argumentsValue = stopStep.arguments;
                } else if (stopStep.args && typeof stopStep.args === 'object' && Object.keys(stopStep.args).length > 0) {
                    argumentsValue = stopStep.args;
                } else if (accumulatedArgs && accumulatedArgs.trim()) {
                    try {
                        argumentsValue = JSON.parse(accumulatedArgs);
                    } catch {
                        argumentsValue = { raw: accumulatedArgs };
                    }
                } else if (currentStep.arguments && typeof currentStep.arguments === 'object') {
                    argumentsValue = currentStep.arguments;
                } else if (typeof currentStep.arguments === 'string') {
                    try {
                        argumentsValue = JSON.parse(currentStep.arguments);
                    } catch {
                        argumentsValue = {};
                    }
                }

                const callId =
                    stopStep.id ||
                    stopStep.call_id ||
                    currentStep.id ||
                    currentStep.call_id ||
                    `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

                const callName = stopStep.name || currentStep.name || 'custom_tool';

                functionCalls.push({
                    id: callId,
                    name: callName,
                    arguments: argumentsValue
                });
            }

            currentStep = null;
            accumulatedArgs = '';
        }

        if (event.event_type === 'interaction.completed') {
            const interaction = event.interaction || {};
            completedInteraction = interaction;

            const finalStatus = interaction.status || 'completed';
            state.status = finalStatus;

            if (interaction.id) {
                state.interactionId = interaction.id;

                context.safeSend({
                    type: 'interaction_id',
                    id: interaction.id
                });
            }

            if (interaction.model) {
                state.model = interaction.model;
            }

            if (interaction.usage) {
                state.usage = interaction.usage;
            }

            if (finalStatus === 'completed' || finalStatus === 'cancelled') {
                state.completed = true;
                context.safeSend({
                    type: 'interaction_status',
                    status: state.status,
                    interaction_id: state.interactionId
                });
            } else if (finalStatus === 'requires_action') {
                state.completed = false;
            }

            break;
        }

        if (event.event_type === 'interaction.failed') {
            state.completed = true;
            state.status = 'failed';

            context.safeSend({
                type: 'interaction_status',
                status: 'failed',
                interaction_id: state.interactionId,
                error: event.error || null
            });

            break;
        }

        if (event.event_type === 'error') {
            const error = event.error || {};
            throw new Error(error.message || 'Gemini Interaction stream encountered an error.');
        }
    }

    if (completedInteraction?.status) {
        terminalStatus = completedInteraction.status;
    }

    return {
        functionCalls,
        status: terminalStatus,
        interaction: completedInteraction
    };
}

async function prepareMultimodalInput(prompt, persistentFiles, directUploads = []) {
    const inputs = [{ type: 'text', text: prompt || 'Hello' }];
    
    // 1. Process persistent files (uploaded via Files API)
    if (persistentFiles) {
        try {
            const pf = typeof persistentFiles === 'string' ? JSON.parse(persistentFiles) : persistentFiles;
            for (const f of pf) {
                if (!f?.fileUri) continue;
                const mime = f.mimeType || 'application/octet-stream';
                
                let docType = 'document';
                if (mime.startsWith('image/')) docType = 'image';
                else if (mime.startsWith('audio/')) docType = 'audio';
                else if (mime.startsWith('video/')) docType = 'video';
                
                inputs.push({
                    type: docType,
                    uri: f.fileUri,
                    mime_type: mime
                });
            }
        } catch (e) {
            console.warn('[prepareMultimodalInput] Failed parsing persistentFiles:', e.message);
        }
    }
    
    // 2. Process any direct multipart uploads via Files API
    for (const f of directUploads) {
        if (!f?.buffer) continue;
        const mime = f.mimetype || 'application/octet-stream';
        const cleanName = path.basename(f.originalname || 'upload.bin');
        const tmp = path.join(os.tmpdir(), `${Date.now()}_${cleanName}`);
        
        try {
            fs.writeFileSync(tmp, f.buffer);
            const uploaded = await client.files.upload({
                file: tmp,
                config: {
                    mimeType: mime,
                    displayName: cleanName
                }
            });
            
            let currentFile = uploaded;
            let attempts = 0;
            while (currentFile.state === 'PROCESSING' && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                currentFile = await client.files.get({ name: uploaded.name });
                attempts++;
            }
            
            let docType = 'document';
            if (mime.startsWith('image/')) docType = 'image';
            else if (mime.startsWith('audio/')) docType = 'audio';
            else if (mime.startsWith('video/')) docType = 'video';
            
            inputs.push({
                type: docType,
                uri: currentFile.uri,
                mime_type: currentFile.mimeType || mime
            });
        } catch (uploadErr) {
            console.error(`[prepareMultimodalInput] Failed uploading ${cleanName} to Files API:`, uploadErr);
        } finally {
            if (fs.existsSync(tmp)) {
                try { fs.unlinkSync(tmp); } catch {}
            }
        }
    }
    
    return inputs;
}

// ── Express Routes: /api/upload & /api/chat ────────────────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: RUNTIME_CONFIG.limits.fileUploadBytes }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        
        const cleanName = path.basename(req.file.originalname || 'file.bin');
        const tmp = path.join(os.tmpdir(), `${Date.now()}_${cleanName}`);
        fs.writeFileSync(tmp, req.file.buffer);
        
        try {
            const uploaded = await client.files.upload({
                file: tmp,
                config: {
                    mimeType: req.file.mimetype,
                    displayName: cleanName
                }
            });
            
            // Poll file state if asynchronously processed (e.g., video files)
            let currentFile = uploaded;
            let attempts = 0;
            while (currentFile.state === 'PROCESSING' && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                currentFile = await client.files.get({ name: uploaded.name });
                attempts++;
            }
            
            if (currentFile.state === 'FAILED') {
                throw new Error('Gemini Files API failed to process the uploaded media file.');
            }
            
            return res.json({
                fileUri: currentFile.uri,
                mimeType: currentFile.mimeType || req.file.mimetype,
                name: cleanName
            });
        } finally {
            if (fs.existsSync(tmp)) {
                try { fs.unlinkSync(tmp); } catch {}
            }
        }
    } catch (error) {
        console.error('[Upload Error]', error);
        return res.status(500).json({ error: error.message || 'Upload failed' });
    }
});

app.post('/api/chat', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'image_1', maxCount: 1 },
    { name: 'image_2', maxCount: 1 },
    { name: 'image_3', maxCount: 1 },
    { name: 'image_4', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'video_1', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
    { name: 'audio_1', maxCount: 1 },
    { name: 'file', maxCount: 1 },
    { name: 'file_1', maxCount: 1 },
    { name: 'file_2', maxCount: 1 },
    { name: 'file_3', maxCount: 1 },
    { name: 'file_4', maxCount: 1 }
]), async (req, res) => {
    const requestStartTime = Date.now();
    let responseFinished = false;

    const safeSend = payload => {
        if (res.writableEnded || responseFinished) return;
        try {
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
        } catch {}
    };

    res.on('finish', () => { responseFinished = true; });
    res.on('close', () => { responseFinished = true; });

    const keepAliveTimer = setInterval(() => {
        if (!res.writableEnded && !responseFinished) {
            try {
                res.write(': keep-alive\n\n');
            } catch {}
        }
    }, 15000);

    try {
        const {
            prompt,
            otherChats,
            userMemories,
            rawMemories,
            modelType,
            previous_interaction_id,
            last_active,
            history,
            interaction_id,
            resume,
            last_event_id,
            persistentFiles,
            use_maps,
            use_study,
            user_lat,
            user_lng
        } = req.body || {};

        const finalPrompt = prompt || 'Hello';
        const isResumeRequest = String(resume || '').toLowerCase() === 'true';

        // Detect Plugins
        const enableMaps = /@maps\b/i.test(finalPrompt) || String(use_maps || '').toLowerCase() === 'true';
        const enableStudy = /@study\b/i.test(finalPrompt) || String(use_study || '').toLowerCase() === 'true';

        let parsedLat = null;
        let parsedLng = null;
        if (user_lat !== undefined && user_lat !== null && user_lat !== '') {
            const num = parseFloat(user_lat);
            if (!isNaN(num)) parsedLat = num;
        }
        if (user_lng !== undefined && user_lng !== null && user_lng !== '') {
            const num = parseFloat(user_lng);
            if (!isNaN(num)) parsedLng = num;
        }

        // 24-hour expiration threshold calculation
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const lastActiveTime = Number(last_active) || 0;
        let conversationParentId = previous_interaction_id || null;

        if (conversationParentId && lastActiveTime > 0 && (Date.now() - lastActiveTime > ONE_DAY_MS)) {
            console.log(`[Interaction Runtime] Interaction ${conversationParentId} is older than 24h. Re-anchoring session via history.`);
            conversationParentId = null;
        }

        const resumeInteractionId = isResumeRequest ? (interaction_id || null) : null;
        const resumeLastEventId = isResumeRequest ? (last_event_id || null) : null;

        let parsedHistory = [];
        if (history) {
            try {
                parsedHistory = typeof history === 'string' ? JSON.parse(history) : history;
            } catch (e) {
                console.warn('[History Parsing Error]', e.message);
            }
        }

        const reasoningTier = normalizeReasoningTier(modelType);

        const sessionKey =
            resumeInteractionId ||
            conversationParentId ||
            `sess_${Date.now()}`;

        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        if (res.flushHeaders) res.flushHeaders();

        safeSend({
            type: 'mode_update',
            mode: reasoningTier
        });

        const fallbackDirectUploads = req.files
            ? Object.values(req.files).flat().filter(Boolean)
            : [];

        const parsedOtherChats = otherChats ? JSON.parse(otherChats) : [];

        let parsedRawMemories = null;
        if (rawMemories) {
            try {
                parsedRawMemories = JSON.parse(rawMemories);
            } catch {}
        }
        getMemoryStore(sessionKey, parsedRawMemories);

        const trace = RuntimeObservability.createTrace(sessionKey, finalPrompt, reasoningTier);
        trace.effectiveMode = reasoningTier;
        trace.selectedTools = (enableMaps && !enableStudy)
            ? ['google_maps', 'memory', 'web_search', 'image_search']
            : ['url_context', 'code_execution', 'memory', 'web_search', 'image_search'];

        const runtimeContext = {
            currentDate: new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: RUNTIME_CONFIG.defaults.locale
            }),
            timeZone: RUNTIME_CONFIG.defaults.locale,
            sessionId: sessionKey,
            userMemories: userMemories || ''
        };

        const systemInstruction = InstructionCompiler.compile(runtimeContext, reasoningTier, {
            enableMaps,
            enableStudy
        });

        const tools = buildCohanaToolset({
            enableMaps,
            enableStudy,
            latitude: parsedLat,
            longitude: parsedLng
        });
        const primary = ModelResolver.getPrimary(reasoningTier);

        const initialInputs = await prepareMultimodalInput(
            finalPrompt,
            persistentFiles,
            fallbackDirectUploads
        );

        const context = {
            requestStartTime,
            sessionKey,
            parsedOtherChats,
            parsedRawMemories,
            trace,
            safeSend
        };

        const state = {
            interactionId: resumeInteractionId,
            lastEventId: resumeLastEventId,
            model: null,
            thinkingLevel: primary.thinkingLevel,
            background: false,
            usage: null,
            completed: false,
            status: null
        };

        let stream = null;

        if (resumeInteractionId) {
            const metadata = await getInteractionMetadata(
                resumeInteractionId,
                primary.modelId
            );

            state.model = metadata.model || primary.modelId;
            state.status = metadata.status || null;

            if (metadata.status === 'requires_action') {
                const pendingCalls = extractPendingFunctionCalls(metadata.steps);

                if (pendingCalls.length > 0) {
                    const functionResults = await executeFunctionCalls(
                        pendingCalls,
                        context
                    );

                    stream = await createContinuation({
                        interactionId: resumeInteractionId,
                        model: state.model,
                        functionResults,
                        systemInstruction,
                        tools,
                        thinkingLevel: state.thinkingLevel
                    });
                } else {
                    stream = await streamResume(
                        resumeInteractionId,
                        resumeLastEventId
                    );
                }
            } else if (
                metadata.status === 'completed' ||
                metadata.status === 'failed' ||
                metadata.status === 'cancelled' ||
                metadata.status === 'incomplete'
            ) {
                state.completed = true;
                const completed = await client.interactions.get(resumeInteractionId);

                if (completed?.output_text) {
                    safeSend({
                        type: 'text',
                        content: completed.output_text
                    });
                }

                safeSend({
                    type: 'interaction_status',
                    status: completed?.status || metadata.status,
                    interaction_id: resumeInteractionId
                });

                safeSend({
                    type: 'interaction_id',
                    id: resumeInteractionId
                });

                stream = null;
            } else {
                stream = await streamResume(
                    resumeInteractionId,
                    resumeLastEventId
                );
            }
        } else {
            const started = await InteractionStarter.create({
                reasoningTier,
                input: initialInputs,
                previousInteractionId: conversationParentId,
                history: parsedHistory,
                systemInstruction,
                tools,
                requestStartTime
            });

            stream = started.stream;
            state.model = started.usedModel;
            state.thinkingLevel = started.thinkingLevel;
            state.background = false;
            trace.selectedModel = started.usedModel;

            safeSend({
                type: 'interaction_mode',
                mode: reasoningTier,
                background: false,
                previous_interaction_id: conversationParentId || null
            });
        }

        while (!state.completed) {
            if (!stream) break;

            const result = await processInteractionStream({
                stream,
                state,
                context
            });

            if (!state.interactionId && result.interaction?.id) {
                state.interactionId = result.interaction.id;
            }

            const functionCalls = result.functionCalls || [];

            if (functionCalls.length === 0) {
                if (state.status === 'completed' || !state.status) {
                    state.completed = true;
                }
                break;
            }

            const functionResults = await executeFunctionCalls(
                functionCalls,
                context
            );

            if (!state.interactionId) {
                throw new Error('Cannot continue a function call without an interaction ID.');
            }

            stream = await createContinuation({
                interactionId: state.interactionId,
                model: state.model || primary.modelId,
                functionResults,
                systemInstruction,
                tools,
                thinkingLevel: state.thinkingLevel
            });

            state.completed = false;
        }

        if (state.completed) {
            safeSend({ type: 'end' });
        }

        clearInterval(keepAliveTimer);
        if (!res.writableEnded) res.end();
    } catch (error) {
        clearInterval(keepAliveTimer);
        console.error('[Interaction Runtime Error]', error);

        safeSend({
            type: 'error',
            error: {
                message: error?.message || 'Interaction failed.'
            }
        });

        if (!responseFinished && !res.writableEnded) res.end();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Cohana is active on port ${PORT}`));

export default app;