module.exports = {
  // Claude API
  claude: {
    baseUrl: process.env.ANTHROPIC_BASE_URL || "https://aicoding.api.zeroclover.io",
    apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
    model: process.env.RECOMMEND_MODEL || "claude-sonnet-4-5-20250929",
  },
  
  // Bitable
  bitable: {
    appToken: process.env.BITABLE_APP_TOKEN,
    poolTableId: process.env.TOPIC_POOL_TABLE_ID,
    tables: {
      weibo: process.env.WEIBO_TABLE_ID,
      douyin: process.env.DOUYIN_TABLE_ID,
      toutiao: process.env.TOUTIAO_TABLE_ID,
    }
  },
  
  // 推荐策略
  recommendation: {
    maxRetries: 2,
    batchSize: 50,
    enableQuotesFor: ["高"], // 只对"高"生成金句
  },
  
  // 记忆路径
  memory: {
    preferences: __dirname + "/memory/preferences.json",
    stats: __dirname + "/memory/skill_stats.json",
    history: __dirname + "/memory/daily_history.json",
  }
};
