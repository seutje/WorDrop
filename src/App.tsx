import { useCallback, useState } from "react";
import { AppShell, type AppSection } from "./components/AppShell";
import { BackupPage } from "./pages/BackupPage";
import { ClosetPage } from "./pages/ClosetPage";
import { OutfitsPage } from "./pages/OutfitsPage";
import "./styles/global.css";

function App() {
  const [activeSection, setActiveSection] = useState<AppSection>("closet");
  const [outfitItemIds, setOutfitItemIds] = useState<string[]>([]);
  const [outfitId, setOutfitId] = useState<string>();
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
      setOutfitId(undefined);
      setOutfitRequestKey((key) => key + 1);
    }
    setActiveSection(section);
  }
  function startOutfit(itemIds: string[]) {
    setOutfitItemIds(itemIds);
    setOutfitId(undefined);
    setOutfitRequestKey((key) => key + 1);
    setActiveSection("outfits");
  }
  function openOutfit(id: string) {
    setOutfitItemIds([]);
    setOutfitId(id);
    setOutfitRequestKey((key) => key + 1);
    setActiveSection("outfits");
  }

  return (
    <AppShell activeSection={activeSection} onNavigate={navigate}>
      {activeSection === "closet" ? (
        <ClosetPage onStartOutfit={startOutfit} onOpenOutfit={openOutfit} />
      ) : activeSection === "outfits" ? (
        <OutfitsPage
          key={outfitRequestKey}
          initialItemIds={outfitItemIds}
          initialOutfitId={outfitId}
          onDirtyChange={handleDirtyChange}
        />
      ) : (
        <BackupPage />
      )}
    </AppShell>
  );
}

export default App;
