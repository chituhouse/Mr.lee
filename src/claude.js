const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-5-20251101';

// Lazy-load ESM module (SDK is ESM-only, our project is CommonJS)
let _query = null;
async function loadSDK() {
  if (!_query) {
    const sdk = await import('@anthropic-ai/claude-agent-sdk');
    _query = sdk.query;
  }
  return _query;
}

const MCP_BITABLE_SERVER = {
  command: "/home/linuxbrew/.linuxbrew/bin/node",
  args: ["/home/jarvis/jarvis-gateway/src/mcp-bitable.mjs"],
};

class ClaudeClient {
  async chat(prompt, sessionId = null) {
    const query = await loadSDK();

    const options = {
      model: CLAUDE_MODEL,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      settingSources: ['user'],
      mcpServers: {
        "feishu-bitable": MCP_BITABLE_SERVER,
      },
      allowedTools: ["mcp__feishu-bitable__*"],
    };

    if (sessionId) {
      options.resume = sessionId;
    }

    console.log(`[Claude] Calling (${CLAUDE_MODEL}): ${sessionId ? 'resume ' + sessionId.substring(0, 8) + '...' : 'new session'}`);
    const startTime = Date.now();

    let resultText = '';
    let resultSessionId = '';

    for await (const message of query({ prompt, options })) {
      if (message.type === 'system' && message.subtype === 'init') {
        resultSessionId = message.session_id;
        if (message.mcp_servers) {
          console.log('[Claude] MCP servers:', Object.keys(message.mcp_servers).join(', '));
        }
      }
      if (message.type === 'result') {
        resultSessionId = message.session_id || resultSessionId;
        if (message.subtype === 'success') {
          resultText = message.result;
        } else {
          throw new Error(message.result || 'Claude returned an error');
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Claude] Response in ${elapsed}s, session: ${resultSessionId?.substring(0, 8)}...`);

    if (!resultText) {
      throw new Error('No result from Claude');
    }

    return { result: resultText, sessionId: resultSessionId };
  }
}

module.exports = { ClaudeClient };
