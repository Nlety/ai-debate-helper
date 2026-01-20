const CONFIG_KEY = 'ai_debate_config';
const REMOTE_CONFIG_URL = 'https://ai-pages.dc616fa1.er.aliyun-esa.net/api/storage?key=config';
const DECRYPT_KEY = 'shfn73fnein348un';
function decryptConfig(e) { try { const d = CryptoJS.RC4.decrypt(e, DECRYPT_KEY).toString(CryptoJS.enc.Utf8); if (!d) return null; const c = JSON.parse(d); c.modelName = 'GLM-4-Flash'; return c; } catch (e) { return null; } }
async function fetchRemoteConfig() { try { const r = await fetch(REMOTE_CONFIG_URL); if (!r.ok) return null; const d = await r.json(); if (d && d.value) { const c = decryptConfig(d.value); if (c && c.apiUrl && c.apiKey) { localStorage.setItem(CONFIG_KEY + '_remote', JSON.stringify(c)); return c; } } return null; } catch (e) { return null; } }
function getModelConfig() { try { const u = localStorage.getItem(CONFIG_KEY); if (u) { const p = JSON.parse(u); if (p && p.apiUrl && p.apiKey && p.modelName) return p; } const r = localStorage.getItem(CONFIG_KEY + '_remote'); if (r) return JSON.parse(r); return null; } catch (e) { return null; } }
function saveModelConfig(c) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); }
async function initConfig() { const c = getModelConfig(); if (c) return c; return await fetchRemoteConfig(); }

async function generate(topic, side, depth, context, onMessage, onComplete, onError) {
    let config = getModelConfig(); if (!config || !config.apiUrl || !config.apiKey) config = await fetchRemoteConfig();
    if (!config) { onError(new Error('请先配置模型')); return; }
    const sideMap = { pro: '正方（支持）', con: '反方（反对）', both: '双方全面分析' };
    const depthMap = { quick: '快速要点（3个核心论点）', standard: '标准分析（5个论点+论据）', deep: '深度论证（8个论点+论据+反驳预案）' };
    const prompt = `你是一位资深辩论教练和逻辑专家。请针对以下辩题提供专业的辩论观点：

辩题：${topic}
立场：${sideMap[side]}
分析深度：${depthMap[depth]}
${context ? `补充背景：${context}` : ''}

${side === 'both' ? `请同时分析正方和反方的观点：

## ✅ 正方观点（支持）
（列出核心论点、论据和逻辑链条）

## ❌ 反方观点（反对）
（列出核心论点、论据和逻辑链条）

## ⚖️ 综合分析
（客观评价双方优劣势）` : `## ${side === 'pro' ? '✅ 正方论点' : '❌ 反方论点'}

### 论点1：[标题]
**核心观点**：（清晰陈述）
**论据支撑**：（事实、数据、案例）
**逻辑链条**：（因为...所以...）

（依此类推列出所有论点...）

## 🔄 对方可能的反驳及应对
（预判对方反驳点并准备应对）

## 💡 辩论技巧建议
（如何更有说服力地表达这些观点）`}`;

    const controller = new AbortController();
    try {
        const response = await fetch(`${config.apiUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` }, body: JSON.stringify({ model: config.modelName, messages: [{ role: 'user', content: prompt }], stream: true, temperature: 0.7 }), signal: controller.signal });
        if (!response.ok) throw new Error(`请求失败: ${response.status}`);
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
        while (true) { const { done, value } = await reader.read(); if (done) { onComplete(); break; } buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; for (const line of lines) { if (line.startsWith('data: ')) { const data = line.slice(6).trim(); if (data === '[DONE]') { onComplete(); return; } try { const content = JSON.parse(data).choices?.[0]?.delta?.content; if (content) onMessage(content); } catch (e) { } } } }
    } catch (error) { if (error.name !== 'AbortError') onError(error); }
}
window.AIService = { getModelConfig, saveModelConfig, initConfig, generate };
