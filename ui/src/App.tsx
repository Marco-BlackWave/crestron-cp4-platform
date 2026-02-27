import { lazy, Suspense, type ReactNode } from "react";
import { HashRouter, Routes, Route } from "react-router";
import Shell from "./components/Shell";
import ConfigureLayout from "./components/ConfigureLayout";
import "./app.css";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const JoinMapPage = lazy(() => import("./pages/JoinMapPage"));
const RoomDetailPage = lazy(() => import("./pages/RoomDetailPage"));
const DeviceLibraryPage = lazy(() => import("./pages/DeviceLibraryPage"));
const DeviceDetailPage = lazy(() => import("./pages/DeviceDetailPage"));
const ScenesPage = lazy(() => import("./pages/ScenesPage"));
const JoinListEditorPage = lazy(() => import("./pages/JoinListEditorPage"));
const ConfigurePage = lazy(() => import("./pages/ConfigurePage"));
const WizardPage = lazy(() => import("./pages/WizardPage"));
const RoomsListPage = lazy(() => import("./pages/RoomsListPage"));
const RoomEditorPage = lazy(() => import("./pages/RoomEditorPage"));
const SourceManagerPage = lazy(() => import("./pages/SourceManagerPage"));
const SceneBuilderPage = lazy(() => import("./pages/SceneBuilderPage"));
const ScaffoldPage = lazy(() => import("./pages/ScaffoldPage"));
const ConfigureStudioPage = lazy(() => import("./pages/ConfigureStudioPage"));
const ExportPage = lazy(() => import("./pages/ExportPage"));
const DeployPage = lazy(() => import("./pages/DeployPage"));
const GettingStartedPage = lazy(() => import("./pages/GettingStartedPage"));
const ArchitecturePage = lazy(() => import("./pages/ArchitecturePage"));
const DeviceEditorPage = lazy(() => import("./pages/DeviceEditorPage"));
const PanelEmulatorPage = lazy(() => import("./pages/PanelEmulatorPage"));
const DebugPage = lazy(() => import("./pages/DebugPage"));
const LogicPlaygroundPage = lazy(() => import("./pages/LogicPlaygroundPage"));
const NetworkScanPage = lazy(() => import("./pages/NetworkScanPage"));
const ProjectOverviewPage = lazy(() => import("./pages/ProjectOverviewPage"));
const AgentGuidePage = lazy(() => import("./pages/AgentGuidePage"));
const XPanelFidelityPage = lazy(() => import("./pages/XPanelFidelityPage"));
const PrototypeStudioPage = lazy(() => import("./pages/PrototypeStudioPage"));
const BuilderAppPage = lazy(() => import("./pages/BuilderAppPage"));
const CrestronHomePage = lazy(() => import("./pages/CrestronHomePage"));

function withSuspense(node: ReactNode): ReactNode {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      {node}
    </Suspense>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="builder-app" element={withSuspense(<BuilderAppPage />)} />
        <Route path="crestron-home" element={withSuspense(<CrestronHomePage />)} />
        <Route element={<Shell />}>
          <Route index element={withSuspense(<ProjectOverviewPage />)} />
          <Route path="project" element={withSuspense(<ProjectOverviewPage />)} />
          <Route path="dashboard" element={withSuspense(<DashboardPage />)} />
          <Route path="joins" element={withSuspense(<JoinMapPage />)} />
          <Route path="rooms/:id" element={withSuspense(<RoomDetailPage />)} />
          <Route path="devices" element={withSuspense(<DeviceLibraryPage />)} />
          <Route path="devices/new" element={withSuspense(<DeviceEditorPage />)} />
          <Route path="devices/:id" element={withSuspense(<DeviceDetailPage />)} />
          <Route path="devices/:id/edit" element={withSuspense(<DeviceEditorPage />)} />
          <Route path="panel" element={withSuspense(<PanelEmulatorPage />)} />
          <Route path="debug" element={withSuspense(<DebugPage />)} />
          <Route path="validate" element={withSuspense(<DebugPage />)} />
          <Route path="logic" element={withSuspense(<LogicPlaygroundPage />)} />
          <Route path="code" element={withSuspense(<LogicPlaygroundPage />)} />
          <Route path="network" element={withSuspense(<NetworkScanPage />)} />
          <Route path="xpanel-fidelity" element={withSuspense(<XPanelFidelityPage />)} />
          <Route path="prototype-studio" element={withSuspense(<PrototypeStudioPage />)} />
          <Route path="architecture" element={withSuspense(<ArchitecturePage />)} />
          <Route path="scenes" element={withSuspense(<ScenesPage />)} />
          <Route path="joinlist" element={withSuspense(<JoinListEditorPage />)} />
          <Route path="getting-started" element={withSuspense(<GettingStartedPage />)} />
          <Route path="agent-guide" element={withSuspense(<AgentGuidePage />)} />
          <Route path="configure" element={<ConfigureLayout />}>
            <Route index element={withSuspense(<ConfigurePage />)} />
            <Route path="scaffold" element={withSuspense(<ScaffoldPage />)} />
            <Route path="studio" element={withSuspense(<ConfigureStudioPage />)} />
            <Route path="wizard" element={withSuspense(<WizardPage />)} />
            <Route path="rooms" element={withSuspense(<RoomsListPage />)} />
            <Route path="rooms/:id" element={withSuspense(<RoomEditorPage />)} />
            <Route path="sources" element={withSuspense(<SourceManagerPage />)} />
            <Route path="scenes" element={withSuspense(<SceneBuilderPage />)} />
            <Route path="export" element={withSuspense(<ExportPage />)} />
            <Route path="deploy" element={withSuspense(<DeployPage />)} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
}
