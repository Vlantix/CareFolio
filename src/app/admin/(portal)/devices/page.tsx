import { PageHeader } from "@/components/ui/page-header";
import { DevicesList } from "@/components/devices-list";
import { getAuthState, requireAdmin } from "@/lib/auth";

export const metadata = { title: "Devices · Records office" };

// Staff version of the Devices page (same list, staff layout).
export default async function StaffDevicesPage({ searchParams }: PageProps<"/admin/devices">) {
  await requireAdmin();
  const { sessionId } = await getAuthState();
  const { error } = await searchParams;

  return (
    <main className="flex flex-col gap-4 px-5 pt-5 pb-6 md:max-w-3xl md:gap-6 md:px-10 md:py-8">
      <PageHeader title="Devices" backHref="/admin" backLabel="Back to request queue" />
      <DevicesList current={sessionId} error={error === "1"} />
    </main>
  );
}
