import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface CreateUserPayload {
  email: string;
  password: string;
  full_name?: string;
  designation?: string;
  department_id?: string;
  role?: 'user' | 'admin';
}

serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Only admins can create users' }), { status: 403 });
  }

  try {
    const body: CreateUserPayload = await req.json();
    if (!body.email || !body.password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400 });
    }

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
    }

    if (userData?.user) {
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: userData.user.id,
        email: body.email,
        full_name: body.full_name || null,
        designation: body.designation || null,
        department_id: body.department_id || null,
        role: body.role || 'user',
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    return new Response(JSON.stringify({ user: userData?.user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
