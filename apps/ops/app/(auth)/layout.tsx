export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-body px-4 py-10 text-primary sm:px-6">
      {children}
    </div>
  );
}
