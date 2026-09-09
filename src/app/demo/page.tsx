import { redirect } from "next/navigation";

export const metadata = {
  title: "Judge path",
};

export default function DemoPage() {
  redirect("/judge");
}
