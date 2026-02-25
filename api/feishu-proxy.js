// 飞书 API 代理 - 用于 Cloudflare Workers / Vercel / Node.js
// 保护敏感的 app_token 和权限

const FEISHU_BASE = 'https://open.feishu.cn/open-apis';

// 配置 - 部署时填入
const CONFIG = {
  app_token: 'MeFpb7f06aCCiMsaadNcReLUnvu',
  table_id: 'tblfl9NLAf6iJtKw',
  app_id: process.env.FEISHU_APP_ID || 'YOUR_APP_ID',
  app_secret: process.env.FEISHU_APP_SECRET || 'YOUR_APP_SECRET'
};

// 获取 access_token
async function getAccessToken(env) {
  const res = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: env.FEISHU_APP_ID || CONFIG.app_id,
      app_secret: env.FEISHU_APP_SECRET || CONFIG.app_secret
    })
  });
  const data = await res.json();
  return data.tenant_access_token;
}

// 处理请求
export default async function handler(request, env, ctx) {
  // CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  const token = await getAccessToken(env);

  const app_token = CONFIG.app_token;
  const table_id = CONFIG.table_id;

  try {
    // 获取饭局列表
    if (path === '/events' && request.method === 'GET') {
      const res = await fetch(
        `${FEISHU_BASE}/bitable/v1/apps/${app_token}/tables/${table_id}/records`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await res.json();
      
      // 转换为前端格式
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

      return new Response(JSON.stringify({ events }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 创建饭局
    if (path === '/events' && request.method === 'POST') {
      const body = await request.json();
      
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
      
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 更新饭局（参与）
    if (path.match(/\/events\/[^/]+/) && request.method === 'PUT') {
      const record_id = path.split('/')[2];
      const body = await request.json();
      
      const res = await fetch(
        `${FEISHU_BASE}/bitable/v1/apps/${app_token}/tables/${table_id}/records/${record_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: body.fields
          })
        }
      );
      
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
