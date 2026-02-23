import { useState } from "react";
import { HashRouter, Routes, Route } from "react-router";
import { ApiKeyContext } from "./hooks/useApiKey";
import Shell from "./components/Shell";
import ConfigureLayout from "./components/ConfigureLayout";
import DashboardPage from "./pages/DashboardPage";
import JoinMapPage from "./pages/JoinMapPage";
import RoomDetailPage from "./pages/RoomDetailPage";
import DeviceLibraryPage from "./pages/DeviceLibraryPage";
import DeviceDetailPage from "./pages/DeviceDetailPage";
import ScenesPage from "./pages/ScenesPage";
import JoinListEditorPage from "./pages/JoinListEditorPage";
import ConfigurePage from "./pages/ConfigurePage";
import WizardPage from "./pages/WizardPage";
import RoomsListPage from "./pages/RoomsListPage";
import RoomEditorPage from "./pages/RoomEditorPage";
import SourceManagerPage from "./pages/SourceManagerPage";
import SceneBuilderPage from "./pages/SceneBuilderPage";
import ExportPage from "./pages/ExportPage";
import "./app.css";

export default function App() {
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem("joinlist-api-key") ?? ""
  );

  const handleSetApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("joinlist-api-key", key);
  };

  return (
    <ApiKeyContext value={{ apiKey, setApiKey: handleSetApiKey }}>
      <HashRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="joins" element={<JoinMapPage />} />
            <Route path="rooms/:id" element={<RoomDetailPage />} />
            <Route path="devices" element={<DeviceLibraryPage />} />
            <Route path="devices/:id" element={<DeviceDetailPage />} />
            <Route path="scenes" element={<ScenesPage />} />
            <Route path="joinlist" element={<JoinListEditorPage />} />
            <Route path="configure" element={<ConfigureLayout />}>
              <Route index element={<ConfigurePage />} />
              <Route path="wizard" element={<WizardPage />} />
              <Route path="rooms" element={<RoomsListPage />} />
              <Route path="rooms/:id" element={<RoomEditorPage />} />
              <Route path="sources" element={<SourceManagerPage />} />
              <Route path="scenes" element={<SceneBuilderPage />} />
              <Route path="export" element={<ExportPage />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </ApiKeyContext>
  );
}
