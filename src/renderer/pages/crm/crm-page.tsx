/**
 * CRM Module Page
 * Tabbed view: Contacts, Deals, Pipeline
 * Matches the Next.js app navigation structure.
 */

import { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactsTab } from "./components/contacts-tab";
import { DealsTab } from "./components/deals-tab";
import { PipelineTab } from "./components/pipeline-tab";

export function CRMPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = location.pathname.includes("/crm/deals")
    ? "deals"
    : location.pathname.includes("/crm/pipeline")
      ? "pipeline"
      : "contacts";

  return (
    <div className="p-6 space-y-6">
      <Heading title="CRM" description="Manage contacts, deals, and sales pipeline" />
      <Separator />

      <Tabs value={currentTab} onValueChange={(v) => navigate(v === "contacts" ? "/crm" : `/crm/${v}`)}>
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>
      </Tabs>

      <Routes>
        <Route index element={<ContactsTab />} />
        <Route path="deals" element={<DealsTab />} />
        <Route path="pipeline" element={<PipelineTab />} />
      </Routes>
    </div>
  );
}
