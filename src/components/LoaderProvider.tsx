'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoaderContextType {
    showLoader: () => void;
    hideLoader: () => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export function LoaderProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);

    const showLoader = () => setIsLoading(true);
    const hideLoader = () => setIsLoading(false);

    return (
        <LoaderContext.Provider value={{ showLoader, hideLoader }}>
            {children}
            {isLoading && (
                <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#070B14]/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-24 h-24">
                        {/* Outer Ring */}
                        <div className="absolute inset-0 border-4 border-[#003875]/20 rounded-full"></div>
                        {/* Animated Ring */}
                        <div className="absolute inset-0 border-4 border-t-[#FFD500] border-r-[#FFD500] rounded-full animate-spin"></div>
                        {/* Inner Pulse */}
                        <div className="absolute inset-4 bg-[#003875] rounded-full animate-pulse flex items-center justify-center shadow-lg shadow-[#FFD500]/20">
                           <img src="/logo_compact.png" alt="R" className="w-8 h-8 object-contain opacity-50" />
                        </div>
                    </div>
                    <div className="mt-8 text-white font-black tracking-widest text-xs uppercase animate-pulse">
                        Synchronizing System...
                    </div>
                </div>
            )}
        </LoaderContext.Provider>
    );
}

export function useLoader() {
    const context = useContext(LoaderContext);
    if (!context) throw new Error('useLoader must be used within LoaderProvider');
    return context;
}
