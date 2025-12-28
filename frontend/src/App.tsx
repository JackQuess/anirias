
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/auth';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import GlobalLoader from './components/GlobalLoader';

// Pages
import Home from './pages/Home';
import Browse from './pages/Browse';
import NewEpisodes from './pages/NewEpisodes';
import Calendar from './pages/Calendar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Admin from './pages/Admin';
import AdminAnimes from './pages/AdminAnimes';
import AdminAnimeEdit from './pages/AdminAnimeEdit';
import AdminEpisodes from './pages/AdminEpisodes';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminUsers from './pages/AdminUsers';
import AdminAutoImport from './pages/AdminAutoImport';
import AdminCalendar from './pages/AdminCalendar';
import AnimeDetail from './pages/AnimeDetail';
import Watch from './pages/Watch';
import WatchSlug from './pages/WatchSlug';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import Legal from './pages/Legal';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial asset loading / "booting"
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <GlobalLoader />;

  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/new-episodes" element={<NewEpisodes />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/anime/:id" element={<AnimeDetail />} />
            <Route path="/watch/:animeSlug/:seasonNumber/:episodeNumber" element={<WatchSlug />} />
            <Route path="/watch/:animeId" element={<Watch />} />
            <Route path="/watch/:animeId/:episodeId" element={<Watch />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* Legal Pages */}
            <Route path="/hakkimizda" element={<Legal />} />
            <Route path="/gizlilik" element={<Legal />} />
            <Route path="/iletisim" element={<Legal />} />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Admin />} />
            <Route path="animes" element={<AdminAnimes />} />
            <Route path="animes/:id/edit" element={<AdminAnimeEdit />} />
            <Route path="episodes/:animeId" element={<AdminEpisodes />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="import" element={<AdminAutoImport />} />
            <Route path="calendar" element={<AdminCalendar />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
