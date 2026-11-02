import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MarketDataProvider } from "./state/MarketData.jsx";
import Layout from "./components/Layout.jsx";
import Overview from "./pages/Overview.jsx";
import Skeleton from "./components/Skeleton.jsx";

// pages with heavy stuff (charts, the model) are loaded only when visited
const Stock = lazy(() => import("./pages/Stock.jsx"));
const Watchlist = lazy(() => import("./pages/Watchlist.jsx"));
const Portfolio = lazy(() => import("./pages/Portfolio.jsx"));
const News = lazy(() => import("./pages/News.jsx"));
const Alerts = lazy(() => import("./pages/Alerts.jsx"));
const Insights = lazy(() => import("./pages/Insights.jsx"));
const Model = lazy(() => import("./pages/Model.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

function Loading() {
  return (
    <div style={{ paddingTop: 24 }}>
      <Skeleton h={28} w={220} />
      <Skeleton h={320} style={{ marginTop: 18 }} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MarketDataProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Overview />} />
              <Route path="stock/:symbol" element={<Stock />} />
              <Route path="watchlist" element={<Watchlist />} />
              <Route path="portfolio" element={<Portfolio />} />
              <Route path="news" element={<News />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="insights" element={<Insights />} />
              <Route path="model" element={<Model />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </MarketDataProvider>
    </BrowserRouter>
  );
}
