// FC3 HTTP 函数 - 晚餐搭子匹配 API

const FEISHU_BASE = 'https://open.feishu.cn/open-apis';

const CONFIG = {
  app_token: 'MeFpb7f06aCCiMsaadNcReLUnvu',
  table_id: 'tblfl9NLAf6iJtKw',
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

  // 找到今天的匹配记录
  const todayRecord = (data.data?.items || []).find(
    item => item.fields['日期'] === date
  );

  if (!todayRecord) {
    return { match: null };
  }

  const participants = JSON.parse(todayRecord.fields['参与者'] || '[]');
  const status = todayRecord.fields['状态'];
  const matched = JSON.parse(todayRecord.fields['匹配结果'] || '[]');
  const topic = todayRecord.fields['破冰话题'] || '';

  return {
    match: {
      id: todayRecord.record_id,
      date,
      participants,
      status,
      matched,
      topic
    }
  };
}

// 创建或更新匹配记录
async function upsertMatch(token, date, participant) {
  const { app_token, table_id } = CONFIG;

  // 先查询是否有今天的记录
  const existingMatch = await getTodayMatch(token, date);
  
  if (!existingMatch.match) {
    // 创建新记录
    const res = await fetch(
      `${FEISHU_BASE}/bitable/v1/apps/${app_token}/tables/${table_id}/records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields: {
              '日期': date,
              '参与者': JSON.stringify([participant]),
              '状态': 'waiting',
              '破冰话题': participant.topics || '',
              '匹配结果': '',
              '创建时间': Date.now()
            }
          }]
        })
      }
    );
    const data = await res.json();
    return {
      match: {
        id: data.data?.records?.[0]?.record_id,
        date,
        participants: [participant],
        status: 'waiting',
        matched: [],
        topic: participant.topics || ''
      }
    };
  }

  // 更新现有记录
  const match = existingMatch.match;
  const participants = [...match.participants, participant];
  
  let newStatus = match.status;
  let matched = [];
  
  // 如果有两人，自动匹配
  if (participants.length >= 2 && match.status === 'waiting') {
    newStatus = 'matched';
    matched = participants.slice(0, 2); // 取前两人
  }

  const res = await fetch(
    `${FEISHU_BASE}/bitable/v1/apps/${app_token}/tables/${table_id}/records/${match.id}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          '参与者': JSON.stringify(participants),
          '状态': newStatus,
          '匹配结果': JSON.stringify(matched),
          '破冰话题': match.topic || participant.topics || ''
        }
      })
    }
  );

  return {
    match: {
      ...match,
      participants,
      status: newStatus,
      matched,
      topic: match.topic || participant.topics || ''
    }
  };
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

    // POST /match/join
    if (path === '/match/join' && method === 'POST') {
      let body = {};
      if (event.body) {
        const bodyStr = event.isBase64Encoded 
          ? Buffer.from(event.body, 'base64').toString() 
          : event.body;
        body = JSON.parse(bodyStr);
      }

      const date = body.date || new Date().toISOString().split('T')[0];
      const participant = {
        id: body.participant.id,
        name: body.participant.name,
        avatar: body.participant.avatar,
        topics: body.participant.topics
      };

      const result = await upsertMatch(token, date, participant);
      return JSON.stringify(result);
    }

    return JSON.stringify({ error: 'Not found', path });

  } catch (err) {
    return JSON.stringify({ error: err.message, stack: err.stack });
  }
};
