
// Cloudflare KV Namespace Type Definition
interface KVNamespace {
  get(key: string, options?: { type?: "text" | "json" | "arrayBuffer" | "stream"; cacheTtl?: number } | "text" | "json" | "arrayBuffer" | "stream"): Promise<any>;
  put(key: string, value: string | ReadableStream | ArrayBuffer, options?: { expiration?: number; expirationTtl?: number; metadata?: any }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string; expiration?: number; metadata?: any }[]; list_complete: boolean; cursor?: string }>;
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
  KV: KVNamespace;
}

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
  const { request, env } = context;
  
  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // KV Binding Check
  if (!env.KV) {
    return errorResponse("KV binding (KV) not found. Check wrangler.toml and Cloudflare Dashboard settings.", 500);
  }

  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '').split('/'); // ['projects'] or ['projects', '123']
  const resource = path[0];
  const id = path[1];
  const method = request.method;

  try {
    // --- PROJECTS ---
    // Key format: project:<id>
    if (resource === 'projects') {
      if (method === 'GET') {
        if (id) {
          // Get Single
          const project = await env.KV.get(`project:${id}`, 'json');
          if (!project) return errorResponse('Project not found', 404);
          return jsonResponse(project);
        } else {
          // List All
          const list = await env.KV.list({ prefix: 'project:' });
          const keys = list.keys;
          
          // Fetch all projects in parallel
          const projects = await Promise.all(
            keys.map(key => env.KV.get(key.name, 'json'))
          );
          
          // Filter out nulls and sort by updatedAt desc
          const validProjects = projects
            .filter((p): p is any => p !== null)
            .sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));

          return jsonResponse(validProjects);
        }
      } 
      
      if (method === 'POST') {
        const body: any = await request.json();
        
        if (!body.name || !body.userId) {
            return errorResponse("Missing required fields: name, userId", 400);
        }

        // Ensure defaults
        const newProject = {
          ...body,
          storyboardZh: body.storyboardZh || [],
          storyboardEn: body.storyboardEn || [],
          creativePlan: body.creativePlan || '',
          grid3x3Zh: body.grid3x3Zh || '',
          grid3x3En: body.grid3x3En || '',
          negativeImage: body.negativeImage || '',
          splitImages: body.splitImages || [],
          createdAt: body.createdAt || Date.now(),
          updatedAt: body.updatedAt || Date.now()
        };

        await env.KV.put(`project:${body.id}`, JSON.stringify(newProject));
        return jsonResponse({ success: true, id: body.id }, 201);
      }

      if (method === 'PUT' && id) {
        const body: any = await request.json();
        const existing: any = await env.KV.get(`project:${id}`, 'json');
        if (!existing) return errorResponse('Project not found', 404);

        const updatedProject = {
          ...existing,
          ...body,
          updatedAt: body.updatedAt || Date.now()
        };

        await env.KV.put(`project:${id}`, JSON.stringify(updatedProject));
        return jsonResponse({ success: true });
      }

      if (method === 'DELETE' && id) {
        await env.KV.delete(`project:${id}`);
        return jsonResponse({ success: true });
      }
    }

    // --- API KEYS ---
    // Key format: key:<id>
    if (resource === 'keys') {
      if (method === 'GET') {
        const list = await env.KV.list({ prefix: 'key:' });
        const keys = await Promise.all(list.keys.map(k => env.KV.get(k.name, 'json')));
        const validKeys = keys
            .filter((k): k is any => k !== null)
            .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        return jsonResponse(validKeys);
      }

      if (method === 'POST') {
        const body: any = await request.json();
        
        if (body.isDefault) {
           const list = await env.KV.list({ prefix: 'key:' });
           for (const k of list.keys) {
             const item: any = await env.KV.get(k.name, 'json');
             if (item && item.isDefault) {
               item.isDefault = false;
               await env.KV.put(k.name, JSON.stringify(item));
             }
           }
        }

        await env.KV.put(`key:${body.id}`, JSON.stringify(body));
        return jsonResponse({ success: true }, 201);
      }

      if (method === 'PUT' && id) {
         const body: any = await request.json();
         const existing: any = await env.KV.get(`key:${id}`, 'json');
         if (!existing) return errorResponse('Key not found', 404);

         if (body.isDefault) {
            const list = await env.KV.list({ prefix: 'key:' });
            for (const k of list.keys) {
                if (k.name !== `key:${id}`) {
                    const item: any = await env.KV.get(k.name, 'json');
                    if (item && item.isDefault) {
                        item.isDefault = false;
                        await env.KV.put(k.name, JSON.stringify(item));
                    }
                }
            }
         }
         
         const updated = { ...existing, ...body };
         await env.KV.put(`key:${id}`, JSON.stringify(updated));
         return jsonResponse({ success: true });
      }

      if (method === 'DELETE' && id) {
        await env.KV.delete(`key:${id}`);
        return jsonResponse({ success: true });
      }
    }

    // --- AI MODELS ---
    // Key format: model:<id>
    if (resource === 'models') {
        if (method === 'GET') {
            const list = await env.KV.list({ prefix: 'model:' });
            const models = await Promise.all(list.keys.map(k => env.KV.get(k.name, 'json')));
            const validModels = models
                .filter((m): m is any => m !== null)
                .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
            return jsonResponse(validModels);
        }

        if (method === 'POST') {
            const body: any = await request.json();
            
            if (body.isDefault) {
                const list = await env.KV.list({ prefix: 'model:' });
                for (const k of list.keys) {
                    const item: any = await env.KV.get(k.name, 'json');
                    if (item && item.isDefault) {
                        item.isDefault = false;
                        await env.KV.put(k.name, JSON.stringify(item));
                    }
                }
            }

            await env.KV.put(`model:${body.id}`, JSON.stringify(body));
            return jsonResponse({ success: true }, 201);
        }

        if (method === 'PUT' && id) {
            const body: any = await request.json();
            const existing: any = await env.KV.get(`model:${id}`, 'json');
            if (!existing) return errorResponse('Model not found', 404);

            if (body.isDefault) {
                const list = await env.KV.list({ prefix: 'model:' });
                for (const k of list.keys) {
                    if (k.name !== `model:${id}`) {
                        const item: any = await env.KV.get(k.name, 'json');
                        if (item && item.isDefault) {
                            item.isDefault = false;
                            await env.KV.put(k.name, JSON.stringify(item));
                        }
                    }
                }
            }
            
            const updated = { ...existing, ...body };
            await env.KV.put(`model:${id}`, JSON.stringify(updated));
            return jsonResponse({ success: true });
        }

        if (method === 'DELETE' && id) {
            await env.KV.delete(`model:${id}`);
            return jsonResponse({ success: true });
        }
    }

    // --- PROMPTS ---
    // Key format: prompt:<moduleKey>
    if (resource === 'prompts') {
      if (method === 'GET') {
        const moduleKey = url.searchParams.get('moduleKey');
        if (moduleKey) {
           const result = await env.KV.get(`prompt:${moduleKey}`, 'json');
           return jsonResponse(result || null); 
        }
        const list = await env.KV.list({ prefix: 'prompt:' });
        const prompts = await Promise.all(list.keys.map(k => env.KV.get(k.name, 'json')));
        return jsonResponse(prompts.filter(Boolean));
      }

      if (method === 'POST') {
        const body: any = await request.json();
        const key = `prompt:${body.moduleKey}`;
        const payload = {
            id: body.id || Date.now().toString(),
            moduleKey: body.moduleKey,
            content: body.content,
            updatedAt: body.updatedAt || Date.now()
        };
        await env.KV.put(key, JSON.stringify(payload));
        return jsonResponse({ success: true });
      }
    }

    return errorResponse('Method Not Allowed', 405);

  } catch (err: any) {
    console.error("API Global Error", err);
    return errorResponse(err.message || 'Internal Server Error', 500);
  }
};