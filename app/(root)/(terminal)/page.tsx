import TerminalClient from "@/components/dashboard/TerminalClient";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { searchStocks } from "@/lib/actions/finnhub.actions";

export default async function TerminalPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };

  const initialStocks = await searchStocks();

  return (
    <TerminalClient user={user} initialStocks={initialStocks} />
  );
}

export const dynamic = 'force-dynamic';
