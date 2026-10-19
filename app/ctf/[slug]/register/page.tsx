import AuthForm from "@/app/components/AuthForm";

export default function Register({ params }: { params: { slug: string } }) {
  return <AuthForm slug={params.slug} mode="register" />;
}
