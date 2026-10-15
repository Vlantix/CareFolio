import { Logo } from "@/components/ui/logo";

/**
 * The teal left-hand panel on the desktop log in and sign up screens
 * (design/DLogin.html, DSignup.html). Hidden on phones, where the
 * designs show the form alone.
 */
export function BrandPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden flex-[1_1_440px] flex-col gap-8 bg-primary p-14 text-white lg:flex">
      <Logo variant="dark" size="lg" />
      <div className="grow" />
      {children}
    </div>
  );
}
