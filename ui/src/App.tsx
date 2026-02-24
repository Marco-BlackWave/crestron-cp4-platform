import { HashRouter, Routes, Route } from "react-router";
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
import DeployPage from "./pages/DeployPage";
import GettingStartedPage from "./pages/GettingStartedPage";
import ArchitecturePage from "./pages/ArchitecturePage";
import DeviceEditorPage from "./pages/DeviceEditorPage";
import PanelEmulatorPage from "./pages/PanelEmulatorPage";
import DebugPage from "./pages/DebugPage";
import LogicPlaygroundPage from "./pages/LogicPlaygroundPage";
import NetworkScanPage from "./pages/NetworkScanPage";
import "./app.css";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<DashboardPage />} />
          <Route path="joins" element={<JoinMapPage />} />
          <Route path="rooms/:id" element={<RoomDetailPage />} />
          <Route path="devices" element={<DeviceLibraryPage />} />
          <Route path="devices/new" element={<DeviceEditorPage />} />
          <Route path="devices/:id" element={<DeviceDetailPage />} />
          <Route path="devices/:id/edit" element={<DeviceEditorPage />} />
          <Route path="panel" element={<PanelEmulatorPage />} />
          <Route path="debug" element={<DebugPage />} />
          <Route path="logic" element={<LogicPlaygroundPage />} />
          <Route path="network" element={<NetworkScanPage />} />
          <Route path="architecture" element={<ArchitecturePage />} />
          <Route path="scenes" element={<ScenesPage />} />
          <Route path="joinlist" element={<JoinListEditorPage />} />
          <Route path="getting-started" element={<GettingStartedPage />} />
          <Route path="configure" element={<ConfigureLayout />}>
            <Route index element={<ConfigurePage />} />
            <Route path="wizard" element={<WizardPage />} />
            <Route path="rooms" element={<RoomsListPage />} />
            <Route path="rooms/:id" element={<RoomEditorPage />} />
            <Route path="sources" element={<SourceManagerPage />} />
            <Route path="scenes" element={<SceneBuilderPage />} />
            <Route path="export" element={<ExportPage />} />
            <Route path="deploy" element={<DeployPage />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
}
