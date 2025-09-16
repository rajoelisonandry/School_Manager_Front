// components/Header.tsx
interface HeaderProps {
  username: string;
}

export default function Header({ username }: HeaderProps) {
  return (
    <header className="flex justify-between items-center p-4 bg-[var(--custom_green)] border-b">
      <h2 className="text-lg font-semibold">Bienvenue, {username}</h2>
      <div className="text-2xl">👤</div>
    </header>
  );
}
