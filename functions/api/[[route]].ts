// Cloudflare Pages/Workers Types Polyfill for compilation
interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: any;
  error?: string;
}

interface D1ExecResult {
  count: number;
  duration: number;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
  next(input?: Request | string, init?: RequestInit): Promise<Response>;
  env: Env;
  params: Record<string, string | string[]>;
  data: Data;
}

type PagesFunction<Env = unknown, Params extends string = any, Data extends Record<string, unknown> = Record<string, unknown>> = (
  context: EventContext<Env, Params, Data>
) => Response | Promise<Response>;

interface Env {
  DB: D1Database;
}

// 4.4 鉴权与 CORS 头 helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper for JSON responses
const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
};

// Helper for Error responses
const errorResponse = (message: string, status = 500, traceId?: string) => {
  return jsonResponse({ 
    ok: false, 
    error: message,
    traceId 
  }, status);
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  
  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // 4.3 D1 Binding Check
  if (!env.DB) {
    return errorResponse("Database binding (DB) not found. Check wrangler.toml.", 500);
  }

  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '').split('/'); // ['projects'] or ['projects', '123']
  const resource = path[0];
  const id = path[1];
  const method = request.method;

  try {
    // --- PROJECTS ---
    if (resource === 'projects') {
      if (method === 'GET') {
        if (id) {
          const stmt = env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id);
          const result = await stmt.first();
          if (!result) return errorResponse('Project not found', 404);
          return jsonResponse(mapProjectFromDb(result));
        } else {
          const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
          return jsonResponse(results.map(mapProjectFromDb));
        }
      } 
      
      if (method === 'POST') {
        const body: any = await request.json();
        
        // 简单校验
        if (!body.name || !body.userId) {
            return errorResponse("Missing required fields: name, userId", 400);
        }

        try {
            await env.DB.prepare(`
            INSERT INTO projects (id, user_id, name, creative_plan, storyboard_zh, storyboard_en, grid_3x3_zh, grid_3x3_en, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
            body.id, body.userId, body.name, body.creativePlan || '', 
            JSON.stringify(body.storyboardZh || []), JSON.stringify(body.storyboardEn || []), 
            body.grid3x3Zh || '', body.grid3x3En || '', body.createdAt || Date.now(), body.updatedAt || Date.now()
            ).run();
        } catch (dbErr: any) {
            console.error("DB Insert Error", dbErr);
            return errorResponse("Database insert failed: " + dbErr.message, 500);
        }
        
        return jsonResponse({ success: true, id: body.id }, 201);
      }

      if (method === 'PUT' && id) {
        const body: any = await request.json();
        await env.DB.prepare(`
          UPDATE projects SET 
            name=?, creative_plan=?, storyboard_zh=?, storyboard_en=?, grid_3x3_zh=?, grid_3x3_en=?, updated_at=?
          WHERE id=?
        `).bind(
          body.name, body.creativePlan, 
          JSON.stringify(body.storyboardZh), JSON.stringify(body.storyboardEn), 
          body.grid3x3Zh, body.grid3x3En, body.updatedAt, id
        ).run();
        return jsonResponse({ success: true });
      }

      if (method === 'DELETE' && id) {
        await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true });
      }
    }

    // --- API KEYS ---
    if (resource === 'keys') {
      if (method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all();
        return jsonResponse(results.map(mapKeyFromDb));
      }

      if (method === 'POST') {
        const body: any = await request.json();
        // If setting default, unset others first
        if (body.isDefault) {
          await env.DB.prepare('UPDATE api_keys SET is_default = 0').run();
        }
        await env.DB.prepare(`
          INSERT INTO api_keys (id, user_id, label, key_value, is_default, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(body.id, body.userId, body.label, body.key, body.isDefault ? 1 : 0, body.createdAt).run();
        return jsonResponse({ success: true }, 201);
      }

      if (method === 'PUT' && id) {
         const body: any = await request.json();
         if (body.isDefault) {
           await env.DB.prepare('UPDATE api_keys SET is_default = 0').run();
         }
         await env.DB.prepare('UPDATE api_keys SET is_default = ? WHERE id = ?')
            .bind(body.isDefault ? 1 : 0, id).run();
         return jsonResponse({ success: true });
      }

      if (method === 'DELETE' && id) {
        await env.DB.prepare('DELETE FROM api_keys WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true });
      }
    }

    // --- PROMPTS ---
    if (resource === 'prompts') {
      if (method === 'GET') {
        const moduleKey = url.searchParams.get('moduleKey');
        if (moduleKey) {
           const result = await env.DB.prepare('SELECT * FROM prompts WHERE module_key = ?').bind(moduleKey).first();
           return jsonResponse(result || null);
        }
        const { results } = await env.DB.prepare('SELECT * FROM prompts').all();
        return jsonResponse(results);
      }

      if (method === 'POST') {
        const body: any = await request.json();
        const existing = await env.DB.prepare('SELECT id FROM prompts WHERE module_key = ?').bind(body.moduleKey).first();
        if (existing) {
           await env.DB.prepare('UPDATE prompts SET content = ?, updated_at = ? WHERE module_key = ?')
             .bind(body.content, body.updatedAt, body.moduleKey).run();
        } else {
           await env.DB.prepare('INSERT INTO prompts (id, module_key, content, updated_at) VALUES (?, ?, ?, ?)')
             .bind(Date.now().toString(), body.moduleKey, body.content, body.updatedAt).run();
        }
        return jsonResponse({ success: true });
      }
    }

    return errorResponse('Method Not Allowed', 405);

  } catch (err: any) {
    console.error("API Global Error", err);
    return errorResponse(err.message || 'Internal Server Error', 500);
  }
};

// Helpers to map DB columns (snake_case) to App types (camelCase)
function mapProjectFromDb(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    creativePlan: row.creative_plan,
    storyboardZh: JSON.parse(row.storyboard_zh || '[]'),
    storyboardEn: JSON.parse(row.storyboard_en || '[]'),
    grid3x3Zh: row.grid_3x3_zh,
    grid3x3En: row.grid_3x3_en,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapKeyFromDb(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    key: row.key_value,
    isDefault: row.is_default === 1,
    createdAt: row.created_at
  };
}