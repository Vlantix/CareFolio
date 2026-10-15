import { PageHeader } from "@/components/ui/page-header";
import { DevicesList } from "@/components/devices-list";
import { getAuthState, requireMember } from "@/lib/auth";

export const metadata = { title: "Devices · CareFolio" };

// No design file for this screen; it is built from the shared blocks
// (PageHeader, Card, Button) in the style of design/MFamily.html.
export default async function SessionsPage({ searchParams }: PageProps<"/profile/sessions">) {
  await requireMember();
  const { sessionId } = await getAuthState();
  const { error } = await searchParams;

  return (
    <main className="flex flex-col gap-4 px-5 pt-5 pb-6 md:max-w-3xl md:gap-6 md:px-10 md:py-8">
      <PageHeader title="Devices" backHref="/home" backLabel="Back to home" />
      <DevicesList current={sessionId} error={error === "1"} />
    </main>
  );
}
