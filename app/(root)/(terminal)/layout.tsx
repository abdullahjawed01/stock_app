import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const TerminalLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) redirect('/sign-in');

  return (
    <div className="w-full h-screen overflow-hidden bg-[#07080a] text-gray-100 flex flex-col">
      {children}
    </div>
  );
};

export default TerminalLayout;
