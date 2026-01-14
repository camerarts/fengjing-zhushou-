
// Cloudflare KV Namespace Type Definition
interface KVNamespace {
  get(key: string, options?: { type?: "text" | "json" | "arrayBuffer" | "stream"; cacheTtl?: number } | "text" | "json" | "arrayBuffer" | "stream"): Promise<any>;
  put(key: string, value: string | ReadableStream | ArrayBuffer, options?: { expiration?: number; expirationTtl?: number; metadata?: any }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string; expiration?: number; metadata?: any }[]; list_complete: boolean; cursor?: string }>;
}

// Cloudflare R2 Bucket Type Definition
interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string } }): Promise<any>;
  get(key: string): Promise<any>;
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
  BUCKET: R2Bucket;
  R2_PUBLIC_URL: string; // Environment variable for the public domain (e.g., https://pub-xxx.r2.dev)
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

// Helper to decode Base64 to Uint8Array
function base64ToUint8Array(base64String: string) {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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
    // --- IMAGE PROXY (Bypass CORS) ---
    if (resource === 'proxy') {
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) return errorResponse('Missing url param', 400);
        
        try {
            const resp = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Storyboard-Assistant-Proxy/1.0'
                }
            });
            if (!resp.ok) return errorResponse(`Upstream error: ${resp.status}`, 502);

            // Forward content type
            const contentType = resp.headers.get('content-type') || 'application/octet-stream';
            
            // Create headers with CORS
            const headers = new Headers(corsHeaders);
            headers.set('Content-Type', contentType);
            headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

            return new Response(resp.body, {
                status: 200,
                headers: headers
            });
        } catch (e: any) {
             return errorResponse(`Proxy failed: ${e.message}`, 500);
        }
    }

    // --- IMAGE UPLOAD (R2) ---
    if (resource === 'upload' && method === 'POST') {
      if (!env.BUCKET) {
        return errorResponse("R2 Bucket binding (BUCKET) not found. Please configure R2 in Cloudflare Dashboard.", 500);
      }
      if (!env.R2_PUBLIC_URL) {
        return errorResponse("R2_PUBLIC_URL environment variable is missing. Please set your R2 public domain.", 500);
      }

      const body: any = await request.json();
      const imageDataUrl = body.image; // Expecting "data:image/png;base64,..."

      if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image')) {
        return errorResponse("Invalid image data. Must be a Base64 Data URL.", 400);
      }

      // Robust Parsing without Regex on full string to avoid stack overflow/DoS on large strings
      const commaIndex = imageDataUrl.indexOf(',');
      if (commaIndex === -1) {
        return errorResponse("Invalid Data URL format: missing comma.", 400);
      }

      const header = imageDataUrl.substring(0, commaIndex);
      // Clean base64 string: remove any newlines or spaces that might creep in
      const base64Data = imageDataUrl.substring(commaIndex + 1).replace(/[\s\r\n]+/g, '');

      // Parse Header for MimeType
      const mimeMatch = header.match(/^data:(image\/[a-zA-Z0-9.-]+);base64$/);
      if (!mimeMatch) {
        return errorResponse("Invalid Data URL header format.", 400);
      }

      const mimeType = mimeMatch[1]; // e.g., image/png
      let extension = mimeType.split('/')[1] || 'png';
      
      // Normalize extension
      if (extension === 'jpeg') extension = 'jpg';
      extension = extension.replace(/[^a-z0-9]/gi, ''); // Sanitize

      // Generate unique filename
      const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
      
      try {
        const buffer = base64ToUint8Array(base64Data);
        
        // Upload to R2
        await env.BUCKET.put(filename, buffer.buffer, {
          httpMetadata: { contentType: mimeType }
        });
      } catch (err: any) {
        console.error("Buffer/R2 Error:", err);
        return errorResponse(`Failed to process or upload image: ${err.message}`, 500);
      }

      // Return Public URL
      // Ensure R2_PUBLIC_URL doesn't have a trailing slash
      const publicUrl = env.R2_PUBLIC_URL.replace(/\/$/, '');
      return jsonResponse({ 
        success: true, 
        url: `${publicUrl}/${filename}` 
      });
    }

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
            const targetType = body.type || 'text'; // Default to text if missing
            
            if (body.isDefault) {
                const list = await env.KV.list({ prefix: 'model:' });
                for (const k of list.keys) {
                    const item: any = await env.KV.get(k.name, 'json');
                    // Ensure robust type checking: default existing item type to 'text'
                    const itemType = item.type || 'text';
                    // Only unset default for same type
                    if (item && item.isDefault && itemType === targetType) {
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
            
            const targetType = body.type || existing.type || 'text';

            if (body.isDefault) {
                const list = await env.KV.list({ prefix: 'model:' });
                for (const k of list.keys) {
                    if (k.name !== `model:${id}`) {
                        const item: any = await env.KV.get(k.name, 'json');
                        // Ensure robust type checking: default existing item type to 'text'
                        const itemType = item.type || 'text';
                        // Only unset default for same type
                        if (item && item.isDefault && itemType === targetType) {
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
