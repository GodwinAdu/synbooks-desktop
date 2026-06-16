/**
 * Projects Page
 * Uses internal Routes for dashboard and detail views.
 */

import { Routes, Route } from "react-router-dom";
import { ProjectsDashboard } from "./components/projects-dashboard";
import { ProjectDetail } from "./components/project-detail";

export function ProjectsPage() {
  return (
    <Routes>
      <Route index element={<ProjectsDashboard />} />
      <Route path=":id" element={<ProjectDetail />} />
    </Routes>
  );
}
