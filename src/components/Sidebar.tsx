// components/Sidebar.js
export default function Sidebar() {
  return (
    <aside className="w-64 bg-[var(--custom_green)] h-full flex flex-col justify-between p-4">
      <div>
        <div className="mb-6">
          <img src="/assets/logo.png" alt="Logo" className="w-40 mx-auto" />
        </div>
        <nav className="space-y-4">
          <button className="flex items-center gap-2 text-left hover:text-blue-600">
            📋 Liste des élèves
          </button>
          <button className="flex items-center gap-2 text-left hover:text-blue-600">
            💳 Paiements
          </button>
          <button className="flex items-center gap-2 text-left hover:text-blue-600">
            📝 Inscriptions
          </button>
          <button className="flex items-center gap-2 text-left hover:text-blue-600">
            🔁 Réinscriptions
          </button>
          <button className="flex items-center gap-2 text-left hover:text-blue-600">
            📊 Bilan
          </button>
        </nav>
      </div>
      <div className="space-y-2">
        <button className="flex items-center gap-2 text-left text-sm hover:text-blue-600">
          ⚙️ Configuration
        </button>
        <button className="flex items-center gap-2 text-left text-sm hover:text-blue-600">
          👤 Utilisateurs
        </button>
      </div>
    </aside>
  );
}