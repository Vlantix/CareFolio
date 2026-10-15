import { NotificationList } from "@/components/notification-list";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Notifications · Records office" };

export default async function StaffNotificationsPage({ searchParams }: PageProps<"/admin/notifications">) {
  await requireAdmin();
  const { error } = await searchParams;
  return <NotificationList backHref="/admin" error={error === "1"} />;
}
