import { restInsert } from "./supabase/rest";

export type EmailRecipient = {
  email: string;
  name?: string;
};

export type EmailBatchInput = {
  subject: string;
  body: string;
  created_by: string;
  recipients: EmailRecipient[];
};

async function sendViaResend(batch: EmailBatchInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "RinSchool <no-reply@rinschool.app>",
      to: batch.recipients.map((r) => r.email),
      subject: batch.subject,
      html: batch.body,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${message}`);
  }
}

async function callEdgeFunction(batch: EmailBatchInput) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Edge function call requires SUPABASE_URL and service role key");
  }

  const response = await fetch(`${url}/functions/v1/send-match-emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(batch),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Edge function request failed: ${response.status} ${message}`);
  }
}

async function logEmailBatch(batch: EmailBatchInput, status: string, error?: string) {
  await restInsert("email_batches", {
    subject: batch.subject,
    body: batch.body,
    status,
    created_by: batch.created_by,
    error_message: error,
  });
}

export async function sendMatchEmails(batch: EmailBatchInput) {
  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(batch);
    } else {
      await callEdgeFunction(batch);
    }
    await logEmailBatch(batch, "sent");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await logEmailBatch(batch, "failed", message);
    throw error;
  }
}
