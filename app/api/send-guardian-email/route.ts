import { NextResponse } from "next/server";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST(request: Request) {
  if (!resend) {
    return NextResponse.json({ error: "이메일 발송 설정이 되어 있지 않습니다." }, { status: 500 });
  }

  const { guardianEmail, studentName, confirmUrl } = await request.json();

  if (!guardianEmail || !confirmUrl) {
    return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
  }

  const subject = "보호자 동의 요청";
  const body = `안녕하세요,

학생 ${studentName ?? ""}의 서비스 이용을 위해 보호자 동의가 필요합니다.
아래 버튼을 눌러 동의해 주세요.

${confirmUrl}
`;

  try {
    await resend.emails.send({
      from: "Lean School <no-reply@leanschool.app>",
      to: guardianEmail,
      subject,
      text: body,
      html: `
        <div style="font-family: Pretendard, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h1 style="font-size: 20px; margin: 0 0 12px; color: #0f172a;">보호자 동의 요청</h1>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">학생 <strong>${studentName ?? ""}</strong>의 서비스 이용을 위해 보호자 동의가 필요합니다. 아래 버튼을 눌러 동의해 주세요.</p>
          <a href="${confirmUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">동의하기</a>
          <p style="font-size: 12px; color: #64748b; margin-top: 16px;">버튼이 동작하지 않으면 아래 링크를 복사해 브라우저에 붙여넣기 해주세요.<br /><code style="color: #0ea5e9;">${confirmUrl}</code></p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send guardian email", error);
    return NextResponse.json({ error: "이메일 발송에 실패했습니다." }, { status: 500 });
  }
}
