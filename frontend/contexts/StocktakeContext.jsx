import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * StocktakeContext - Global context to track active full stocktake state
 * 
 * When a Full Stocktake is IN_PROGRESS, operations are locked.
 * This context provides the lockdown state to the entire app.
 */

const StocktakeContext = createContext({
    activeStocktake: null,
    isLocked: false,
    refreshStatus: () => { },
    loading: true
});

// eslint-disable-next-line react-refresh/only-export-components
export const useStocktake = () => useContext(StocktakeContext);

export const StocktakeProvider = ({ children }) => {
    const [activeStocktake, setActiveStocktake] = useState(null);
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);

    const refreshStatus = useCallback(async () => {
        try {
            const response = await axios.get('/api/stocktake/lockdown-status');
            const { isLocked: locked, activeStocktake: stocktake } = response.data;
            setIsLocked(locked);
            setActiveStocktake(stocktake);
        } catch {
            // If endpoint doesn't exist yet, check for active full stocktakes manually
            try {
                const response = await axios.get('/api/stocktake?status=IN_PROGRESS&limit=10');
                const stocktakes = response.data.data || [];
                // Find any full stocktake (not cycle count)
                const fullStocktake = stocktakes.find(s => !s.count_type || s.count_type === 'full');
                setIsLocked(!!fullStocktake);
                setActiveStocktake(fullStocktake || null);
            } catch (err) {
                console.error('Error checking stocktake status:', err);
                setIsLocked(false);
                setActiveStocktake(null);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch and periodic refresh
    useEffect(() => {
        const abortController = new AbortController();

        const fetchStatus = async () => {
            try {
                const response = await axios.get('/api/stocktake/lockdown-status', {
                    signal: abortController.signal
                });
                const { isLocked: locked, activeStocktake: stocktake } = response.data;
                setIsLocked(locked);
                setActiveStocktake(stocktake);
            } catch (err) {
                // Ignore aborted requests (component unmounted)
                if (axios.isCancel(err) || err.code === 'ERR_CANCELED' || err.name === 'CanceledError') {
                    return;
                }
                // If endpoint doesn't exist yet, check for active full stocktakes manually
                try {
                    const fallbackResponse = await axios.get('/api/stocktake?status=IN_PROGRESS&limit=10', {
                        signal: abortController.signal
                    });
                    const stocktakes = fallbackResponse.data.data || [];
                    const fullStocktake = stocktakes.find(s => !s.count_type || s.count_type === 'full');
                    setIsLocked(!!fullStocktake);
                    setActiveStocktake(fullStocktake || null);
                } catch (innerErr) {
                    // Ignore aborted requests
                    if (axios.isCancel(innerErr) || innerErr.code === 'ERR_CANCELED' || innerErr.name === 'CanceledError') {
                        return;
                    }
                    console.error('Error checking stocktake status:', innerErr);
                    setIsLocked(false);
                    setActiveStocktake(null);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();

        // Refresh every 30 seconds
        const interval = setInterval(fetchStatus, 30000);

        return () => {
            clearInterval(interval);
            abortController.abort();
        };
    }, []);

    return (
        <StocktakeContext.Provider value={{ activeStocktake, isLocked, refreshStatus, loading }}>
            {children}
        </StocktakeContext.Provider>
    );
};

export default StocktakeContext;
