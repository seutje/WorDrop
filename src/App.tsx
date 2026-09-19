import { useState } from "react";
import { AppShell, type AppSection } from "./components/AppShell";
import { ClosetPage } from "./pages/ClosetPage";
import { OutfitsPage } from "./pages/OutfitsPage";
import "./styles/global.css";

function App() {
  const [activeSection, setActiveSection] = useState<AppSection>("closet");

  return (
    <AppShell activeSection={activeSection} onNavigate={setActiveSection}>
      {activeSection === "closet" ? <ClosetPage /> : <OutfitsPage />}
    </AppShell>
  );
}

export default App;
