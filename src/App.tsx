import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/MapPage";
import ValidationPage from "./pages/ValidationPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/peta" element={<MapPage />} />
            <Route
              path="/tw-1"
              element={
                <ValidationPage
                  quarter="tw-1"
                  title="Validasi Triwulan I"
                  subtitle="Periode Januari – Maret"
                />
              }
            />
            <Route
              path="/tw-2"
              element={
                <ValidationPage
                  quarter="tw-2"
                  title="Validasi Triwulan II"
                  subtitle="Periode April – Juni"
                />
              }
            />
            <Route
              path="/tw-3"
              element={
                <ValidationPage
                  quarter="tw-3"
                  title="Validasi Triwulan III"
                  subtitle="Periode Juli – September"
                />
              }
            />
            <Route
              path="/tw-4"
              element={
                <ValidationPage
                  quarter="tw-4"
                  title="Validasi Triwulan IV"
                  subtitle="Periode Oktober – Desember"
                />
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
