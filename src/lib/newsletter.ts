import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewsletterEmail } from "@/lib/email";

type NewsletterInput = {
  subject: string;
  headline: string;
  lines: string[];
  ctaPath?: string;
};

const PAGE_SIZE = 1000;

export async function getRegisteredEmails() {
  const supabase = createAdminClient();
  const emails = new Set<string>();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });

    if (error) throw error;

    for (const user of data.users) {
      const email = user.email?.trim().toLowerCase();
      if (email) emails.add(email);
    }

    if (data.users.length < PAGE_SIZE) break;
    page += 1;
  }

  return Array.from(emails).sort();
}

export async function notifyRegisteredUsers(input: NewsletterInput) {
  try {
    const recipients = await getRegisteredEmails();

    if (!recipients.length) {
      console.warn("[newsletter] skipped: no registered emails found");
      return { skipped: true, sent: false, recipients: 0, error: "no registered emails found" };
    }

    return await sendNewsletterEmail({ ...input, recipients });
  } catch (error) {
    const message = error instanceof Error && error.message.trim() ? error.message : "unknown newsletter error";
    console.error(`[newsletter] send failed: ${message}`);
    return { skipped: false, sent: false, recipients: 0, error: message };
  }
}
