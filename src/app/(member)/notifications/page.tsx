import { NotificationList } from "@/components/notification-list";
import { requireMember } from "@/lib/auth";

export const metadata = { title: "Notifications · CareFolio" };

// design/MNotifications.html
export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  await requireMember();
  const { error } = await searchParams;
  return <NotificationList backHref="/home" error={error === "1"} />;
}
