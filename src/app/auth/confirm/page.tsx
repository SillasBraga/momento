import { ConfirmSession } from "./session";

export default function ConfirmPage() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY.");
  return <ConfirmSession url={url} publishableKey={publishableKey} />;
}
