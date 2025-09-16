import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function HomePage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header username="Rajoelison" />
        <main className="flex-1 bg-white p-6">
          {/* Content Here */}
        </main>
        <Footer />
      </div>
    </div>
  );
}