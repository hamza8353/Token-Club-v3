import React from 'react';

interface LogoProps {
  isNetworkSwitched?: boolean;
}

export const Logo = React.memo<LogoProps>(({ isNetworkSwitched = false }) => (
  <div className="flex flex-col leading-none select-none">
    <span className="text-xl md:text-3xl font-black tracking-tighter text-teal-400 drop-shadow-[0_0_15px_rgba(45,212,191,0.4)]">
      token
    </span>
    <span className="text-xl md:text-3xl font-black tracking-tighter text-blue-400 ml-0.5 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]">
      club<span className={isNetworkSwitched ? "text-gray-400" : "text-white"}>.</span>
    </span>
  </div>
));
Logo.displayName = 'Logo';

