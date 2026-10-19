import Scoreboard from "@/app/components/Scoreboard";

export default function ScoreboardPage({ params }: { params: { slug: string } }) {
  return <Scoreboard slug={params.slug} />;
}
