
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/auth';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import GlobalLoader from './components/GlobalLoader';
import WelcomeModal from './components/WelcomeModal';
import FeedbackCard from './components/FeedbackCard';
import FeedbackFloatingButton from './components/FeedbackFloatingButton';
import AnnouncementBanner from './components/AnnouncementBanner';
import { ToastProvider } from './components/ToastProvider';

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
import AdminFeedback from './pages/AdminFeedback';
import AdminMascotSettings from './pages/AdminMascotSettings';
import AdminAnnouncement from './pages/AdminAnnouncement';
import AdminErrors from './pages/AdminErrors';
import AdminAutomation from './pages/AdminAutomation';
import AnimeDetail from './pages/AnimeDetail';
import Watch from './pages/Watch';
import WatchSlug from './pages/WatchSlug';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import Legal from './pages/Legal';
import AuthCallback from './pages/AuthCallback';
import UpdatePassword from './pages/UpdatePassword';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Minimal boot delay so UI doesn't flash; content shows as soon as possible
    const timer = setTimeout(() => setIsLoading(false), 150);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <GlobalLoader />;

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AnnouncementBanner />
          <WelcomeModal />
          <FeedbackCard />
          <FeedbackFloatingButton />
          <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/new-episodes" element={<NewEpisodes />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/anime/:id" element={<AnimeDetail />} />
            {/* Watch page - slug-based routing only */}
            <Route path="/watch/:animeSlug/:seasonNumber/:episodeNumber" element={<WatchSlug />} />
            {/* Backward compatibility: redirect old UUID-based URLs to slug format */}
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
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/update-password" element={<UpdatePassword />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Admin />} />
            <Route path="animes" element={<AdminAnimes />} />
            <Route path="animes/new" element={<AdminAnimeEdit />} />
            <Route path="animes/:id/edit" element={<AdminAnimeEdit />} />
            <Route path="episodes" element={<Navigate to="/admin/animes" replace />} />
            <Route path="episodes/:animeId" element={<AdminEpisodes />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="import" element={<AdminAutoImport />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="feedback" element={<AdminFeedback />} />
            <Route path="site-settings/mascots" element={<AdminMascotSettings />} />
            <Route path="announcement" element={<AdminAnnouncement />} />
            <Route path="errors" element={<AdminErrors />} />
            <Route path="automation" element={<AdminAutomation />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
