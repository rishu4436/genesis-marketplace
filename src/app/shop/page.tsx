import { redirect } from "next/navigation";

export const metadata = {
  title: "Hire",
  description: "Hire a By Genesis specialist — one path, four jobs.",
};

export default function ShopRedirect() {
  redirect("/hire");
}
