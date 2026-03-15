import type { Metadata } from "next";
import { MonitorShell } from "@/components/monitor/MonitorShell";

export const metadata: Metadata = {
  title: "WriteWhiz Monitor",
  robots: { index: false, follow: false },
};

export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MonitorShell>{children}</MonitorShell>;
}
