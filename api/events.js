// Vercel Serverless Function
// 文件路径: api/events.js

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
  tokenExpiry = Date.now() + 7000 * 1000; // 约2小时
  return cachedToken;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = await getAccessToken();
  const { app_token, table_id } = CONFIG;

  try {
    // GET - 获取列表
    if (req.method === 'GET') {
      const response = await fetch(
        `${FEISHU_BASE}/bitable/v1/apps/${app_token}/tables/${table_id}/records`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();

      const events = (data.data?.items || []).map(item => ({
        id: item.record_id,
        title: item.fields['饭局名称'] || '',
        description: item.fields['描述'] || '',
        location: item.fields['地点'] || '',
        distance: item.fields['距离'] || 0,
        time: item.fields['时间'] || '',
        maxPeople: item.fields['最大人数'] || 4,
        currentPeople: item.fields['当前人数'] || 1,
        host: item.fields['发起人'] || '',
        hostAvatar: item.fields['发起人头像'] || '😊',
        questions: JSON.parse(item.fields['筛选问题'] || '[]'),
        status: item.fields['状态'] || '招募中',
        createTime: item.fields['创建时间'] || Date.now()
      }));

      return res.status(200).json({ events });
    }

    // POST - 创建饭局
    if (req.method === 'POST') {
      const body = req.body;

      const response = await fetch(
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
                '饭局名称': body.title,
                '描述': body.description,
                '地点': body.location,
                '距离': body.distance,
                '时间': body.time,
                '最大人数': body.maxPeople,
                '当前人数': 1,
                '发起人': body.host || '匿名',
                '发起人头像': body.hostAvatar || '😊',
                '筛选问题': JSON.stringify(body.questions || []),
                '状态': '招募中',
                '创建时间': Date.now()
              }
            }]
          })
        }
      );

      const data = await response.json();
      return res.status(200).json(data);
    }

    // PUT - 更新饭局
    if (req.method === 'PUT') {
      const { id } = req.query;
      const body = req.body;

      const response = await fetch(
        `${FEISHU_BASE}/bitable/v1/apps/${app_token}/tables/${table_id}/records/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields: body.fields })
        }
      );

      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(404).json({ error: 'Not found' });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
