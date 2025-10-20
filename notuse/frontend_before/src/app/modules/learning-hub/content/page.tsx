import { LEARNING_HUB_FIELDS } from "@/lib/constants";
import { LearningHubContentView } from "./LearningHubContentView";

type PageProps = {
  searchParams?: { category?: string };
};

const allFields = LEARNING_HUB_FIELDS as readonly string[];

export default function LearningHubContentPage({ searchParams }: PageProps) {
  const rawCategory = searchParams?.category;
  const categoryParam = Array.isArray(rawCategory) ? rawCategory[0] ?? "" : rawCategory ?? "";

  const initialField = allFields.includes(categoryParam)
    ? (categoryParam as (typeof LEARNING_HUB_FIELDS)[number])
    : LEARNING_HUB_FIELDS[0];

  return <LearningHubContentView initialField={initialField} />;
}
