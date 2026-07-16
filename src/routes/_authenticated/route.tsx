import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: isStoryteller } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "storyteller",
    });
    if (!isStoryteller) {
      const { data: characters } = await supabase
        .from("characters")
        .select("id")
        .eq("owner_id", data.user.id);
      if (!characters?.length) throw redirect({ to: "/" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
