import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/app/actions/logout";

// Placeholder until ticket 06 builds the request queue (design/AQueue.html).
export default async function AdminHome() {
  const profile = await requireAdmin();

  return (
    <main className="cf-enter flex flex-col gap-6 px-5 py-6 md:px-10 md:py-8">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Records office</span>
        <h1 className="font-heading text-[30px] font-bold tracking-[-0.02em]">
          Hello, {profile.full_name}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Request queue</CardTitle>
          <CardDescription>
            Lab result requests will appear here once ticket 06 is built.
          </CardDescription>
        </CardHeader>
        <CardContent className="md:hidden">
          <form action={logout}>
            <input type="hidden" name="to" value="staff" />
            <button type="submit" className="min-h-11 font-semibold text-primary">
              Log out
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
