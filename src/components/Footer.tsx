export default function Footer() {
  return (
    <footer className="bg-gray-100 p-4 border-t text-sm text-center text-gray-500">
      <div className="flex justify-around flex-wrap gap-4">
        <div>
          <strong>📧</strong> <a href="mailto:lyceeaubelenfant@gmail.com">lyceeaubelenfant@gmail.com</a>
        </div>
        <div>
          <strong>📞</strong> +261 34 03 322 78
        </div>
        <div>
          <strong>📍</strong> 077 B 96 Ambohibao Antehiroka, Antananarivo, Madagascar
        </div>
      </div>
      <p className="mt-4">© 2025 Au Bel Enfant. Tous droits réservés.</p>
    </footer>
  );
}