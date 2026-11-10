import type { SVGProps } from "react";

type IconName = "garage" | "plus" | "list" | "signout" | "collapse";
const paths: Record<IconName, React.ReactNode> = {
  garage: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M8 21v-7h8v7"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
  signout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h7v18h-7"/></>,
  collapse: <><path d="m14 7-5 5 5 5"/><path d="M20 4v16"/></>,
};

export function NavIcon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name]}</svg>;
}
