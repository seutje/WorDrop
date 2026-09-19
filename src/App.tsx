import { useCallback, useState } from "react";
import { AppShell, type AppSection } from "./components/AppShell";
import { ClosetPage } from "./pages/ClosetPage";
import { OutfitsPage } from "./pages/OutfitsPage";
import "./styles/global.css";

function App() {
  const [activeSection, setActiveSection] = useState<AppSection>("closet");
  const [outfitItemIds, setOutfitItemIds] = useState<string[]>([]);
  const [outfitRequestKey, setOutfitRequestKey] = useState(0);
  const [outfitDirty, setOutfitDirty] = useState(false);
  const handleDirtyChange = useCallback(
    (dirty: boolean) => setOutfitDirty(dirty),
    [],
  );
  function navigate(section: AppSection) {
    if (
      section !== activeSection &&
      activeSection === "outfits" &&
      outfitDirty &&
      !window.confirm("Discard your unsaved outfit changes?")
    )
      return;
    if (section === "outfits" && activeSection !== "outfits") {
      setOutfitItemIds([]);
      setOutfitRequestKey((key) => key + 1);
    }
    setActiveSection(section);
  }
  function startOutfit(itemIds: string[]) {
    setOutfitItemIds(itemIds);
    setOutfitRequestKey((key) => key + 1);
    setActiveSection("outfits");
  }

  return (
    <AppShell activeSection={activeSection} onNavigate={navigate}>
      {activeSection === "closet" ? (
        <ClosetPage onStartOutfit={startOutfit} />
      ) : (
        <OutfitsPage
          key={outfitRequestKey}
          initialItemIds={outfitItemIds}
          onDirtyChange={handleDirtyChange}
        />
      )}
    </AppShell>
  );
}

export default App;
