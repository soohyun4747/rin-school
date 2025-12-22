import { Resend } from "resend";

type EmailParams = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendEmail({ to, subject, text, html }: EmailParams) {
  if (!resendClient) {
    console.warn("[email] RESEND_API_KEY is not set. Skipping email send.", {
      to,
      subject,
    });
    return;
  }

  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) return;

  await resendClient.emails.send({
    from: "RIN School <no-reply@updates.rinschool.com>",
    to: recipients,
    subject,
    text,
    html,
  });
}
