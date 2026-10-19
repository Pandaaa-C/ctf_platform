import AuthForm from "@/app/components/AuthForm";

export default function Login({ params }: { params: { slug: string } }) {
  return <AuthForm slug={params.slug} mode="login" />;
}
