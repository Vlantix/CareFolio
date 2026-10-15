import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputField } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { Sidebar } from "@/components/ui/sidebar";
import { BottomNav } from "@/components/ui/bottom-nav";

// A page for checking the UI building blocks against design/*.html.
// Not linked from anywhere. Delete it once the real screens exist.
export const metadata = { robots: { index: false } };

export default function Preview() {
  return (
    <div className="flex min-h-full flex-1">
      <Sidebar menu="member" />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="cf-enter flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 py-5 md:px-10 md:py-8">
          <PageHeader title="UI building blocks" backHref="/" backLabel="Back to start" />

          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-6">
              <Logo />
              <Logo size="lg" />
              <span className="rounded-field bg-navy p-4">
                <Logo variant="dark" />
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Decline</Button>
                <Button disabled>Disabled</Button>
              </div>
              <Button size="lg">Submit request</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form fields</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <InputField id="p-email" label="Email address" type="email" placeholder="you@example.com" />
              <InputField id="p-test" label="Which test or date?" hint="For example: HbA1c — Sept 2026" />
              <InputField id="p-bad" label="Password" type="password" error="That password is incorrect." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request statuses</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {(["submitted", "approved", "declined", "released"] as const).map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-3 rounded-tile border border-border bg-card p-3.5"
                >
                  <span className="flex flex-1 flex-col gap-[3px]">
                    <span className="text-[15px] font-bold">Lab result — HbA1c</span>
                    <span className="text-[13px] text-muted-foreground">REQ-0001</span>
                  </span>
                  <StatusChip status={s} />
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
        <BottomNav menu="member" />
      </div>
    </div>
  );
}
