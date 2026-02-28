// FC3 HTTP 函数 - 晚餐搭子答题匹配 API

const FEISHU_BASE = 'https://open.feishu.cn/open-apis';

const CONFIG = {
  app_token: 'SOtGbDbx0aOOi6ssapFctVZhnLd',
  table_id: 'tblK5cCBih3TYn3D',
  app_id: process.env.FEISHU_APP_ID,
  app_secret: process.env.FEISHU_APP_SECRET
};

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const res = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: CONFIG.app_id,
      app_secret: CONFIG.app_secret
    })
  });
  const data = await res.json();
  cachedToken = data.tenant_access_token;
  tokenExpiry = Date.now() + 7000 * 1000;
  return cachedToken;
}

function parseEvent(request) {
  const buf = Buffer.isBuffer(request) ? request : Buffer.from(request);
  return JSON.parse(buf.toString());
}

// 获取今日匹配
async function getTodayMatch(token, date) {
  const { app_token, table_id } = CONFIG;
  
  const res = await fetch(
    `${FEISHU_BASE}/bitable/v1/apps/${app_token}/tables/${table_id}/records`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await res.json();

  const todayRecord = (data.data?.items || []).find(
    item => item.fields['日期'] === date
  );

  if (!todayRecord) {
    return { match: null };
  }

  return {
    match: {
      id: todayRecord.record_id,
      date,
      creator: JSON.parse(todayRecord.fields['发起人'] || 'null'),
      questions: JSON.parse(todayRecord.fields['问题列表'] || '[]'),
      matched: JSON.parse(todayRecord.fields['匹配结果'] || '[]'),
      failedAttempts: JSON.parse(todayRecord.fields['失败记录'] || '[]'),
      status: todayRecord.fields['状态']
    }
  };
}

// 创建匹配（发起人设置题目）
async function createMatch(token, date, creator, questions) {
  const { app_token, table_id } = CONFIG;

  const body = {
    records: [{
      fields: {
        '日期': date,
        '发起人': JSON.stringify(creator),
        '问题列表': JSON.stringify(questions),
        '匹配结果': '',
        '失败记录': '',
        '状态': '等待答题'
      }
    }]
  };

  const res = await fetch(
    `${FEISHU_BASE}/bitable/v1/apps/${app_token}/tables/${table_id}/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );
  const data = await res.json();
  
  if (data.code !== 0) {
    return { error: data.msg, match: null };
  }
  
  return {
    match: {
      id: data.data?.records?.[0]?.record_id,
      date,
      creator,
      questions,
      matched: [],
      failedAttempts: [],
      status: '等待答题'
    }
  };
}

// 参加匹配（答题）
async function joinMatch(token, date, participant) {
  const { app_token, table_id } = CONFIG;

  const existing = await getTodayMatch(token, date);
  if (!existing.match) {
    return { error: '没有找到匹配', match: null };
  }

  const match = existing.match;
  
  // 检查性别是否匹配（异性）
  if (participant.gender === match.creator.gender) {
    return { error: '同性不能匹配', match };
  }

  // 检查是否已经匹配成功
  if (match.matched.length >= 2) {
    return { error: '已匹配成功', match };
  }

  // 如果答对了，匹配成功
  if (participant.allCorrect) {
    match.matched = [match.creator, participant];
    
    await fetch(
      `${FEISHU_BASE}/bitable/v1/apps/${app_token}/tables/${table_id}/records/${match.id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            '匹配结果': JSON.stringify(match.matched),
            '状态': '已匹配'
          }
        })
      }
    );
  } else {
    // 答错了，记录失败
    match.failedAttempts = [...(match.failedAttempts || []), participant];
    
    await fetch(
      `${FEISHU_BASE}/bitable/v1/apps/${app_token}/tables/${table_id}/records/${match.id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            '失败记录': JSON.stringify(match.failedAttempts)
          }
        })
      }
    );
  }

  return { match };
}

exports.handler = async (request) => {
  const event = parseEvent(request);
  const path = event.rawPath || event.requestContext?.http?.path || '/';
  const method = event.requestContext?.http?.method || 'GET';
  const query = event.queryStringParameters || {};

  try {
    const token = await getAccessToken();

    // GET /match?date=2024-03-01
    if (path === '/match' && method === 'GET') {
      const date = query.date || new Date().toISOString().split('T')[0];
      const result = await getTodayMatch(token, date);
      return JSON.stringify(result);
    }

    // POST /match/create - 发起匹配
    if (path === '/match/create' && method === 'POST') {
      let body = {};
      if (event.body) {
        const bodyStr = event.isBase64Encoded 
          ? Buffer.from(event.body, 'base64').toString() 
          : event.body;
        body = JSON.parse(bodyStr);
      }

      const date = body.date || new Date().toISOString().split('T')[0];
      const result = await createMatch(token, date, body.creator, body.questions);
      return JSON.stringify(result);
    }

    // POST /match/join - 参加匹配
    if (path === '/match/join' && method === 'POST') {
      let body = {};
      if (event.body) {
        const bodyStr = event.isBase64Encoded 
          ? Buffer.from(event.body, 'base64').toString() 
          : event.body;
        body = JSON.parse(bodyStr);
      }

      const date = body.date || new Date().toISOString().split('T')[0];
      const result = await joinMatch(token, date, body.participant);
      return JSON.stringify(result);
    }

    return JSON.stringify({ error: 'Not found', path });

  } catch (err) {
    return JSON.stringify({ error: err.message, stack: err.stack });
  }
};
