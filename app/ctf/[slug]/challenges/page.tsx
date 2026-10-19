import Board from "@/app/components/Board";

export default function ChallengesPage({ params }: { params: { slug: string } }) {
  return <Board slug={params.slug} />;
}
