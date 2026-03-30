import React from 'react';
import HomeHeroCinematic from '@/components/home/HomeHeroCinematic';
import HomeContentRail from '@/components/home/HomeContentRail';

/**
 * Zip parity: hero + five rails only, cinematic background.
 */
const Home: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-background pb-8 md:pb-12 font-inter">
      <HomeHeroCinematic />
      <div className="relative z-10 space-y-8 sm:space-y-12 pb-6 sm:pb-12 pt-4 sm:pt-8">
        <HomeContentRail title="İzlemeye Devam Et" type="continue" />
        <HomeContentRail title="Yeni Bölümler" type="new" />
        <HomeContentRail title="Top 10" type="trending" />
        <HomeContentRail title="Senin İçin Önerilenler" type="recommended" />
        <HomeContentRail title="Listem" type="list" />
      </div>
    </div>
  );
};

export default Home;
