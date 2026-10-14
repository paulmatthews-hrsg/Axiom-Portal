interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

export async function triggeriPaaSWorkflow(event: string, data: Record<string, any>) {
  const MAKE_WEBHOOK_URL = import.meta.env.VITE_MAKE_WEBHOOK_URL;

  if (!MAKE_WEBHOOK_URL) {
    console.warn('iPaaS Webhook URL not configured. Action logged locally:', { event, data });
    return { success: false, reason: 'Missing webhook configuration' };
  }

  const payload: WebhookPayload & Record<string, unknown> = {
    event,
    timestamp: new Date().toISOString(),
    subject: data.subject ?? null,
    body_html: data.body_html ?? null,
    ...data,
    data: {
      ...data,
      subject: data.subject ?? null,
      body_html: data.body_html ?? null,
    },
  };

  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`iPaaS returned status ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to trigger iPaaS workflow:', error);
    return { success: false, error };
  }
}
