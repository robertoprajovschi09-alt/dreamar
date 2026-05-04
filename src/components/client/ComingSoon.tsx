import { EmptyState } from "@/components/EmptyState";
import { Construction } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return <EmptyState icon={Construction} title={title} description={description} />;
}
