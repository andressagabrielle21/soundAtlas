import { AuthForm } from "../../components/auth-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmacao?: string }>;
}) {
  const { confirmacao } = await searchParams;
  return (
    <AuthForm mode="sign-in" confirmationFailed={confirmacao === "erro"} />
  );
}
