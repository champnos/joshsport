import { getBaseUrl } from "./site-url";

export function escapeEmailHtml(value: string | number) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function renderEmailLayout({
  previewText,
  bodyHtml,
}: {
  previewText?: string;
  bodyHtml: string;
}) {
  const logoUrl = new URL("/email-logo.png", getBaseUrl());
  logoUrl.protocol = "https:";
  const safePreview = previewText ? escapeEmailHtml(previewText) : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Maggy's Massage Therapy</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f2f4f7; color:#263238; font-family:Arial, Helvetica, sans-serif;">
    ${safePreview ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${safePreview}</div>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f4f7; border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; border-collapse:collapse; background-color:#ffffff;">
            <tr>
              <td style="padding:22px 28px; background-color:#003366; border-bottom:4px solid #d4a62d;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td width="120" valign="middle" style="width:120px; padding-right:16px;">
                      <img src="${escapeEmailHtml(logoUrl.toString())}" width="120" height="48" alt="MMT" style="display:block; width:120px; height:48px; border:0;">
                    </td>
                    <td valign="middle" style="color:#ffffff; font-size:20px; line-height:26px; font-weight:bold;">
                      Maggy's Massage Therapy
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px; font-size:16px; line-height:1.6; color:#374151;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px; background-color:#f8fafc; border-top:1px solid #e5e7eb; text-align:center; color:#5b6573; font-size:13px; line-height:1.6;">
                <strong style="color:#003366;">Josh Maggs | Maggy's Massage Therapy</strong><br>
                Bristol &amp; Bath &nbsp;|&nbsp;
                <a href="mailto:contact@maggsymassagetherapy.com" style="color:#003366; text-decoration:underline;">contact@maggsymassagetherapy.com</a>
                <br>
                <span style="font-size:11px; color:#7b8490;">This is an automated email from Maggy's Massage Therapy.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
