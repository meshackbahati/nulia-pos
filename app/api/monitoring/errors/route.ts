import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const errorData = await request.json();
    
    // Get the user's IP address
    const forwardedFor = headers().get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
    
    // Get the user agent
    const userAgent = headers().get('user-agent') || 'unknown';
    
    // Get the current timestamp
    const timestamp = new Date().toISOString();
    
    // Get the current user (if authenticated)
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    // Prepare the error log entry
    const errorLog = {
      timestamp,
      level: 'error',
      message: errorData.message || 'Unknown error',
      name: errorData.name || 'Error',
      stack: errorData.stack || null,
      component_stack: errorData.componentStack || null,
      context: {
        ...errorData,
        // Remove the fields we're storing at the top level
        message: undefined,
        name: undefined,
        stack: undefined,
        componentStack: undefined,
      },
      user_agent: userAgent,
      ip_address: ip,
      user_id: session?.user?.id || null,
      url: errorData.url || headers().get('referer') || 'unknown',
      environment: process.env.NODE_ENV,
    };
    
    // In a production environment, you would typically:
    // 1. Save the error to a database
    // 2. Send an alert to your monitoring system (e.g., Sentry, LogRocket, etc.)
    // 3. Notify the team if it's a critical error
    
    // For now, we'll just log it to the console and the server logs
    console.error('Client error reported:', errorLog);
    
    // If you're using a logging service, you'd send the error there
    // await logToService(errorLog);
    
    // Return a success response
    return NextResponse.json({ 
      success: true,
      message: 'Error reported successfully' 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error processing error report:', error);
    
    // Return an error response
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process error report',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Define the allowed HTTP methods
export const dynamic = 'force-dynamic';
export const methods = ['POST'];
