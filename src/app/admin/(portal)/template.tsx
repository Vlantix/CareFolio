// Every page in this area enters with a 0.4s fade + 10px rise
// (design/README.md; .cf-enter in globals.css, off under reduced motion).
// A template re-mounts on each page change, so the fade replays — but
// it sits INSIDE the area's layout, so the sidebar, menus and idle timer
// are not rebuilt on every click.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="cf-enter flex min-h-full flex-1 flex-col">{children}</div>;
}
